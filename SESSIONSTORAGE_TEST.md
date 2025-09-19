# sessionStorage Testing & Debug Guide

## Key Fix Applied: MAIN World Execution

The main issue was that Chrome extensions run scripts in an "ISOLATED" world by default, but `localStorage` and `sessionStorage` APIs need access to the "MAIN" world where the webpage's storage actually exists.

**Fixed by adding `world: 'MAIN'` to all `chrome.scripting.executeScript()` calls.**

## Testing sessionStorage Functionality

### Step 1: Create Test Data

Open any website and run this in the browser console (F12):

```javascript
// Clear existing data first
localStorage.clear();
sessionStorage.clear();

// Add test localStorage data
localStorage.setItem('ls_test_1', 'localStorage value 1');
localStorage.setItem('ls_user_pref', JSON.stringify({theme: 'dark', lang: 'en'}));

// Add test sessionStorage data
sessionStorage.setItem('ss_test_1', 'sessionStorage value 1');
sessionStorage.setItem('ss_form_data', JSON.stringify({step: 2, field1: 'data'}));
sessionStorage.setItem('ss_temp_token', 'abc123xyz789');

// Verify the data exists
console.log('✅ localStorage items:', localStorage.length);
console.log('✅ sessionStorage items:', sessionStorage.length);

// List all items
console.log('localStorage keys:');
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  console.log(`  ${key}: ${localStorage.getItem(key)}`);
}

console.log('sessionStorage keys:');
for (let i = 0; i < sessionStorage.length; i++) {
  const key = sessionStorage.key(i);
  console.log(`  ${key}: ${sessionStorage.getItem(key)}`);
}
```

### Step 2: Test Extension Storage Count

1. **Open Extension Popup**: Click the extension icon
2. **Check Storage Display**: Should show something like "5 items for domain.com"
3. **Check Details**: Should show "2 localStorage • 3 sessionStorage" (or similar)

**Expected Console Logs** (check browser DevTools):
```
📊 [INJECT-COUNT] Starting storage count...
📊 [INJECT-COUNT] localStorage available: true
📊 [INJECT-COUNT] sessionStorage available: true
📊 [INJECT-COUNT] localStorage count: 2
📊 [INJECT-COUNT] localStorage key: ls_test_1
📊 [INJECT-COUNT] localStorage key: ls_user_pref
📊 [INJECT-COUNT] sessionStorage count: 3
📊 [INJECT-COUNT] sessionStorage key: ss_test_1
📊 [INJECT-COUNT] sessionStorage key: ss_form_data
📊 [INJECT-COUNT] sessionStorage key: ss_temp_token
📊 [INJECT-COUNT] Final count result: {localStorage: 2, sessionStorage: 3}
```

### Step 3: Test Export Functionality

1. **Click "Export All Storage"** in the extension popup
2. **Check Downloaded File**: Should be named like `storage_domain.com_5items_2025-01-17.json`

**Expected File Contents**:
```json
{
  "domain": "example.com",
  "url": "https://example.com/",
  "timestamp": 1642435200000,
  "cookies": [...],
  "localStorage": {
    "ls_test_1": "localStorage value 1",
    "ls_user_pref": "{\"theme\":\"dark\",\"lang\":\"en\"}"
  },
  "sessionStorage": {
    "ss_test_1": "sessionStorage value 1", 
    "ss_form_data": "{\"step\":2,\"field1\":\"data\"}",
    "ss_temp_token": "abc123xyz789"
  }
}
```

**Expected Console Logs**:
```
💾 [INJECT] Starting storage extraction...
💾 [INJECT] localStorage available: true
💾 [INJECT] sessionStorage available: true
💾 [INJECT] localStorage length: 2
💾 [INJECT] Found localStorage item: ls_test_1 (18 chars)
💾 [INJECT] Found localStorage item: ls_user_pref (25 chars)
💾 [INJECT] localStorage extraction complete, items found: 2
💾 [INJECT] sessionStorage length: 3
💾 [INJECT] Found sessionStorage item: ss_test_1 (20 chars)
💾 [INJECT] Found sessionStorage item: ss_form_data (29 chars)
💾 [INJECT] Found sessionStorage item: ss_temp_token (12 chars)
💾 [INJECT] sessionStorage extraction complete, items found: 3
```

### Step 4: Test Import Functionality

