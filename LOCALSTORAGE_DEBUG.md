# localStorage/sessionStorage Debug Guide

## Issues Fixed

1. **Script Injection Problem**: Replaced class methods with standalone functions for proper injection
2. **Error Handling**: Added comprehensive error handling and debugging logs  
3. **Permissions**: Verified `scripting` permission is correctly set in manifest
4. **UI Feedback**: Enhanced display to show only non-zero storage counts

## Testing Instructions

### 1. Test on a Website with localStorage
Try these websites that commonly use localStorage:
- GitHub.com (user preferences, theme settings)
- Gmail.com (user settings, cached data)
- Any React/Vue app (often stores app state)

### 2. Create Test Data Manually
On any website, open browser DevTools (F12) and run:
```javascript
// Add test localStorage data
localStorage.setItem('test_key_1', 'test_value_1');
localStorage.setItem('user_preference', JSON.stringify({theme: 'dark', lang: 'en'}));

// Add test sessionStorage data  
sessionStorage.setItem('session_data', 'temporary_value');
sessionStorage.setItem('form_state', JSON.stringify({step: 2, completed: false}));

// Verify the data
console.log('localStorage items:', localStorage.length);
console.log('sessionStorage items:', sessionStorage.length);
```

### 3. Test the Extension
1. **Check Storage Count**: Open extension popup, should show updated counts
2. **Export Storage**: Click "Export All Storage", check downloaded JSON file
3. **Clear Storage**: Click "Clear All Storage", verify everything is removed
4. **Import Storage**: Use previously exported file to restore data

## Debug Console Messages

Look for these log messages in browser DevTools:

### Successful Operation:
```
💾 [DEBUG] Starting storage export for URL: https://example.com
💾 [DEBUG] Exporting localStorage and sessionStorage...
💾 [DEBUG] localStorage items: 3
💾 [DEBUG] sessionStorage items: 2
💾 [SUCCESS] Exported storage for: example.com (8 total items: 3 cookies, 3 localStorage, 2 sessionStorage)
```

### Common Issues:
```
💾 [WARN] Cannot export localStorage - missing tabId or scripting permission
💾 [WARN] Failed to export localStorage/sessionStorage: [error details]
```

## Troubleshooting

### If localStorage/sessionStorage shows 0 items:

1. **Check Current Website**: Some sites don't use localStorage (e.g., chrome:// pages)
2. **Verify in DevTools**: Open DevTools > Application tab > Local Storage / Session Storage
3. **Check Console**: Look for error messages in browser console
4. **Try Different Website**: Test on GitHub.com or Gmail.com which definitely use localStorage

### If Export/Import Fails:

1. **Check Tab Permissions**: Extension needs active tab permission
2. **Look for Script Errors**: Check console for injection errors
3. **Verify File Format**: Ensure JSON file is properly formatted

### Extension Not Loading Storage:

1. **Reload Extension**: Go to chrome://extensions/ and reload the extension
2. **Check Permissions**: Verify `scripting` permission is granted
3. **Restart Browser**: Sometimes Chrome needs restart after extension updates

## Common localStorage Websites

- **GitHub**: Stores user preferences, theme, sidebar state
- **Gmail**: Stores UI preferences, conversation settings  
- **YouTube**: Stores volume, quality preferences
- **Twitter**: Stores UI state, draft tweets
- **Reddit**: Stores user preferences, viewed posts
- **Stack Overflow**: Stores user preferences, dismissed notices

## Expected Behavior

### Working Correctly:
- Shows accurate counts for each storage type
- Exports non-empty JSON files with all three storage types
- Successfully imports and restores all data
- Clears all storage types when requested

### Known Limitations:
- Cannot access storage on chrome:// pages (browser restriction)
- Cannot access storage in incognito mode for some sites
- Some sites may block storage access (rare)
- sessionStorage is lost when tab closes (normal behavior)

The localStorage/sessionStorage functionality should now work correctly with proper error handling and debugging information.