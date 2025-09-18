// Content script for Dev Support Extension - Medium Freedium Feature

console.log('🚀 Dev Support Extension content script loaded');

class DevSupportFeatures {
  constructor() {
    this.features = {
      mediumFreedium: false
    };
    this.floatingButton = null;
    
    this.init();
  }
  
  async init() {
    // Load feature states from storage
    await this.loadFeatureStates();
    
    // Setup message listener
    this.setupMessageListener();
    
    // Initialize features based on current page
    this.initializeFeatures();
  }
  
  async loadFeatureStates() {
    try {
      const result = await chrome.storage.sync.get(['mediumFreedium']);
      this.features.mediumFreedium = result.mediumFreedium !== false; // Default to true
      
      console.log('📋 Loaded feature states:', this.features);
    } catch (error) {
      console.error('❌ Error loading feature states:', error);
      // Use defaults
      this.features.mediumFreedium = true;
    }
  }
  
  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('📨 Content script received message:', message);
      
      switch (message.action) {
        case 'toggleFeature':
          this.toggleFeature(message.feature, message.enabled);
          sendResponse({ success: true });
          break;
      }
    });
  }
  
  toggleFeature(feature, enabled) {
    this.features[feature] = enabled;
    console.log(`🔄 Feature ${feature} ${enabled ? 'enabled' : 'disabled'}`);
    
    // Reinitialize features
    this.initializeFeatures();
  }
  
  initializeFeatures() {
    // Medium Freedium feature
    if (this.features.mediumFreedium && this.isMediumPage()) {
      this.initMediumFreedium();
    } else {
      this.removeMediumFreedium();
    }
  }
  
  isMediumPage() {
    const hostname = window.location.hostname;
    return hostname === 'medium.com' || 
           hostname.endsWith('.medium.com') ||
           hostname === 'towardsdatascience.com' ||
           hostname === 'blog.medium.com';
  }
  
  initMediumFreedium() {
    console.log('🌟 Initializing Medium Freedium feature');
    
    // Remove existing button if any
    this.removeMediumFreedium();
    
    // Create floating button
    this.createFreediumButton();
  }
  
  removeMediumFreedium() {
    if (this.floatingButton) {
      this.floatingButton.remove();
      this.floatingButton = null;
      console.log('🗑️ Removed Freedium button');
    }
  }
  
  createFreediumButton() {
    // Create the floating button
    this.floatingButton = document.createElement('div');
    this.floatingButton.id = 'dev-support-freedium-btn';
    this.floatingButton.innerHTML = `
      <div class="freedium-button" title="Open in Freedium (Free Access)">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
          <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
          <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        </svg>
        <span class="freedium-text">Free</span>
      </div>
    `;
    
    // Add styles
    this.addFreediumStyles();
    
    // Position at 5 o'clock (bottom-right)
    this.floatingButton.style.cssText = `
      position: fixed;
      bottom: 60px;
      right: 60px;
      z-index: 10000;
      cursor: pointer;
      user-select: none;
      animation: freediumFadeIn 0.5s ease-out;
    `;
    
    // Add click handler
    this.floatingButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.openInFreedium();
    });
    
    // Add hover effects
    this.floatingButton.addEventListener('mouseenter', () => {
      this.floatingButton.style.transform = 'scale(1.1) rotate(5deg)';
    });
    
    this.floatingButton.addEventListener('mouseleave', () => {
      this.floatingButton.style.transform = 'scale(1) rotate(0deg)';
    });
    
    // Add to page
    document.body.appendChild(this.floatingButton);
    
    console.log('✨ Freedium button created and added to page');
  }
  
  addFreediumStyles() {
    // Check if styles already exist
    if (document.getElementById('dev-support-freedium-styles')) {
      return;
    }
    
    const style = document.createElement('style');
    style.id = 'dev-support-freedium-styles';
    style.textContent = `
      @keyframes freediumFadeIn {
        from {
          opacity: 0;
          transform: translateY(20px) scale(0.8);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      
      @keyframes freediumPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      
      .freedium-button {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        width: 80px;
        height: 80px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 50%;
        box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        flex-direction: column;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      .freedium-button:hover {
        box-shadow: 0 8px 30px rgba(102, 126, 234, 0.6);
        background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
      }
      
      .freedium-button:active {
        transform: scale(0.95) !important;
      }
      
      .freedium-button svg {
        width: 28px;
        height: 28px;
        margin-bottom: -2px;
      }
      
      .freedium-text {
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.5px;
        text-transform: uppercase;
      }
      
      /* Mobile responsive */
      @media (max-width: 768px) {
        #dev-support-freedium-btn {
          bottom: 30px !important;
          right: 30px !important;
        }
        
        .freedium-button {
          width: 70px;
          height: 70px;
        }
        
        .freedium-button svg {
          width: 24px;
          height: 24px;
        }
        
        .freedium-text {
          font-size: 10px;
        }
      }
      
      /* Ensure button stays above all content */
      #dev-support-freedium-btn {
        z-index: 2147483647 !important;
      }
    `;
    
    document.head.appendChild(style);
  }
  
  openInFreedium() {
    const currentUrl = window.location.href;
    const freediumUrl = `https://freedium.cfd/${currentUrl}`;
    
    console.log('🌐 Opening in Freedium:', freediumUrl);
    
    // Add click animation
    this.floatingButton.style.animation = 'freediumPulse 0.3s ease-out';
    
    // Open in new tab
    window.open(freediumUrl, '_blank', 'noopener,noreferrer');
    
    // Reset animation
    setTimeout(() => {
      if (this.floatingButton) {
        this.floatingButton.style.animation = '';
      }
    }, 300);
    
    // Send analytics
    try {
      chrome.runtime.sendMessage({
        action: 'trackEvent',
        event: 'freedium_redirect',
        data: {
          originalUrl: currentUrl,
          freediumUrl: freediumUrl,
          timestamp: Date.now()
        }
      });
    } catch (error) {
      // Ignore if background script not available
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new DevSupportFeatures();
  });
} else {
  new DevSupportFeatures();
}

// Handle page navigation (for SPAs)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    console.log('🔄 Page navigation detected, reinitializing features');
    // Small delay to let the page settle
    setTimeout(() => {
      new DevSupportFeatures();
    }, 1000);
  }
}).observe(document, { subtree: true, childList: true });