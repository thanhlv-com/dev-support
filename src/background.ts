// Background service worker for Dev Support Extension v2.0 - TypeScript version

/// <reference path="types/global.d.ts" />

import ProxyManager from './features/proxy/ProxyManager';
import { StorageManager } from './features/cookie-manager/CookieManager';

interface BackgroundMessage extends ChromeMessage {
  action: 'trackEvent' | 'getSettings' | 'saveSettings' | 'captureScreen' | 'deleteHistory' | 'deleteHistoryNow' | 'getHistoryStats' | 'getProxyConfig' | 'saveProxyConfig' | 'testProxyConnection' | 'exportStorage' | 'importStorage' | 'clearStorage' | 'getStorageCount' | 'exportCookies' | 'importCookies' | 'clearCookies' | 'getCookieCount';
  event?: string;
  data?: any;
  settings?: ExtensionSettings;
  options?: any;
  historyConfig?: HistoryDeletionConfig;
  proxyConfig?: ProxyConfiguration;
  proxyRule?: ProxyRule;
  testUrl?: string;
  url?: string;
  tabId?: number;
  storageData?: StorageExport;
  cookieData?: CookieExport;
}

interface BackgroundResponse {
  success: boolean;
  settings?: ExtensionSettings;
  dataUrl?: string;
  filename?: string;
  data?: any;
  error?: string;
}

class BackgroundController {
  private proxyManager: ProxyManager;
  private storageManager: StorageManager;

  constructor() {
    this.proxyManager = ProxyManager.getInstance();
    this.storageManager = StorageManager.getInstance();
    this.init();
  }

  private async init(): Promise<void> {
    console.log('🚀 Dev Support Extension background script loaded');
    
    // Setup event listeners
    this.setupInstallListener();
    this.setupMessageListener();
    this.setupTabUpdateListener();
    this.setupAlarmListener();
    this.setupContextMenu();
    
    // Create periodic cleanup alarm (every 6 hours)
    chrome.alarms.create('cleanup', { periodInMinutes: 360 });
    
    // Create history deletion alarms
    this.setupHistoryDeletionAlarms();
    
    // Initialize proxy configuration on startup
    await this.initializeProxyConfiguration();
    
    console.log('✅ Dev Support Extension background script initialized');
  }

  private setupInstallListener(): void {
    chrome.runtime.onInstalled.addListener((details) => {
      console.log('📦 Extension installed/updated:', details.reason);
      
      if (details.reason === 'install') {
        // Set default settings on first install
        const defaultHistoryConfig: HistoryDeletionConfig = {
          enabled: false,
          interval: 'weekly',
          retentionDays: 30, // 0 = delete all, >0 = keep for N days
          deleteOnStartup: false,
          excludePatterns: []
        };
        
        chrome.storage.sync.set({
          mediumFreedium: true, // Enable Medium Freedium by default
          jsonViewer: true,     // Enable JSON Viewer by default
          historyDeletion: defaultHistoryConfig
        });
        console.log('✅ Default settings initialized');
      }
    });
  }

