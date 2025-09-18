// Background service worker for Dev Support Extension

// Extension installation/update handler
chrome.runtime.onInstalled.addListener((details) => {
  console.log('🚀 Dev Support Extension installed/updated:', details.reason);
  
  if (details.reason === 'install') {
    // Set default settings on first install
    chrome.storage.sync.set({
      autoRefresh: false,
      refreshInterval: 30000, // 30 seconds
      notifications: true
    });
  }
});

// Message handler from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Background received message:', message);
  
  switch (message.action) {
    case 'toggleDevTools':
      handleToggleDevTools(message.tabId);
      break;
      
    case 'toggleAutoRefresh':
      handleAutoRefresh(message.enabled, message.tabId);
      break;
      
    case 'getTabInfo':
      handleGetTabInfo(sendResponse);
      return true; // Keep message channel open for async response
      
    case 'showNotification':
      showNotification(message.title, message.message);
      break;
  }
});

// Auto-refresh functionality
let autoRefreshIntervals = new Map();

function handleAutoRefresh(enabled, tabId) {
  if (enabled) {
    // Start auto-refresh for this tab
    const intervalId = setInterval(async () => {
      try {
        // Check if tab still exists
        const tab = await chrome.tabs.get(tabId);
        if (tab) {
          await chrome.tabs.reload(tabId);
          console.log(`🔄 Auto-refreshed tab ${tabId}`);
        }
      } catch (error) {
        // Tab no longer exists, clear interval
        clearInterval(intervalId);
        autoRefreshIntervals.delete(tabId);
        console.log(`❌ Tab ${tabId} no longer exists, stopping auto-refresh`);
      }
    }, 30000); // 30 seconds
    
    autoRefreshIntervals.set(tabId, intervalId);
    console.log(`✅ Auto-refresh enabled for tab ${tabId}`);
  } else {
    // Stop auto-refresh for this tab
    const intervalId = autoRefreshIntervals.get(tabId);
    if (intervalId) {
      clearInterval(intervalId);
      autoRefreshIntervals.delete(tabId);
      console.log(`❌ Auto-refresh disabled for tab ${tabId}`);
    }
  }
}

// Dev tools toggle handler
async function handleToggleDevTools(tabId) {
  try {
    // Note: Chrome extensions cannot directly toggle dev tools
    // This is a placeholder for future functionality or workarounds
    console.log('🔧 Dev tools toggle requested for tab', tabId);
    
    // Alternative: Inject a script that logs useful debug info
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      function: debugInfo
    });
  } catch (error) {
    console.error('❌ Error toggling dev tools:', error);
  }
}

// Function to inject debug information
function debugInfo() {
  console.group('🔧 Dev Support Debug Info');
  console.log('📍 Current URL:', window.location.href);
  console.log('📄 Document title:', document.title);
  console.log('🎯 User agent:', navigator.userAgent);
  console.log('📊 Performance:', performance.now() + 'ms since page load');
  console.log('🎨 Viewport:', window.innerWidth + 'x' + window.innerHeight);
  console.log('📱 Device pixel ratio:', window.devicePixelRatio);
  console.log('🌐 Online status:', navigator.onLine);
  console.log('🧠 Memory usage:', performance.memory || 'Not available');
  console.groupEnd();
}

// Get tab information
async function handleGetTabInfo(sendResponse) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    sendResponse({
      success: true,
      data: {
        id: tab.id,
        url: tab.url,
        title: tab.title,
        status: tab.status,
        favIconUrl: tab.favIconUrl
      }
    });
  } catch (error) {
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

// Notification handler
function showNotification(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon-48.png',
    title: title,
    message: message
  });
}

// Clean up intervals when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  const intervalId = autoRefreshIntervals.get(tabId);
  if (intervalId) {
    clearInterval(intervalId);
    autoRefreshIntervals.delete(tabId);
    console.log(`🧹 Cleaned up auto-refresh for closed tab ${tabId}`);
  }
});

// Handle tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    console.log('✅ Tab updated:', tab.url);
  }
});

// Alarm handler for scheduled tasks
chrome.alarms.onAlarm.addListener((alarm) => {
  console.log('⏰ Alarm triggered:', alarm.name);
  
  switch (alarm.name) {
    case 'cleanup':
      performCleanup();
      break;
  }
});

// Create periodic cleanup alarm
chrome.alarms.create('cleanup', { periodInMinutes: 60 });

// Cleanup function
function performCleanup() {
  console.log('🧹 Performing periodic cleanup...');
  
  // Clean up any orphaned intervals
  autoRefreshIntervals.forEach((intervalId, tabId) => {
    chrome.tabs.get(tabId).catch(() => {
      clearInterval(intervalId);
      autoRefreshIntervals.delete(tabId);
      console.log(`🧹 Cleaned up orphaned interval for tab ${tabId}`);
    });
  });
}