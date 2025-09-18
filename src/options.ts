// Options page script for Dev Support Extension - TypeScript version

/// <reference path="types/global.d.ts" />

interface OptionsElements {
  // Feature toggles
  mediumFreedium: HTMLInputElement | null;
  jsonViewer: HTMLInputElement | null;
  historyDeletion: HTMLInputElement | null;
  
  // History config panel
  historyConfig: HTMLElement | null;
  retentionDays: HTMLInputElement | null;
  deletionInterval: HTMLSelectElement | null;
  deleteOnStartup: HTMLInputElement | null;
  excludePatterns: HTMLTextAreaElement | null;
  
  // Buttons
  saveHistoryConfig: HTMLButtonElement | null;
  resetHistoryConfig: HTMLButtonElement | null;
  openPopup: HTMLButtonElement | null;
  exportSettings: HTMLAnchorElement | null;
  importSettings: HTMLAnchorElement | null;
  importFile: HTMLInputElement | null;
  
  // Stats
  totalHistoryItems: HTMLElement | null;
  recentHistoryItems: HTMLElement | null;
  
  // Status
  statusMessage: HTMLElement | null;
}

class OptionsController {
  private elements: OptionsElements;

  constructor() {
    this.elements = {
      mediumFreedium: null,
      jsonViewer: null,
      historyDeletion: null,
      historyConfig: null,
      retentionDays: null,
      deletionInterval: null,
      deleteOnStartup: null,
      excludePatterns: null,
      saveHistoryConfig: null,
      resetHistoryConfig: null,
      openPopup: null,
      exportSettings: null,
      importSettings: null,
      importFile: null,
      totalHistoryItems: null,
      recentHistoryItems: null,
      statusMessage: null
    };
    
    this.init();
  }

  private async init(): Promise<void> {
    await this.initializeElements();
    await this.loadSettings();
    this.setupEventListeners();
    await this.loadHistoryStats();
    
    console.log('Options page initialized');
  }

  private async initializeElements(): Promise<void> {
    // Feature toggles
    this.elements.mediumFreedium = document.getElementById('mediumFreedium') as HTMLInputElement;
    this.elements.jsonViewer = document.getElementById('jsonViewer') as HTMLInputElement;
    this.elements.historyDeletion = document.getElementById('historyDeletion') as HTMLInputElement;
    
    // History config elements
    this.elements.historyConfig = document.getElementById('historyConfig');
    this.elements.retentionDays = document.getElementById('retentionDays') as HTMLInputElement;
    this.elements.deletionInterval = document.getElementById('deletionInterval') as HTMLSelectElement;
    this.elements.deleteOnStartup = document.getElementById('deleteOnStartup') as HTMLInputElement;
    this.elements.excludePatterns = document.getElementById('excludePatterns') as HTMLTextAreaElement;
    
    // Buttons
    this.elements.saveHistoryConfig = document.getElementById('saveHistoryConfig') as HTMLButtonElement;
    this.elements.resetHistoryConfig = document.getElementById('resetHistoryConfig') as HTMLButtonElement;
    this.elements.openPopup = document.getElementById('openPopup') as HTMLButtonElement;
    this.elements.exportSettings = document.getElementById('exportSettings') as HTMLAnchorElement;
    this.elements.importSettings = document.getElementById('importSettings') as HTMLAnchorElement;
    this.elements.importFile = document.getElementById('importFile') as HTMLInputElement;
    
    // Stats
    this.elements.totalHistoryItems = document.getElementById('totalHistoryItems');
    this.elements.recentHistoryItems = document.getElementById('recentHistoryItems');
    
    // Status
    this.elements.statusMessage = document.getElementById('statusMessage');
  }

