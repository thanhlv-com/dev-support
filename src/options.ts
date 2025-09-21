// Options page script for Dev Support Extension - TypeScript version

/// <reference path="types/global.d.ts" />

interface OptionsElements {
  // Feature toggles
  freediumFeature: HTMLInputElement | null;
  jsonViewer: HTMLInputElement | null;
  imageDownloader: HTMLInputElement | null;
  historyDeletion: HTMLInputElement | null;
  proxyEnabled: HTMLInputElement | null;
  
  // History config panel
  historyConfig: HTMLElement | null;
  retentionDays: HTMLInputElement | null;
  deletionInterval: HTMLSelectElement | null;
  deleteOnStartup: HTMLInputElement | null;
  excludePatterns: HTMLTextAreaElement | null;
  
  // Proxy config panel
  proxyConfig: HTMLElement | null;
  globalProxyEnabled: HTMLInputElement | null;
  globalProxyConfig: HTMLElement | null;
  globalProxyProfileSelect: HTMLSelectElement | null;
  
  // Proxy profiles
  proxyProfilesList: HTMLElement | null;
  addProxyProfile: HTMLButtonElement | null;
  
  // Proxy rules
  proxyRulesList: HTMLElement | null;
  
  // Buttons
  saveHistoryConfig: HTMLButtonElement | null;
  resetHistoryConfig: HTMLButtonElement | null;
  saveProxyConfig: HTMLButtonElement | null;
  resetProxyConfig: HTMLButtonElement | null;
  exportProxyConfig: HTMLButtonElement | null;
  importProxyConfig: HTMLButtonElement | null;
  addProxyRule: HTMLButtonElement | null;
  testAllProxies: HTMLButtonElement | null;
  showProxyDebug: HTMLButtonElement | null;
  openPopup: HTMLButtonElement | null;
  exportSettings: HTMLAnchorElement | null;
  importSettings: HTMLAnchorElement | null;
  importFile: HTMLInputElement | null;
  importProxyFile: HTMLInputElement | null;
  
  // Stats
  totalHistoryItems: HTMLElement | null;
  recentHistoryItems: HTMLElement | null;
  
  // Status
  statusMessage: HTMLElement | null;
}

class OptionsController {
  private elements: OptionsElements;
  private currentProxyConfig: ProxyConfiguration | null = null;

  constructor() {
    this.elements = {
      freediumFeature: null,
      jsonViewer: null,
      imageDownloader: null,
      historyDeletion: null,
      proxyEnabled: null,
      historyConfig: null,
      retentionDays: null,
      deletionInterval: null,
      deleteOnStartup: null,
      excludePatterns: null,
      proxyConfig: null,
      globalProxyEnabled: null,
      globalProxyConfig: null,
      globalProxyProfileSelect: null,
      proxyProfilesList: null,
      addProxyProfile: null,
      proxyRulesList: null,
      saveHistoryConfig: null,
      resetHistoryConfig: null,
      saveProxyConfig: null,
      resetProxyConfig: null,
      exportProxyConfig: null,
      importProxyConfig: null,
      addProxyRule: null,
      testAllProxies: null,
      showProxyDebug: null,
      openPopup: null,
      exportSettings: null,
      importSettings: null,
      importFile: null,
      importProxyFile: null,
      totalHistoryItems: null,
      recentHistoryItems: null,
      statusMessage: null
    };
    
    this.init();
  }

  private async init(): Promise<void> {
    await this.initializeElements();
    await this.loadSettings();
    await this.loadProxyConfiguration();
    this.setupEventListeners();
    await this.loadHistoryStats();
    
    console.log('Options page initialized');
  }

