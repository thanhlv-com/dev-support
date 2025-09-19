// Options page script for Dev Support Extension - TypeScript version

/// <reference path="types/global.d.ts" />

interface OptionsElements {
  // Feature toggles
  mediumFreedium: HTMLInputElement | null;
  jsonViewer: HTMLInputElement | null;
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
  globalProxyType: HTMLSelectElement | null;
  globalProxyHost: HTMLInputElement | null;
  globalProxyPort: HTMLInputElement | null;
  globalProxyUsername: HTMLInputElement | null;
  globalProxyPassword: HTMLInputElement | null;
  globalProxyBypass: HTMLTextAreaElement | null;
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
      mediumFreedium: null,
      jsonViewer: null,
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
      globalProxyType: null,
      globalProxyHost: null,
      globalProxyPort: null,
      globalProxyUsername: null,
      globalProxyPassword: null,
      globalProxyBypass: null,
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
    this.elements.mediumFreedium = document.getElementById('mediumFreedium') as HTMLInputElement;
    this.elements.jsonViewer = document.getElementById('jsonViewer') as HTMLInputElement;
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
    this.elements.globalProxyType = document.getElementById('globalProxyType') as HTMLSelectElement;
    this.elements.globalProxyHost = document.getElementById('globalProxyHost') as HTMLInputElement;
    this.elements.globalProxyPort = document.getElementById('globalProxyPort') as HTMLInputElement;
    this.elements.globalProxyUsername = document.getElementById('globalProxyUsername') as HTMLInputElement;
    this.elements.globalProxyPassword = document.getElementById('globalProxyPassword') as HTMLInputElement;
    this.elements.globalProxyBypass = document.getElementById('globalProxyBypass') as HTMLTextAreaElement;
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

    // Load global proxy settings
    if (config.globalProxy) {
      this.loadGlobalProxyConfig(config.globalProxy);
    }