  private async loadSettings(): Promise<void> {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getSettings' });
      
      if (response.success && response.settings) {
        const settings = response.settings;
        
        // Set feature toggles
        if (this.elements.mediumFreedium) {
          this.elements.mediumFreedium.checked = settings.mediumFreedium !== false;
        }
        if (this.elements.jsonViewer) {
          this.elements.jsonViewer.checked = settings.jsonViewer !== false;
        }
        if (this.elements.historyDeletion) {
          this.elements.historyDeletion.checked = settings.historyDeletion?.enabled || false;
          this.toggleHistoryConfig(settings.historyDeletion?.enabled || false);
        }
        
        // Set history config
        if (settings.historyDeletion) {
          this.loadHistoryConfig(settings.historyDeletion);
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      this.showStatus('Failed to load settings', 'error');
    }
  }

  private loadHistoryConfig(config: HistoryDeletionConfig): void {
    if (this.elements.retentionDays) {
      this.elements.retentionDays.value = config.retentionDays.toString();
    }
    if (this.elements.deletionInterval) {
      this.elements.deletionInterval.value = config.interval;
    }
    if (this.elements.deleteOnStartup) {
      this.elements.deleteOnStartup.checked = config.deleteOnStartup;
    }
    if (this.elements.excludePatterns) {
      this.elements.excludePatterns.value = config.excludePatterns.join('\n');
    }
  }

  private setupEventListeners(): void {
    // Feature toggles
    if (this.elements.mediumFreedium) {
      this.elements.mediumFreedium.addEventListener('change', (e) => {
        this.handleFeatureToggle('mediumFreedium', e);
      });
    }
    
    if (this.elements.jsonViewer) {
      this.elements.jsonViewer.addEventListener('change', (e) => {
        this.handleFeatureToggle('jsonViewer', e);
      });
    }
    
    if (this.elements.historyDeletion) {
      this.elements.historyDeletion.addEventListener('change', (e) => {
        this.handleHistoryDeletionToggle(e);
      });
    }
    
    // History config buttons
    if (this.elements.saveHistoryConfig) {
      this.elements.saveHistoryConfig.addEventListener('click', () => {
        this.handleSaveHistoryConfig();
      });
    }
    
    if (this.elements.resetHistoryConfig) {
      this.elements.resetHistoryConfig.addEventListener('click', () => {
        this.handleResetHistoryConfig();
      });
    }
    
    // Other buttons
    if (this.elements.openPopup) {
      this.elements.openPopup.addEventListener('click', () => {
        this.handleOpenPopup();
      });
    }
    
    if (this.elements.exportSettings) {
      this.elements.exportSettings.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleExportSettings();
      });
    }
    
    if (this.elements.importSettings) {
      this.elements.importSettings.addEventListener('click', (e) => {
        e.preventDefault();
        this.elements.importFile?.click();
      });
    }
    
