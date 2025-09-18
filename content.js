// Content script for Dev Support Extension
// This script runs on every webpage and provides additional functionality

console.log('🚀 Dev Support Extension content script loaded');

// Create a namespace to avoid conflicts
const DevSupport = {
  initialized: false,
  
  init() {
    if (this.initialized) return;
    this.initialized = true;
    
    console.log('🔧 Initializing Dev Support content script');
    
    this.setupMessageListener();
    this.setupKeyboardShortcuts();
    this.setupPageAnalytics();
    this.injectUtilities();
  },
  
  setupMessageListener() {
    // Listen for messages from popup and background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('📨 Content script received message:', message);
      
      switch (message.action) {
        case 'getPageInfo':
          sendResponse(this.getPageInfo());
          break;
          
        case 'highlightElements':
          this.highlightElements(message.selector);
          sendResponse({ success: true });
          break;
          
        case 'injectCSS':
          this.injectCSS(message.css);
          sendResponse({ success: true });
          break;
          
        case 'analyzePerformance':
          sendResponse(this.analyzePerformance());
          break;
      }
    });
  },
  
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + Shift + D: Toggle debug mode
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        this.toggleDebugMode();
      }
      
      // Ctrl/Cmd + Shift + H: Highlight all interactive elements
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'H') {
        e.preventDefault();
        this.highlightInteractiveElements();
      }
    });
  },
  
  setupPageAnalytics() {
    // Track page load time
    window.addEventListener('load', () => {
      const loadTime = performance.now();
      console.log(`📊 Page load time: ${loadTime.toFixed(2)}ms`);
      
      // Store analytics data
      this.storeAnalytics({
        url: window.location.href,
        loadTime: loadTime,
        timestamp: Date.now(),
        userAgent: navigator.userAgent
      });
    });
    
    // Track errors
    window.addEventListener('error', (e) => {
      console.error('❌ JavaScript error caught by Dev Support:', e.error);
      this.storeError({
        message: e.message,
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
        error: e.error?.stack,
        url: window.location.href,
        timestamp: Date.now()
      });
    });
  },
  
  injectUtilities() {
    // Add utility functions to window object for easy access in console
    window.DevSupportUtils = {
      // Highlight all elements matching a selector
      highlight: (selector) => this.highlightElements(selector),
      
      // Get element information
      inspect: (element) => this.inspectElement(element),
      
      // Performance analysis
      performance: () => this.analyzePerformance(),
      
      // Export page data
      export: () => this.exportPageData(),
      
      // Clear all highlights
      clearHighlights: () => this.clearHighlights()
    };
    
    console.log('🛠️ Dev Support utilities injected. Use window.DevSupportUtils');
  },
  
  getPageInfo() {
    return {
      url: window.location.href,
      title: document.title,
      domain: window.location.hostname,
      protocol: window.location.protocol,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      scroll: {
        x: window.scrollX,
        y: window.scrollY
      },
      elements: {
        total: document.querySelectorAll('*').length,
        images: document.querySelectorAll('img').length,
        links: document.querySelectorAll('a').length,
        forms: document.querySelectorAll('form').length,
        inputs: document.querySelectorAll('input, textarea, select').length
      },
      performance: this.analyzePerformance()
    };
  },
  
  highlightElements(selector) {
    try {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el, index) => {
        const highlight = document.createElement('div');
        highlight.className = 'dev-support-highlight';
        highlight.style.cssText = `
          position: absolute;
          pointer-events: none;
          background: rgba(255, 0, 0, 0.3);
          border: 2px solid #ff0000;
          z-index: 10000;
          border-radius: 4px;
        `;
        
        const rect = el.getBoundingClientRect();
        highlight.style.top = (rect.top + window.scrollY) + 'px';
        highlight.style.left = (rect.left + window.scrollX) + 'px';
        highlight.style.width = rect.width + 'px';
        highlight.style.height = rect.height + 'px';
        
        document.body.appendChild(highlight);
        
        // Add number label
        const label = document.createElement('div');
        label.textContent = index + 1;
        label.style.cssText = `
          position: absolute;
          top: -20px;
          left: 0;
          background: #ff0000;
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: bold;
        `;
        highlight.appendChild(label);
      });
      
      console.log(`🎯 Highlighted ${elements.length} elements matching "${selector}"`);
      
      // Auto-clear after 5 seconds
      setTimeout(() => this.clearHighlights(), 5000);
      
    } catch (error) {
      console.error('❌ Error highlighting elements:', error);
    }
  },
  
  highlightInteractiveElements() {
    const selectors = [
      'button',
      'a[href]',
      'input',
      'textarea',
      'select',
      '[onclick]',
      '[role="button"]',
      '[tabindex]'
    ];
    
    this.highlightElements(selectors.join(', '));
  },
  
  clearHighlights() {
    const highlights = document.querySelectorAll('.dev-support-highlight');
    highlights.forEach(highlight => highlight.remove());
    console.log(`🧹 Cleared ${highlights.length} highlights`);
  },
  
  toggleDebugMode() {
    const debugMode = document.body.classList.toggle('dev-support-debug-mode');
    
    if (debugMode) {
      this.injectCSS(`
        .dev-support-debug-mode * {
          outline: 1px solid rgba(255, 0, 0, 0.3) !important;
        }
        .dev-support-debug-mode *:hover {
          outline: 2px solid #ff0000 !important;
          background: rgba(255, 0, 0, 0.1) !important;
        }
      `);
      console.log('🔍 Debug mode enabled - all elements outlined');
    } else {
      const debugStyles = document.querySelector('#dev-support-debug-styles');
      if (debugStyles) debugStyles.remove();
      console.log('🔍 Debug mode disabled');
    }
  },
  
  injectCSS(css) {
    const style = document.createElement('style');
    style.id = 'dev-support-debug-styles';
    style.textContent = css;
    document.head.appendChild(style);
  },
  
  inspectElement(element) {
    if (!element) return null;
    
    const rect = element.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(element);
    
    return {
      tagName: element.tagName,
      id: element.id,
      className: element.className,
      attributes: Array.from(element.attributes).map(attr => ({
        name: attr.name,
        value: attr.value
      })),
      position: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      },
      styles: {
        display: computedStyle.display,
        position: computedStyle.position,
        zIndex: computedStyle.zIndex,
        backgroundColor: computedStyle.backgroundColor,
        color: computedStyle.color
      },
      textContent: element.textContent?.substring(0, 100) + '...'
    };
  },
  
  analyzePerformance() {
    const navigation = performance.getEntriesByType('navigation')[0];
    const paint = performance.getEntriesByType('paint');
    
    return {
      navigation: navigation ? {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        domInteractive: navigation.domInteractive - navigation.fetchStart,
        firstByte: navigation.responseStart - navigation.requestStart
      } : null,
      paint: paint.reduce((acc, entry) => {
        acc[entry.name] = entry.startTime;
        return acc;
      }, {}),
      memory: performance.memory || null,
      timing: {
        now: performance.now(),
        timeOrigin: performance.timeOrigin
      }
    };
  },
  
  exportPageData() {
    const data = {
      ...this.getPageInfo(),
      html: document.documentElement.outerHTML.substring(0, 10000) + '...',
      localStorage: { ...localStorage },
      sessionStorage: { ...sessionStorage },
      cookies: document.cookie
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `page-analysis-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('📤 Page data exported', data);
    return data;
  },
  
  storeAnalytics(data) {
    chrome.storage.local.get(['analytics'], (result) => {
      const analytics = result.analytics || [];
      analytics.push(data);
      
      // Keep only last 100 entries
      if (analytics.length > 100) {
        analytics.splice(0, analytics.length - 100);
      }
      
      chrome.storage.local.set({ analytics });
    });
  },
  
  storeError(errorData) {
    chrome.storage.local.get(['errors'], (result) => {
      const errors = result.errors || [];
      errors.push(errorData);
      
      // Keep only last 50 errors
      if (errors.length > 50) {
        errors.splice(0, errors.length - 50);
      }
      
      chrome.storage.local.set({ errors });
    });
  }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => DevSupport.init());
} else {
  DevSupport.init();
}