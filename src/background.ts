// Background service worker for Dev Support Extension v2.0 - TypeScript version

/// <reference path="../types/global.d.ts" />

interface BackgroundMessage extends ChromeMessage {
  action: 'trackEvent' | 'getSettings' | 'saveSettings';
  event?: string;
  data?: any;
  settings?: ExtensionSettings;
}

interface BackgroundResponse {
  success: boolean;
  settings?: ExtensionSettings;
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
    
    console.log('✅ Dev Support Extension background script initialized');
  }

  private setupInstallListener(): void {
    chrome.runtime.onInstalled.addListener((details) => {
      console.log('📦 Extension installed/updated:', details.reason);
      
      if (details.reason === 'install') {
        // Set default settings on first install
        chrome.storage.sync.set({
          mediumFreedium: true // Enable Medium Freedium by default
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
            target: { tabId: tabId },
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
          freediumUrl: freediumUrl,
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
        event: event,
        data: data,
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
      const settings = await chrome.storage.sync.get(['mediumFreedium']) as ChromeStorageResult;
      
      sendResponse({
        success: true,
        settings: {
          mediumFreedium: settings.mediumFreedium !== false // Default to true
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

  private isMediumUrl(url: string): boolean {
    return url.includes('medium.com') || url.includes('towardsdatascience.com');
  }
}

// Initialize background controller
new BackgroundController();