// Background service worker for Dev Support Extension v2.0

console.log('🚀 Dev Support Extension background script loaded');

// Installation/update handler
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

// Message handler from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Background received message:', message);
  
  switch (message.action) {
    case 'trackEvent':
      handleTrackEvent(message.event, message.data);
      sendResponse({ success: true });
      break;
      
    case 'getSettings':
      handleGetSettings(sendResponse);
      return true; // Keep message channel open for async response
      
    case 'saveSettings':
      handleSaveSettings(message.settings, sendResponse);
      return true; // Keep message channel open for async response
  }
});

// Analytics/tracking handler
function handleTrackEvent(event, data) {
  console.log('📊 Tracking event:', event, data);
  
  // Store analytics data locally
  chrome.storage.local.get(['analytics'], (result) => {
    const analytics = result.analytics || [];
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

// Settings handlers
async function handleGetSettings(sendResponse) {
  try {
    const settings = await chrome.storage.sync.get([
      'mediumFreedium'
    ]);
    
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
      error: error.message
    });
  }
}

async function handleSaveSettings(settings, sendResponse) {
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
      error: error.message
    });
  }
}

// Tab update handler - reinject content script on navigation
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Check if this is a Medium page
    const isMediumPage = tab.url.includes('medium.com') || 
                        tab.url.includes('towardsdatascience.com');
    
    if (isMediumPage) {
      console.log('📄 Medium page detected:', tab.url);
      
      // Ensure content script is loaded
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        function: () => {
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

// Alarm handler for periodic cleanup
chrome.alarms.onAlarm.addListener((alarm) => {
  console.log('⏰ Alarm triggered:', alarm.name);
  
  switch (alarm.name) {
    case 'cleanup':
      performCleanup();
      break;
  }
});

// Create periodic cleanup alarm (every 6 hours)
chrome.alarms.create('cleanup', { periodInMinutes: 360 });

// Cleanup function
function performCleanup() {
  console.log('🧹 Performing periodic cleanup...');
  
  // Clean up old analytics data
  chrome.storage.local.get(['analytics'], (result) => {
    const analytics = result.analytics || [];
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    const cleanedAnalytics = analytics.filter(item => item.timestamp > oneWeekAgo);
    
    if (cleanedAnalytics.length !== analytics.length) {
      chrome.storage.local.set({ analytics: cleanedAnalytics });
      console.log(`🗑️ Cleaned up ${analytics.length - cleanedAnalytics.length} old analytics entries`);
    }
  });
}

// Context menu setup (optional enhancement)
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
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'openInFreedium') {
    const freediumUrl = `https://freedium.cfd/${tab.url}`;
    chrome.tabs.create({ url: freediumUrl });
    
    // Track the event
    handleTrackEvent('freedium_redirect_context_menu', {
      originalUrl: tab.url,
      freediumUrl: freediumUrl,
      timestamp: Date.now()
    });
  }
});

console.log('✅ Dev Support Extension background script initialized');