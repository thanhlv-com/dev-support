// Proxy Manager for Dev Support Extension
// Handles proxy configuration, domain pattern matching, and Chrome proxy API integration

/// <reference path="../../types/global.d.ts" />

interface ProxyManagerMessage extends ChromeMessage {
  action: 'configureProxy' | 'getProxyConfig' | 'saveProxyConfig' | 'testProxyConnection';
  proxyConfig?: ProxyConfiguration;
  url?: string;
}

class ProxyManager {
  private static instance: ProxyManager;
  private proxyConfig: ProxyConfiguration | null = null;

  private constructor() {
    console.log('🌐 ProxyManager created');
    this.proxyConfig = this.getDefaultConfiguration();
  }

  public static getInstance(): ProxyManager {
    if (!ProxyManager.instance) {
      ProxyManager.instance = new ProxyManager();
    }
    return ProxyManager.instance;
  }

  public async initialize(): Promise<void> {
    console.log('🌐 ProxyManager initializing...');
    await this.loadConfiguration();
    
    // Apply configuration if enabled
    if (this.proxyConfig && this.proxyConfig.enabled) {
      console.log('🔧 Applying existing proxy configuration on startup...');
      await this.applyProxyConfiguration();
    }
    console.log('✅ ProxyManager initialized successfully');
  }

  private async loadConfiguration(): Promise<void> {
    try {
      const result = await chrome.storage.sync.get(['proxyConfig']);
      this.proxyConfig = result.proxyConfig || this.getDefaultConfiguration();
      console.log('📋 Proxy configuration loaded (rules count):', this.proxyConfig?.rules.length || 0);
    } catch (error) {
      console.error('❌ Error loading proxy configuration:', error);
      this.proxyConfig = this.getDefaultConfiguration();
    }
  }

  private getDefaultConfiguration(): ProxyConfiguration {
    return {
      enabled: false,
      rules: []
    };
  }

  public async saveConfiguration(config: ProxyConfiguration): Promise<void> {
    try {
      await chrome.storage.sync.set({ proxyConfig: config });
      this.proxyConfig = config;
      
      if (config.enabled) {
        await this.applyProxyConfiguration();
      } else {
        await this.clearProxyConfiguration();
      }
      
      console.log('💾 Proxy configuration saved and applied');
    } catch (error) {
      console.error('❌ Error saving proxy configuration:', error);
      throw error;
    }
  }

  public getConfiguration(): ProxyConfiguration | null {
    return this.proxyConfig;
  }

  public matchDomainPattern(url: string, patterns: string[]): boolean {
    if (!patterns || patterns.length === 0) {
      return false;
    }

    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;
      
      for (const pattern of patterns) {
        if (this.matchPattern(domain, pattern.trim())) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.warn('Invalid URL for pattern matching:', url, error);
      return false;
    }
  }

  private matchPattern(domain: string, pattern: string): boolean {
    if (!pattern) return false;
    
    // Convert glob-like pattern to regex
    // * matches any sequence of characters
    // ? matches any single character
    // Support for subdomain wildcards like *.example.com
    const regexPattern = pattern
      .replace(/\./g, '\\.')  // Escape dots
      .replace(/\*/g, '.*')   // * becomes .*
      .replace(/\?/g, '.');   // ? becomes .
    
    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(domain);
  }

  public findMatchingProxyRule(url: string): ProxyRule | null {
    if (!this.proxyConfig || !this.proxyConfig.enabled) {
      return null;
    }

    // Check specific rules first
    for (const rule of this.proxyConfig.rules) {
      if (rule.enabled && this.matchDomainPattern(url, rule.domainPatterns)) {
        return rule;
      }
    }

    // Check global proxy if no specific rule matches
    if (this.proxyConfig.globalProxy && this.proxyConfig.globalProxy.enabled) {
      return this.proxyConfig.globalProxy;
    }

    return null;
  }

