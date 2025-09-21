// Content script for Dev Support Extension - Medium Freedium Feature - TypeScript version

/// <reference path="types/global.d.ts" />

import { JsonViewer } from './features/json-viewer/JsonViewer';
import { ImageDownloader } from './features/image-downloader/ImageDownloader';

interface ContentScriptMessage extends ChromeMessage {
  action: 'toggleFeature';
  feature: keyof FeatureState;
  enabled: boolean;
}

interface FreediumButtonElements {
  container: HTMLDivElement;
  button: HTMLDivElement;
  styles: HTMLStyleElement;
}

class ContentScriptManager {
  private features: FeatureState;
  private freediumButton: HTMLDivElement | null = null;
  private styleElement: HTMLStyleElement | null = null;
  private jsonViewer: JsonViewer | null = null;
  private imageDownloader: ImageDownloader | null = null;
  private imageDownloaderUI: HTMLElement | null = null;

  constructor() {
    this.features = {
      freediumFeature: false,
      jsonViewer: true,
      imageDownloader: true,
      imageDownloaderButton: true
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
      const result = await chrome.storage.sync.get(['freediumFeature', 'jsonViewer', 'imageDownloader', 'imageDownloaderButton']) as ChromeStorageResult;
      this.features.freediumFeature = result.freediumFeature !== false; // Default to true
      this.features.jsonViewer = result.jsonViewer !== false; // Default to true
      this.features.imageDownloader = result.imageDownloader !== false; // Default to true
      this.features.imageDownloaderButton = result.imageDownloaderButton !== false; // Default to true
      
      console.log('📋 Loaded feature states:', this.features);
    } catch (error) {
      console.error('❌ Error loading feature states:', error);
      // Use defaults
      this.features.freediumFeature = true;
      this.features.jsonViewer = true;
      this.features.imageDownloader = true;
      this.features.imageDownloaderButton = true;
    }
  }

