import React, { useState, useEffect } from 'react';

interface StatusElements {
  currentUrl: string;
  activeCount: number;
}

interface StorageData {
  domain: string;
  cookies: number;
  localStorage: number;
  sessionStorage: number;
  indexedDB: number;
  total: number;
}

const PopupApp: React.FC = () => {
  const [status, setStatus] = useState<StatusElements>({
    currentUrl: 'Loading...',
    activeCount: 0
  });
  const [storageData, setStorageData] = useState<StorageData | null>(null);
  const [captureStatus, setCaptureStatus] = useState<{ message: string; type: 'loading' | 'success' | 'error' } | null>(null);
  const [currentTab, setCurrentTab] = useState<chrome.tabs.Tab | null>(null);

  useEffect(() => {
    loadCurrentTab();
    updateActiveCount();
  }, []);

  useEffect(() => {
    if (currentTab) {
      updateStorageCount();
    }
  }, [currentTab]);

  const loadCurrentTab = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) {
        const tabs = await chrome.tabs.query({ currentWindow: true });
        setCurrentTab(tabs[0] || null);
      } else {
        setCurrentTab(tab);
      }
      
      setStatus(prev => ({
        ...prev,
        currentUrl: tab?.url || 'Unknown'
      }));
    } catch (error) {
      console.error('Error loading current tab:', error);
      setCurrentTab(null);
      setStatus(prev => ({
        ...prev,
        currentUrl: 'Error loading URL'
      }));
    }
  };

  const updateActiveCount = async () => {
    try {
      const result = await chrome.storage.sync.get(['freediumFeature', 'jsonViewer', 'historyDeletion']);
      
      let count = 0;
      if (result.freediumFeature !== false) count++;
      if (result.jsonViewer !== false) count++;
      if (result.historyDeletion?.enabled) count++;
      
      setStatus(prev => ({
        ...prev,
        activeCount: count
      }));
    } catch (error) {
      console.error('Error updating active count:', error);
      setStatus(prev => ({
        ...prev,
        activeCount: 0
      }));
    }
  };

  const updateStorageCount = async () => {
    try {
      if (!currentTab?.url) return;

      const response = await chrome.runtime.sendMessage({
        action: 'getStorageCount',
        url: currentTab.url,
        tabId: currentTab.id
      });

      if (response.success) {
        setStorageData(response.data);
      } else {
        setStorageData(null);
      }
    } catch (error) {
      console.error('Error updating storage count:', error);
      setStorageData(null);
    }
  };

  const handleScreenCapture = async (fullPage: boolean) => {
    try {
      await loadCurrentTab();
      
      if (!currentTab?.id) {
        setCaptureStatus({ message: 'No active tab found - please refresh the extension', type: 'error' });
        return;
      }

      setCaptureStatus({ message: 'Capturing screenshot...', type: 'loading' });

      const response = await chrome.runtime.sendMessage({
        action: 'captureScreen',
        options: {
          fullPage,
          format: 'png',
          quality: 90,
          filename: generateFilename(fullPage)
        }
      });

      if (response.success) {
        setCaptureStatus({ message: 'Screenshot captured and downloaded!', type: 'success' });
        setTimeout(() => setCaptureStatus(null), 4000);
      } else {
        setCaptureStatus({ message: response.error || 'Capture failed', type: 'error' });
      }
    } catch (error) {
      console.error('Screen capture error:', error);
      setCaptureStatus({ message: 'Failed to capture screenshot', type: 'error' });
    }
  };

  const generateFilename = (fullPage: boolean): string => {
    const now = new Date();
    const timestamp = now.toISOString()
      .replace(/:/g, '-')
      .replace(/\./g, '-')
      .substring(0, 19);
    
    const domain = currentTab?.url 
      ? new URL(currentTab.url).hostname.replace(/[^a-zA-Z0-9]/g, '-')
      : 'unknown';
    
    const type = fullPage ? 'fullpage' : 'visible';
    return `screenshot-${type}-${domain}-${timestamp}.png`;
  };

  const handleDeleteHistory = async (retentionDays: number, description: string) => {
    const confirmMessage = retentionDays === 0 
      ? '⚠️ Are you sure you want to delete ALL browser history? This action cannot be undone.'
      : `Delete all browser history older than ${retentionDays} days?`;
    
    if (!confirm(confirmMessage)) return;

    try {
      const config = {
        enabled: true,
        retentionDays,
        interval: 'daily',
        deleteOnStartup: false,
        excludePatterns: []
      };

      const response = await chrome.runtime.sendMessage({
        action: 'deleteHistoryNow',
        historyConfig: config
      });

      if (response.success) {
        const { deletedCount } = response.data || { deletedCount: 0 };
        alert(`✅ ${description} deleted! ${deletedCount} items removed`);
        await updateActiveCount();
      } else {
        alert(response.error || `Failed to delete ${description}`);
      }
    } catch (error) {
      console.error('Quick deletion error:', error);
      alert(`Failed to delete ${description}`);
    }
  };

  const handleStorageAction = async (action: 'export' | 'clear') => {
    if (!currentTab?.url) {
      alert('No active tab found');
      return;
    }

    if (action === 'clear') {
      const urlObj = new URL(currentTab.url);
      if (!confirm(`Clear all storage data (cookies, localStorage, sessionStorage, IndexedDB) for ${urlObj.hostname}?`)) {
        return;
      }
    }

    try {
      const response = await chrome.runtime.sendMessage({
        action: action === 'export' ? 'exportStorage' : 'clearStorage',
        url: currentTab.url,
        tabId: currentTab.id
      });

      if (response.success) {
        if (action === 'export') {
          downloadStorageAsFile(response.data);
          alert('Storage exported successfully!');
        } else {
          const { domain, cookies, localStorage: ls, sessionStorage: ss, indexedDB } = response.data;
          const totalCleared = cookies + ls + ss + (indexedDB || 0);
          alert(`Cleared ${totalCleared} storage items for ${domain}`);
        }
        await updateStorageCount();
      } else {
        alert(response.error || `Failed to ${action} storage`);
      }
    } catch (error) {
      console.error(`Storage ${action} error:`, error);
      alert(`Failed to ${action} storage`);
    }
  };

  const downloadStorageAsFile = (storageExport: any) => {
    const jsonData = JSON.stringify(storageExport, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const indexedDBCount = Object.values(storageExport.indexedDB || {}).reduce((total: number, db: any) => {
      return total + Object.values(db.objectStores).reduce((storeTotal: number, store: any) => storeTotal + store.data.length, 0);
    }, 0);
    const totalItems = storageExport.cookies.length + Object.keys(storageExport.localStorage || {}).length + Object.keys(storageExport.sessionStorage || {}).length + indexedDBCount;
    const filename = `storage_${storageExport.domain}_${totalItems}items_${new Date().toISOString().split('T')[0]}.json`;
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const openSettings = () => {
    chrome.runtime.openOptionsPage();
  };

  return (
    <div className="container">
      <header className="header">
        <h1>🛠️ Dev Support</h1>
        <p className="subtitle">Admin Panel</p>
      </header>
      
      <main className="main-content">
        <div className="admin-section">
          {/* Screen Capture Section */}
          <div className="action-section">
            <h2>Quick Actions</h2>
            <div className="action-buttons">
              <button 
                className="btn action-btn action-btn--primary"
                onClick={() => handleScreenCapture(true)}
                disabled={!!captureStatus}
              >
                <span>📸 Capture Full Page</span>
              </button>
              <button 
                className="btn action-btn action-btn--secondary"
                onClick={() => handleScreenCapture(false)}
                disabled={!!captureStatus}
              >
                <span>📷 Capture Visible Area</span>
              </button>
            </div>
            {captureStatus && (
              <div className={`capture-status capture-status--${captureStatus.type}`}>
                <span className="capture-status-text">{captureStatus.message}</span>
              </div>
            )}
          </div>
          
          {/* Storage Management Section */}
          <div className="storage-section">
            <h2>💾 Storage Management</h2>
            
            <div className="storage-actions">
              <button 
                className="btn storage-btn storage-btn--primary"
                onClick={() => handleStorageAction('export')}
              >
                <span>📤 Export All Storage</span>
              </button>
              <button 
                className="btn storage-btn storage-btn--danger"
                onClick={() => handleStorageAction('clear')}
              >
                <span>🧹 Clear All Storage</span>
              </button>
            </div>
            
            <div className="storage-info">
              <div className="storage-counts">
                <span className="storage-count">
                  {storageData ? `${storageData.total} items for ${storageData.domain}` : 'Loading storage info...'}
                </span>
              </div>
              <div className="storage-details">
                <small className="storage-details-text">
                  {storageData ? (() => {
                    const parts = [];
                    if (storageData.cookies > 0) parts.push(`${storageData.cookies} cookies`);
                    if (storageData.localStorage > 0) parts.push(`${storageData.localStorage} localStorage`);
                    if (storageData.sessionStorage > 0) parts.push(`${storageData.sessionStorage} sessionStorage`);
                    if (storageData.indexedDB > 0) parts.push(`${storageData.indexedDB} IndexedDB`);
                    return parts.length === 0 ? 'No storage data found' : parts.join(' • ');
                  })() : 'Cookies • localStorage • sessionStorage'}
                </small>
              </div>
            </div>
          </div>

          {/* Quick History Actions */}
          <div className="quick-section">
            <h2>🗑️ Quick History Actions</h2>
            
            <div className="quick-actions">
              <button 
                className="btn quick-btn quick-btn--danger"
                onClick={() => handleDeleteHistory(0, 'ALL HISTORY')}
              >
                <span>🗑️ Delete ALL History</span>
              </button>
              <button 
                className="btn quick-btn quick-btn--warning"
                onClick={() => handleDeleteHistory(30, '30+ day old history')}
              >
                <span>🕐 Delete 30+ Days Old</span>
              </button>
              <button 
                className="btn quick-btn quick-btn--warning"
                onClick={() => handleDeleteHistory(7, '7+ day old history')}
              >
                <span>📅 Delete 7+ Days Old</span>
              </button>
            </div>
            
            <div className="quick-info">
              <div className="info-icon">⚙️</div>
              <div className="info-text">
                <strong>Need more control?</strong> Go to Extension Settings for advanced configuration, 
                scheduling, and exclusion patterns.
              </div>
            </div>
            
            <div className="quick-actions">
              <button 
                className="btn quick-btn quick-btn--secondary"
                onClick={openSettings}
              >
                <span>⚙️ Open Settings</span>
              </button>
            </div>
          </div>
        </div>
        
        <div className="status-section">
          <h2>Status</h2>
          <div className="status-item">
            <span className="status-label">Active Features:</span>
            <span className="status-value">{status.activeCount}</span>
          </div>
          <div className="status-item">
            <span className="status-label">Current URL:</span>
            <span className="status-value">{status.currentUrl}</span>
          </div>
        </div>
      </main>
      
      <footer className="footer">
        <p>v2.0.0 | Feature Manager</p>
      </footer>
    </div>
  );
};

export default PopupApp;