  private async initializeElements(): Promise<void> {
    // Feature toggles
    this.elements.freediumFeature = document.getElementById('freediumFeature') as HTMLInputElement;
    this.elements.jsonViewer = document.getElementById('jsonViewer') as HTMLInputElement;
    this.elements.imageDownloader = document.getElementById('imageDownloader') as HTMLInputElement;
    this.elements.historyDeletion = document.getElementById('historyDeletion') as HTMLInputElement;
    this.elements.proxyEnabled = document.getElementById('proxyEnabled') as HTMLInputElement;
    
    // History config elements
    this.elements.historyConfig = document.getElementById('historyConfig');
    this.elements.retentionDays = document.getElementById('retentionDays') as HTMLInputElement;
    this.elements.deletionInterval = document.getElementById('deletionInterval') as HTMLSelectElement;
    this.elements.deleteOnStartup = document.getElementById('deleteOnStartup') as HTMLInputElement;
    this.elements.excludePatterns = document.getElementById('excludePatterns') as HTMLTextAreaElement;
    
    // Proxy config elements
    this.elements.proxyConfig = document.getElementById('proxyConfig');
    this.elements.globalProxyEnabled = document.getElementById('globalProxyEnabled') as HTMLInputElement;
    this.elements.globalProxyConfig = document.getElementById('globalProxyConfig');
    this.elements.globalProxyProfileSelect = document.getElementById('globalProxyProfileSelect') as HTMLSelectElement;
    
    // Proxy profiles
    this.elements.proxyProfilesList = document.getElementById('proxyProfilesList');
    this.elements.addProxyProfile = document.getElementById('addProxyProfile') as HTMLButtonElement;
    
    // Proxy rules
    this.elements.proxyRulesList = document.getElementById('proxyRulesList');
    
    // Buttons
    this.elements.saveHistoryConfig = document.getElementById('saveHistoryConfig') as HTMLButtonElement;
    this.elements.resetHistoryConfig = document.getElementById('resetHistoryConfig') as HTMLButtonElement;
    this.elements.saveProxyConfig = document.getElementById('saveProxyConfig') as HTMLButtonElement;
    this.elements.resetProxyConfig = document.getElementById('resetProxyConfig') as HTMLButtonElement;
    this.elements.exportProxyConfig = document.getElementById('exportProxyConfig') as HTMLButtonElement;
    this.elements.importProxyConfig = document.getElementById('importProxyConfig') as HTMLButtonElement;
    this.elements.addProxyRule = document.getElementById('addProxyRule') as HTMLButtonElement;
    this.elements.testAllProxies = document.getElementById('testAllProxies') as HTMLButtonElement;
    this.elements.showProxyDebug = document.getElementById('showProxyDebug') as HTMLButtonElement;
    this.elements.openPopup = document.getElementById('openPopup') as HTMLButtonElement;
    this.elements.exportSettings = document.getElementById('exportSettings') as HTMLAnchorElement;
    this.elements.importSettings = document.getElementById('importSettings') as HTMLAnchorElement;
    this.elements.importFile = document.getElementById('importFile') as HTMLInputElement;
    this.elements.importProxyFile = document.getElementById('importProxyFile') as HTMLInputElement;
    
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
        if (this.elements.freediumFeature) {
          this.elements.freediumFeature.checked = settings.freediumFeature !== false;
        }
        if (this.elements.jsonViewer) {
          this.elements.jsonViewer.checked = settings.jsonViewer !== false;
        }
        if (this.elements.imageDownloader) {
          this.elements.imageDownloader.checked = settings.imageDownloader !== false;
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
    if (this.elements.freediumFeature) {
      this.elements.freediumFeature.addEventListener('change', (e) => {
        this.handleFeatureToggle('freediumFeature', e);
      });
    }
    
    if (this.elements.jsonViewer) {
      this.elements.jsonViewer.addEventListener('change', (e) => {
        this.handleFeatureToggle('jsonViewer', e);
      });
    }
    
    if (this.elements.imageDownloader) {
      this.elements.imageDownloader.addEventListener('change', (e) => {
        this.handleFeatureToggle('imageDownloader', e);
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

    // Proxy configuration event listeners
    if (this.elements.proxyEnabled) {
      this.elements.proxyEnabled.addEventListener('change', (e) => {
        this.handleProxyToggle(e);
      });
    }

    if (this.elements.globalProxyEnabled) {
      this.elements.globalProxyEnabled.addEventListener('change', (e) => {
        this.handleGlobalProxyToggle(e);
      });
    }

    if (this.elements.saveProxyConfig) {
      this.elements.saveProxyConfig.addEventListener('click', () => {
        this.handleSaveProxyConfig();
      });
    }

    if (this.elements.resetProxyConfig) {
      this.elements.resetProxyConfig.addEventListener('click', () => {
        this.handleResetProxyConfig();
      });
    }

    if (this.elements.exportProxyConfig) {
      this.elements.exportProxyConfig.addEventListener('click', () => {
        this.handleExportProxyConfig();
      });
    }

    if (this.elements.importProxyConfig) {
      this.elements.importProxyConfig.addEventListener('click', () => {
        this.elements.importProxyFile?.click();
      });
    }

    if (this.elements.importProxyFile) {
      this.elements.importProxyFile.addEventListener('change', (e) => {
        this.handleImportProxyConfig(e);
      });
    }

    if (this.elements.addProxyProfile) {
      this.elements.addProxyProfile.addEventListener('click', () => {
        this.handleAddProxyProfile();
      });
    }

    if (this.elements.addProxyRule) {
      this.elements.addProxyRule.addEventListener('click', () => {
        this.handleAddProxyRule();
      });
    }

    if (this.elements.testAllProxies) {
      this.elements.testAllProxies.addEventListener('click', () => {
        this.handleTestAllProxies();
      });
    }

    if (this.elements.showProxyDebug) {
      this.elements.showProxyDebug.addEventListener('click', () => {
        this.handleShowProxyDebug();
      });
    }
  }

  private async handleFeatureToggle(feature: 'freediumFeature' | 'jsonViewer' | 'imageDownloader', event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    const enabled = target.checked;
    
    try {
      await chrome.storage.sync.set({ [feature]: enabled });
      console.log(`${feature} feature:`, enabled ? 'enabled' : 'disabled');
      
      // Notify all content scripts about the feature toggle
      await this.notifyContentScripts(feature, enabled);
      
      this.showStatus(`${this.getFeatureName(feature)} ${enabled ? 'enabled' : 'disabled'}`, 'success');
    } catch (error) {
      console.error(`Error toggling ${feature} feature:`, error);
      this.showStatus(`Failed to update ${this.getFeatureName(feature)}`, 'error');
      target.checked = !enabled; // Revert on error
    }
  }

  private getFeatureName(feature: string): string {
    switch (feature) {
      case 'freediumFeature': return 'Medium Freedium Redirect';
      case 'jsonViewer': return 'JSON Viewer';
      case 'imageDownloader': return 'Image Downloader';
      default: return feature;
    }
  }

  private async notifyContentScripts(feature: 'freediumFeature' | 'jsonViewer' | 'imageDownloader', enabled: boolean): Promise<void> {
    try {
      // Get all tabs
      const tabs = await chrome.tabs.query({});
      
      // Send message to each tab's content script
      const promises = tabs.map(async (tab) => {
        if (tab.id && tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
          try {
            await chrome.tabs.sendMessage(tab.id, {
              action: 'toggleFeature',
              feature: feature,
              enabled: enabled
            });
            console.log(`✅ Notified tab ${tab.id} about ${feature} toggle: ${enabled}`);
          } catch (error) {
            // Ignore errors for tabs that don't have content scripts loaded
            console.log(`⚠️ Could not notify tab ${tab.id}: content script not available`);
          }
        }
      });
      
      // Wait for all notifications to complete (ignoring failures)
      await Promise.allSettled(promises);
      console.log(`📢 Feature toggle notification sent to all tabs: ${feature} = ${enabled}`);
    } catch (error) {
      console.error('❌ Error notifying content scripts:', error);
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

  // Proxy configuration methods
  private async loadProxyConfiguration(): Promise<void> {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getProxyConfig' });
      
      if (response.success && response.data) {
        this.currentProxyConfig = response.data;
        this.loadProxyConfigUI(response.data);
      } else {
        // Initialize with default configuration
        this.currentProxyConfig = {
          enabled: false,
          profiles: [],
          rules: []
        };
        this.loadProxyConfigUI(this.currentProxyConfig);
      }
    } catch (error) {
      console.error('Error loading proxy configuration:', error);
      this.showStatus('Failed to load proxy configuration', 'error');
    }
  }

  private loadProxyConfigUI(config: ProxyConfiguration): void {
    // Set main proxy toggle
    if (this.elements.proxyEnabled) {
      this.elements.proxyEnabled.checked = config.enabled;
      this.toggleProxyConfig(config.enabled);
    }

    // Load proxy profiles
    this.renderProxyProfiles(config.profiles || []);

    // Load global proxy settings
    this.loadGlobalProxyConfig(config);

    // Load proxy rules
    this.renderProxyRules(config.rules || []);
  }

  private loadGlobalProxyConfig(config: ProxyConfiguration): void {
    if (this.elements.globalProxyEnabled) {
      this.elements.globalProxyEnabled.checked = !!config.globalProxyProfileId;
      this.toggleGlobalProxyConfig(!!config.globalProxyProfileId);
    }

    // Update global proxy profile select options
    this.updateGlobalProxyProfileSelect(config.profiles || [], config.globalProxyProfileId);
  }

  private updateGlobalProxyProfileSelect(profiles: ProxyProfile[], selectedProfileId?: string): void {
    if (!this.elements.globalProxyProfileSelect) return;

    // Clear existing options
    this.elements.globalProxyProfileSelect.innerHTML = '<option value="">Select a profile...</option>';

    // Add profile options
    profiles.forEach(profile => {
      const option = document.createElement('option');
      option.value = profile.id;
      option.textContent = `${profile.name} (${profile.proxyType.toUpperCase()} ${profile.host}:${profile.port})`;
      if (profile.id === selectedProfileId) {
        option.selected = true;
      }
      this.elements.globalProxyProfileSelect!.appendChild(option);
    });
  }

  private renderProxyProfiles(profiles: ProxyProfile[]): void {
    if (!this.elements.proxyProfilesList) return;

    this.elements.proxyProfilesList.innerHTML = '';

    profiles.forEach((profile, index) => {
      const profileElement = this.createProxyProfileElement(profile, index);
      this.elements.proxyProfilesList!.appendChild(profileElement);
    });
  }

  private renderProxyRules(rules: ProxyRule[]): void {
    if (!this.elements.proxyRulesList) return;

    this.elements.proxyRulesList.innerHTML = '';

    rules.forEach((rule, index) => {
      const ruleElement = this.createProxyRuleElement(rule, index);
      this.elements.proxyRulesList!.appendChild(ruleElement);
    });
  }

  private createProxyProfileElement(profile: ProxyProfile, _index: number): HTMLElement {
    const profileDiv = document.createElement('div');
    profileDiv.className = 'proxy-profile';
    profileDiv.setAttribute('data-profile-id', profile.id);

    profileDiv.innerHTML = `
      <div class="proxy-profile-header">
        <div class="proxy-profile-info">
          <input type="text" class="profile-name" value="${profile.name}" placeholder="Profile name">
          <span class="profile-details">${profile.proxyType.toUpperCase()} ${profile.host}:${profile.port}</span>
        </div>
        <div class="proxy-profile-actions">
          <button class="config-btn config-btn--secondary test-profile">🧪 Test</button>
          <button class="config-btn config-btn--danger remove-profile">🗑️ Remove</button>
        </div>
      </div>
      <div class="proxy-profile-config">
        <div class="config-grid">
          <div class="config-item">
            <label>Type:</label>
            <select class="config-select profile-type">
              <option value="http" ${profile.proxyType === 'http' ? 'selected' : ''}>HTTP</option>
              <option value="https" ${profile.proxyType === 'https' ? 'selected' : ''}>HTTPS</option>
              <option value="socks4" ${profile.proxyType === 'socks4' ? 'selected' : ''}>SOCKS4</option>
              <option value="socks5" ${profile.proxyType === 'socks5' ? 'selected' : ''}>SOCKS5</option>
            </select>
          </div>
          <div class="config-item">
            <label>Host:</label>
            <input type="text" class="config-input profile-host" value="${profile.host}" placeholder="127.0.0.1">
          </div>
          <div class="config-item">
            <label>Port:</label>
            <input type="number" class="config-input profile-port" min="1" max="65535" value="${profile.port}">
          </div>
          <div class="config-item">
            <label>Username:</label>
            <input type="text" class="config-input profile-username" value="${profile.username || ''}" placeholder="optional">
          </div>
          <div class="config-item">
            <label>Password:</label>
            <input type="password" class="config-input profile-password" value="${profile.password || ''}" placeholder="optional">
          </div>
          <div class="config-item full-width">
            <label>Description:</label>
            <input type="text" class="config-input profile-description" value="${profile.description || ''}" placeholder="Optional description">
          </div>
        </div>
      </div>
    `;

    // Add event listeners for this profile
    this.setupProxyProfileEventListeners(profileDiv, profile.id);

    return profileDiv;
  }

  private createProxyRuleElement(rule: ProxyRule, _index: number): HTMLElement {
    const ruleDiv = document.createElement('div');
    ruleDiv.className = 'proxy-rule';
    ruleDiv.setAttribute('data-rule-id', rule.id);

    // Get profile info for display
    const profile = this.findProfileById(rule.profileId);
    const profileDisplay = profile ? `${profile.name} (${profile.proxyType.toUpperCase()} ${profile.host}:${profile.port})` : 'Profile not found';

    ruleDiv.innerHTML = `
      <div class="proxy-rule-header">
        <div class="proxy-rule-info">
          <input type="text" class="rule-name" value="${rule.name}" placeholder="Rule name">
          <label class="toggle-switch">
            <input type="checkbox" class="rule-enabled" ${rule.enabled ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
        </div>
        <div class="proxy-rule-actions">
          <button class="config-btn config-btn--secondary test-rule">🧪 Test</button>
          <button class="config-btn config-btn--danger remove-rule">🗑️ Remove</button>
        </div>
      </div>
      <div class="proxy-rule-config">
        <div class="config-grid">
          <div class="config-item full-width">
            <label>Proxy Profile:</label>
            <select class="config-select rule-profile-select">
              <option value="">Select a profile...</option>
            </select>
            <small class="config-help">Current: ${profileDisplay}</small>
          </div>
          <div class="config-item full-width">
            <label>Domain patterns (one per line):</label>
            <textarea class="config-textarea rule-patterns" placeholder="*.example.com&#10;api.domain.com&#10;*.test.org" rows="3">${rule.domainPatterns.join('\n')}</textarea>
            <small class="config-help">Use * as wildcard. Example: *.google.com or api.github.com</small>
          </div>
          <div class="config-item full-width">
            <label>Bypass list (one per line):</label>
            <textarea class="config-textarea rule-bypass" placeholder="localhost&#10;127.0.0.1&#10;*.local" rows="2">${(rule.bypassList || []).join('\n')}</textarea>
            <small class="config-help">Domains that should bypass this proxy</small>
          </div>
        </div>
      </div>
    `;

    // Update the profile select options
    this.updateRuleProfileSelect(ruleDiv, rule.profileId);

    // Add event listeners for this rule
    this.setupProxyRuleEventListeners(ruleDiv, rule.id);

    return ruleDiv;
  }

  private findProfileById(profileId: string): ProxyProfile | null {
    return this.currentProxyConfig?.profiles.find(profile => profile.id === profileId) || null;
  }

  private updateRuleProfileSelect(ruleElement: HTMLElement, selectedProfileId: string): void {
    const profileSelect = ruleElement.querySelector('.rule-profile-select') as HTMLSelectElement;
    if (!profileSelect || !this.currentProxyConfig) return;

    // Clear existing options except the first one
    profileSelect.innerHTML = '<option value="">Select a profile...</option>';

    // Add profile options
    this.currentProxyConfig.profiles.forEach(profile => {
      const option = document.createElement('option');
      option.value = profile.id;
      option.textContent = `${profile.name} (${profile.proxyType.toUpperCase()} ${profile.host}:${profile.port})`;
      if (profile.id === selectedProfileId) {
        option.selected = true;
      }
      profileSelect.appendChild(option);
    });
  }

  private setupProxyProfileEventListeners(profileElement: HTMLElement, profileId: string): void {
    const testButton = profileElement.querySelector('.test-profile') as HTMLButtonElement;
    const removeButton = profileElement.querySelector('.remove-profile') as HTMLButtonElement;

    if (testButton) {
      testButton.addEventListener('click', () => this.handleTestProxyProfile(profileId));
    }

    if (removeButton) {
      removeButton.addEventListener('click', () => this.handleRemoveProxyProfile(profileId));
    }
  }

  private setupProxyRuleEventListeners(ruleElement: HTMLElement, ruleId: string): void {
    const testButton = ruleElement.querySelector('.test-rule') as HTMLButtonElement;
    const removeButton = ruleElement.querySelector('.remove-rule') as HTMLButtonElement;

    if (testButton) {
      testButton.addEventListener('click', () => this.handleTestProxyRule(ruleId));
    }

    if (removeButton) {
      removeButton.addEventListener('click', () => this.handleRemoveProxyRule(ruleId));
    }
  }

  private toggleProxyConfig(show: boolean): void {
    if (this.elements.proxyConfig) {
      this.elements.proxyConfig.style.display = show ? 'block' : 'none';
    }
  }

  private toggleGlobalProxyConfig(show: boolean): void {
    if (this.elements.globalProxyConfig) {
      this.elements.globalProxyConfig.style.display = show ? 'block' : 'none';
    }
  }

  private async handleTestProxyRule(ruleId: string): Promise<void> {
    if (!this.currentProxyConfig) return;

    const rule = this.currentProxyConfig.rules.find(r => r.id === ruleId);
    if (!rule) return;

    try {
      // Get current values from DOM for this rule
      const ruleElement = document.querySelector(`[data-rule-id="${ruleId}"]`);
      if (ruleElement) {
        const currentRule: ProxyRule = {
          id: rule.id,
          name: (ruleElement.querySelector('.rule-name') as HTMLInputElement)?.value || rule.name,
          enabled: (ruleElement.querySelector('.rule-enabled') as HTMLInputElement)?.checked || false,
          profileId: (ruleElement.querySelector('.rule-profile-select') as HTMLSelectElement)?.value || rule.profileId,
          domainPatterns: ((ruleElement.querySelector('.rule-patterns') as HTMLTextAreaElement)?.value || '').split('\n').filter(p => p.trim()) || rule.domainPatterns,
          bypassList: ((ruleElement.querySelector('.rule-bypass') as HTMLTextAreaElement)?.value || '').split('\n').filter(p => p.trim()) || rule.bypassList
        };

        // Get the profile for testing
        const profile = this.findProfileById(currentRule.profileId);
        if (!profile) {
          this.showStatus(`❌ Profile not found for rule: ${currentRule.name}`, 'error');
          return;
        }

        this.showStatus(`Validating proxy settings ${profile.proxyType.toUpperCase()} ${profile.host}:${profile.port}...`, 'info');
        
        // Create legacy rule format for testing compatibility
        const legacyRuleForTest = {
          ...currentRule,
          proxyType: profile.proxyType,
          host: profile.host,
          port: profile.port,
          username: profile.username,
          password: profile.password
        };

        const response = await chrome.runtime.sendMessage({
          action: 'testProxyConnection',
          proxyRule: legacyRuleForTest,
          testUrl: 'https://www.google.com'
        });

        if (response.success) {
          const isValid = response.data.isValid;
          if (isValid) {
            this.showStatus(`✅ Validation passed for ${profile.name} (${profile.host}:${profile.port}) - Settings appear valid`, 'success');
          } else {
            this.showStatus(`❌ Validation failed for ${profile.name} (${profile.host}:${profile.port}) - Check settings`, 'error');
          }
        } else {
          this.showStatus(`❌ Proxy test error: ${response.error}`, 'error');
        }
      }
    } catch (error) {
      console.error('Error testing proxy:', error);
      this.showStatus('❌ Error testing proxy connection. Check browser console for details.', 'error');
    }
  }

  private handleRemoveProxyRule(ruleId: string): void {
    if (!this.currentProxyConfig) return;

    this.currentProxyConfig.rules = this.currentProxyConfig.rules.filter(r => r.id !== ruleId);
    this.renderProxyRules(this.currentProxyConfig.rules);
    this.showStatus('Proxy rule removed', 'info');
  }

  private generateRuleId(): string {
    return 'proxy-rule-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }


  // Proxy event handlers
  private handleProxyToggle(event: Event): void {
    const target = event.target as HTMLInputElement;
    const enabled = target.checked;
    
    this.toggleProxyConfig(enabled);
    
    if (this.currentProxyConfig) {
      this.currentProxyConfig.enabled = enabled;
    }
  }

  private handleGlobalProxyToggle(event: Event): void {
    const target = event.target as HTMLInputElement;
    const enabled = target.checked;
    
    this.toggleGlobalProxyConfig(enabled);
  }

  private getCurrentProxyConfig(): ProxyConfiguration {
    if (!this.currentProxyConfig) {
      this.currentProxyConfig = {
        enabled: false,
        profiles: [],
        rules: []
      };
    }

    // Update from UI
    this.currentProxyConfig.enabled = this.elements.proxyEnabled?.checked || false;

    // Update global proxy profile ID
    if (this.elements.globalProxyEnabled?.checked && this.elements.globalProxyProfileSelect?.value) {
      this.currentProxyConfig.globalProxyProfileId = this.elements.globalProxyProfileSelect.value;
    } else {
      this.currentProxyConfig.globalProxyProfileId = undefined;
    }

    // Update profiles from DOM
    this.updateProfilesFromDOM();

    // Update rules from DOM
    this.updateRulesFromDOM();

    return this.currentProxyConfig;
  }

  private updateProfilesFromDOM(): void {
    if (!this.elements.proxyProfilesList || !this.currentProxyConfig) return;

    const profileElements = this.elements.proxyProfilesList.querySelectorAll('.proxy-profile');
    const updatedProfiles: ProxyProfile[] = [];

    profileElements.forEach(profileElement => {
      const profileId = profileElement.getAttribute('data-profile-id');
      if (!profileId) return;

      const profile: ProxyProfile = {
        id: profileId,
        name: (profileElement.querySelector('.profile-name') as HTMLInputElement)?.value || 'Unnamed Profile',
        proxyType: (profileElement.querySelector('.profile-type') as HTMLSelectElement)?.value as any || 'http',
        host: (profileElement.querySelector('.profile-host') as HTMLInputElement)?.value || '127.0.0.1',
        port: parseInt((profileElement.querySelector('.profile-port') as HTMLInputElement)?.value || '8080'),
        username: (profileElement.querySelector('.profile-username') as HTMLInputElement)?.value || undefined,
        password: (profileElement.querySelector('.profile-password') as HTMLInputElement)?.value || undefined,
        description: (profileElement.querySelector('.profile-description') as HTMLInputElement)?.value || undefined
      };

      updatedProfiles.push(profile);
    });

    this.currentProxyConfig.profiles = updatedProfiles;
  }

  private updateRulesFromDOM(): void {
    if (!this.elements.proxyRulesList || !this.currentProxyConfig) return;

    const ruleElements = this.elements.proxyRulesList.querySelectorAll('.proxy-rule');
    const updatedRules: ProxyRule[] = [];

    ruleElements.forEach(ruleElement => {
      const ruleId = ruleElement.getAttribute('data-rule-id');
      if (!ruleId) return;

      const rule: ProxyRule = {
        id: ruleId,
        name: (ruleElement.querySelector('.rule-name') as HTMLInputElement)?.value || 'Unnamed Rule',
        enabled: (ruleElement.querySelector('.rule-enabled') as HTMLInputElement)?.checked || false,
        profileId: (ruleElement.querySelector('.rule-profile-select') as HTMLSelectElement)?.value || '',
        domainPatterns: ((ruleElement.querySelector('.rule-patterns') as HTMLTextAreaElement)?.value || '').split('\n').filter(p => p.trim()),
        bypassList: ((ruleElement.querySelector('.rule-bypass') as HTMLTextAreaElement)?.value || '').split('\n').filter(p => p.trim())
      };

      updatedRules.push(rule);
    });

    this.currentProxyConfig.rules = updatedRules;
  }

  private async handleSaveProxyConfig(): Promise<void> {
    try {
      const config = this.getCurrentProxyConfig();
      
      const response = await chrome.runtime.sendMessage({
        action: 'saveProxyConfig',
        proxyConfig: config
      });

      if (response.success) {
        this.showStatus('Proxy configuration saved successfully!', 'success');
      } else {
        this.showStatus('Failed to save proxy configuration: ' + response.error, 'error');
      }
    } catch (error) {
      console.error('Error saving proxy configuration:', error);
      this.showStatus('Error saving proxy configuration', 'error');
    }
  }

  private handleResetProxyConfig(): void {
    this.currentProxyConfig = {
      enabled: false,
      profiles: [],
      rules: []
    };

    this.loadProxyConfigUI(this.currentProxyConfig);
    this.showStatus('Proxy configuration reset to defaults', 'info');
  }

  private handleAddProxyProfile(): void {
    if (!this.currentProxyConfig) {
      this.currentProxyConfig = { enabled: false, profiles: [], rules: [] };
    }

    const newProfile: ProxyProfile = {
      id: this.generateProfileId(),
      name: `Profile ${this.currentProxyConfig.profiles.length + 1}`,
      proxyType: 'http',
      host: '127.0.0.1',
      port: 8080,
      description: 'New proxy profile'
    };

    this.currentProxyConfig.profiles.push(newProfile);
    this.renderProxyProfiles(this.currentProxyConfig.profiles);
    
    // Update all profile selects
    this.updateAllProfileSelects();
    
    this.showStatus('New proxy profile added', 'info');
  }

  private generateProfileId(): string {
    return 'proxy-profile-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  private updateAllProfileSelects(): void {
    // Update global proxy profile select
    if (this.currentProxyConfig) {
      this.updateGlobalProxyProfileSelect(this.currentProxyConfig.profiles, this.currentProxyConfig.globalProxyProfileId);
      
      // Update all rule profile selects
      const ruleElements = this.elements.proxyRulesList?.querySelectorAll('.proxy-rule');
      ruleElements?.forEach(ruleElement => {
        const ruleId = ruleElement.getAttribute('data-rule-id');
        if (ruleId) {
          const rule = this.currentProxyConfig!.rules.find(r => r.id === ruleId);
          if (rule) {
            this.updateRuleProfileSelect(ruleElement as HTMLElement, rule.profileId);
          }
        }
      });
    }
  }

  private handleAddProxyRule(): void {
    if (!this.currentProxyConfig) {
      this.currentProxyConfig = { enabled: false, profiles: [], rules: [] };
    }

    const newRule = this.createDefaultRule();
    this.currentProxyConfig.rules.push(newRule);
    this.renderProxyRules(this.currentProxyConfig.rules);
    this.showStatus('New proxy rule added', 'info');
  }

  private createDefaultRule(): ProxyRule {
    return {
      id: this.generateRuleId(),
      name: `Rule ${(this.currentProxyConfig?.rules.length || 0) + 1}`,
      enabled: true,
      domainPatterns: ['*.example.com'],
      profileId: '', // Will need to be set to an existing profile ID
      bypassList: ['localhost', '127.0.0.1', '*.local']
    };
  }

  private async handleTestProxyProfile(profileId: string): Promise<void> {
    if (!this.currentProxyConfig) return;

    const profile = this.currentProxyConfig.profiles.find(p => p.id === profileId);
    if (!profile) return;

    try {
      // Get current values from DOM for this profile
      const profileElement = document.querySelector(`[data-profile-id="${profileId}"]`);
      if (profileElement) {
        const currentProfile: ProxyProfile = {
          id: profile.id,
          name: (profileElement.querySelector('.profile-name') as HTMLInputElement)?.value || profile.name,
          proxyType: (profileElement.querySelector('.profile-type') as HTMLSelectElement)?.value as any || profile.proxyType,
          host: (profileElement.querySelector('.profile-host') as HTMLInputElement)?.value || profile.host,
          port: parseInt((profileElement.querySelector('.profile-port') as HTMLInputElement)?.value || '0') || profile.port,
          username: (profileElement.querySelector('.profile-username') as HTMLInputElement)?.value || profile.username,
          password: (profileElement.querySelector('.profile-password') as HTMLInputElement)?.value || profile.password,
          description: (profileElement.querySelector('.profile-description') as HTMLInputElement)?.value || profile.description
        };

        this.showStatus(`Validating proxy settings ${currentProfile.proxyType.toUpperCase()} ${currentProfile.host}:${currentProfile.port}...`, 'info');
        
        // Create a temporary rule for testing
        const testRule: ProxyRule = {
          id: 'test-rule',
          name: 'Test Rule',
          enabled: true,
          domainPatterns: ['*'],
          profileId: currentProfile.id,
          bypassList: []
        };

        // We need to test using the profile data directly since backend expects a ProxyRule
        // Convert profile to old format for testing compatibility
        const legacyRuleForTest = {
          ...testRule,
          proxyType: currentProfile.proxyType,
          host: currentProfile.host,
          port: currentProfile.port,
          username: currentProfile.username,
          password: currentProfile.password
        };

        const response = await chrome.runtime.sendMessage({
          action: 'testProxyConnection',
          proxyRule: legacyRuleForTest,
          testUrl: 'https://www.google.com'
        });

        if (response.success) {
          const isValid = response.data.isValid;
          if (isValid) {
            this.showStatus(`✅ Validation passed for ${currentProfile.name} (${currentProfile.host}:${currentProfile.port}) - Settings appear valid`, 'success');
          } else {
            this.showStatus(`❌ Validation failed for ${currentProfile.name} (${currentProfile.host}:${currentProfile.port}) - Check settings`, 'error');
          }
        } else {
          this.showStatus(`❌ Profile test error: ${response.error}`, 'error');
        }
      }
    } catch (error) {
      console.error('Error testing profile:', error);
      this.showStatus('❌ Error testing profile connection. Check browser console for details.', 'error');
    }
  }

  private handleRemoveProxyProfile(profileId: string): void {
    if (!this.currentProxyConfig) return;

    // Check if profile is being used
    const isUsedByRules = this.currentProxyConfig.rules.some(rule => rule.profileId === profileId);
    const isUsedByGlobal = this.currentProxyConfig.globalProxyProfileId === profileId;

    if (isUsedByRules || isUsedByGlobal) {
      this.showStatus('❌ Cannot remove profile - it is being used by rules or global proxy', 'error');
      return;
    }

    this.currentProxyConfig.profiles = this.currentProxyConfig.profiles.filter(p => p.id !== profileId);
    this.renderProxyProfiles(this.currentProxyConfig.profiles);
    this.updateAllProfileSelects();
    this.showStatus('Proxy profile removed', 'info');
  }

  private async handleTestAllProxies(): Promise<void> {
    if (!this.currentProxyConfig || this.currentProxyConfig.rules.length === 0) {
      this.showStatus('No proxy rules to test', 'info');
      return;
    }

    this.showStatus('Testing all proxy connections...', 'info');

    let passedCount = 0;
    let failedCount = 0;

    for (const rule of this.currentProxyConfig.rules) {
      if (!rule.enabled) continue;

      try {
        const response = await chrome.runtime.sendMessage({
          action: 'testProxyConnection',
          proxyRule: rule,
          testUrl: 'https://www.google.com'
        });

        if (response.success && response.data.isValid) {
          passedCount++;
        } else {
          failedCount++;
        }
      } catch (error) {
        failedCount++;
      }

      // Add small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    this.showStatus(
      `Proxy tests completed: ${passedCount} passed, ${failedCount} failed`,
      passedCount > failedCount ? 'success' : 'error'
    );
  }

  private async handleExportProxyConfig(): Promise<void> {
    try {
      const config = this.getCurrentProxyConfig();
      const dataStr = JSON.stringify(config, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `proxy-config-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      this.showStatus('Proxy configuration exported successfully!', 'success');
    } catch (error) {
      console.error('Error exporting proxy configuration:', error);
      this.showStatus('Failed to export proxy configuration', 'error');
    }
  }

  private async handleImportProxyConfig(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (!file) return;
    
    try {
      const text = await file.text();
      const config = JSON.parse(text) as ProxyConfiguration;
      
      // Basic validation
      if (typeof config.enabled !== 'boolean' || !Array.isArray(config.rules)) {
        throw new Error('Invalid proxy configuration format');
      }
      
      this.currentProxyConfig = config;
      this.loadProxyConfigUI(config);
      
      this.showStatus('Proxy configuration imported successfully!', 'success');
    } catch (error) {
      console.error('Error importing proxy configuration:', error);
      this.showStatus('Failed to import proxy configuration - invalid file format', 'error');
    } finally {
      target.value = '';
    }
  }

  private async handleShowProxyDebug(): Promise<void> {
    try {
      // Get current proxy settings from Chrome
      if (chrome.proxy?.settings) {
        const currentSettings = await chrome.proxy.settings.get({});
        
        let debugInfo = '🔍 PROXY DEBUG INFORMATION\n\n';
        debugInfo += `Current Chrome Proxy Mode: ${currentSettings.value.mode}\n`;
        debugInfo += `Proxy Controlled By: ${currentSettings.levelOfControl}\n\n`;
        
        if (this.currentProxyConfig) {
          debugInfo += `Extension Proxy Enabled: ${this.currentProxyConfig.enabled}\n`;
          debugInfo += `Number of Rules: ${this.currentProxyConfig.rules.length}\n`;
          debugInfo += `Global Proxy: ${this.currentProxyConfig.globalProxyProfileId ? 'Yes' : 'No'}\n\n`;
          
          if (this.currentProxyConfig.globalProxyProfileId) {
            const globalProfile = this.findProfileById(this.currentProxyConfig.globalProxyProfileId);
            if (globalProfile) {
              debugInfo += `Global Proxy Details:\n`;
              debugInfo += `  Type: ${globalProfile.proxyType}\n`;
              debugInfo += `  Host: ${globalProfile.host}\n`;
              debugInfo += `  Port: ${globalProfile.port}\n`;
              debugInfo += `  Auth: ${globalProfile.username ? 'Yes' : 'No'}\n\n`;
            }
          }
          
          if (this.currentProxyConfig.rules.length > 0) {
            debugInfo += `Proxy Rules:\n`;
            this.currentProxyConfig.rules.forEach((rule, index) => {
              debugInfo += `  ${index + 1}. ${rule.name} (${rule.enabled ? 'Enabled' : 'Disabled'})\n`;
              const profile = this.findProfileById(rule.profileId);
              if (profile) {
                debugInfo += `     Profile: ${profile.name} (${profile.proxyType.toUpperCase()} ${profile.host}:${profile.port})\n`;
              } else {
                debugInfo += `     Profile: Not found (ID: ${rule.profileId})\n`;
              }
              debugInfo += `     Patterns: ${rule.domainPatterns.join(', ')}\n`;
              if (rule.bypassList && rule.bypassList.length > 0) {
                debugInfo += `     Bypass: ${rule.bypassList.join(', ')}\n`;
              }
            });
          }
        } else {
          debugInfo += 'Extension Proxy Config: Not loaded\n';
        }
        
        debugInfo += '\n💡 TROUBLESHOOTING TIPS:\n';
        debugInfo += '• If mode is "direct" but you have proxy enabled, check for errors in background script\n';
        debugInfo += '• If mode is "system", Chrome is using system proxy settings\n';
        debugInfo += '• If controlled by "other_extension", another extension is managing proxies\n';
        debugInfo += '• Copy this info when reporting issues\n\n';
        debugInfo += '🧪 TESTING PROXY:\n';
        debugInfo += '1. Make sure proxy is ENABLED and rules are ENABLED\n';
        debugInfo += '2. SAVE configuration (important!)\n';
        debugInfo += '3. Open browser developer tools (F12) → Console tab\n';
        debugInfo += '4. Visit a domain that matches your proxy rules\n';
        debugInfo += '5. Look for [PAC] messages showing domain matching and proxy decisions\n';
        debugInfo += '6. Look for 🔐 messages showing authentication handling\n';
        debugInfo += '7. Check Network tab - requests should show proxy indicator\n';
        debugInfo += '8. Visit httpbin.org/ip to see your IP (should show proxy IP if working)\n\n';
        debugInfo += '⚠️ COMMON ISSUES:\n';
        debugInfo += '• Mode is "direct": Extension not controlling proxy (check for errors)\n';
        debugInfo += '• Mode is "system": Chrome using system proxy instead\n';
        debugInfo += '• No [PAC] messages: PAC script not loaded or has errors\n';
        debugInfo += '• No 🔐 messages: webRequest API not working or no auth challenges\n';
        debugInfo += '• Other extension controlling: Disable other proxy extensions\n\n';
        debugInfo += '🔐 AUTHENTICATION FEATURES:\n';
        debugInfo += '• Extension now automatically handles proxy authentication\n';
        debugInfo += '• No more browser password prompts for configured proxies\n';
        debugInfo += '• Username/password from your proxy rules are used automatically\n';
        debugInfo += '• Check browser console for 🔐 authentication debug messages\n\n';
        debugInfo += 'Example test: Rule for *.httpbin.org → visit httpbin.org/ip';

        // Create a modal or alert to show debug info
        const modal = document.createElement('div');
        modal.style.cssText = `
          position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
          background: rgba(0,0,0,0.5); z-index: 10000; display: flex; 
          align-items: center; justify-content: center;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
          background: white; padding: 20px; border-radius: 8px; 
          max-width: 600px; max-height: 80vh; overflow-y: auto;
          font-family: monospace; font-size: 12px; line-height: 1.4;
        `;
        
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '❌ Close';
        closeBtn.style.cssText = `
          position: absolute; top: 10px; right: 10px; 
          background: #dc3545; color: white; border: none; 
          padding: 5px 10px; border-radius: 4px; cursor: pointer;
        `;
        closeBtn.onclick = () => document.body.removeChild(modal);
        
        const copyBtn = document.createElement('button');
        copyBtn.textContent = '📋 Copy Debug Info';
        copyBtn.style.cssText = `
          margin-bottom: 10px; background: #007bff; color: white; 
          border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;
        `;
        copyBtn.onclick = () => {
          navigator.clipboard.writeText(debugInfo);
          this.showStatus('Debug info copied to clipboard!', 'success');
        };
        
        const pre = document.createElement('pre');
        pre.textContent = debugInfo;
        pre.style.cssText = 'white-space: pre-wrap; margin: 0;';
        
        content.appendChild(closeBtn);
        content.appendChild(copyBtn);
        content.appendChild(pre);
        modal.appendChild(content);
        document.body.appendChild(modal);
        
      } else {
        this.showStatus('❌ Chrome proxy API not available', 'error');
      }
    } catch (error) {
      console.error('Error getting debug info:', error);
      this.showStatus('❌ Error getting debug information', 'error');
    }
  }
}

// Initialize options page when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new OptionsController();
});
