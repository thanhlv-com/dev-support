// Content script for Dev Support Extension - Medium Freedium Feature - TypeScript version

/// <reference path="../types/global.d.ts" />

interface ContentMessage extends ChromeMessage {
  action: 'toggleFeature';
  feature: keyof FeatureState;
  enabled: boolean;
}

interface FreediumButtonElements {
  container: HTMLDivElement;
  button: HTMLDivElement;
  styles: HTMLStyleElement;
}

class DevSupportFeatures {
  private features: FeatureState;
  private floatingButton: HTMLDivElement | null = null;
  private styleElement: HTMLStyleElement | null = null;

  constructor() {
    this.features = {
      mediumFreedium: false
    };
    
    this.init();
  }

  private async init(): Promise<void> {
    console.log('🚀 Dev Support Extension content script loaded');
    
    // Load feature states from storage
    await this.loadFeatureStates();
    
    // Setup message listener
    this.setupMessageListener();
    
    // Initialize features based on current page
    this.initializeFeatures();
  }

  private async loadFeatureStates(): Promise<void> {
    try {
      const result = await chrome.storage.sync.get(['mediumFreedium']) as ChromeStorageResult;
      this.features.mediumFreedium = result.mediumFreedium !== false; // Default to true
      
      console.log('📋 Loaded feature states:', this.features);
    } catch (error) {
      console.error('❌ Error loading feature states:', error);
      // Use defaults
      this.features.mediumFreedium = true;
    }
  }

  private setupMessageListener(): void {
    chrome.runtime.onMessage.addListener((
      message: ContentMessage,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response: { success: boolean }) => void
    ) => {
      console.log('📨 Content script received message:', message);
      
      switch (message.action) {
        case 'toggleFeature':
          this.toggleFeature(message.feature, message.enabled);
          sendResponse({ success: true });
          break;
      }
    });
  }

  private toggleFeature(feature: keyof FeatureState, enabled: boolean): void {
    this.features[feature] = enabled;
    console.log(`🔄 Feature ${String(feature)} ${enabled ? 'enabled' : 'disabled'}`);
    
    // Reinitialize features
    this.initializeFeatures();
  }

  private initializeFeatures(): void {
    // Medium Freedium feature
    if (this.features.mediumFreedium && this.isMediumPage()) {
      this.initMediumFreedium();
    } else {
      this.removeMediumFreedium();
    }
  }

  private isMediumPage(): boolean {
    const hostname = window.location.hostname;
    return hostname === 'medium.com' || 
           hostname.endsWith('.medium.com') ||
           hostname === 'towardsdatascience.com' ||
           hostname === 'blog.medium.com';
  }

  private initMediumFreedium(): void {
    console.log('🌟 Initializing Medium Freedium feature');
    
    // Remove existing button if any
    this.removeMediumFreedium();
    
    // Create floating button
    this.createFreediumButton();
  }

  private removeMediumFreedium(): void {
    if (this.floatingButton) {
      this.floatingButton.remove();
      this.floatingButton = null;
      console.log('🗑️ Removed Freedium button');
    }

    if (this.styleElement) {
      this.styleElement.remove();
      this.styleElement = null;
    }
  }

  private createFreediumButton(): void {
    // Create the floating button
    this.floatingButton = document.createElement('div');
    this.floatingButton.id = 'dev-support-freedium-btn';
    this.floatingButton.innerHTML = this.getButtonHTML();
    
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
    
    // Add event listeners
    this.setupButtonEventListeners();
    
    // Add to page
    document.body.appendChild(this.floatingButton);
    
    console.log('✨ Freedium button created and added to page');
  }

  private getButtonHTML(): string {
    return `
      <div class="freedium-button" title="Open in Freedium (Free Access)">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
          <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
          <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        </svg>
        <span class="freedium-text">Free</span>
      </div>
    `;
  }

  private setupButtonEventListeners(): void {
    if (!this.floatingButton) return;

    // Add click handler
    this.floatingButton.addEventListener('click', (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      this.openInFreedium();
    });
    
    // Add hover effects
    this.floatingButton.addEventListener('mouseenter', () => {
      if (this.floatingButton) {
        this.floatingButton.style.transform = 'scale(1.1) rotate(5deg)';
      }
    });
    
    this.floatingButton.addEventListener('mouseleave', () => {
      if (this.floatingButton) {
        this.floatingButton.style.transform = 'scale(1) rotate(0deg)';
      }
    });
  }

  private addFreediumStyles(): void {
    // Check if styles already exist
    if (document.getElementById('dev-support-freedium-styles')) {
      return;
    }
    
    this.styleElement = document.createElement('style');
    this.styleElement.id = 'dev-support-freedium-styles';
    this.styleElement.textContent = this.getFreediumStyles();
    
    document.head.appendChild(this.styleElement);
  }

  private getFreediumStyles(): string {
    return `
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
  }

  private openInFreedium(): void {
    const currentUrl = window.location.href;
    const freediumUrl = `https://freedium.cfd/${currentUrl}`;
    
    console.log('🌐 Opening in Freedium:', freediumUrl);
    
    // Add click animation
    if (this.floatingButton) {
      this.floatingButton.style.animation = 'freediumPulse 0.3s ease-out';
    }
    
    // Open in new tab
    window.open(freediumUrl, '_blank', 'noopener,noreferrer');
    
    // Reset animation
    setTimeout(() => {
      if (this.floatingButton) {
        this.floatingButton.style.animation = '';
      }
    }, 300);
    
    // Send analytics
    this.trackFreediumUsage(currentUrl, freediumUrl);
  }

  private trackFreediumUsage(originalUrl: string, freediumUrl: string): void {
    try {
      chrome.runtime.sendMessage({
        action: 'trackEvent',
        event: 'freedium_redirect',
        data: {
          originalUrl: originalUrl,
          freediumUrl: freediumUrl,
          timestamp: Date.now()
        } as AnalyticsData
      });
    } catch (error) {
      // Ignore if background script not available
      console.log('Background script not available for analytics');
    }
  }
}

// Initialize when DOM is ready
function initializeDevSupport(): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      new DevSupportFeatures();
    });
  } else {
    new DevSupportFeatures();
  }
}

// Handle page navigation (for SPAs)
function setupNavigationHandler(): void {
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
}

// Initialize everything
initializeDevSupport();
setupNavigationHandler();