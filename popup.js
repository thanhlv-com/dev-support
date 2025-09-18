document.addEventListener('DOMContentLoaded', async () => {
  // Get current tab info
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  // Update UI with current page info
  document.getElementById('currentUrl').textContent = tab.url;
  document.getElementById('pageTitle').textContent = tab.title;
  
  // Load saved settings
  const result = await chrome.storage.sync.get(['autoRefresh']);
  document.getElementById('autoRefresh').checked = result.autoRefresh || false;
  
  // Button event listeners
  document.getElementById('clearConsole').addEventListener('click', async () => {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: clearConsole
    });
    showNotification('Console cleared! 🧹');
  });
  
  document.getElementById('refreshPage').addEventListener('click', async () => {
    await chrome.tabs.reload(tab.id);
    showNotification('Page refreshed! 🔄');
    window.close();
  });
  
  document.getElementById('toggleDevTools').addEventListener('click', async () => {
    // Send message to background script to toggle dev tools
    chrome.runtime.sendMessage({ action: 'toggleDevTools', tabId: tab.id });
    showNotification('Dev tools toggled! 🔧');
  });
  
  document.getElementById('exportData').addEventListener('click', async () => {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: exportPageData
    });
    showNotification('Data exported! 📤');
  });
  
  // Settings toggle
  document.getElementById('autoRefresh').addEventListener('change', async (e) => {
    await chrome.storage.sync.set({ autoRefresh: e.target.checked });
    const message = e.target.checked ? 'Auto-refresh enabled! ✅' : 'Auto-refresh disabled! ❌';
    showNotification(message);
    
    // Send message to background script
    chrome.runtime.sendMessage({ 
      action: 'toggleAutoRefresh', 
      enabled: e.target.checked,
      tabId: tab.id 
    });
  });
});

// Functions to be injected into the page
function clearConsole() {
  console.clear();
  console.log('🧹 Console cleared by Dev Support Extension');
}

function exportPageData() {
  const data = {
    url: window.location.href,
    title: document.title,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    localStorage: { ...localStorage },
    sessionStorage: { ...sessionStorage },
    cookies: document.cookie,
    metaTags: Array.from(document.querySelectorAll('meta')).map(meta => ({
      name: meta.name || meta.property,
      content: meta.content
    })),
    links: Array.from(document.querySelectorAll('a')).map(link => ({
      text: link.textContent.trim(),
      href: link.href
    })).slice(0, 20) // Limit to first 20 links
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `page-data-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  console.log('📤 Page data exported by Dev Support Extension', data);
}

// Utility function to show notifications
function showNotification(message) {
  // Create a temporary notification element
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: #4CAF50;
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 14px;
    z-index: 10000;
    animation: slideInRight 0.3s ease-out;
  `;
  
  // Add animation styles
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideInRight {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
  
  document.body.appendChild(notification);
  
  // Remove after 2 seconds
  setTimeout(() => {
    notification.style.animation = 'slideInRight 0.3s ease-out reverse';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    }, 300);
  }, 2000);
}