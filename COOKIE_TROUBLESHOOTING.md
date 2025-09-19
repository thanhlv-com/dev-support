# Cookie Export/Import Troubleshooting Guide

## Common Issues and Solutions

### 1. "Failed to export cookies" Error

**Possible Causes:**
- Extension not properly reloaded after adding cookie functionality
- Missing cookie permissions
- Invalid URL (not HTTP/HTTPS)
- Browser restrictions on certain domains

**Debugging Steps:**

1. **Check Console Logs:**
   - Open Chrome DevTools (F12)
   - Go to Console tab
   - Look for messages starting with 🍪 for detailed debugging info

2. **Verify Extension Permissions:**
   - Go to `chrome://extensions/`
   - Find "Dev Support Extension"
   - Click "Details"
   - Check that "cookies" permission is listed
   - If not, reload the extension

3. **Check Current Tab URL:**
   - Ensure you're on a valid HTTP/HTTPS website
   - chrome:// and file:// URLs don't support cookies
   - Some internal browser pages may restrict cookie access

4. **Reload Extension:**
   - Go to `chrome://extensions/`
   - Click the reload button for "Dev Support Extension"
   - Try the export again

### 2. "No cookies found" Message

**This is normal if:**
- The website doesn't set any cookies
- You're in incognito mode (depending on extension settings)
- Cookies were recently cleared
- The website uses localStorage/sessionStorage instead of cookies

### 3. Extension Popup Not Showing Cookie Section

**Solutions:**
- Make sure you've built the extension: `npm run build`
- Reload the extension in chrome://extensions/
- Check that popup.html includes the cookie section

## Testing the Feature

1. **Go to a website that uses cookies** (e.g., GitHub, Google, any login site)
2. **Open the extension popup**
3. **Check the cookie count display** - should show "X cookies for domain.com"
4. **Click "Export Cookies"** - should download a JSON file
5. **Check browser console** for detailed debug logs

## Debug Information

The extension now includes extensive logging. Look for these log prefixes:
- `🍪 [POPUP]` - Messages from the popup interface
- `🍪 [BACKGROUND]` - Messages from the background script
- `🍪 [DEBUG]` - Detailed debugging information
- `❌ [ERROR]` - Error messages with full details

## Manual Testing Commands

You can test the cookie API directly in the console:

```javascript
// Test if cookies API is available
console.log('Cookies API available:', !!chrome.cookies);

// Test getting cookies for current site
chrome.cookies.getAll({url: window.location.href}, (cookies) => {
  console.log('Cookies found:', cookies.length);
  console.log('Cookie details:', cookies);
});
```

## Common Browser Restrictions

- **Chrome Extensions API**: Some websites (like chrome:// pages) don't allow cookie access
- **HTTPS Only**: Some cookies may only be accessible on HTTPS sites
- **HttpOnly Cookies**: Some cookies are marked as HttpOnly and may have limited access
- **SameSite Restrictions**: Modern browsers have strict SameSite cookie policies

## If All Else Fails

1. Check the browser's cookie settings: chrome://settings/cookies
2. Ensure the website actually sets cookies (check DevTools > Application > Cookies)
3. Try on a different website known to use cookies
4. Check if other extensions are interfering with cookie access