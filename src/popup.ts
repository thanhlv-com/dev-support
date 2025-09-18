// Popup script for Dev Support Extension - TypeScript version

/// <reference path="types/global.d.ts" />

interface FeatureToggleElements {
  mediumFreedium: HTMLInputElement | null;
  jsonViewer: HTMLInputElement | null;
  historyDeletion: HTMLInputElement | null;
}

interface StatusElements {
  currentUrl: HTMLElement | null;
  activeCount: HTMLElement | null;
}

interface HistoryConfigElements {
  historyConfig: HTMLElement | null;
  retentionDays: HTMLInputElement | null;
  deletionInterval: HTMLSelectElement | null;
  deleteOnStartup: HTMLInputElement | null;
  excludePatterns: HTMLTextAreaElement | null;
  saveHistoryConfig: HTMLButtonElement | null;
  deleteNow: HTMLButtonElement | null;
  totalHistoryItems: HTMLElement | null;
  recentHistoryItems: HTMLElement | null;
}

class PopupController {
  private featureToggles: FeatureToggleElements;
  private statusElements: StatusElements;
  private historyConfigElements: HistoryConfigElements;
  private currentTab: chrome.tabs.Tab | null = null;

  constructor() {
    this.featureToggles = {
      mediumFreedium: null,
      jsonViewer: null,
      historyDeletion: null
    };
    
    this.statusElements = {
      currentUrl: null,
      activeCount: null
    };
    
    this.historyConfigElements = {
      historyConfig: null,
      retentionDays: null,
      deletionInterval: null,
      deleteOnStartup: null,
      excludePatterns: null,
      saveHistoryConfig: null,
      deleteNow: null,
      totalHistoryItems: null,
      recentHistoryItems: null
    };
    
    this.init();
  }

  private async init(): Promise<void> {
    await this.initializeElements();
    await this.loadCurrentTab();
    await this.loadFeatureStates();
    this.setupEventListeners();
    this.setupScreenCaptureListeners();
    this.setupHistoryConfigListeners();
    await this.updateActiveCount();
    await this.loadHistoryStats();
  }

