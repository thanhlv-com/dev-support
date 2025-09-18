document.addEventListener('DOMContentLoaded', async () => {
  // Get current tab info
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  // Update UI with current page info
  document.getElementById('currentUrl').textContent = tab.url || 'Unknown';
  
  // Load saved feature states
  await loadFeatureStates();
  
  // Setup event listeners for feature toggles
  setupFeatureToggles();
  
  // Update active feature count
  updateActiveCount();
});

async function loadFeatureStates() {
  try {
    const result = await chrome.storage.sync.get([
      'mediumFreedium'
    ]);
    
    // Set toggle states based on saved preferences
    const mediumToggle = document.getElementById('mediumFreedium');
    if (mediumToggle) {
      mediumToggle.checked = result.mediumFreedium !== false; // Default to true
    }
  } catch (error) {
    console.error('Error loading feature states:', error);
  }
}

function setupFeatureToggles() {
  // Medium Freedium toggle
  const mediumToggle = document.getElementById('mediumFreedium');
  if (mediumToggle) {
    mediumToggle.addEventListener('change', async (e) => {
      const enabled = e.target.checked;
      
      try {
        // Save state
        await chrome.storage.sync.set({ mediumFreedium: enabled });
        
        // Send message to content script
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        chrome.tabs.sendMessage(tab.id, {
          action: 'toggleFeature',
          feature: 'mediumFreedium',
          enabled: enabled
        }).catch(() => {
          // Ignore if content script not ready
        });
        
        // Show visual feedback
        showFeatureFeedback('mediumFreedium', enabled);
        
        // Update counter
        updateActiveCount();
        
        console.log('Medium Freedium feature:', enabled ? 'enabled' : 'disabled');
      } catch (error) {
        console.error('Error toggling Medium Freedium feature:', error);
        // Revert toggle state on error
        e.target.checked = !enabled;
      }
    });
  }
}

function showFeatureFeedback(featureId, enabled) {
  const toggle = document.querySelector(`#${featureId}`).closest('.feature-toggle');
  
  // Remove existing classes
  toggle.classList.remove('success', 'error');
  
  // Add success class
  toggle.classList.add('success');
  
  // Remove after animation
  setTimeout(() => {
    toggle.classList.remove('success');
  }, 2000);
}

async function updateActiveCount() {
  try {
    const result = await chrome.storage.sync.get([
      'mediumFreedium'
    ]);
    
    let count = 0;
    if (result.mediumFreedium !== false) count++; // Default to true
    
    document.getElementById('activeCount').textContent = count;
  } catch (error) {
    document.getElementById('activeCount').textContent = '?';
  }
}

// Initialize default settings if first time
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({
    mediumFreedium: true // Enable by default
  });
});