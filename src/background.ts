// Background service worker for Dev Support Extension v2.0 - TypeScript version

/// <reference path="types/global.d.ts" />

interface BackgroundMessage extends ChromeMessage {
  action: 'trackEvent' | 'getSettings' | 'saveSettings' | 'captureScreen' | 'deleteHistory' | 'deleteHistoryNow' | 'getHistoryStats';
  event?: string;
  data?: any;
  settings?: ExtensionSettings;
  options?: any;
  historyConfig?: HistoryDeletionConfig;
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
  constructor() {
    this.init();
  }

  private init(): void {
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
          retentionDays: 30,
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
        retentionDays: 30,
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
      
      const cutoffTime = Date.now() - (historyConfig.retentionDays * 24 * 60 * 60 * 1000);
      
      // Get history items to delete
      const historyItems = await chrome.history.search({
        text: '',
        startTime: 0,
        endTime: cutoffTime,
        maxResults: 10000
      });
      
      console.log(`📊 Found ${historyItems.length} history items older than ${historyConfig.retentionDays} days for scheduled deletion`);
      
      let deletedCount = 0;
      let skippedCount = 0;
      
      for (const item of historyItems) {
        if (item.url && this.shouldDeleteHistoryItem(item.url, historyConfig.excludePatterns)) {
          try {
            await chrome.history.deleteUrl({ url: item.url });
            deletedCount++;
            console.log(`🗑️ Scheduled deletion: ${item.url}`);
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
      
      console.log(`✅ Scheduled history deletion completed: ${deletedCount} deleted, ${skippedCount} skipped`);
      
      // Track the event
      this.handleTrackEvent('history_deletion_scheduled', {
        deletedCount,
        skippedCount,
        retentionDays: historyConfig.retentionDays,
        interval: historyConfig.interval,
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
      console.log('🗑️ Performing immediate history deletion with config:', config);
      
      // Check if we have history permission
      if (!chrome.history) {
        throw new Error('History API not available - missing permission');
      }
      
      const cutoffTime = Date.now() - (config.retentionDays * 24 * 60 * 60 * 1000);
      console.log(`📅 Cutoff time: ${new Date(cutoffTime).toISOString()} (${config.retentionDays} days ago)`);
      
      // Get history items to delete
      const historyItems = await chrome.history.search({
        text: '',
        startTime: 0,
        endTime: cutoffTime,
        maxResults: 10000
      });
      
      console.log(`📊 Found ${historyItems.length} history items older than ${config.retentionDays} days`);
      console.log(`🔍 Exclude patterns:`, config.excludePatterns);
      
      if (historyItems.length === 0) {
        console.log('ℹ️ No history items found to delete');
        sendResponse({
          success: true,
          data: {
            deletedCount: 0,
            skippedCount: 0
          }
        });
        return;
      }
      
      let deletedCount = 0;
      let skippedCount = 0;
      
      for (const item of historyItems) {
        if (item.url && this.shouldDeleteHistoryItem(item.url, config.excludePatterns)) {
          try {
            await chrome.history.deleteUrl({ url: item.url });
            deletedCount++;
            console.log(`🗑️ Deleted: ${item.url}`);
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
      
      console.log(`✅ Immediate history deletion completed: ${deletedCount} deleted, ${skippedCount} skipped`);
      
      // Track the event
      this.handleTrackEvent('history_deletion_manual', {
        deletedCount,
        skippedCount,
        retentionDays: config.retentionDays,
        timestamp: Date.now()
      });
      
      sendResponse({
        success: true,
        data: {
          deletedCount,
          skippedCount
        }
      });
      
    } catch (error) {
      console.error('❌ Error performing immediate history deletion:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
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
}

// Initialize background controller
new BackgroundController();