  private async initializeElements(): Promise<void> {
    // Get feature toggle elements
    this.featureToggles.mediumFreedium = document.getElementById('mediumFreedium') as HTMLInputElement;
    this.featureToggles.jsonViewer = document.getElementById('jsonViewer') as HTMLInputElement;
    this.featureToggles.historyDeletion = document.getElementById('historyDeletion') as HTMLInputElement;
    
    // Get status elements
    this.statusElements.currentUrl = document.getElementById('currentUrl');
    this.statusElements.activeCount = document.getElementById('activeCount');
    
    // Get history config elements
    this.historyConfigElements.historyConfig = document.getElementById('historyConfig');
    this.historyConfigElements.retentionDays = document.getElementById('retentionDays') as HTMLInputElement;
    this.historyConfigElements.deletionInterval = document.getElementById('deletionInterval') as HTMLSelectElement;
    this.historyConfigElements.deleteOnStartup = document.getElementById('deleteOnStartup') as HTMLInputElement;
    this.historyConfigElements.excludePatterns = document.getElementById('excludePatterns') as HTMLTextAreaElement;
    this.historyConfigElements.saveHistoryConfig = document.getElementById('saveHistoryConfig') as HTMLButtonElement;
    this.historyConfigElements.deleteNow = document.getElementById('deleteNow') as HTMLButtonElement;
    this.historyConfigElements.totalHistoryItems = document.getElementById('totalHistoryItems');
    this.historyConfigElements.recentHistoryItems = document.getElementById('recentHistoryItems');
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

  private async loadFeatureStates(): Promise<void> {
    try {
      const result = await chrome.storage.sync.get(['mediumFreedium', 'jsonViewer', 'historyDeletion']);
      
      // Set toggle states based on saved preferences
      if (this.featureToggles.mediumFreedium) {
        this.featureToggles.mediumFreedium.checked = result.mediumFreedium !== false; // Default to true
      }
      if (this.featureToggles.jsonViewer) {
        this.featureToggles.jsonViewer.checked = result.jsonViewer !== false; // Default to true
      }
      if (this.featureToggles.historyDeletion) {
        const historyConfig: HistoryDeletionConfig = result.historyDeletion || {
          enabled: false,
          interval: 'weekly',
          retentionDays: 30,
          deleteOnStartup: false,
          excludePatterns: []
        };
        
        this.featureToggles.historyDeletion.checked = historyConfig.enabled;
        this.loadHistoryConfig(historyConfig);
        this.toggleHistoryConfig(historyConfig.enabled);
      }
    } catch (error) {
      console.error('Error loading feature states:', error);
    }
  }

  private setupEventListeners(): void {
    // Medium Freedium toggle
    if (this.featureToggles.mediumFreedium) {
      this.featureToggles.mediumFreedium.addEventListener('change', (e) => {
        this.handleFeatureToggle('mediumFreedium', e);
      });
    }
    
    // JSON Viewer toggle
    if (this.featureToggles.jsonViewer) {
      this.featureToggles.jsonViewer.addEventListener('change', (e) => {
        this.handleFeatureToggle('jsonViewer', e);
      });
    }
    
    // History Deletion toggle
    if (this.featureToggles.historyDeletion) {
      this.featureToggles.historyDeletion.addEventListener('change', (e) => {
        this.handleHistoryDeletionToggle(e);
      });
    }
  }

  private async handleFeatureToggle(feature: keyof FeatureSettings, event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    const enabled = target.checked;
    
    try {
      // Save state
      await chrome.storage.sync.set({ [feature]: enabled });
      
      // Send message to content script
      if (this.currentTab?.id) {
        try {
          await chrome.tabs.sendMessage(this.currentTab.id, {
            action: 'toggleFeature',
            feature,
            enabled
          });
        } catch (error) {
          // Ignore if content script not ready
          console.log('Content script not ready, settings saved');
        }
      }
      
      // Show visual feedback
      this.showFeatureFeedback(feature, enabled);
      
      // Update counter
      await this.updateActiveCount();
      
      console.log(`${String(feature)} feature:`, enabled ? 'enabled' : 'disabled');
    } catch (error) {
      console.error(`Error toggling ${String(feature)} feature:`, error);
      // Revert toggle state on error
      target.checked = !enabled;
    }
  }

  private showFeatureFeedback(featureId: keyof FeatureSettings, enabled: boolean): void {
    const toggleElement = document.querySelector(`#${String(featureId)}`)?.closest('.feature-toggle') as HTMLElement;
    
    if (!toggleElement) return;
    
    // Remove existing classes
    toggleElement.classList.remove('success', 'error');
    
    // Add success class
    toggleElement.classList.add('success');
    
    // Remove after animation
    setTimeout(() => {
      toggleElement.classList.remove('success');
    }, 2000);
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

  private setupHistoryConfigListeners(): void {
    // Save history config button
    if (this.historyConfigElements.saveHistoryConfig) {
      this.historyConfigElements.saveHistoryConfig.addEventListener('click', () => {
        this.handleSaveHistoryConfig();
      });
    }
    
    // Delete now button
    if (this.historyConfigElements.deleteNow) {
      this.historyConfigElements.deleteNow.addEventListener('click', () => {
        this.handleDeleteNow();
      });
    }
  }

  private async handleHistoryDeletionToggle(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    const enabled = target.checked;
    
    this.toggleHistoryConfig(enabled);
    
    if (enabled) {
      // Save the enabled state immediately
      const currentConfig = this.getCurrentHistoryConfig();
      currentConfig.enabled = true;
      await this.saveHistoryConfig(currentConfig);
    } else {
      // Disable history deletion
      const currentConfig = this.getCurrentHistoryConfig();
      currentConfig.enabled = false;
      await this.saveHistoryConfig(currentConfig);
    }
    
    await this.updateActiveCount();
  }

  private toggleHistoryConfig(show: boolean): void {
    if (this.historyConfigElements.historyConfig) {
      this.historyConfigElements.historyConfig.style.display = show ? 'block' : 'none';
    }
  }

  private loadHistoryConfig(config: HistoryDeletionConfig): void {
    if (this.historyConfigElements.retentionDays) {
      this.historyConfigElements.retentionDays.value = config.retentionDays.toString();
    }
    if (this.historyConfigElements.deletionInterval) {
      this.historyConfigElements.deletionInterval.value = config.interval;
    }
    if (this.historyConfigElements.deleteOnStartup) {
      this.historyConfigElements.deleteOnStartup.checked = config.deleteOnStartup;
    }
    if (this.historyConfigElements.excludePatterns) {
      this.historyConfigElements.excludePatterns.value = config.excludePatterns.join('\n');
    }
  }

  private getCurrentHistoryConfig(): HistoryDeletionConfig {
    return {
      enabled: this.featureToggles.historyDeletion?.checked || false,
      retentionDays: parseInt(this.historyConfigElements.retentionDays?.value || '30'),
      interval: (this.historyConfigElements.deletionInterval?.value as 'daily' | 'weekly' | 'monthly') || 'weekly',
      deleteOnStartup: this.historyConfigElements.deleteOnStartup?.checked || false,
      excludePatterns: this.historyConfigElements.excludePatterns?.value.split('\n').filter(p => p.trim()) || []
    };
  }

  private async handleSaveHistoryConfig(): Promise<void> {
    try {
      const config = this.getCurrentHistoryConfig();
      await this.saveHistoryConfig(config);
      
      // Show success feedback
      this.showConfigFeedback('Settings saved successfully!', 'success');
      await this.updateActiveCount();
    } catch (error) {
      console.error('Error saving history config:', error);
      this.showConfigFeedback('Failed to save settings', 'error');
    }
  }

  private async saveHistoryConfig(config: HistoryDeletionConfig): Promise<void> {
    // Send to background script to handle alarms
    const response = await chrome.runtime.sendMessage({
      action: 'deleteHistory',
      historyConfig: config
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to save configuration');
    }
  }

  private async handleDeleteNow(): Promise<void> {
    try {
      const config = this.getCurrentHistoryConfig();
      console.log('🗑️ [POPUP] Starting history deletion with config:', config);
      
      if (config.retentionDays < 0) {
        console.log('❌ [POPUP] Invalid retention days:', config.retentionDays);
        this.showConfigFeedback('Please set a valid retention period (0 or higher)', 'error');
        return;
      }
      
      // Disable button during deletion
      if (this.historyConfigElements.deleteNow) {
        this.historyConfigElements.deleteNow.disabled = true;
        this.historyConfigElements.deleteNow.textContent = 'Deleting...';
      }
      
      this.showConfigFeedback('Deleting old history...', 'loading');
      
      console.log('📨 [POPUP] Sending message to background script...');
      
      // Send delete request
      const response = await chrome.runtime.sendMessage({
        action: 'deleteHistoryNow',
        historyConfig: config
      });
      
      console.log('📨 [POPUP] Received response from background:', response);
      
      if (response.success) {
        const { deletedCount, skippedCount, method, syncCleared, totalFound, deleteAll } = response.data || { 
          deletedCount: 0, 
          skippedCount: 0, 
          method: 'unknown',
          syncCleared: false,
          totalFound: 0,
          deleteAll: false
        };
        
        console.log('✅ [POPUP] Deletion successful:', { deletedCount, skippedCount, method, totalFound, deleteAll });
        
        let message: string;
        
        if (deleteAll) {
          if (method === 'deleteAll') {
            message = `🗑️ ALL HISTORY DELETED! Cleared ${deletedCount} total items using efficient deleteAll()`;
          } else {
            message = `🗑️ ALL HISTORY DELETED! ${deletedCount} items removed`;
            if (skippedCount > 0) {
              message += `, ${skippedCount} skipped due to exclusions`;
            }
          }
        } else {
          message = `History deleted! ${deletedCount} items removed`;
          if (skippedCount > 0) {
            message += `, ${skippedCount} skipped`;
          }
        }
        
        if (totalFound && totalFound > deletedCount + skippedCount) {
          message += ` (${totalFound} total found, limited to 100 for testing)`;
        }
        if (syncCleared) {
          message += ` (synced data cleared)`;
        }
        if (method === 'bulk') {
          message += ` - used efficient bulk deletion`;
        }
        message += '.';
        
        this.showConfigFeedback(message, 'success');
        await this.loadHistoryStats(); // Refresh stats
      } else {
        console.error('❌ [POPUP] Deletion failed:', response.error);
        this.showConfigFeedback(response.error || 'Failed to delete history', 'error');
      }
    } catch (error) {
      console.error('❌ [POPUP] Error deleting history:', error);
      this.showConfigFeedback(`Failed to delete history: ${error.message}`, 'error');
    } finally {
      // Re-enable button
      if (this.historyConfigElements.deleteNow) {
        this.historyConfigElements.deleteNow.disabled = false;
        this.historyConfigElements.deleteNow.textContent = 'Delete Old History Now';
      }
    }
  }

  private async loadHistoryStats(): Promise<void> {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getHistoryStats'
      });
      
      if (response.success) {
        if (this.historyConfigElements.totalHistoryItems) {
          this.historyConfigElements.totalHistoryItems.textContent = response.data.totalItems.toString();
        }
        if (this.historyConfigElements.recentHistoryItems) {
          this.historyConfigElements.recentHistoryItems.textContent = response.data.recentItems.toString();
        }
      } else {
        if (this.historyConfigElements.totalHistoryItems) {
          this.historyConfigElements.totalHistoryItems.textContent = 'Error';
        }
        if (this.historyConfigElements.recentHistoryItems) {
          this.historyConfigElements.recentHistoryItems.textContent = 'Error';
        }
      }
    } catch (error) {
      console.error('Error loading history stats:', error);
      if (this.historyConfigElements.totalHistoryItems) {
        this.historyConfigElements.totalHistoryItems.textContent = 'Error';
      }
      if (this.historyConfigElements.recentHistoryItems) {
        this.historyConfigElements.recentHistoryItems.textContent = 'Error';
      }
    }
  }

  private showConfigFeedback(message: string, type: 'success' | 'error' | 'loading'): void {
    // Create or update feedback element
    let feedbackElement = document.getElementById('configFeedback');
    
    if (!feedbackElement) {
      feedbackElement = document.createElement('div');
      feedbackElement.id = 'configFeedback';
      feedbackElement.className = 'config-feedback';
      
      const configActions = document.querySelector('.config-actions');
      if (configActions) {
        configActions.appendChild(feedbackElement);
      }
    }
    
    feedbackElement.textContent = message;
    feedbackElement.className = `config-feedback config-feedback--${type}`;
    feedbackElement.style.display = 'block';
    
    // Auto-hide after 3 seconds for success/error messages
    if (type !== 'loading') {
      setTimeout(() => {
        if (feedbackElement) {
          feedbackElement.style.display = 'none';
        }
      }, 3000);
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