    // Load proxy rules
    this.renderProxyRules(config.rules);
  }

  private loadGlobalProxyConfig(globalProxy: ProxyRule): void {
    if (this.elements.globalProxyEnabled) {
      this.elements.globalProxyEnabled.checked = globalProxy.enabled;
      this.toggleGlobalProxyConfig(globalProxy.enabled);
    }

    if (this.elements.globalProxyType) {
      this.elements.globalProxyType.value = globalProxy.proxyType;
    }
    if (this.elements.globalProxyHost) {
      this.elements.globalProxyHost.value = globalProxy.host;
    }
    if (this.elements.globalProxyPort) {
      this.elements.globalProxyPort.value = globalProxy.port.toString();
    }
    if (this.elements.globalProxyUsername) {
      this.elements.globalProxyUsername.value = globalProxy.username || '';
    }
    if (this.elements.globalProxyPassword) {
      this.elements.globalProxyPassword.value = globalProxy.password || '';
    }
    if (this.elements.globalProxyBypass) {
      this.elements.globalProxyBypass.value = (globalProxy.bypassList || []).join('\n');
    }
  }

  private renderProxyRules(rules: ProxyRule[]): void {
    if (!this.elements.proxyRulesList) return;

    this.elements.proxyRulesList.innerHTML = '';

    rules.forEach((rule, index) => {
      const ruleElement = this.createProxyRuleElement(rule, index);
      this.elements.proxyRulesList!.appendChild(ruleElement);
    });
  }

  private createProxyRuleElement(rule: ProxyRule, _index: number): HTMLElement {
    const ruleDiv = document.createElement('div');
    ruleDiv.className = 'proxy-rule';
    ruleDiv.setAttribute('data-rule-id', rule.id);

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
          <div class="config-item">
            <label>Type:</label>
            <select class="config-select rule-type">
              <option value="http" ${rule.proxyType === 'http' ? 'selected' : ''}>HTTP</option>
              <option value="https" ${rule.proxyType === 'https' ? 'selected' : ''}>HTTPS</option>
              <option value="socks4" ${rule.proxyType === 'socks4' ? 'selected' : ''}>SOCKS4</option>
              <option value="socks5" ${rule.proxyType === 'socks5' ? 'selected' : ''}>SOCKS5</option>
            </select>
          </div>
          <div class="config-item">
            <label>Host:</label>
            <input type="text" class="config-input rule-host" value="${rule.host}" placeholder="127.0.0.1">
          </div>
          <div class="config-item">
            <label>Port:</label>
            <input type="number" class="config-input rule-port" min="1" max="65535" value="${rule.port}">
          </div>
          <div class="config-item">
            <label>Username:</label>
            <input type="text" class="config-input rule-username" value="${rule.username || ''}" placeholder="optional">
          </div>
          <div class="config-item">
            <label>Password:</label>
            <input type="password" class="config-input rule-password" value="${rule.password || ''}" placeholder="optional">
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

    // Add event listeners for this rule
    this.setupProxyRuleEventListeners(ruleDiv, rule.id);

    return ruleDiv;
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
          proxyType: (ruleElement.querySelector('.rule-type') as HTMLSelectElement)?.value as any || rule.proxyType,
          host: (ruleElement.querySelector('.rule-host') as HTMLInputElement)?.value || rule.host,
          port: parseInt((ruleElement.querySelector('.rule-port') as HTMLInputElement)?.value || '0') || rule.port,
          username: (ruleElement.querySelector('.rule-username') as HTMLInputElement)?.value || rule.username,
          password: (ruleElement.querySelector('.rule-password') as HTMLInputElement)?.value || rule.password,
          domainPatterns: ((ruleElement.querySelector('.rule-patterns') as HTMLTextAreaElement)?.value || '').split('\n').filter(p => p.trim()) || rule.domainPatterns,
          bypassList: ((ruleElement.querySelector('.rule-bypass') as HTMLTextAreaElement)?.value || '').split('\n').filter(p => p.trim()) || rule.bypassList
        };

        this.showStatus(`Testing ${currentRule.proxyType.toUpperCase()} proxy ${currentRule.host}:${currentRule.port}...`, 'info');
        
        const response = await chrome.runtime.sendMessage({
          action: 'testProxyConnection',
          proxyRule: currentRule,
          testUrl: 'https://www.google.com'
        });

        if (response.success) {
          const isValid = response.data.isValid;
          if (isValid) {
            this.showStatus(`✅ Proxy test passed for ${currentRule.host}:${currentRule.port}`, 'success');
          } else {
            this.showStatus(`❌ Proxy test failed for ${currentRule.host}:${currentRule.port}. Check host, port, and credentials.`, 'error');
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

  private createDefaultRule(): ProxyRule {
    return {
      id: this.generateRuleId(),
      name: `Proxy Rule ${(this.currentProxyConfig?.rules.length || 0) + 1}`,
      enabled: true,
      domainPatterns: ['*.example.com'],
      proxyType: 'http',
      host: '127.0.0.1',
      port: 8080,
      bypassList: ['localhost', '127.0.0.1', '*.local']
    };
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
        rules: []
      };
    }

    // Update from UI
    this.currentProxyConfig.enabled = this.elements.proxyEnabled?.checked || false;

    // Update global proxy
    if (this.elements.globalProxyEnabled?.checked) {
      this.currentProxyConfig.globalProxy = {
        id: 'global-proxy',
        name: 'Global Proxy',
        enabled: true,
        domainPatterns: ['*'],
        proxyType: (this.elements.globalProxyType?.value as any) || 'http',
        host: this.elements.globalProxyHost?.value || '127.0.0.1',
        port: parseInt(this.elements.globalProxyPort?.value || '8080'),
        username: this.elements.globalProxyUsername?.value || undefined,
        password: this.elements.globalProxyPassword?.value || undefined,
        bypassList: this.elements.globalProxyBypass?.value.split('\n').filter(p => p.trim()) || []
      };
    } else {
      this.currentProxyConfig.globalProxy = undefined;
    }

    // Update rules from DOM
    this.updateRulesFromDOM();

    return this.currentProxyConfig;
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
        proxyType: (ruleElement.querySelector('.rule-type') as HTMLSelectElement)?.value as any || 'http',
        host: (ruleElement.querySelector('.rule-host') as HTMLInputElement)?.value || '127.0.0.1',
        port: parseInt((ruleElement.querySelector('.rule-port') as HTMLInputElement)?.value || '8080'),
        username: (ruleElement.querySelector('.rule-username') as HTMLInputElement)?.value || undefined,
        password: (ruleElement.querySelector('.rule-password') as HTMLInputElement)?.value || undefined,
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
      rules: []
    };

    this.loadProxyConfigUI(this.currentProxyConfig);
    this.showStatus('Proxy configuration reset to defaults', 'info');
  }

  private handleAddProxyRule(): void {
    if (!this.currentProxyConfig) {
      this.currentProxyConfig = { enabled: false, rules: [] };
    }

    const newRule = this.createDefaultRule();
    this.currentProxyConfig.rules.push(newRule);
    this.renderProxyRules(this.currentProxyConfig.rules);
    this.showStatus('New proxy rule added', 'info');
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
          debugInfo += `Global Proxy: ${this.currentProxyConfig.globalProxy ? 'Yes' : 'No'}\n\n`;
          
          if (this.currentProxyConfig.globalProxy) {
            debugInfo += `Global Proxy Details:\n`;
            debugInfo += `  Type: ${this.currentProxyConfig.globalProxy.proxyType}\n`;
            debugInfo += `  Host: ${this.currentProxyConfig.globalProxy.host}\n`;
            debugInfo += `  Port: ${this.currentProxyConfig.globalProxy.port}\n`;
            debugInfo += `  Auth: ${this.currentProxyConfig.globalProxy.username ? 'Yes' : 'No'}\n\n`;
          }
          
          if (this.currentProxyConfig.rules.length > 0) {
            debugInfo += `Proxy Rules:\n`;
            this.currentProxyConfig.rules.forEach((rule, index) => {
              debugInfo += `  ${index + 1}. ${rule.name} (${rule.enabled ? 'Enabled' : 'Disabled'})\n`;
              debugInfo += `     Type: ${rule.proxyType}, Host: ${rule.host}:${rule.port}\n`;
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
        debugInfo += '6. Check Network tab - requests should show proxy indicator\n';
        debugInfo += '7. Visit httpbin.org/ip to see your IP (should show proxy IP if working)\n\n';
        debugInfo += '⚠️ COMMON ISSUES:\n';
        debugInfo += '• Mode is "direct": Extension not controlling proxy (check for errors)\n';
        debugInfo += '• Mode is "system": Chrome using system proxy instead\n';
        debugInfo += '• No [PAC] messages: PAC script not loaded or has errors\n';
        debugInfo += '• Other extension controlling: Disable other proxy extensions\n\n';
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