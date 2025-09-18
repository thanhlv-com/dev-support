// Background service worker for Dev Support Extension v2.0 - TypeScript version

/// <reference path="types/global.d.ts" />

interface BackgroundMessage extends ChromeMessage {
  action: 'trackEvent' | 'getSettings' | 'saveSettings' | 'captureScreen';
  event?: string;
  data?: any;
  settings?: ExtensionSettings;
  options?: any;
}

interface BackgroundResponse {
  success: boolean;
  settings?: ExtensionSettings;
  dataUrl?: string;
  filename?: string;
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
          mediumFreedium: true, // Enable Medium Freedium by default
          jsonViewer: true      // Enable JSON Viewer by default
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
      const settings = await chrome.storage.sync.get(['mediumFreedium', 'jsonViewer']) as ChromeStorageResult;
      
      sendResponse({
        success: true,
        settings: {
          mediumFreedium: settings.mediumFreedium !== false, // Default to true
          jsonViewer: settings.jsonViewer !== false          // Default to true
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
}

// Initialize background controller
new BackgroundController();