    if (this.elements.importFile) {
      this.elements.importFile.addEventListener('change', (e) => {
        this.handleImportSettings(e);
      });
    }
  }

  private async handleFeatureToggle(feature: 'mediumFreedium' | 'jsonViewer', event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    const enabled = target.checked;
    
    try {
      await chrome.storage.sync.set({ [feature]: enabled });
      console.log(`${feature} feature:`, enabled ? 'enabled' : 'disabled');
      this.showStatus(`${this.getFeatureName(feature)} ${enabled ? 'enabled' : 'disabled'}`, 'success');
    } catch (error) {
      console.error(`Error toggling ${feature} feature:`, error);
      this.showStatus(`Failed to update ${this.getFeatureName(feature)}`, 'error');
      target.checked = !enabled; // Revert on error
    }
  }

  private getFeatureName(feature: string): string {
    switch (feature) {
      case 'mediumFreedium': return 'Medium Freedium Redirect';
      case 'jsonViewer': return 'JSON Viewer';
      default: return feature;
    }
  }

  private async handleHistoryDeletionToggle(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    const enabled = target.checked;
    
    this.toggleHistoryConfig(enabled);
    
    if (enabled) {
      // Save the enabled state with current config
      await this.handleSaveHistoryConfig();
    } else {
      // Disable history deletion
      const currentConfig = this.getCurrentHistoryConfig();
      currentConfig.enabled = false;
      await this.saveHistoryConfig(currentConfig);
    }
  }

  private toggleHistoryConfig(show: boolean): void {
    if (this.elements.historyConfig) {
      this.elements.historyConfig.style.display = show ? 'block' : 'none';
    }
  }

  private getCurrentHistoryConfig(): HistoryDeletionConfig {
    return {
      enabled: this.elements.historyDeletion?.checked || false,
      retentionDays: parseInt(this.elements.retentionDays?.value || '30'),
      interval: (this.elements.deletionInterval?.value as 'daily' | 'weekly' | 'monthly') || 'weekly',
      deleteOnStartup: this.elements.deleteOnStartup?.checked || false,
      excludePatterns: this.elements.excludePatterns?.value.split('\n').filter(p => p.trim()) || []
    };
  }

  private async handleSaveHistoryConfig(): Promise<void> {
    try {
      const config = this.getCurrentHistoryConfig();
      await this.saveHistoryConfig(config);
      this.showStatus('History deletion configuration saved successfully!', 'success');
    } catch (error) {
      console.error('Error saving history config:', error);
      this.showStatus('Failed to save history deletion configuration', 'error');
    }
  }

  private async saveHistoryConfig(config: HistoryDeletionConfig): Promise<void> {
    const response = await chrome.runtime.sendMessage({
      action: 'deleteHistory',
      historyConfig: config
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to save configuration');
    }
  }

  private handleResetHistoryConfig(): void {
    const defaultConfig: HistoryDeletionConfig = {
      enabled: false,
      interval: 'weekly',
      retentionDays: 30,
      deleteOnStartup: false,
      excludePatterns: []
    };
    
    this.loadHistoryConfig(defaultConfig);
    
    if (this.elements.historyDeletion) {
      this.elements.historyDeletion.checked = false;
    }
    
    this.toggleHistoryConfig(false);
    this.showStatus('History deletion configuration reset to defaults', 'info');
  }

  private handleOpenPopup(): void {
    // This will open the extension popup - handled by browser
    chrome.action.openPopup?.() || this.showStatus('Please click the extension icon in your toolbar', 'info');
  }

  private async handleExportSettings(): Promise<void> {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getSettings' });
      
      if (response.success) {
        const settings = response.settings;
        const dataStr = JSON.stringify(settings, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `dev-support-settings-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        this.showStatus('Settings exported successfully!', 'success');
      }
    } catch (error) {
      console.error('Error exporting settings:', error);
      this.showStatus('Failed to export settings', 'error');
    }
  }

  private async handleImportSettings(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (!file) return;
    
    try {
      const text = await file.text();
      const settings = JSON.parse(text);
      
      // Validate settings structure
      if (typeof settings !== 'object' || settings === null) {
        throw new Error('Invalid settings format');
      }
      
      // Save imported settings
      await chrome.storage.sync.set(settings);
      
      // Reload the page to reflect changes
      await this.loadSettings();
      await this.loadHistoryStats();
      
      this.showStatus('Settings imported successfully!', 'success');
    } catch (error) {
      console.error('Error importing settings:', error);
      this.showStatus('Failed to import settings - invalid file format', 'error');
    } finally {
      // Clear the file input
      target.value = '';
    }
  }

  private async loadHistoryStats(): Promise<void> {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getHistoryStats' });
      
      if (response.success) {
        if (this.elements.totalHistoryItems) {
          this.elements.totalHistoryItems.textContent = response.data.totalItems.toString();
        }
        if (this.elements.recentHistoryItems) {
          this.elements.recentHistoryItems.textContent = response.data.recentItems.toString();
        }
      } else {
        if (this.elements.totalHistoryItems) {
          this.elements.totalHistoryItems.textContent = 'Error';
        }
        if (this.elements.recentHistoryItems) {
          this.elements.recentHistoryItems.textContent = 'Error';
        }
      }
    } catch (error) {
      console.error('Error loading history stats:', error);
      if (this.elements.totalHistoryItems) {
        this.elements.totalHistoryItems.textContent = 'Error';
      }
      if (this.elements.recentHistoryItems) {
        this.elements.recentHistoryItems.textContent = 'Error';
      }
    }
  }

  private showStatus(message: string, type: 'success' | 'error' | 'info'): void {
    if (!this.elements.statusMessage) return;
    
    this.elements.statusMessage.textContent = message;
    this.elements.statusMessage.className = `status-message ${type}`;
    this.elements.statusMessage.style.display = 'block';
    
    // Auto-hide after 4 seconds
    setTimeout(() => {
      if (this.elements.statusMessage) {
        this.elements.statusMessage.style.display = 'none';
      }
    }, 4000);
  }
}

// Initialize options page when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new OptionsController();
});