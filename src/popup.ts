// Popup script for Dev Support Extension - TypeScript version

/// <reference path="types/global.d.ts" />


interface StatusElements {
  currentUrl: HTMLElement | null;
  activeCount: HTMLElement | null;
}

interface QuickActionElements {
  deleteAll: HTMLButtonElement | null;
  delete30Days: HTMLButtonElement | null;
  delete7Days: HTMLButtonElement | null;
  openSettings: HTMLButtonElement | null;
}

interface StorageActionElements {
  exportStorage: HTMLButtonElement | null;
  importStorage: HTMLButtonElement | null;
  clearStorage: HTMLButtonElement | null;
  storageFileInput: HTMLInputElement | null;
  storageCount: HTMLElement | null;
  storageDetails: HTMLElement | null;
}

class PopupController {
  private statusElements: StatusElements;
  private quickActionElements: QuickActionElements;
  private storageActionElements: StorageActionElements;
  private currentTab: chrome.tabs.Tab | null = null;

  constructor() {
    
    this.statusElements = {
      currentUrl: null,
      activeCount: null
    };
    
    this.quickActionElements = {
      deleteAll: null,
      delete30Days: null,
      delete7Days: null,
      openSettings: null
    };

    this.storageActionElements = {
      exportStorage: null,
      importStorage: null,
      clearStorage: null,
      storageFileInput: null,
      storageCount: null,
      storageDetails: null
    };
    
    this.init();
  }

  private async init(): Promise<void> {
    await this.initializeElements();
    await this.loadCurrentTab();
    this.setupScreenCaptureListeners();
    this.setupQuickActionListeners();
    this.setupStorageActionListeners();
    await this.updateActiveCount();
    await this.updateStorageCount();
  }

  private async initializeElements(): Promise<void> {
    // Get status elements
    this.statusElements.currentUrl = document.getElementById('currentUrl');
    this.statusElements.activeCount = document.getElementById('activeCount');
    
    // Get quick action elements
    this.quickActionElements.deleteAll = document.getElementById('deleteAll') as HTMLButtonElement;
    this.quickActionElements.delete30Days = document.getElementById('delete30Days') as HTMLButtonElement;
    this.quickActionElements.delete7Days = document.getElementById('delete7Days') as HTMLButtonElement;
    this.quickActionElements.openSettings = document.getElementById('openSettings') as HTMLButtonElement;

    // Get storage action elements
    this.storageActionElements.exportStorage = document.getElementById('exportStorage') as HTMLButtonElement;
    this.storageActionElements.importStorage = document.getElementById('importStorage') as HTMLButtonElement;
    this.storageActionElements.clearStorage = document.getElementById('clearStorage') as HTMLButtonElement;
    this.storageActionElements.storageFileInput = document.getElementById('storageFileInput') as HTMLInputElement;
    this.storageActionElements.storageCount = document.getElementById('storageCount');
    this.storageActionElements.storageDetails = document.getElementById('storageDetails');
  }

  private async loadCurrentTab(): Promise<void> {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) {
        console.warn('No active tab found, trying alternative query');
        // Fallback: try to get any tab in current window
        const tabs = await chrome.tabs.query({ currentWindow: true });
        this.currentTab = tabs[0] || null;
      } else {
        this.currentTab = tab;
      }
      
      console.log('Current tab loaded:', this.currentTab);
      