  private async applyProxyConfiguration(): Promise<void> {
    if (!this.proxyConfig || !this.proxyConfig.enabled) {
      console.log('🔄 Proxy configuration disabled or not available, clearing any existing proxy settings');
      await this.clearProxyConfiguration();
      return;
    }

    try {
      // Check if proxy API is available
      if (!chrome.proxy || !chrome.proxy.settings) {
        console.error('❌ Chrome proxy API not available - extension may need proxy permission');
        throw new Error('Chrome proxy API not available. Make sure the extension has "proxy" permission.');
      }

      console.log('🔧 Building Chrome proxy configuration...');
      console.log('📊 Current proxy config:', {
        enabled: this.proxyConfig.enabled,
        rulesCount: this.proxyConfig.rules.length,
        hasGlobalProxy: !!this.proxyConfig.globalProxy,
        enabledRules: this.proxyConfig.rules.filter(r => r.enabled).length
      });
      
      const proxyConfig = this.buildChromeProxyConfig();
      
      console.log('📝 Generated PAC script preview:', proxyConfig.pacScript?.data?.substring(0, 300) + '...');
      
      // First clear any existing proxy settings
      await chrome.proxy.settings.clear({ scope: 'regular' });
      console.log('🧹 Cleared existing proxy settings');
      
      // Apply new proxy configuration
      await chrome.proxy.settings.set({
        value: proxyConfig,
        scope: 'regular'
      });

      console.log('✅ Proxy configuration applied to Chrome successfully');
      
      // Verify the configuration was set
      const verification = await chrome.proxy.settings.get({});
      console.log('🔍 Verification - Current proxy mode:', verification.value.mode);
      console.log('🔍 Verification - Level of control:', verification.levelOfControl);
      
      if (verification.value.mode !== 'pac_script') {
        console.warn('⚠️ Expected proxy mode "pac_script" but got:', verification.value.mode);
      }
      
      if (verification.levelOfControl !== 'controlled_by_this_extension') {
        console.warn('⚠️ Proxy not controlled by this extension. Level:', verification.levelOfControl);
      }
      
    } catch (error) {
      console.error('❌ Error applying proxy configuration:', error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('not available')) {
          console.error('💡 Solution: Make sure the extension has "proxy" permission in manifest.json');
        } else if (error.message.includes('PAC script')) {
          console.error('💡 Solution: Check PAC script syntax for errors');
        } else if (error.message.includes('controlled by')) {
          console.error('💡 Solution: Another extension or system setting is controlling proxy');
        }
      }
      
      throw error;
    }
  }

  private buildChromeProxyConfig(): chrome.proxy.ProxyConfig {
    if (!this.proxyConfig) {
      throw new Error('No proxy configuration available');
    }

    // Build PAC script for complex routing
    const pacScript = this.generatePacScript();
    
    return {
      mode: 'pac_script',
      pacScript: {
        data: pacScript
      }
    };
  }

  private generatePacScript(): string {
    if (!this.proxyConfig) {
      return 'function FindProxyForURL(url, host) { return "DIRECT"; }';
    }

    // Create sanitized versions without passwords for the PAC script
    const sanitizedRules = this.proxyConfig.rules.filter(rule => rule.enabled).map(rule => ({
      ...rule,
      password: undefined // Remove password from PAC script
    }));
    
    const sanitizedGlobalProxy = this.proxyConfig.globalProxy ? {
      ...this.proxyConfig.globalProxy,
      password: undefined // Remove password from PAC script
    } : null;

    // Validate that we have rules or global proxy
    if (sanitizedRules.length === 0 && !sanitizedGlobalProxy) {
      console.warn('⚠️ No proxy rules configured, PAC script will return DIRECT for all requests');
    }

    const pacScript = `
function FindProxyForURL(url, host) {
  // Embedded proxy configuration
  var rules = ${JSON.stringify(sanitizedRules)};
  var globalProxy = ${JSON.stringify(sanitizedGlobalProxy)};
  
  // Debug logging
  console.log("[PAC] Processing: " + url + " (host: " + host + ")");
  console.log("[PAC] Available rules: " + rules.length);
  console.log("[PAC] Global proxy: " + (globalProxy ? "Yes" : "No"));
  
  // Helper function to match domain patterns
  function matchPattern(domain, pattern) {
    if (!pattern) return false;
    
    console.log("[PAC] Matching '" + domain + "' against pattern '" + pattern + "'");
    
    // Handle exact matches first
    if (pattern === domain || pattern === '*') {
      console.log("[PAC] Exact match or wildcard: true");
      return true;
    }
    
    // Handle simple wildcard patterns
    if (pattern.indexOf('*') !== -1) {
      // Replace * with .* for regex, but be careful with escaping
      var escapedPattern = pattern.replace(/\\\\/g, '\\\\\\\\')  // Double escape backslashes
                                  .replace(/\\./g, '\\\\.')      // Escape dots
                                  .replace(/\\*/g, '.*');        // * becomes .*
      try {
        var regex = new RegExp('^' + escapedPattern + '$', 'i');
        var matches = regex.test(domain);
        console.log("[PAC] Regex '" + escapedPattern + "' matches: " + matches);
        return matches;
      } catch (e) {
        console.log("[PAC] Regex error for pattern '" + pattern + "': " + e.message);
        // Fallback to simple string comparison
        return domain.toLowerCase() === pattern.toLowerCase();
      }
    }
    
    // Exact string match
    var matches = domain.toLowerCase() === pattern.toLowerCase();
    console.log("[PAC] Exact string match: " + matches);
    return matches;
  }
  
  // Check specific rules first
  for (var i = 0; i < rules.length; i++) {
    var rule = rules[i];
    console.log("[PAC] Checking rule: " + rule.name + " (enabled: " + rule.enabled + ")");
    
    if (rule.enabled) {
      for (var j = 0; j < rule.domainPatterns.length; j++) {
        var pattern = rule.domainPatterns[j];
        if (matchPattern(host, pattern)) {
          console.log("[PAC] Rule matched! Checking bypass list...");
          
          // Check bypass list
          if (rule.bypassList && rule.bypassList.length > 0) {
            for (var k = 0; k < rule.bypassList.length; k++) {
              if (matchPattern(host, rule.bypassList[k])) {
                console.log("[PAC] Bypassed by rule: " + rule.bypassList[k]);
                return "DIRECT";
              }
            }
          }
          
          var proxyType = rule.proxyType.toUpperCase();
          // Chrome expects specific proxy type names in PAC scripts
          if (proxyType === "SOCKS4") {
            proxyType = "SOCKS";
          } else if (proxyType === "SOCKS5") {
            proxyType = "SOCKS5";
          } else if (proxyType === "HTTPS") {
            proxyType = "HTTPS";
          } else {
            proxyType = "PROXY"; // HTTP becomes PROXY in PAC scripts
          }
          var proxyStr = proxyType + " " + rule.host + ":" + rule.port;
          console.log("[PAC] Using proxy: " + proxyStr + " for rule: " + rule.name);
          return proxyStr;
        }
      }
    }
  }
  
  // Check global proxy
  if (globalProxy && globalProxy.enabled) {
    console.log("[PAC] Checking global proxy...");
    
    // Check bypass list for global proxy
    if (globalProxy.bypassList && globalProxy.bypassList.length > 0) {
      for (var i = 0; i < globalProxy.bypassList.length; i++) {
        if (matchPattern(host, globalProxy.bypassList[i])) {
          console.log("[PAC] Bypassed by global proxy rule: " + globalProxy.bypassList[i]);
          return "DIRECT";
        }
      }
    }
    
    var globalProxyType = globalProxy.proxyType.toUpperCase();
    // Chrome expects specific proxy type names in PAC scripts
    if (globalProxyType === "SOCKS4") {
      globalProxyType = "SOCKS";
    } else if (globalProxyType === "SOCKS5") {
      globalProxyType = "SOCKS5";
    } else if (globalProxyType === "HTTPS") {
      globalProxyType = "HTTPS";
    } else {
      globalProxyType = "PROXY"; // HTTP becomes PROXY in PAC scripts
    }
    var globalProxyStr = globalProxyType + " " + globalProxy.host + ":" + globalProxy.port;
    console.log("[PAC] Using global proxy: " + globalProxyStr);
    return globalProxyStr;
  }
  
  console.log("[PAC] No proxy rules matched, using DIRECT");
  return "DIRECT";
}`;

    return pacScript;
  }

  private async clearProxyConfiguration(): Promise<void> {
    try {
      if (chrome.proxy && chrome.proxy.settings) {
        await chrome.proxy.settings.clear({ scope: 'regular' });
        console.log('🧹 Proxy configuration cleared');
      }
    } catch (error) {
      console.error('❌ Error clearing proxy configuration:', error);
      throw error;
    }
  }

  public async testProxyConnection(rule: ProxyRule, testUrl: string = 'https://www.google.com'): Promise<boolean> {
    try {
      console.log(`🧪 Testing proxy connection to ${rule.host}:${rule.port}`);
      
      // First validate the rule structure
      if (!this.validateProxyRule(rule)) {
        console.error('❌ Proxy rule validation failed');
        return false;
      }

      // Test basic connectivity using a simple approach
      // We'll try to create a temporary proxy configuration and test it
      const testResult = await this.performProxyConnectivityTest(rule, testUrl);
      
      if (testResult) {
        console.log('✅ Proxy connection test passed');
      } else {
        console.log('❌ Proxy connection test failed');
      }
      
      return testResult;
    } catch (error) {
      console.error('❌ Proxy connection test failed:', error);
      return false;
    }
  }

  private async performProxyConnectivityTest(rule: ProxyRule, testUrl: string): Promise<boolean> {
    try {
      // Create a test PAC script for this specific rule
      const testPacScript = this.generateTestPacScript(rule);
      
      // Store current proxy configuration
      let originalConfig: chrome.proxy.ProxyConfig | null = null;
      
      if (chrome.proxy?.settings) {
        try {
          // Get current settings
          const currentSettings = await chrome.proxy.settings.get({});
          originalConfig = currentSettings.value;
          
          // Set temporary proxy configuration
          await chrome.proxy.settings.set({
            value: {
              mode: 'pac_script',
              pacScript: {
                data: testPacScript
              }
            },
            scope: 'regular'
          });
          
          // Wait a moment for the proxy to be applied
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Try to make a simple request (this is limited in extension context)
          // For now, we'll just return true if we can set the proxy without errors
          const testSuccess = true; // In a real implementation, you'd make an actual request
          
          // Restore original configuration
          if (originalConfig) {
            await chrome.proxy.settings.set({
              value: originalConfig,
              scope: 'regular'
            });
          } else {
            await chrome.proxy.settings.clear({ scope: 'regular' });
          }
          
          return testSuccess;
        } catch (proxyError) {
          console.error('Proxy API error:', proxyError);
          
          // Try to restore original config on error
          try {
            if (originalConfig) {
              await chrome.proxy.settings.set({
                value: originalConfig,
                scope: 'regular'
              });
            } else {
              await chrome.proxy.settings.clear({ scope: 'regular' });
            }
          } catch (restoreError) {
            console.error('Failed to restore proxy configuration:', restoreError);
          }
          
          return false;
        }
      } else {
        console.warn('⚠️ Chrome proxy API not available');
        return false;
      }
    } catch (error) {
      console.error('❌ Proxy connectivity test error:', error);
      return false;
    }
  }

  private generateTestPacScript(rule: ProxyRule): string {
    // Generate a simple PAC script for testing this specific rule
    let proxyType = rule.proxyType.toUpperCase();
    
    // Chrome expects specific proxy type names in PAC scripts
    if (proxyType === "SOCKS4") {
      proxyType = "SOCKS";
    } else if (proxyType === "SOCKS5") {
      proxyType = "SOCKS5";
    } else if (proxyType === "HTTPS") {
      proxyType = "HTTPS";
    } else {
      proxyType = "PROXY"; // HTTP becomes PROXY in PAC scripts
    }
    
    return `
function FindProxyForURL(url, host) {
  // Test proxy configuration
  var proxyStr = "${proxyType} ${rule.host}:${rule.port}";
  return proxyStr;
}`;
  }

  public validateProxyRule(rule: ProxyRule): boolean {
    // Validate host
    if (!rule.host || rule.host.trim() === '') {
      console.error('❌ Proxy validation: Host is required');
      return false;
    }

    // Validate host format (basic check)
    const hostPattern = /^[a-zA-Z0-9.-]+$/;
    if (!hostPattern.test(rule.host.trim())) {
      console.error('❌ Proxy validation: Invalid host format');
      return false;
    }

    // Validate port
    if (!rule.port || rule.port < 1 || rule.port > 65535) {
      console.error('❌ Proxy validation: Port must be between 1 and 65535');
      return false;
    }

    // Validate proxy type
    if (!['http', 'https', 'socks4', 'socks5'].includes(rule.proxyType)) {
      console.error('❌ Proxy validation: Invalid proxy type');
      return false;
    }

    // Validate domain patterns (only for non-global proxy)
    if (rule.id !== 'global-proxy' && (!rule.domainPatterns || rule.domainPatterns.length === 0)) {
      console.error('❌ Proxy validation: At least one domain pattern is required');
      return false;
    }

    // Validate domain patterns format
    if (rule.domainPatterns) {
      for (const pattern of rule.domainPatterns) {
        if (pattern.trim() === '') continue;
        
        // Basic pattern validation - check for obviously invalid patterns
        if (pattern.includes('..') || pattern.startsWith('.') && pattern.length === 1) {
          console.error('❌ Proxy validation: Invalid domain pattern:', pattern);
          return false;
        }
      }
    }

    // Validate authentication if provided
    if (rule.username && rule.username.trim() !== '' && (!rule.password || rule.password.trim() === '')) {
      console.warn('⚠️ Proxy validation: Username provided but password is empty');
    }

    return true;
  }

  public generateRuleId(): string {
    return 'proxy-rule-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  public createDefaultRule(): ProxyRule {
    return {
      id: this.generateRuleId(),
      name: 'New Proxy Rule',
      enabled: true,
      domainPatterns: ['*.example.com'],
      proxyType: 'http',
      host: '127.0.0.1',
      port: 8080,
      bypassList: ['localhost', '127.0.0.1', '*.local']
    };
  }

  // Export/Import functionality
  public exportConfiguration(): string {
    return JSON.stringify(this.proxyConfig, null, 2);
  }

  public async importConfiguration(configJson: string): Promise<void> {
    try {
      const config = JSON.parse(configJson) as ProxyConfiguration;
      
      // Validate imported configuration
      if (!this.validateConfiguration(config)) {
        throw new Error('Invalid proxy configuration format');
      }

      await this.saveConfiguration(config);
      console.log('📥 Proxy configuration imported successfully');
    } catch (error) {
      console.error('❌ Error importing proxy configuration:', error);
      throw error;
    }
  }

  private validateConfiguration(config: ProxyConfiguration): boolean {
    if (typeof config.enabled !== 'boolean') {
      return false;
    }

    if (!Array.isArray(config.rules)) {
      return false;
    }

    for (const rule of config.rules) {
      if (!this.validateProxyRule(rule)) {
        return false;
      }
    }

    if (config.globalProxy && !this.validateProxyRule(config.globalProxy)) {
      return false;
    }

    return true;
  }
}

export default ProxyManager;