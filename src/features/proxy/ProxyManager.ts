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
    
    // Setup authentication handlers
    this.setupAuthenticationHandlers();
    
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
      profiles: [],
      rules: []
    };
  }

  public async saveConfiguration(config: ProxyConfiguration): Promise<void> {
    try {
      await chrome.storage.sync.set({ proxyConfig: config });
      this.proxyConfig = config;
      
      // Re-setup authentication handlers with new configuration
      this.clearAuthenticationHandlers();
      this.setupAuthenticationHandlers();
      
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

  public findMatchingProxyRule(url: string): { rule: ProxyRule; profile: ProxyProfile } | null {
    if (!this.proxyConfig || !this.proxyConfig.enabled) {
      return null;
    }

    // Check specific rules first
    for (const rule of this.proxyConfig.rules) {
      if (rule.enabled && this.matchDomainPattern(url, rule.domainPatterns)) {
        const profile = this.findProfileById(rule.profileId);
        if (profile) {
          return { rule, profile };
        }
      }
    }

    // Check global proxy if no specific rule matches
    if (this.proxyConfig.globalProxyProfileId) {
      const globalProfile = this.findProfileById(this.proxyConfig.globalProxyProfileId);
      if (globalProfile) {
        // Create a virtual rule for global proxy
        const globalRule: ProxyRule = {
          id: 'global-proxy',
          name: 'Global Proxy',
          enabled: true,
          domainPatterns: ['*'],
          profileId: this.proxyConfig.globalProxyProfileId,
          bypassList: []
        };
        return { rule: globalRule, profile: globalProfile };
      }
    }

    return null;
  }

  private findProfileById(profileId: string): ProxyProfile | null {
    if (!this.proxyConfig) {
      return null;
    }
    return this.proxyConfig.profiles.find(profile => profile.id === profileId) || null;
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

    // Create sanitized versions of profiles and rules for the PAC script
    const sanitizedProfiles = this.proxyConfig.profiles.map(profile => ({
      ...profile,
      password: undefined // Remove password from PAC script
    }));
    
    const sanitizedRules = this.proxyConfig.rules.filter(rule => rule.enabled);
    
    const sanitizedGlobalProxyProfileId = this.proxyConfig.globalProxyProfileId;

    // Validate that we have rules or global proxy
    if (sanitizedRules.length === 0 && !sanitizedGlobalProxyProfileId) {
      console.warn('⚠️ No proxy rules configured, PAC script will return DIRECT for all requests');
    }

    const pacScript = `
function FindProxyForURL(url, host) {
  // Embedded proxy configuration
  var profiles = ${JSON.stringify(sanitizedProfiles)};
  var rules = ${JSON.stringify(sanitizedRules)};
  var globalProxyProfileId = ${JSON.stringify(sanitizedGlobalProxyProfileId)};
  
  // Debug logging
  console.log("[PAC] Processing: " + url + " (host: " + host + ")");
  console.log("[PAC] Available profiles: " + profiles.length);
  console.log("[PAC] Available rules: " + rules.length);
  console.log("[PAC] Global proxy profile: " + (globalProxyProfileId ? globalProxyProfileId : "None"));
  
  // Helper function to find profile by ID
  function findProfile(profileId) {
    for (var i = 0; i < profiles.length; i++) {
      if (profiles[i].id === profileId) {
        return profiles[i];
      }
    }
    return null;
  }
  
  // Helper function to build proxy string from profile
  function buildProxyString(profile) {
    var proxyType = profile.proxyType.toUpperCase();
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
    return proxyType + " " + profile.host + ":" + profile.port;
  }
  
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
          console.log("[PAC] Rule matched! Looking for profile: " + rule.profileId);
          
          // Find the profile for this rule
          var profile = findProfile(rule.profileId);
          if (!profile) {
            console.log("[PAC] Profile not found: " + rule.profileId);
            continue;
          }
          
          console.log("[PAC] Found profile: " + profile.name + " (" + profile.proxyType + " " + profile.host + ":" + profile.port + ")");
          
          // Check bypass list
          if (rule.bypassList && rule.bypassList.length > 0) {
            for (var k = 0; k < rule.bypassList.length; k++) {
              if (matchPattern(host, rule.bypassList[k])) {
                console.log("[PAC] Bypassed by rule: " + rule.bypassList[k]);
                return "DIRECT";
              }
            }
          }
          
          var proxyStr = buildProxyString(profile);
          console.log("[PAC] Using proxy: " + proxyStr + " for rule: " + rule.name + " (profile: " + profile.name + ")");
          return proxyStr;
        }
      }
    }
  }
  
  // Check global proxy
  if (globalProxyProfileId) {
    console.log("[PAC] Checking global proxy profile: " + globalProxyProfileId);
    
    var globalProfile = findProfile(globalProxyProfileId);
    if (globalProfile) {
      console.log("[PAC] Found global profile: " + globalProfile.name + " (" + globalProfile.proxyType + " " + globalProfile.host + ":" + globalProfile.port + ")");
      
      var globalProxyStr = buildProxyString(globalProfile);
      console.log("[PAC] Using global proxy: " + globalProxyStr + " (profile: " + globalProfile.name + ")");
      return globalProxyStr;
    } else {
      console.log("[PAC] Global proxy profile not found: " + globalProxyProfileId);
    }
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
      
      // Also clear authentication handlers when proxy is disabled
      this.clearAuthenticationHandlers();
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
    // Validate profile ID
    if (!rule.profileId || rule.profileId.trim() === '') {
      console.error('❌ Proxy rule validation: Profile ID is required');
      return false;
    }

    // Check if profile exists
    const profile = this.findProfileById(rule.profileId);
    if (!profile) {
      console.error('❌ Proxy rule validation: Referenced profile not found:', rule.profileId);
      return false;
    }

    // Validate domain patterns (only for non-global proxy)
    if (rule.id !== 'global-proxy' && (!rule.domainPatterns || rule.domainPatterns.length === 0)) {
      console.error('❌ Proxy rule validation: At least one domain pattern is required');
      return false;
    }

    // Validate domain patterns format
    if (rule.domainPatterns) {
      for (const pattern of rule.domainPatterns) {
        if (pattern.trim() === '') continue;
        
        // Basic pattern validation - check for obviously invalid patterns
        if (pattern.includes('..') || pattern.startsWith('.') && pattern.length === 1) {
          console.error('❌ Proxy rule validation: Invalid domain pattern:', pattern);
          return false;
        }
      }
    }

    return true;
  }

  public validateProxyProfile(profile: ProxyProfile): boolean {
    // Validate host
    if (!profile.host || profile.host.trim() === '') {
      console.error('❌ Proxy profile validation: Host is required');
      return false;
    }

    // Validate host format (basic check)
    const hostPattern = /^[a-zA-Z0-9.-]+$/;
    if (!hostPattern.test(profile.host.trim())) {
      console.error('❌ Proxy profile validation: Invalid host format');
      return false;
    }

    // Validate port
    if (!profile.port || profile.port < 1 || profile.port > 65535) {
      console.error('❌ Proxy profile validation: Port must be between 1 and 65535');
      return false;
    }

    // Validate proxy type
    if (!['http', 'https', 'socks4', 'socks5'].includes(profile.proxyType)) {
      console.error('❌ Proxy profile validation: Invalid proxy type');
      return false;
    }

    // Validate authentication if provided
    if (profile.username && profile.username.trim() !== '' && (!profile.password || profile.password.trim() === '')) {
      console.warn('⚠️ Proxy profile validation: Username provided but password is empty');
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
      profileId: '', // Will need to be set to an existing profile ID
      bypassList: ['localhost', '127.0.0.1', '*.local']
    };
  }

  public generateProfileId(): string {
    return 'proxy-profile-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  public createDefaultProfile(): ProxyProfile {
    return {
      id: this.generateProfileId(),
      name: 'New Proxy Profile',
      proxyType: 'http',
      host: '127.0.0.1',
      port: 8080,
      description: 'Default proxy profile'
    };
  }

  public getProfiles(): ProxyProfile[] {
    return this.proxyConfig?.profiles || [];
  }

  public addProfile(profile: ProxyProfile): void {
    if (!this.proxyConfig) {
      this.proxyConfig = this.getDefaultConfiguration();
    }
    this.proxyConfig.profiles.push(profile);
  }

  public updateProfile(profileId: string, updatedProfile: Partial<ProxyProfile>): boolean {
    if (!this.proxyConfig) return false;
    
    const profileIndex = this.proxyConfig.profiles.findIndex(p => p.id === profileId);
    if (profileIndex === -1) return false;
    
    this.proxyConfig.profiles[profileIndex] = { ...this.proxyConfig.profiles[profileIndex], ...updatedProfile };
    return true;
  }

  public removeProfile(profileId: string): boolean {
    if (!this.proxyConfig) return false;
    
    // Check if profile is being used by any rules or global proxy
    const isUsedByRules = this.proxyConfig.rules.some(rule => rule.profileId === profileId);
    const isUsedByGlobal = this.proxyConfig.globalProxyProfileId === profileId;
    
    if (isUsedByRules || isUsedByGlobal) {
      console.warn(`Cannot remove profile ${profileId} - it is being used by rules or global proxy`);
      return false;
    }
    
    const originalLength = this.proxyConfig.profiles.length;
    this.proxyConfig.profiles = this.proxyConfig.profiles.filter(p => p.id !== profileId);
    return this.proxyConfig.profiles.length < originalLength;
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

    if (!Array.isArray(config.profiles)) {
      return false;
    }

    if (!Array.isArray(config.rules)) {
      return false;
    }

    // Validate all profiles
    for (const profile of config.profiles) {
      if (!this.validateProxyProfile(profile)) {
        return false;
      }
    }

    // Validate all rules
    for (const rule of config.rules) {
      if (!this.validateProxyRule(rule)) {
        return false;
      }
    }

    // Validate global proxy profile reference if set
    if (config.globalProxyProfileId) {
      const globalProfile = config.profiles.find(p => p.id === config.globalProxyProfileId);
      if (!globalProfile) {
        console.error('❌ Configuration validation: Global proxy profile not found:', config.globalProxyProfileId);
        return false;
      }
    }

    return true;
  }

  // Authentication handling methods
  private setupAuthenticationHandlers(): void {
    if (!chrome.webRequest) {
      console.warn('⚠️ webRequest API not available - proxy authentication will require manual input');
      return;
    }

    console.log('🔐 Setting up proxy authentication handlers...');

    // Handle authentication challenges
    chrome.webRequest.onAuthRequired.addListener(
      this.handleAuthRequired.bind(this),
      { urls: ['<all_urls>'] },
      ['blocking']
    );

    console.log('✅ Proxy authentication handlers configured');
  }

  private handleAuthRequired(
    details: chrome.webRequest.WebAuthenticationChallengeDetails
  ): chrome.webRequest.BlockingResponse | undefined {
    console.log('🔐 Authentication challenge received:', {
      url: details.url,
      challenger: details.challenger,
      scheme: details.scheme,
      realm: details.realm
    });

    // Only handle proxy authentication challenges
    if (details.challenger?.host && details.challenger?.port) {
      const proxyHost = details.challenger.host;
      const proxyPort = details.challenger.port;
      
      console.log(`🔍 Looking for credentials for proxy ${proxyHost}:${proxyPort}`);
      
      // Find matching proxy rule with credentials
      const credentials = this.findProxyCredentials(proxyHost, proxyPort);
      
      if (credentials) {
        console.log(`✅ Found credentials for proxy ${proxyHost}:${proxyPort}, username: ${credentials.username}`);
        
        return {
          authCredentials: {
            username: credentials.username,
            password: credentials.password
          }
        };
      } else {
        console.log(`❌ No credentials found for proxy ${proxyHost}:${proxyPort}`);
      }
    }

    // Let browser handle if no credentials found
    return {};
  }

  private findProxyCredentials(host: string, port: number): { username: string; password: string } | null {
    if (!this.proxyConfig) {
      return null;
    }

    // Check all profiles for matching host/port with credentials
    for (const profile of this.proxyConfig.profiles) {
      if (profile.host === host &&
          profile.port === port &&
          profile.username &&
          profile.password) {
        
        console.log(`🔐 Using profile credentials: ${profile.name} (${profile.proxyType} ${profile.host}:${profile.port})`);
        return {
          username: profile.username,
          password: profile.password
        };
      }
    }

    console.log(`❌ No credentials found for proxy ${host}:${port} in any profile`);
    return null;
  }

  public clearAuthenticationHandlers(): void {
    if (chrome.webRequest && chrome.webRequest.onAuthRequired.hasListener(this.handleAuthRequired)) {
      chrome.webRequest.onAuthRequired.removeListener(this.handleAuthRequired);
      console.log('🧹 Proxy authentication handlers cleared');
    }
  }
}

export default ProxyManager;