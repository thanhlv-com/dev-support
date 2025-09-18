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

class PopupController {
  private statusElements: StatusElements;
  private quickActionElements: QuickActionElements;
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
    
    this.init();
  }

  private async init(): Promise<void> {
    await this.initializeElements();
    await this.loadCurrentTab();
    this.setupScreenCaptureListeners();
    this.setupQuickActionListeners();
    await this.updateActiveCount();
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
      const result = await chrome.storage.sync.get(['mediumFreedium', 'jsonViewer', 'historyDeletion']);
      
      let count = 0;
      if (result.mediumFreedium !== false) count++; // Default to true
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
          fullPage: fullPage,
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
        retentionDays: retentionDays,
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
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});

// Initialize default settings on extension install
chrome.runtime.onInstalled?.addListener(() => {
  chrome.storage.sync.set({
    mediumFreedium: true, // Enable by default
    jsonViewer: true      // Enable by default
  });
});