  private setupMessageListener(): void {
    chrome.runtime.onMessage.addListener((
      message: BackgroundMessage,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response: BackgroundResponse) => void
    ) => {
      console.log('📨 Background received message:', message);
      
      switch (message.action) {
        case 'trackEvent':
          if (message.event && message.data) {
            this.handleTrackEvent(message.event, message.data);
            sendResponse({ success: true });
          }
          break;
          
        case 'getSettings':
          this.handleGetSettings(sendResponse);
          return true; // Keep message channel open for async response
          
        case 'saveSettings':
          if (message.settings) {
            this.handleSaveSettings(message.settings, sendResponse);
            return true; // Keep message channel open for async response
          }
          break;
          
        case 'captureScreen':
          this.handleScreenCapture(message.options || {}, sendResponse, sender);
          return true; // Keep message channel open for async response
          
        case 'deleteHistory':
          if (message.historyConfig) {
            this.handleHistoryDeletion(message.historyConfig, sendResponse);
            return true; // Keep message channel open for async response
          }
          break;
          
        case 'deleteHistoryNow':
          if (message.historyConfig) {
            this.handleDeleteHistoryNow(message.historyConfig, sendResponse);
            return true; // Keep message channel open for async response
          }
          break;
          
        case 'getHistoryStats':
          this.handleGetHistoryStats(sendResponse);
          return true; // Keep message channel open for async response
          
        case 'getProxyConfig':
          this.handleGetProxyConfig(sendResponse);
          return true; // Keep message channel open for async response
          
        case 'saveProxyConfig':
          if (message.proxyConfig) {
            this.handleSaveProxyConfig(message.proxyConfig, sendResponse);
            return true; // Keep message channel open for async response
          }
          break;
          
        case 'testProxyConnection':
          if (message.proxyRule) {
            this.handleTestProxyConnection(message.proxyRule, message.testUrl, sendResponse);
            return true; // Keep message channel open for async response
          }
          break;

        case 'exportStorage':
          if (message.url) {
            this.handleExportStorage(message.url, message.tabId, sendResponse);
            return true; // Keep message channel open for async response
          }
          break;

        case 'importStorage':
          if (message.storageData) {
            this.handleImportStorage(message.storageData, message.tabId, sendResponse);
            return true; // Keep message channel open for async response
          }
          break;

        case 'clearStorage':
          if (message.url) {
            this.handleClearStorage(message.url, message.tabId, sendResponse);
            return true; // Keep message channel open for async response
          }
          break;

        case 'getStorageCount':
          if (message.url) {
            this.handleGetStorageCount(message.url, message.tabId, sendResponse);
            return true; // Keep message channel open for async response
          }
          break;

        // Legacy cookie handlers for backward compatibility
        case 'exportCookies':
          if (message.url) {
            this.handleExportCookies(message.url, sendResponse);
            return true; // Keep message channel open for async response
          }
          break;

        case 'importCookies':
          if (message.cookieData) {
            this.handleImportCookies(message.cookieData, sendResponse);
            return true; // Keep message channel open for async response
          }
          break;

        case 'clearCookies':
          if (message.url) {
            this.handleClearCookies(message.url, sendResponse);
            return true; // Keep message channel open for async response
          }
          break;

        case 'getCookieCount':
          if (message.url) {
            this.handleGetCookieCount(message.url, sendResponse);
            return true; // Keep message channel open for async response
          }
          break;
      }
    });
  }

  private setupTabUpdateListener(): void {
    chrome.tabs.onUpdated.addListener((tabId: number, changeInfo: any, tab: chrome.tabs.Tab) => {
      if (changeInfo.status === 'complete' && tab.url) {
        // Check if this is a Medium page
        const isMediumPage = this.isMediumUrl(tab.url);
        
        if (isMediumPage) {
          console.log('📄 Medium page detected:', tab.url);
          
          // Ensure content script is loaded
          chrome.scripting.executeScript({
            target: { tabId },
            func: () => {
              // Check if our extension is already loaded
              if (!window.devSupportLoaded) {
                window.devSupportLoaded = true;
                console.log('🔄 Reloading Dev Support features');
              }
            }
          }).catch(() => {
            // Ignore errors (might be restricted page)
          });
        }
      }
    });
  }

  private setupAlarmListener(): void {
    chrome.alarms.onAlarm.addListener((alarm: chrome.alarms.Alarm) => {
      console.log('⏰ Alarm triggered:', alarm.name);
      
      switch (alarm.name) {
        case 'cleanup':
          this.performCleanup();
          break;
        case 'historyDeletion':
          this.performScheduledHistoryDeletion();
          break;
      }
    });
  }

  private setupContextMenu(): void {
    chrome.runtime.onInstalled.addListener(() => {
      // Create context menu for Medium pages
      chrome.contextMenus.create({
        id: 'openInFreedium',
        title: 'Open in Freedium (Free Access)',
        contexts: ['page'],
        documentUrlPatterns: [
          '*://*.medium.com/*',
          '*://medium.com/*',
          '*://towardsdatascience.com/*'
        ]
      });
    });

    // Context menu click handler
    chrome.contextMenus.onClicked.addListener((info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) => {
      if (info.menuItemId === 'openInFreedium' && tab?.url) {
        const freediumUrl = `https://freedium.cfd/${tab.url}`;
        chrome.tabs.create({ url: freediumUrl });
        
        // Track the event
        this.handleTrackEvent('freedium_redirect_context_menu', {
          originalUrl: tab.url,
          freediumUrl,
          timestamp: Date.now()
        });
      }
    });
  }

  private handleTrackEvent(event: string, data: any): void {
    console.log('📊 Tracking event:', event, data);
    
    // Store analytics data locally
    chrome.storage.local.get(['analytics'], (result) => {
      const analytics: ChromeAnalyticsEvent[] = result.analytics || [];
      analytics.push({
        event,
        data,
        timestamp: Date.now(),
        userAgent: navigator.userAgent
      });
      
      // Keep only last 100 events
      if (analytics.length > 100) {
        analytics.splice(0, analytics.length - 100);
      }
      
      chrome.storage.local.set({ analytics });
    });
    
    // Special handling for different events
    switch (event) {
      case 'freedium_redirect':
        console.log('🌐 User redirected to Freedium:', data.freediumUrl);
        break;
    }
  }

  private async handleGetSettings(sendResponse: (response: BackgroundResponse) => void): Promise<void> {
    try {
      const settings = await chrome.storage.sync.get(['mediumFreedium', 'jsonViewer', 'historyDeletion']) as ChromeStorageResult;
      
      const defaultHistoryConfig: HistoryDeletionConfig = {
        enabled: false,
        interval: 'weekly',
        retentionDays: 30, // 0 = delete all, >0 = keep for N days
        deleteOnStartup: false,
        excludePatterns: []
      };
      
      sendResponse({
        success: true,
        settings: {
          mediumFreedium: settings.mediumFreedium !== false, // Default to true
          jsonViewer: settings.jsonViewer !== false,          // Default to true
          historyDeletion: settings.historyDeletion || defaultHistoryConfig
        }
      });
    } catch (error) {
      console.error('❌ Error getting settings:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async handleSaveSettings(settings: ExtensionSettings, sendResponse: (response: BackgroundResponse) => void): Promise<void> {
    try {
      await chrome.storage.sync.set(settings);
      console.log('💾 Settings saved:', settings);
      
      sendResponse({
        success: true
      });
    } catch (error) {
      console.error('❌ Error saving settings:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private performCleanup(): void {
    console.log('🧹 Performing periodic cleanup...');
    
    // Clean up old analytics data
    chrome.storage.local.get(['analytics'], (result) => {
      const analytics: ChromeAnalyticsEvent[] = result.analytics || [];
      const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      
      const cleanedAnalytics = analytics.filter(item => item.timestamp > oneWeekAgo);
      
      if (cleanedAnalytics.length !== analytics.length) {
        chrome.storage.local.set({ analytics: cleanedAnalytics });
        console.log(`🗑️ Cleaned up ${analytics.length - cleanedAnalytics.length} old analytics entries`);
      }
    });
  }

  private async handleScreenCapture(
    options: any, 
    sendResponse: (response: BackgroundResponse) => void,
    sender: chrome.runtime.MessageSender
  ): Promise<void> {
    try {
      console.log('📸 Handling screen capture request:', options);
      
      // Try to get current active tab if sender.tab is not available
      let tabId: number | undefined = sender.tab?.id;
      let windowId: number | undefined = sender.tab?.windowId;
      
      if (!tabId) {
        console.log('No sender tab, trying to get active tab');
        try {
          const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (activeTab?.id) {
            tabId = activeTab.id;
            windowId = activeTab.windowId;
            console.log('Found active tab:', tabId);
          }
        } catch (error) {
          console.error('Error getting active tab:', error);
        }
      }
      
      if (!tabId) {
        sendResponse({
          success: false,
          error: 'No active tab found. Please make sure a tab is open and try again.'
        });
        return;
      }
      
      // Capture the visible area first - if no windowId, use current window
      const quality = options.quality || 90;
      const captureOptions = {
        format: options.format || 'png',
        quality: quality > 1 ? Math.round(quality) : Math.round(quality * 100) // Handle both 0.9 and 90 formats
      };
      
      const dataUrl = windowId 
        ? await chrome.tabs.captureVisibleTab(windowId, captureOptions)
        : await chrome.tabs.captureVisibleTab(captureOptions);

      let finalDataUrl: string;
      if (options.fullPage) {
        // For full page capture, we need to implement scrolling
        finalDataUrl = await this.captureFullPageWithScrolling(tabId, options);
      } else {
        finalDataUrl = dataUrl;
      }

      // Trigger download using chrome.downloads API
      try {
        const downloadId = await chrome.downloads.download({
          url: finalDataUrl,
          filename: options.filename,
          saveAs: false // Don't show save dialog, use default download location
        });
        
        console.log('Download started with ID:', downloadId);
        
        sendResponse({
          success: true,
          dataUrl: finalDataUrl,
          filename: options.filename
        });
      } catch (downloadError) {
        console.error('Download failed, falling back to data URL:', downloadError);
        
        // Fallback: return data URL for manual download
        sendResponse({
          success: true,
          dataUrl: finalDataUrl,
          filename: options.filename
        });
      }

      // Track the event
      this.handleTrackEvent('screen_capture', {
        fullPage: options.fullPage,
        format: options.format,
        timestamp: Date.now(),
        url: sender.tab?.url || 'unknown'
      });

    } catch (error) {
      console.error('❌ Screen capture failed:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Screen capture failed'
      });
    }
  }

  private async captureFullPageWithScrolling(tabId: number, options: any): Promise<string> {
    try {
      // Get page dimensions
      const [dimensions] = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          return {
            scrollHeight: document.documentElement.scrollHeight,
            clientHeight: document.documentElement.clientHeight,
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
            scrollX: window.scrollX,
            scrollY: window.scrollY
          };
        }
      });

      if (!dimensions.result) {
        throw new Error('Could not get page dimensions');
      }

      const { scrollHeight, clientHeight, scrollWidth, clientWidth, scrollX: originalScrollX, scrollY: originalScrollY } = dimensions.result;
      
      // If page fits in viewport, just capture visible area
      if (scrollHeight <= clientHeight) {
        const quality = options.quality || 90;
        return await chrome.tabs.captureVisibleTab({
          format: options.format || 'png',
          quality: quality > 1 ? Math.round(quality) : Math.round(quality * 100) // Handle both 0.9 and 90 formats
        });
      }

      // Calculate number of captures needed with optimization
      const captures: string[] = [];
      const captureHeight = clientHeight;
      const numCaptures = Math.ceil(scrollHeight / captureHeight);
      
      // Limit captures to prevent excessive API calls (max 10 captures)
      const maxCaptures = 10;
      if (numCaptures > maxCaptures) {
        throw new Error(`Page too long (${numCaptures} captures needed). Maximum ${maxCaptures} captures allowed.`);
      }
      
      console.log(`📸 Full page capture: ${numCaptures} sections needed for height ${scrollHeight}px`);

      // Scroll and capture each section
      for (let i = 0; i < numCaptures; i++) {
        const scrollTop = i * captureHeight;
        
        // Scroll to position
        await chrome.scripting.executeScript({
          target: { tabId },
          func: (y: number) => {
            window.scrollTo(0, y);
          },
          args: [scrollTop]
        });

        // Wait for scroll to complete
        await new Promise(resolve => setTimeout(resolve, 300));

        // Capture this section with rate limiting
        const quality = options.quality || 90;
        const sectionDataUrl = await chrome.tabs.captureVisibleTab({
          format: options.format || 'png',
          quality: quality > 1 ? Math.round(quality) : Math.round(quality * 100) // Handle both 0.9 and 90 formats
        });
        
        captures.push(sectionDataUrl);
        
        // Add delay between captures to respect rate limits (max 2 per second)
        if (i < numCaptures - 1) {
          await new Promise(resolve => setTimeout(resolve, 600));
        }
      }

      // Restore original scroll position
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (x: number, y: number) => {
          window.scrollTo(x, y);
        },
        args: [originalScrollX, originalScrollY]
      });

      // Combine all captures into one image
      return await this.combineImages(captures, clientWidth, scrollHeight, captureHeight);

    } catch (error) {
      console.error('Full page capture failed:', error);
      throw error;
    }
  }

  private async combineImages(dataUrls: string[], width: number, totalHeight: number, sectionHeight: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const canvas = new OffscreenCanvas(width, totalHeight);
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      let loadedImages = 0;
      const images: ImageBitmap[] = [];

      dataUrls.forEach((dataUrl, index) => {
        fetch(dataUrl)
          .then(response => response.blob())
          .then(blob => createImageBitmap(blob))
          .then(imageBitmap => {
            images[index] = imageBitmap;
            loadedImages++;

            if (loadedImages === dataUrls.length) {
              // Draw all images onto the canvas
              images.forEach((img, i) => {
                const y = i * sectionHeight;
                ctx.drawImage(img, 0, y);
              });

              // Convert canvas to data URL
              canvas.convertToBlob({ type: 'image/png' })
                .then(blob => {
                  const reader = new FileReader();
                  reader.onload = () => resolve(reader.result as string);
                  reader.onerror = () => reject(new Error('Failed to convert blob to data URL'));
                  reader.readAsDataURL(blob);
                })
                .catch(reject);
            }
          })
          .catch(reject);
      });
    });
  }

  private isMediumUrl(url: string): boolean {
    return url.includes('medium.com') || url.includes('towardsdatascience.com');
  }

  private async setupHistoryDeletionAlarms(): Promise<void> {
    try {
      const settings = await chrome.storage.sync.get(['historyDeletion']) as ChromeStorageResult;
      const historyConfig: HistoryDeletionConfig = settings.historyDeletion;
      
      if (historyConfig?.enabled) {
        // Clear existing history deletion alarm
        chrome.alarms.clear('historyDeletion');
        
        // Calculate minutes based on interval
        let periodInMinutes: number;
        switch (historyConfig.interval) {
          case 'daily':
            periodInMinutes = 24 * 60; // 1440 minutes
            break;
          case 'weekly':
            periodInMinutes = 7 * 24 * 60; // 10080 minutes
            break;
          case 'monthly':
            periodInMinutes = 30 * 24 * 60; // 43200 minutes
            break;
          default:
            periodInMinutes = 7 * 24 * 60; // Default to weekly
        }
        
        chrome.alarms.create('historyDeletion', { periodInMinutes });
        console.log(`🗓️ History deletion alarm set for ${historyConfig.interval} (${periodInMinutes} minutes)`);
        
        // If deleteOnStartup is enabled, perform deletion now
        if (historyConfig.deleteOnStartup) {
          this.performScheduledHistoryDeletion();
        }
      } else {
        // Clear the alarm if history deletion is disabled
        chrome.alarms.clear('historyDeletion');
      }
    } catch (error) {
      console.error('❌ Error setting up history deletion alarms:', error);
    }
  }

  private async performScheduledHistoryDeletion(): Promise<void> {
    try {
      const settings = await chrome.storage.sync.get(['historyDeletion']) as ChromeStorageResult;
      const historyConfig: HistoryDeletionConfig = settings.historyDeletion;
      
      if (!historyConfig?.enabled) {
        console.log('📋 History deletion is disabled, skipping scheduled deletion');
        return;
      }
      
      console.log('🗑️ Performing scheduled history deletion...');
      
      let cutoffTime: number;
      let isDeleteAll = false;
      
      if (historyConfig.retentionDays === 0) {
        // Delete ALL history
        cutoffTime = Date.now();
        isDeleteAll = true;
        console.log('📅 [SCHEDULED] DELETE ALL MODE - deleting entire history');
      } else {
        // Delete history older than retention period
        cutoffTime = Date.now() - (historyConfig.retentionDays * 24 * 60 * 60 * 1000);
        console.log(`📅 [SCHEDULED] Deleting history older than ${historyConfig.retentionDays} days`);
      }
      
      // Get history items to analyze (for counting and exclusion checking)
      const historyItems = await chrome.history.search({
        text: '',
        startTime: 0,
        endTime: cutoffTime,
        maxResults: 10000
      });
      
      console.log(`📊 Found ${historyItems.length} history items older than ${historyConfig.retentionDays} days for scheduled deletion`);
      
      if (historyItems.length === 0) {
        console.log('ℹ️ No history items found for scheduled deletion');
        return;
      }
      
      let deletedCount = 0;
      let skippedCount = 0;
      
      // Check deletion method based on mode and exclusions
      if (isDeleteAll && historyConfig.excludePatterns.length === 0) {
        // Delete all with no exclusions - use deleteAll()
        console.log('🚀 [SCHEDULED] DELETE ALL MODE with no exclusions - using chrome.history.deleteAll()');
        
        try {
          await chrome.history.deleteAll();
          deletedCount = historyItems.length;
          console.log(`✅ [SCHEDULED] All history deleted using deleteAll(): ${deletedCount} items`);
        } catch (error) {
          console.error('❌ [SCHEDULED] deleteAll() failed, falling back to individual deletion:', error);
          // Fallback to individual deletion
          for (const item of historyItems) {
            if (item.url) {
              try {
                await chrome.history.deleteUrl({ url: item.url });
                deletedCount++;
              } catch (error) {
                console.error('Error deleting history item:', item.url, error);
              }
            }
          }
        }
      } else if (!isDeleteAll && historyConfig.excludePatterns.length === 0) {
        // Regular deletion with no exclusions - use deleteRange()
        console.log('🚀 [SCHEDULED] Regular deletion (no exclusions) - using deleteRange()');
        
        try {
          await chrome.history.deleteRange({
            startTime: 0,
            endTime: cutoffTime
          });
          
          deletedCount = historyItems.length;
          console.log(`✅ [SCHEDULED] Range deletion completed: ${deletedCount} items deleted`);
        } catch (error) {
          console.error('❌ [SCHEDULED] Range deletion failed, falling back to individual deletion:', error);
          // Fallback to individual deletion
          for (const item of historyItems) {
            if (item.url) {
              try {
                await chrome.history.deleteUrl({ url: item.url });
                deletedCount++;
              } catch (error) {
                console.error('Error deleting history item:', item.url, error);
              }
            }
          }
        }
      } else {
        // Have exclusions - need individual URL deletion
        console.log('🔄 Scheduled individual deletion (with exclusions) - clearing synced data for deleted URLs');
        
        for (const item of historyItems) {
          if (item.url && this.shouldDeleteHistoryItem(item.url, historyConfig.excludePatterns)) {
            try {
              await chrome.history.deleteUrl({ url: item.url });
              deletedCount++;
              console.log(`🗑️ Scheduled deletion (including synced): ${item.url}`);
            } catch (error) {
              console.error('Error deleting history item:', item.url, error);
            }
          } else {
            skippedCount++;
            if (item.url) {
              console.log(`⏭️ Scheduled skip (excluded): ${item.url}`);
            }
          }
        }
      }
      
      if (isDeleteAll) {
        console.log(`✅ [SCHEDULED] DELETE ALL completed: ${deletedCount} deleted, ${skippedCount} skipped (all history)`);
      } else {
        console.log(`✅ [SCHEDULED] History deletion completed: ${deletedCount} deleted, ${skippedCount} skipped (synced data cleared)`);
      }
      
      // Track the event
      this.handleTrackEvent('history_deletion_scheduled', {
        deletedCount,
        skippedCount,
        retentionDays: historyConfig.retentionDays,
        interval: historyConfig.interval,
        method: isDeleteAll ? (historyConfig.excludePatterns.length === 0 ? 'deleteAll' : 'individual_delete_all') : 
                              (historyConfig.excludePatterns.length === 0 ? 'bulk' : 'individual'),
        deleteAll: isDeleteAll,
        syncCleared: true,
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error('❌ Error performing scheduled history deletion:', error);
    }
  }

  private async handleHistoryDeletion(config: HistoryDeletionConfig, sendResponse: (response: BackgroundResponse) => void): Promise<void> {
    try {
      // Save the new configuration
      await chrome.storage.sync.set({ historyDeletion: config });
      
      // Update alarms based on new configuration
      await this.setupHistoryDeletionAlarms();
      
      console.log('💾 History deletion configuration saved:', config);
      
      sendResponse({
        success: true
      });
    } catch (error) {
      console.error('❌ Error saving history deletion configuration:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async handleDeleteHistoryNow(config: HistoryDeletionConfig, sendResponse: (response: BackgroundResponse) => void): Promise<void> {
    try {
      console.log('🗑️ [START] Performing immediate history deletion with config:', JSON.stringify(config, null, 2));
      
      // Extensive API availability checks
      console.log('🔍 [CHECK] Chrome APIs available:');
      console.log('  - chrome:', !!chrome);
      console.log('  - chrome.history:', !!chrome.history);
      console.log('  - chrome.history.search:', !!chrome.history?.search);
      console.log('  - chrome.history.deleteUrl:', !!chrome.history?.deleteUrl);
      console.log('  - chrome.history.deleteRange:', !!chrome.history?.deleteRange);
      
      if (!chrome.history) {
        throw new Error('History API not available - missing permission or API not loaded');
      }
      
      let cutoffTime: number;
      let isDeleteAll = false;
      
      if (config.retentionDays === 0) {
        // Delete ALL history
        cutoffTime = Date.now(); // Everything up to now
        isDeleteAll = true;
        console.log(`📅 [CONFIG] DELETE ALL MODE - deleting entire history`);
      } else {
        // Delete history older than retention period
        cutoffTime = Date.now() - (config.retentionDays * 24 * 60 * 60 * 1000);
        const cutoffDate = new Date(cutoffTime);
        console.log(`📅 [CONFIG] Cutoff time: ${cutoffDate.toISOString()} (${config.retentionDays} days ago)`);
      }
      
      console.log(`📅 [CONFIG] Current time: ${new Date().toISOString()}`);
      console.log(`📅 [CONFIG] Time range: 0 to ${cutoffTime}`);
      
      // Test basic history access first
      console.log('🧪 [TEST] Testing basic history access...');
      try {
        const testSearch = await chrome.history.search({
          text: '',
          startTime: Date.now() - (24 * 60 * 60 * 1000), // Last 24 hours
          maxResults: 5
        });
        console.log(`🧪 [TEST] Basic history access works. Found ${testSearch.length} items in last 24h`);
        console.log('🧪 [TEST] Sample items:', testSearch.slice(0, 2).map(item => ({ url: item.url, visitCount: item.visitCount })));
      } catch (testError) {
        console.error('🧪 [TEST] Basic history access failed:', testError);
        throw new Error(`History API test failed: ${testError instanceof Error ? testError.message : 'Unknown error'}`);
      }
      
      // Get history items to analyze
      if (isDeleteAll) {
        console.log('📊 [SEARCH] DELETE ALL MODE - searching for ALL history items...');
      } else {
        console.log(`📊 [SEARCH] Searching for history items older than ${config.retentionDays} days...`);
      }
      
      const historyItems = await chrome.history.search({
        text: '',
        startTime: 0,
        endTime: cutoffTime,
        maxResults: 10000
      });
      
      if (isDeleteAll) {
        console.log(`📊 [SEARCH] Found ${historyItems.length} total history items to delete (ALL)`);
      } else {
        console.log(`📊 [SEARCH] Found ${historyItems.length} history items older than ${config.retentionDays} days`);
      }
      console.log(`🔍 [CONFIG] Exclude patterns:`, config.excludePatterns);
      
      // Show sample of found items
      if (historyItems.length > 0) {
        console.log('📋 [SAMPLE] First 5 items to potentially delete:');
        historyItems.slice(0, 5).forEach((item, index) => {
          console.log(`  ${index + 1}. ${item.url} (visited: ${item.visitCount} times, last: ${new Date(item.lastVisitTime || 0).toISOString()})`);
        });
      }
      
      if (historyItems.length === 0) {
        console.log('ℹ️ [RESULT] No history items found to delete');
        sendResponse({
          success: true,
          data: {
            deletedCount: 0,
            skippedCount: 0,
            method: 'none'
          }
        });
        return;
      }
      
      let deletedCount = 0;
      let skippedCount = 0;
      
      // Special handling for delete all mode
      if (isDeleteAll && config.excludePatterns.length === 0) {
        console.log('🚀 [METHOD] DELETE ALL MODE with no exclusions - using chrome.history.deleteAll()');
        
        try {
          await chrome.history.deleteAll();
          deletedCount = historyItems.length;
          console.log(`✅ [COMPLETE] All history deleted using deleteAll(): ${deletedCount} items`);
          
          // Track the event
          this.handleTrackEvent('history_deletion_manual', {
            deletedCount,
            skippedCount: 0,
            retentionDays: 0,
            method: 'deleteAll',
            deleteAll: true,
            timestamp: Date.now()
          });
          
          sendResponse({
            success: true,
            data: {
              deletedCount,
              skippedCount: 0,
              method: 'deleteAll',
              totalFound: historyItems.length,
              deleteAll: true
            }
          });
          return;
        } catch (error) {
          console.error('❌ [ERROR] deleteAll() failed, falling back to individual deletion:', error);
          // Continue to individual deletion below
        }
      }
      
      // Use individual deletion for better debugging and control, or when deleteAll failed
      if (isDeleteAll) {
        console.log('🔄 [METHOD] DELETE ALL MODE - using individual deletion (with exclusions or as fallback)');
      } else {
        console.log('🔄 [METHOD] Using individual deletion for better control and debugging');
      }
      
      for (const item of historyItems.slice(0, 100)) { // Limit to first 100 for testing
        if (!item.url) {
          console.log('⚠️ [SKIP] Item has no URL:', item);
          skippedCount++;
          continue;
        }
        
        const shouldDelete = this.shouldDeleteHistoryItem(item.url, config.excludePatterns);
        
        if (isDeleteAll && config.excludePatterns.length === 0) {
          // In delete all mode with no exclusions, delete everything
          console.log(`🗑️ [DELETE-ALL] ${item.url} -> DELETE (all mode)`);
        } else {
          console.log(`🤔 [DECIDE] ${item.url} -> ${shouldDelete ? 'DELETE' : 'SKIP'}`);
        }
        
        if (shouldDelete || (isDeleteAll && config.excludePatterns.length === 0)) {
          try {
            console.log(`🗑️ [DELETE] Attempting to delete: ${item.url}`);
            await chrome.history.deleteUrl({ url: item.url });
            deletedCount++;
            console.log(`✅ [SUCCESS] Deleted: ${item.url}`);
            
            // Add a small delay to avoid overwhelming the API
            await new Promise(resolve => setTimeout(resolve, 10));
          } catch (error) {
            console.error(`❌ [ERROR] Failed to delete ${item.url}:`, error);
          }
        } else {
          skippedCount++;
          console.log(`⏭️ [SKIP] Excluded: ${item.url}`);
        }
      }
      
      if (isDeleteAll) {
        console.log(`✅ [COMPLETE] DELETE ALL completed: ${deletedCount} deleted, ${skippedCount} skipped (all history)`);
      } else {
        console.log(`✅ [COMPLETE] History deletion completed: ${deletedCount} deleted, ${skippedCount} skipped`);
      }
      
      // Track the event
      this.handleTrackEvent('history_deletion_manual', {
        deletedCount,
        skippedCount,
        retentionDays: config.retentionDays,
        method: isDeleteAll ? 'individual_delete_all' : 'individual_debug',
        deleteAll: isDeleteAll,
        timestamp: Date.now()
      });
      
      sendResponse({
        success: true,
        data: {
          deletedCount,
          skippedCount,
          method: isDeleteAll ? 'individual_delete_all' : 'individual_debug',
          totalFound: historyItems.length,
          deleteAll: isDeleteAll
        }
      });
      
    } catch (error) {
      console.error('❌ [FATAL] Error performing immediate history deletion:', error);
      console.error('❌ [FATAL] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async deleteHistoryIndividually(historyItems: chrome.history.HistoryItem[], config: HistoryDeletionConfig, sendResponse: (response: BackgroundResponse) => void): Promise<void> {
    let deletedCount = 0;
    let skippedCount = 0;
    
    for (const item of historyItems) {
      if (item.url && this.shouldDeleteHistoryItem(item.url, config.excludePatterns)) {
        try {
          await chrome.history.deleteUrl({ url: item.url });
          deletedCount++;
          console.log(`🗑️ Deleted (fallback): ${item.url}`);
        } catch (error) {
          console.error('Error deleting history item:', item.url, error);
        }
      } else {
        skippedCount++;
        if (item.url) {
          console.log(`⏭️ Skipped (excluded): ${item.url}`);
        }
      }
    }
    
    console.log(`✅ Individual deletion completed: ${deletedCount} deleted, ${skippedCount} skipped`);
    
    sendResponse({
      success: true,
      data: {
        deletedCount,
        skippedCount,
        method: 'individual_fallback',
        syncCleared: true
      }
    });
  }

  private async handleGetHistoryStats(sendResponse: (response: BackgroundResponse) => void): Promise<void> {
    try {
      // Get total history count (approximate)
      const recentHistory = await chrome.history.search({
        text: '',
        maxResults: 10000
      });
      
      // Get history from last 30 days for more detailed stats
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      const recentHistoryItems = await chrome.history.search({
        text: '',
        startTime: thirtyDaysAgo,
        maxResults: 10000
      });
      
      sendResponse({
        success: true,
        data: {
          totalItems: recentHistory.length,
          recentItems: recentHistoryItems.length,
          oldestItem: recentHistory.length > 0 ? recentHistory[recentHistory.length - 1] : null
        }
      });
    } catch (error) {
      console.error('❌ Error getting history stats:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private shouldDeleteHistoryItem(url: string, excludePatterns: string[]): boolean {
    // Check if URL matches any exclude pattern
    for (const pattern of excludePatterns) {
      if (pattern.trim()) {
        try {
          // Convert glob-like pattern to regex
          const regexPattern = pattern
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.');
          const regex = new RegExp(regexPattern, 'i');
          
          if (regex.test(url)) {
            return false; // Don't delete if it matches exclude pattern
          }
        } catch (error) {
          console.warn('Invalid exclude pattern:', pattern, error);
        }
      }
    }
    
    return true; // Delete by default
  }

  // Proxy-related handlers
  private async handleGetProxyConfig(sendResponse: (response: BackgroundResponse) => void): Promise<void> {
    try {
      const config = this.proxyManager.getConfiguration();
      sendResponse({
        success: true,
        data: config
      });
    } catch (error) {
      console.error('❌ Error getting proxy configuration:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async handleSaveProxyConfig(config: ProxyConfiguration, sendResponse: (response: BackgroundResponse) => void): Promise<void> {
    try {
      await this.proxyManager.saveConfiguration(config);
      console.log('💾 Proxy configuration saved:', config);
      
      sendResponse({
        success: true
      });
      
      // Track the event
      this.handleTrackEvent('proxy_config_saved', {
        enabled: config.enabled,
        rulesCount: config.rules.length,
        hasGlobalProxy: !!config.globalProxyProfileId,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('❌ Error saving proxy configuration:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async handleTestProxyConnection(rule: ProxyRule, testUrl: string | undefined, sendResponse: (response: BackgroundResponse) => void): Promise<void> {
    try {
      const isValid = await this.proxyManager.testProxyConnection(rule, testUrl);
      
      sendResponse({
        success: true,
        data: { isValid }
      });
      
      // Track the event (using legacy format for compatibility)
      this.handleTrackEvent('proxy_connection_test', {
        proxyType: (rule as any).proxyType || 'unknown',
        host: (rule as any).host || 'unknown',
        port: (rule as any).port || 0,
        profileId: rule.profileId,
        isValid,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('❌ Error testing proxy connection:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Initialize proxy configuration on extension startup
  private async initializeProxyConfiguration(): Promise<void> {
    try {
      console.log('🌐 Initializing proxy configuration...');
      await this.proxyManager.initialize();
    } catch (error) {
      console.error('❌ Error initializing proxy configuration:', error);
    }
  }

  // Storage management handlers (new)
  private async handleExportStorage(url: string, tabId: number | undefined, sendResponse: (response: BackgroundResponse) => void): Promise<void> {
    try {
      console.log('💾 [BACKGROUND] Starting storage export for URL:', url, 'tabId:', tabId);
      
      // Validate URL
      if (!url || typeof url !== 'string') {
        throw new Error('Invalid URL provided for storage export');
      }
      
      // Check if URL is a valid web URL
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        throw new Error('Storage export is only supported for HTTP/HTTPS URLs');
      }
      
      const storageExport = await this.storageManager.exportStorage(url, tabId);
      const indexedDBCount = Object.values(storageExport.indexedDB || {}).reduce((total, db) => {
        return total + Object.values(db.objectStores).reduce((storeTotal, store) => storeTotal + store.data.length, 0);
      }, 0);
      console.log('💾 [BACKGROUND] Storage export successful:', storageExport.domain, 
        `(${storageExport.cookies.length} cookies, ${Object.keys(storageExport.localStorage).length} localStorage, ${Object.keys(storageExport.sessionStorage).length} sessionStorage, ${indexedDBCount} IndexedDB items)`);
      
      sendResponse({
        success: true,
        data: storageExport
      });

      // Track the event
      this.handleTrackEvent('storage_exported', {
        domain: storageExport.domain,
        cookieCount: storageExport.cookies.length,
        localStorageCount: Object.keys(storageExport.localStorage).length,
        sessionStorageCount: Object.keys(storageExport.sessionStorage).length,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('❌ [BACKGROUND] Error exporting storage:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async handleImportStorage(storageData: StorageExport, tabId: number | undefined, sendResponse: (response: BackgroundResponse) => void): Promise<void> {
    try {
      await this.storageManager.importStorage(storageData, tabId);
      sendResponse({
        success: true,
        data: {
          domain: storageData.domain,
          cookieCount: storageData.cookies.length,
          localStorageCount: Object.keys(storageData.localStorage).length,
          sessionStorageCount: Object.keys(storageData.sessionStorage).length
        }
      });

      // Track the event
      this.handleTrackEvent('storage_imported', {
        domain: storageData.domain,
        cookieCount: storageData.cookies.length,
        localStorageCount: Object.keys(storageData.localStorage).length,
        sessionStorageCount: Object.keys(storageData.sessionStorage).length,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('❌ [BACKGROUND] Error importing storage:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async handleClearStorage(url: string, tabId: number | undefined, sendResponse: (response: BackgroundResponse) => void): Promise<void> {
    try {
      const result = await this.storageManager.clearStorage(url, tabId);
      const urlObj = new URL(url);
      
      sendResponse({
        success: true,
        data: {
          domain: urlObj.hostname,
          ...result
        }
      });

      // Track the event
      this.handleTrackEvent('storage_cleared', {
        domain: urlObj.hostname,
        ...result,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('❌ [BACKGROUND] Error clearing storage:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async handleGetStorageCount(url: string, tabId: number | undefined, sendResponse: (response: BackgroundResponse) => void): Promise<void> {
    try {
      const counts = await this.storageManager.getStorageCount(url, tabId);
      const urlObj = new URL(url);
      
      sendResponse({
        success: true,
        data: {
          domain: urlObj.hostname,
          ...counts
        }
      });
    } catch (error) {
      console.error('❌ [BACKGROUND] Error getting storage counts:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Legacy cookie management handlers (for backward compatibility)
  private async handleExportCookies(url: string, sendResponse: (response: BackgroundResponse) => void): Promise<void> {
    try {
      console.log('🍪 [BACKGROUND] Starting legacy cookie export for URL:', url);
      
      // Use the new storage manager but only return cookies
      const storageExport = await this.storageManager.exportStorage(url);
      const cookieExport: CookieExport = {
        domain: storageExport.domain,
        url: storageExport.url,
        timestamp: storageExport.timestamp,
        cookies: storageExport.cookies
      };
      
      console.log('🍪 [BACKGROUND] Legacy cookie export successful:', cookieExport.domain, cookieExport.cookies.length, 'cookies');
      
      sendResponse({
        success: true,
        data: cookieExport
      });

      // Track the event
      this.handleTrackEvent('cookies_exported', {
        domain: cookieExport.domain,
        cookieCount: cookieExport.cookies.length,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('❌ [BACKGROUND] Error exporting cookies:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async handleImportCookies(cookieData: CookieExport, sendResponse: (response: BackgroundResponse) => void): Promise<void> {
    try {
      // Convert legacy cookie data to storage format
      const storageData: StorageExport = {
        domain: cookieData.domain,
        url: cookieData.url,
        timestamp: cookieData.timestamp,
        cookies: cookieData.cookies,
        localStorage: {},
        sessionStorage: {},
        indexedDB: {}
      };
      
      await this.storageManager.importStorage(storageData);
      sendResponse({
        success: true,
        data: {
          domain: cookieData.domain,
          cookieCount: cookieData.cookies.length
        }
      });

      // Track the event
      this.handleTrackEvent('cookies_imported', {
        domain: cookieData.domain,
        cookieCount: cookieData.cookies.length,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('❌ Error importing cookies:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async handleClearCookies(url: string, sendResponse: (response: BackgroundResponse) => void): Promise<void> {
    try {
      const result = await this.storageManager.clearStorage(url);
      const urlObj = new URL(url);
      
      sendResponse({
        success: true,
        data: {
          domain: urlObj.hostname,
          removedCount: result.cookies
        }
      });

      // Track the event
      this.handleTrackEvent('cookies_cleared', {
        domain: urlObj.hostname,
        removedCount: result.cookies,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('❌ Error clearing cookies:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async handleGetCookieCount(url: string, sendResponse: (response: BackgroundResponse) => void): Promise<void> {
    try {
      const counts = await this.storageManager.getStorageCount(url);
      const urlObj = new URL(url);
      
      sendResponse({
        success: true,
        data: {
          domain: urlObj.hostname,
          count: counts.cookies
        }
      });
    } catch (error) {
      console.error('❌ Error getting cookie count:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

// Initialize background controller
new BackgroundController();