  private setupMessageListener(): void {
    chrome.runtime.onMessage.addListener((
      message: ContentScriptMessage,
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
    if (this.features.freediumFeature && this.isMediumDomain()) {
      this.initMediumFreedium();
    } else {
      this.removeMediumFreedium();
    }

    // JSON Viewer feature
    if (this.features.jsonViewer && this.isJsonPage()) {
      this.initJsonViewer();
    } else {
      this.removeJsonViewer();
    }

    // Image Downloader feature (floating button)
    if (this.features.imageDownloader && this.features.imageDownloaderButton && this.canUseImageDownloader()) {
      this.initImageDownloader();
    } else {
      this.removeImageDownloader();
    }
  }

  private isMediumDomain(): boolean {
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
    if (this.freediumButton) {
      this.freediumButton.remove();
      this.freediumButton = null;
      console.log('🗑️ Removed Freedium button');
    }

    if (this.styleElement) {
      this.styleElement.remove();
      this.styleElement = null;
    }
  }

  private createFreediumButton(): void {
    // Create the floating button
    this.freediumButton = document.createElement('div');
    this.freediumButton.id = 'dev-support-freedium-btn';
    this.freediumButton.innerHTML = this.getButtonHTML();
    
    // Add styles
    this.addFreediumStyles();
    
    // Position at 5 o'clock (bottom-right)
    this.freediumButton.style.cssText = `
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
    document.body.appendChild(this.freediumButton);
    
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
    if (!this.freediumButton) return;

    // Add click handler
    this.freediumButton.addEventListener('click', (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      this.openInFreedium();
    });
    
    // Add hover effects
    this.freediumButton.addEventListener('mouseenter', () => {
      if (this.freediumButton) {
        this.freediumButton.style.transform = 'scale(1.1) rotate(5deg)';
      }
    });
    
    this.freediumButton.addEventListener('mouseleave', () => {
      if (this.freediumButton) {
        this.freediumButton.style.transform = 'scale(1) rotate(0deg)';
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
    const freediumAccessUrl = `https://freedium.cfd/${currentUrl}`;
    
    console.log('🌐 Opening in Freedium:', freediumAccessUrl);
    
    // Add click animation
    if (this.freediumButton) {
      this.freediumButton.style.animation = 'freediumPulse 0.3s ease-out';
    }
    
    // Open in new tab
    window.open(freediumAccessUrl, '_blank', 'noopener,noreferrer');
    
    // Reset animation
    setTimeout(() => {
      if (this.freediumButton) {
        this.freediumButton.style.animation = '';
      }
    }, 300);
    
    // Send analytics
    this.trackFreediumUsage(currentUrl, freediumAccessUrl);
  }

  private trackFreediumUsage(originalUrl: string, freediumAccessUrl: string): void {
    try {
      chrome.runtime.sendMessage({
        action: 'trackEvent',
        event: 'freedium_redirect',
        data: {
          originalUrl,
          freediumUrl: freediumAccessUrl,
          timestamp: Date.now()
        } as AnalyticsData
      });
    } catch (error) {
      // Ignore if background script not available
      console.log('Background script not available for analytics');
    }
  }

  private isJsonPage(): boolean {
    // Check content type
    const contentType = document.contentType || document.querySelector('meta[http-equiv="Content-Type"]')?.getAttribute('content') || '';
    if (contentType.includes('application/json')) {
      return true;
    }

    // Check URL patterns for API endpoints
    const url = window.location.href;
    const jsonUrlPatterns = [
      /\/api\//,
      /\.json(\?|$)/,
      /\/rest\//,
      /\/graphql/,
      /\/v\d+\//
    ];
    
    if (jsonUrlPatterns.some(pattern => pattern.test(url))) {
      return true;
    }

    // Check if page content looks like JSON
    const bodyText = document.body.textContent?.trim() || '';
    if (bodyText.length > 0) {
      try {
        JSON.parse(bodyText);
        return bodyText.startsWith('{') || bodyText.startsWith('[');
      } catch {
        return false;
      }
    }

    return false;
  }

  private initJsonViewer(): void {
    console.log('🌟 Initializing JSON Viewer feature');
    
    // Remove existing viewer if any
    this.removeJsonViewer();
    
    try {
      const bodyText = document.body.textContent?.trim() || '';
      const jsonData = JSON.parse(bodyText);
      
      // Add JSON viewer styles
      this.addJsonViewerStyles();
      
      // Clear the existing content
      document.body.innerHTML = '';
      
      // Create container for JSON viewer
      const container = document.createElement('div');
      container.id = 'dev-support-json-viewer';
      document.body.appendChild(container);
      
      // Initialize JSON viewer
      this.jsonViewer = new JsonViewer(container, jsonData, {
        theme: 'dark',
        collapsible: true,
        searchable: true,
        copyable: true,
        formattable: true
      });
      
      console.log('✨ JSON Viewer initialized');
    } catch (error) {
      console.error('❌ Error initializing JSON viewer:', error);
    }
  }

  private removeJsonViewer(): void {
    if (this.jsonViewer) {
      this.jsonViewer.destroy();
      this.jsonViewer = null;
      console.log('🗑️ Removed JSON viewer');
    }
    
    const existingViewer = document.getElementById('dev-support-json-viewer');
    if (existingViewer) {
      existingViewer.remove();
    }

    // Remove JSON viewer styles
    const existingStyles = document.getElementById('dev-support-json-viewer-styles');
    if (existingStyles) {
      existingStyles.remove();
    }
  }

  private addJsonViewerStyles(): void {
    // Check if styles already exist
    if (document.getElementById('dev-support-json-viewer-styles')) {
      return;
    }
    
    const styleElement = document.createElement('style');
    styleElement.id = 'dev-support-json-viewer-styles';
    styleElement.textContent = this.getJsonViewerStyles();
    
    document.head.appendChild(styleElement);
  }

  private getJsonViewerStyles(): string {
    return `
      /* JSON Viewer Styles */
      .json-viewer {
        font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
        font-size: 14px;
        line-height: 1.5;
        padding: 20px;
        max-width: 100%;
        overflow-x: auto;
        min-height: 100vh;
        box-sizing: border-box;
      }

      .json-viewer--dark {
        background-color: #1a1a1a;
        color: #e1e1e1;
      }

      .json-viewer--light {
        background-color: #ffffff;
        color: #333333;
      }

      .json-viewer__toolbar {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 0;
        margin-bottom: 20px;
        border-bottom: 1px solid;
        flex-wrap: wrap;
      }

      .json-viewer--dark .json-viewer__toolbar {
        border-bottom-color: #333;
      }

      .json-viewer--light .json-viewer__toolbar {
        border-bottom-color: #e1e1e1;
      }

      .json-viewer__search {
        flex: 1;
        min-width: 200px;
      }

      .json-viewer__search-input {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid;
        border-radius: 6px;
        font-size: 14px;
        background: transparent;
        color: inherit;
      }

      .json-viewer--dark .json-viewer__search-input {
        border-color: #444;
        background-color: #2a2a2a;
      }

      .json-viewer--light .json-viewer__search-input {
        border-color: #ddd;
        background-color: #f8f9fa;
      }

      .json-viewer__search-input:focus {
        outline: none;
        border-color: #007acc;
        box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.2);
      }

      .json-viewer__copy-btn,
      .json-viewer__expand-btn,
      .json-viewer__collapse-btn,
      .json-viewer__format-btn {
        padding: 8px 12px;
        border: 1px solid;
        border-radius: 6px;
        background: transparent;
        color: inherit;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s ease;
        white-space: nowrap;
      }

      .json-viewer--dark .json-viewer__copy-btn,
      .json-viewer--dark .json-viewer__expand-btn,
      .json-viewer--dark .json-viewer__collapse-btn,
      .json-viewer--dark .json-viewer__format-btn {
        border-color: #444;
      }

      .json-viewer--light .json-viewer__copy-btn,
      .json-viewer--light .json-viewer__expand-btn,
      .json-viewer--light .json-viewer__collapse-btn,
      .json-viewer--light .json-viewer__format-btn {
        border-color: #ddd;
      }

      .json-viewer__copy-btn:hover,
      .json-viewer__expand-btn:hover,
      .json-viewer__collapse-btn:hover,
      .json-viewer__format-btn:hover {
        background-color: rgba(0, 122, 204, 0.1);
        border-color: #007acc;
      }

      .json-viewer__content {
        position: relative;
      }

      .json-viewer__node {
        margin: 0;
        position: relative;
      }

      .json-viewer__node-header {
        display: flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        padding: 2px 0;
        border-radius: 3px;
        transition: background-color 0.15s ease;
      }

      .json-viewer__node-header:hover {
        background-color: rgba(255, 255, 255, 0.05);
      }

      .json-viewer--light .json-viewer__node-header:hover {
        background-color: rgba(0, 0, 0, 0.05);
      }

      .json-viewer__toggle {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 16px;
        height: 16px;
        font-size: 10px;
        color: #888;
        cursor: pointer;
        user-select: none;
        transition: transform 0.15s ease;
      }

      .json-viewer__toggle:hover {
        color: #007acc;
      }

      .json-viewer__key {
        color: #9cdcfe;
        font-weight: 500;
      }

      .json-viewer--light .json-viewer__key {
        color: #0451a5;
      }

      .json-viewer__value {
        font-weight: 400;
      }

      .json-viewer__value--string {
        color: #ce9178;
      }

      .json-viewer--light .json-viewer__value--string {
        color: #a31515;
      }

      .json-viewer__value--number {
        color: #b5cea8;
      }

      .json-viewer--light .json-viewer__value--number {
        color: #098658;
      }

      .json-viewer__value--boolean {
        color: #569cd6;
      }

      .json-viewer--light .json-viewer__value--boolean {
        color: #0000ff;
      }

      .json-viewer__value--null {
        color: #569cd6;
        font-style: italic;
      }

      .json-viewer--light .json-viewer__value--null {
        color: #0000ff;
      }

      .json-viewer__type-info {
        color: #888;
        font-size: 12px;
        font-style: italic;
      }

      .json-viewer__node-content {
        margin-left: 20px;
        position: relative;
      }

      .json-viewer__node-content::before {
        content: '';
        position: absolute;
        left: -10px;
        top: 0;
        bottom: 0;
        width: 1px;
        background-color: #333;
      }

      .json-viewer--light .json-viewer__node-content::before {
        background-color: #e1e1e1;
      }

      .json-viewer__simple-node {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 2px 0;
      }

      .json-viewer__highlighted {
        background-color: #ffd700;
        color: #000;
        padding: 1px 2px;
        border-radius: 2px;
        font-weight: 600;
      }

      .json-viewer__formatted-container {
        position: relative;
        overflow: auto;
      }

      .json-viewer__formatted-text {
        margin: 0;
        padding: 16px;
        font-family: inherit;
        font-size: inherit;
        line-height: inherit;
        white-space: pre-wrap;
        word-wrap: break-word;
        overflow-x: auto;
        border-radius: 6px;
        border: 1px solid;
        background-color: rgba(255, 255, 255, 0.02);
      }

      .json-viewer--dark .json-viewer__formatted-text {
        border-color: #333;
        background-color: rgba(255, 255, 255, 0.02);
      }

      .json-viewer--light .json-viewer__formatted-text {
        border-color: #e1e1e1;
        background-color: rgba(0, 0, 0, 0.02);
      }

      .json-viewer__formatted-text mark {
        background-color: #ffd700;
        color: #000;
        padding: 1px 2px;
        border-radius: 2px;
      }

      .json-viewer__error {
        color: #f85552;
        background-color: rgba(248, 85, 82, 0.1);
        padding: 12px;
        border-radius: 6px;
        border-left: 4px solid #f85552;
        font-family: inherit;
      }

      @media (max-width: 768px) {
        .json-viewer {
          padding: 12px;
          font-size: 13px;
        }
        
        .json-viewer__toolbar {
          flex-direction: column;
          align-items: stretch;
          gap: 8px;
        }
        
        .json-viewer__search {
          min-width: unset;
        }
        
        .json-viewer__node-content {
          margin-left: 16px;
        }
      }

      .json-viewer__node-content {
        animation: jsonFadeIn 0.2s ease-out;
      }

      @keyframes jsonFadeIn {
        from {
          opacity: 0;
          transform: translateY(-5px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `;
  }

  // Image Downloader feature methods
  private canUseImageDownloader(): boolean {
    // Enable on all web pages except specific exclusions
    const hostname = window.location.hostname;
    const excludedDomains = ['chrome-extension:', 'chrome:', 'about:', 'moz-extension:'];
    
    return !excludedDomains.some(domain => window.location.protocol.startsWith(domain.replace(':', ''))) &&
           hostname !== '' && 
           !this.isJsonPage(); // Don't show on JSON pages as they won't have images
  }

  private initImageDownloader(): void {
    console.log('📸 Initializing Image Downloader feature');
    
    // Remove existing UI if any
    this.removeImageDownloader();
    
    // Initialize the image downloader
    this.imageDownloader = ImageDownloader.getInstance();
    
    // Create and add UI
    this.imageDownloaderUI = this.imageDownloader.createDownloadUI();
    document.body.appendChild(this.imageDownloaderUI);
    
    console.log('✨ Image Downloader initialized');
  }

  private removeImageDownloader(): void {
    if (this.imageDownloaderUI) {
      this.imageDownloaderUI.remove();
      this.imageDownloaderUI = null;
      console.log('🗑️ Removed Image Downloader UI');
    }

    if (this.imageDownloader) {
      this.imageDownloader.removeDownloaderUI();
      this.imageDownloader = null;
    }
  }
}

// Initialize when DOM is ready
function initializeDevSupport(): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      new ContentScriptManager();
    });
  } else {
    new ContentScriptManager();
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
        new ContentScriptManager();
      }, 1000);
    }
  }).observe(document, { subtree: true, childList: true });
}

// Initialize everything
initializeDevSupport();
setupNavigationHandler();