1. **Clear Storage**: Run `localStorage.clear(); sessionStorage.clear();` in console
2. **Import File**: Click "Import Storage" and select the exported JSON file
3. **Verify Restoration**: Check console and verify data is restored

**Expected Console Logs**:
```
💾 [INJECT-IMPORT] Starting storage import...
💾 [INJECT-IMPORT] localStorage items to import: 2
💾 [INJECT-IMPORT] sessionStorage items to import: 3
💾 [INJECT-IMPORT] localStorage available: true
💾 [INJECT-IMPORT] sessionStorage available: true
💾 [INJECT-IMPORT] Restoring localStorage items...
✅ [INJECT-IMPORT] Restored localStorage item: ls_test_1
✅ [INJECT-IMPORT] Restored localStorage item: ls_user_pref
💾 [INJECT-IMPORT] localStorage restore complete: 2 items
💾 [INJECT-IMPORT] Restoring sessionStorage items...
✅ [INJECT-IMPORT] Restored sessionStorage item: ss_test_1
✅ [INJECT-IMPORT] Restored sessionStorage item: ss_form_data
✅ [INJECT-IMPORT] Restored sessionStorage item: ss_temp_token
💾 [INJECT-IMPORT] sessionStorage restore complete: 3 items
```

### Step 5: Test Clear Functionality

1. **Click "Clear All Storage"** in extension popup
2. **Confirm Dialog**: Confirm the clear operation
3. **Verify Clearing**: Check that all storage is cleared

**Expected Console Logs**:
```
🧹 [INJECT-CLEAR] Starting storage clear...
🧹 [INJECT-CLEAR] localStorage available: true
🧹 [INJECT-CLEAR] sessionStorage available: true
🧹 [INJECT-CLEAR] localStorage items to clear: 2
🧹 [INJECT-CLEAR] localStorage cleared successfully
🧹 [INJECT-CLEAR] sessionStorage items to clear: 3
🧹 [INJECT-CLEAR] sessionStorage cleared successfully
🧹 [INJECT-CLEAR] Final clear result: {localStorage: 2, sessionStorage: 3}
```

## Common Issues & Solutions

### Issue: sessionStorage always shows 0 items

**Possible Causes:**
1. **Website doesn't use sessionStorage**: Many sites only use localStorage
2. **Incognito Mode**: sessionStorage might be blocked
3. **Script Execution Context**: Fixed by using `world: 'MAIN'`

**Solutions:**
1. **Test on GitHub.com**: Known to use both localStorage and sessionStorage
2. **Create Test Data**: Use the script above to create sessionStorage items
3. **Check Console**: Look for error messages in browser DevTools

### Issue: Import/Export not working for sessionStorage

**Possible Causes:**
1. **Tab ID missing**: sessionStorage access requires active tab
2. **Permissions**: Extension needs scripting permission
3. **Cross-origin restrictions**: Some sites block storage access

**Solutions:**
1. **Ensure Active Tab**: Make sure you're on the same tab when importing
2. **Check Permissions**: Verify scripting permission in chrome://extensions/
3. **Try Different Website**: Test on multiple sites

### Issue: Console logs not appearing

**Where to Look:**
1. **Main Console**: Browser DevTools → Console tab (for injected script logs)
2. **Extension Console**: chrome://extensions/ → Details → Inspect views: background page
3. **Popup Console**: Right-click extension popup → Inspect

## sessionStorage vs localStorage Differences

### sessionStorage Characteristics:
- **Tab-specific**: Each browser tab has separate sessionStorage
- **Temporary**: Cleared when tab is closed
- **Smaller capacity**: Usually 5-10MB limit
- **Same-origin**: Restricted to same domain/protocol/port

### localStorage Characteristics:
- **Browser-wide**: Shared across all tabs for same origin
- **Persistent**: Survives browser restart
- **Larger capacity**: Usually 10MB+ limit  
- **Same-origin**: Restricted to same domain/protocol/port

## Expected Behavior After Fix

With `world: 'MAIN'` execution context:
- ✅ sessionStorage should be properly detected and counted
- ✅ sessionStorage should be included in exports
- ✅ sessionStorage should be restored during imports
- ✅ sessionStorage should be cleared with clear operations
- ✅ All operations should show detailed console logging

The sessionStorage functionality should now work identically to localStorage!