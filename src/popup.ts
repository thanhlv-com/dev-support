// Popup script for Dev Support Extension - TypeScript version

/// <reference path="../types/global.d.ts" />

interface FeatureToggleElements {
  mediumFreedium: HTMLInputElement | null;
}

interface StatusElements {
  currentUrl: HTMLElement | null;
  activeCount: HTMLElement | null;
}

class PopupController {
  private featureToggles: FeatureToggleElements;
  private statusElements: StatusElements;
  private currentTab: chrome.tabs.Tab | null = null;

  constructor() {
    this.featureToggles = {
      mediumFreedium: null
    };
    
    this.statusElements = {
      currentUrl: null,
      activeCount: null
    };
    
    this.init();
  }

  private async init(): Promise<void> {
    await this.initializeElements();
    await this.loadCurrentTab();
    await this.loadFeatureStates();
    this.setupEventListeners();
    await this.updateActiveCount();
  }

  private async initializeElements(): Promise<void> {
    // Get feature toggle elements
    this.featureToggles.mediumFreedium = document.getElementById('mediumFreedium') as HTMLInputElement;
    
    // Get status elements
    this.statusElements.currentUrl = document.getElementById('currentUrl');
    this.statusElements.activeCount = document.getElementById('activeCount');
  }

  private async loadCurrentTab(): Promise<void> {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      this.currentTab = tab;
      
      if (this.statusElements.currentUrl) {
        this.statusElements.currentUrl.textContent = tab.url || 'Unknown';
      }
    } catch (error) {
      console.error('Error loading current tab:', error);
      if (this.statusElements.currentUrl) {
        this.statusElements.currentUrl.textContent = 'Error loading URL';
      }
    }
  }

  private async loadFeatureStates(): Promise<void> {
    try {
      const result = await chrome.storage.sync.get(['mediumFreedium']);
      
      // Set toggle states based on saved preferences
      if (this.featureToggles.mediumFreedium) {
        this.featureToggles.mediumFreedium.checked = result.mediumFreedium !== false; // Default to true
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
            feature: feature,
            enabled: enabled
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
      const result = await chrome.storage.sync.get(['mediumFreedium']);
      
      let count = 0;
      if (result.mediumFreedium !== false) count++; // Default to true
      
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
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});

// Initialize default settings on extension install
chrome.runtime.onInstalled?.addListener(() => {
  chrome.storage.sync.set({
    mediumFreedium: true // Enable by default
  });
});