      if (this.statusElements.currentUrl) {
        this.statusElements.currentUrl.textContent = this.currentTab?.url || 'Unknown';
      }
    } catch (error) {
      console.error('Error loading current tab:', error);
      this.currentTab = null;
      if (this.statusElements.currentUrl) {
        this.statusElements.currentUrl.textContent = 'Error loading URL';
      }
    }
  }


  private async updateActiveCount(): Promise<void> {
    try {
      const result = await chrome.storage.sync.get(['freediumFeature', 'jsonViewer', 'historyDeletion']);
      
      let count = 0;
      if (result.freediumFeature !== false) count++; // Default to true
      if (result.jsonViewer !== false) count++;     // Default to true
      if (result.historyDeletion?.enabled) count++;
      
      if (this.statusElements.activeCount) {
        this.statusElements.activeCount.textContent = count.toString();
      }
    } catch (error) {
      console.error('Error updating active count:', error);
      if (this.statusElements.activeCount) {
        this.statusElements.activeCount.textContent = '?';
      }
    }
  }

  private setupScreenCaptureListeners(): void {
    const captureFullPageBtn = document.getElementById('captureFullPage') as HTMLButtonElement;
    const captureVisibleBtn = document.getElementById('captureVisible') as HTMLButtonElement;
    
    if (captureFullPageBtn) {
      captureFullPageBtn.addEventListener('click', () => {
        this.handleScreenCapture(true);
      });
    }
    
    if (captureVisibleBtn) {
      captureVisibleBtn.addEventListener('click', () => {
        this.handleScreenCapture(false);
      });
    }
  }

  private async handleScreenCapture(fullPage: boolean): Promise<void> {
    try {
      // Reload current tab info to ensure we have the latest
      await this.loadCurrentTab();
      
      if (!this.currentTab?.id) {
        this.showCaptureStatus('No active tab found - please refresh the extension', 'error');
        return;
      }

      // Show capturing status
      this.showCaptureStatus('Capturing screenshot...', 'loading');
      
      // Disable buttons during capture
      this.toggleCaptureButtons(false);

      // Send capture request to background script
      const response = await chrome.runtime.sendMessage({
        action: 'captureScreen',
        options: {
          fullPage,
          format: 'png',
          quality: 90, // Integer value (0-100)
          filename: this.generateFilename(fullPage)
        }
      });

      if (response.success) {
        if (response.dataUrl) {
          // If we have a data URL but download might have failed, provide manual download option
          this.showCaptureStatus('Screenshot captured and downloaded!', 'success');
          
          // Auto-hide success message after 4 seconds
          setTimeout(() => {
            this.hideCaptureStatus();
          }, 4000);
        } else {
          this.showCaptureStatus('Screenshot captured successfully!', 'success');
          setTimeout(() => {
            this.hideCaptureStatus();
          }, 3000);
        }
      } else {
        this.showCaptureStatus(response.error || 'Capture failed', 'error');
      }

    } catch (error) {
      console.error('Screen capture error:', error);
      this.showCaptureStatus('Failed to capture screenshot', 'error');
    } finally {
      // Re-enable buttons
      this.toggleCaptureButtons(true);
    }
  }

  private generateFilename(fullPage: boolean): string {
    const now = new Date();
    const timestamp = now.toISOString()
      .replace(/:/g, '-')
      .replace(/\./g, '-')
      .substring(0, 19);
    
    const domain = this.currentTab?.url 
      ? new URL(this.currentTab.url).hostname.replace(/[^a-zA-Z0-9]/g, '-')
      : 'unknown';
    
    const type = fullPage ? 'fullpage' : 'visible';
    return `screenshot-${type}-${domain}-${timestamp}.png`;
  }

  private showCaptureStatus(message: string, type: 'loading' | 'success' | 'error'): void {
    const statusElement = document.getElementById('captureStatus') as HTMLElement;
    const statusText = statusElement?.querySelector('.capture-status-text') as HTMLElement;
    
    if (statusElement && statusText) {
      statusText.textContent = message;
      statusElement.className = `capture-status capture-status--${type}`;
      statusElement.style.display = 'block';
    }
  }

  private hideCaptureStatus(): void {
    const statusElement = document.getElementById('captureStatus') as HTMLElement;
    if (statusElement) {
      statusElement.style.display = 'none';
    }
  }

  private toggleCaptureButtons(enabled: boolean): void {
    const captureFullPageBtn = document.getElementById('captureFullPage') as HTMLButtonElement;
    const captureVisibleBtn = document.getElementById('captureVisible') as HTMLButtonElement;
    
    if (captureFullPageBtn) {
      captureFullPageBtn.disabled = !enabled;
    }
    if (captureVisibleBtn) {
      captureVisibleBtn.disabled = !enabled;
    }
  }

  private setupQuickActionListeners(): void {
    // Delete all history button
    if (this.quickActionElements.deleteAll) {
      this.quickActionElements.deleteAll.addEventListener('click', () => {
        this.handleDeleteAll();
      });
    }
    
    // Delete 30+ days old button
    if (this.quickActionElements.delete30Days) {
      this.quickActionElements.delete30Days.addEventListener('click', () => {
        this.handleDelete30Days();
      });
    }
    
    // Delete 7+ days old button
    if (this.quickActionElements.delete7Days) {
      this.quickActionElements.delete7Days.addEventListener('click', () => {
        this.handleDelete7Days();
      });
    }
    
    // Open settings button
    if (this.quickActionElements.openSettings) {
      this.quickActionElements.openSettings.addEventListener('click', () => {
        this.handleOpenSettings();
      });
    }
  }

  private async handleDeleteAll(): Promise<void> {
    if (!confirm('⚠️ Are you sure you want to delete ALL browser history? This action cannot be undone.')) {
      return;
    }
    
    await this.performQuickDeletion(0, 'ALL HISTORY');
  }

  private async handleDelete30Days(): Promise<void> {
    if (!confirm('Delete all browser history older than 30 days?')) {
      return;
    }
    
    await this.performQuickDeletion(30, '30+ day old history');
  }

  private async handleDelete7Days(): Promise<void> {
    if (!confirm('Delete all browser history older than 7 days?')) {
      return;
    }
    
    await this.performQuickDeletion(7, '7+ day old history');
  }

  private async performQuickDeletion(retentionDays: number, description: string): Promise<void> {
    try {
      // Disable all quick action buttons during deletion
      this.toggleQuickActionButtons(false);
      
      this.showQuickActionFeedback(`Deleting ${description}...`, 'loading');
      
      const config: HistoryDeletionConfig = {
        enabled: true,
        retentionDays,
        interval: 'daily',
        deleteOnStartup: false,
        excludePatterns: []
      };
      
      console.log('🗑️ [POPUP-QUICK] Starting deletion:', { retentionDays, description });
      
      const response = await chrome.runtime.sendMessage({
        action: 'deleteHistoryNow',
        historyConfig: config
      });
      
      if (response.success) {
        const { deletedCount, skippedCount, method, syncCleared, deleteAll } = response.data || {
          deletedCount: 0,
          skippedCount: 0,
          method: 'unknown',
          syncCleared: false,
          deleteAll: false
        };
        
        let message: string;
        if (deleteAll && retentionDays === 0) {
          message = `🗑️ ALL HISTORY DELETED! Cleared ${deletedCount} items`;
        } else {
          message = `✅ ${description} deleted! ${deletedCount} items removed`;
        }
        
        if (syncCleared) {
          message += ' (synced data cleared)';
        }
        
        this.showQuickActionFeedback(message, 'success');
        await this.updateActiveCount();
      } else {
        this.showQuickActionFeedback(response.error || `Failed to delete ${description}`, 'error');
      }
    } catch (error) {
      console.error('Quick deletion error:', error);
      this.showQuickActionFeedback(`Failed to delete ${description}`, 'error');
    } finally {
      // Re-enable buttons
      this.toggleQuickActionButtons(true);
    }
  }

  private handleOpenSettings(): void {
    // Open the options page
    chrome.runtime.openOptionsPage();
  }

  private toggleQuickActionButtons(enabled: boolean): void {
    const buttons = [
      this.quickActionElements.deleteAll,
      this.quickActionElements.delete30Days,
      this.quickActionElements.delete7Days,
      this.quickActionElements.openSettings
    ];
    
    buttons.forEach(button => {
      if (button) {
        button.disabled = !enabled;
      }
    });
  }

  private showQuickActionFeedback(message: string, type: 'success' | 'error' | 'loading'): void {
    // Create or update feedback element
    let feedbackElement = document.getElementById('quickActionFeedback');
    
    if (!feedbackElement) {
      feedbackElement = document.createElement('div');
      feedbackElement.id = 'quickActionFeedback';
      feedbackElement.className = 'config-feedback';
      
      const quickSection = document.querySelector('.quick-section');
      if (quickSection) {
        quickSection.appendChild(feedbackElement);
      }
    }
    
    feedbackElement.textContent = message;
    feedbackElement.className = `config-feedback config-feedback--${type}`;
    feedbackElement.style.display = 'block';
    
    // Auto-hide after 4 seconds for success/error messages
    if (type !== 'loading') {
      setTimeout(() => {
        if (feedbackElement) {
          feedbackElement.style.display = 'none';
        }
      }, 4000);
    }
  }

  private setupStorageActionListeners(): void {
    // Export storage button
    if (this.storageActionElements.exportStorage) {
      this.storageActionElements.exportStorage.addEventListener('click', () => {
        this.handleExportStorage();
      });
    }

    // Import storage button
    if (this.storageActionElements.importStorage) {
      this.storageActionElements.importStorage.addEventListener('click', () => {
        this.handleImportStorage();
      });
    }

    // Clear storage button
    if (this.storageActionElements.clearStorage) {
      this.storageActionElements.clearStorage.addEventListener('click', () => {
        this.handleClearStorage();
      });
    }

    // File input change listener
    if (this.storageActionElements.storageFileInput) {
      this.storageActionElements.storageFileInput.addEventListener('change', (e) => {
        this.handleFileSelected(e);
      });
    }
  }

  private async updateStorageCount(): Promise<void> {
    try {
      if (!this.currentTab?.url || !this.storageActionElements.storageCount) {
        return;
      }

      const response = await chrome.runtime.sendMessage({
        action: 'getStorageCount',
        url: this.currentTab.url,
        tabId: this.currentTab.id
      });

      console.log('💾 [POPUP] Storage count response:', response);

      if (response.success) {
        const { domain, cookies, localStorage, sessionStorage, indexedDB, total } = response.data;
        this.storageActionElements.storageCount.textContent = `${total} items for ${domain}`;
        
        if (this.storageActionElements.storageDetails) {
          const parts = [];
          if (cookies > 0) parts.push(`${cookies} cookies`);
          if (localStorage > 0) parts.push(`${localStorage} localStorage`);
          if (sessionStorage > 0) parts.push(`${sessionStorage} sessionStorage`);
          if (indexedDB > 0) parts.push(`${indexedDB} IndexedDB`);
          
          if (parts.length === 0) {
            this.storageActionElements.storageDetails.textContent = 'No storage data found';
          } else {
            this.storageActionElements.storageDetails.textContent = parts.join(' • ');
          }
        }
      } else {
        this.storageActionElements.storageCount.textContent = 'Unable to load storage count';
        if (this.storageActionElements.storageDetails) {
          this.storageActionElements.storageDetails.textContent = 'Error loading storage details';
        }
      }
    } catch (error) {
      console.error('Error updating storage count:', error);
      if (this.storageActionElements.storageCount) {
        this.storageActionElements.storageCount.textContent = 'Error loading storage';
      }
    }
  }

  private async handleExportStorage(): Promise<void> {
    try {
      console.log('💾 [POPUP] Starting storage export...');
      console.log('💾 [POPUP] Current tab:', this.currentTab);
      
      if (!this.currentTab?.url) {
        console.error('💾 [POPUP] No active tab found');
        this.showStorageFeedback('No active tab found', 'error');
        return;
      }

      console.log('💾 [POPUP] Exporting storage for URL:', this.currentTab.url);
      this.showStorageFeedback('Exporting storage data...', 'loading');
      this.toggleStorageButtons(false);

      const message = {
        action: 'exportStorage',
        url: this.currentTab.url,
        tabId: this.currentTab.id
      };
      console.log('💾 [POPUP] Sending message to background:', message);

      const response = await chrome.runtime.sendMessage(message);
      console.log('💾 [POPUP] Received response from background:', response);

      if (response && response.success) {
        const storageExport = response.data;
        console.log('💾 [POPUP] Storage export data received:', storageExport);
        this.downloadStorageAsFile(storageExport);
        const indexedDBCount = Object.values(storageExport.indexedDB || {}).reduce((total: number, db: any) => {
          return total + Object.values(db.objectStores).reduce((storeTotal: number, store: any) => storeTotal + store.data.length, 0);
        }, 0);
        const totalItems = storageExport.cookies.length + Object.keys(storageExport.localStorage || {}).length + Object.keys(storageExport.sessionStorage || {}).length + indexedDBCount;
        this.showStorageFeedback(`Exported ${totalItems} storage items for ${storageExport.domain}`, 'success');
        await this.updateStorageCount();
      } else {
        const errorMsg = response?.error || 'Failed to export storage';
        console.error('💾 [POPUP] Export failed:', errorMsg);
        this.showStorageFeedback(errorMsg, 'error');
      }
    } catch (error) {
      console.error('💾 [POPUP] Storage export error:', error);
      this.showStorageFeedback('Failed to export storage: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
    } finally {
      this.toggleStorageButtons(true);
    }
  }

  private handleImportStorage(): void {
    if (this.storageActionElements.storageFileInput) {
      this.storageActionElements.storageFileInput.click();
    }
  }

  private async handleFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    try {
      this.showStorageFeedback('Importing storage data...', 'loading');
      this.toggleStorageButtons(false);

      const storageExport = await this.parseUploadedFile(file);

      const response = await chrome.runtime.sendMessage({
        action: 'importStorage',
        storageData: storageExport,
        tabId: this.currentTab?.id
      });

      if (response.success) {
        const { domain, cookieCount, localStorageCount, sessionStorageCount } = response.data;
        const totalItems = cookieCount + localStorageCount + sessionStorageCount;
        this.showStorageFeedback(`Imported ${totalItems} storage items for ${domain}`, 'success');
        await this.updateStorageCount();
      } else {
        this.showStorageFeedback(response.error || 'Failed to import storage', 'error');
      }
    } catch (error) {
      console.error('Storage import error:', error);
      this.showStorageFeedback('Failed to import storage: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
    } finally {
      this.toggleStorageButtons(true);
      // Clear the file input
      input.value = '';
    }
  }

  private async handleClearStorage(): Promise<void> {
    try {
      if (!this.currentTab?.url) {
        this.showStorageFeedback('No active tab found', 'error');
        return;
      }

      const urlObj = new URL(this.currentTab.url);
      if (!confirm(`Clear all storage data (cookies, localStorage, sessionStorage, IndexedDB) for ${urlObj.hostname}?`)) {
        return;
      }

      this.showStorageFeedback('Clearing storage data...', 'loading');
      this.toggleStorageButtons(false);

      const response = await chrome.runtime.sendMessage({
        action: 'clearStorage',
        url: this.currentTab.url,
        tabId: this.currentTab.id
      });

      if (response.success) {
        const { domain, cookies, localStorage, sessionStorage, indexedDB } = response.data;
        const totalCleared = cookies + localStorage + sessionStorage + (indexedDB || 0);
        this.showStorageFeedback(`Cleared ${totalCleared} storage items for ${domain}`, 'success');
        await this.updateStorageCount();
      } else {
        this.showStorageFeedback(response.error || 'Failed to clear storage', 'error');
      }
    } catch (error) {
      console.error('Storage clear error:', error);
      this.showStorageFeedback('Failed to clear storage', 'error');
    } finally {
      this.toggleStorageButtons(true);
    }
  }

  private downloadStorageAsFile(storageExport: StorageExport): void {
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
  }

  private async parseUploadedFile(file: File): Promise<StorageExport> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content) as any;
          
          // Check if it's the old cookie format and convert it
          if (data.cookies && !data.localStorage && !data.sessionStorage && !data.indexedDB) {
            console.log('📥 Converting legacy cookie file format...');
            const convertedData: StorageExport = {
              domain: data.domain || new URL(data.url).hostname,
              url: data.url,
              timestamp: data.timestamp || Date.now(),
              cookies: data.cookies || [],
              localStorage: {},
              sessionStorage: {},
              indexedDB: {}
            };
            resolve(convertedData);
            return;
          }
          
          // Validate the new storage format
          if (!data.domain || !Array.isArray(data.cookies)) {
            throw new Error('Invalid storage file format - missing domain or cookies array');
          }
          
          // Ensure localStorage, sessionStorage, and indexedDB exist
          const validatedData: StorageExport = {
            domain: data.domain,
            url: data.url,
            timestamp: data.timestamp || Date.now(),
            cookies: data.cookies || [],
            localStorage: data.localStorage || {},
            sessionStorage: data.sessionStorage || {},
            indexedDB: data.indexedDB || {}
          };
          
          resolve(validatedData);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  private toggleStorageButtons(enabled: boolean): void {
    const buttons = [
      this.storageActionElements.exportStorage,
      this.storageActionElements.importStorage,
      this.storageActionElements.clearStorage
    ];
    
    buttons.forEach(button => {
      if (button) {
        button.disabled = !enabled;
      }
    });
  }

  private showStorageFeedback(message: string, type: 'success' | 'error' | 'loading'): void {
    // Create or update feedback element
    let feedbackElement = document.getElementById('storageFeedback');
    
    if (!feedbackElement) {
      feedbackElement = document.createElement('div');
      feedbackElement.id = 'storageFeedback';
      feedbackElement.className = 'config-feedback';
      
      const storageSection = document.querySelector('.storage-section');
      if (storageSection) {
        storageSection.appendChild(feedbackElement);
      }
    }
    
    feedbackElement.textContent = message;
    feedbackElement.className = `config-feedback config-feedback--${type}`;
    feedbackElement.style.display = 'block';
    
    // Auto-hide after 4 seconds for success/error messages
    if (type !== 'loading') {
      setTimeout(() => {
        if (feedbackElement) {
          feedbackElement.style.display = 'none';
        }
      }, 4000);
    }
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});

// Initialize default settings on extension install
chrome.runtime.onInstalled?.addListener(() => {
  chrome.storage.sync.set({
    freediumFeature: true, // Enable by default
    jsonViewer: true       // Enable by default
  });
});