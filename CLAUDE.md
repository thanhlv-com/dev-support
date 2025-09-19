# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Dev Support Extension v2.0.0** - A comprehensive Chrome extension (Manifest V3) designed for developer productivity. Provides advanced features for proxy management, browser automation, JSON visualization, and developer workflow enhancement.

## Development Commands

### Build and Development
- `npm run build` - Production build using webpack with optimizations
- `npm run build:dev` - Development build with source maps
- `npm run watch` - Development build with file watching for rapid iteration
- `npm run clean` - Clean dist directory using rimraf
- `npm run package` - Complete release process: clean → build → zip for Chrome Web Store

### Code Quality and Linting
- `npm run lint` - ESLint check for TypeScript/JavaScript files
- `npm run lint:fix` - Auto-fix linting issues where possible
- `npm run type-check` - TypeScript type checking without emitting files
- `npm run type-check:watch` - TypeScript type checking with watch mode for development

### Asset Management
- `npm run icons:convert` - Convert SVG source icons to PNG format using shell script
- `npm run icons:preview` - Generate HTML preview of all icon sizes

### Testing
- `npm run test` - Currently returns success with no tests (placeholder for future test integration)

## Architecture Overview

### Core Framework
Chrome Extension Manifest V3 with TypeScript, modular architecture, and comprehensive Chrome APIs integration.

### Main Components

#### 1. Background Service Worker (`src/background.ts`)
**Role**: Central orchestrator and API gateway
**Key Responsibilities**:
- **Message Router**: Handles communication between popup, options, content scripts
- **Chrome API Manager**: Integrates tabs, storage, alarms, contextMenus, proxy, webRequest APIs
- **Screen Capture Engine**: 
  - Viewport capture using `chrome.tabs.captureVisibleTab()`
  - Full-page capture with intelligent scrolling and stitching
  - Automatic download via `chrome.downloads` API
- **History Management**: 
  - Configurable scheduled deletion (daily/weekly/monthly)
  - Pattern-based exclusions with glob matching
  - Bulk vs individual deletion optimization
- **Proxy Controller**: Interfaces with ProxyManager for network routing
- **Analytics Tracker**: Local event storage with automatic cleanup

#### 2. Popup Controller (`src/popup.ts`)
**Role**: Quick actions interface (380px width popup)
**Features**:
- **Screen Capture**: Quick full-page and visible area capture
- **History Quick Actions**: One-click deletion (all history, 30+ days, 7+ days)
- **Status Display**: Active feature count, current URL
- **Real-time Feedback**: Capture status, deletion confirmation with counts

#### 3. Options Controller (`src/options.ts`)
**Role**: Comprehensive settings management (full-page interface)
**Configuration Panels**:
- **Feature Toggles**: Medium Freedium redirect, JSON viewer
- **History Management**: Retention days, intervals, startup deletion, exclusion patterns
- **Proxy Configuration**: Profiles, rules, global settings, import/export
- **Statistics Dashboard**: History counts, recent items
- **Debug Tools**: Proxy testing, configuration validation

#### 4. Content Script (`src/content.ts`)
**Role**: Page enhancement and feature injection
**Features**:
- **Medium Freedium**: Floating action button with animation and analytics
- **JSON Viewer**: Automatic detection and formatting of JSON content
- **Page Detection**: Smart content-type and URL pattern matching
- **SPA Navigation**: Mutation observer for route changes

### Feature Modules

#### JSON Viewer (`src/features/json-viewer/JsonViewer.ts`)
**Capabilities**:
- **Tree View**: Collapsible nodes with type indicators
- **Formatted View**: Syntax-highlighted raw JSON
- **Search**: Real-time highlighting across keys and values
- **Copy**: One-click JSON copying to clipboard
- **Themes**: Dark/light mode support
- **Mobile Responsive**: Adaptive layout for small screens

#### Proxy Manager (`src/features/proxy/ProxyManager.ts`)
**Advanced Features**:
- **Profile System**: Reusable proxy configurations (HTTP/HTTPS/SOCKS4/SOCKS5)
- **Rule Engine**: Domain pattern matching with wildcard support
- **PAC Script Generation**: Dynamic proxy routing logic
- **Authentication**: Automatic credential handling via webRequest API
- **Global Proxy**: Default proxy for all non-matched domains
- **Connection Testing**: Validation with real network requests
- **Import/Export**: JSON configuration backup/restore

#### Screen Capture (`src/features/screen-capture/ScreenCapture.ts`)
**Technical Implementation**:
- **Singleton Pattern**: Thread-safe capture management
- **Full-Page Algorithm**: Intelligent scrolling with viewport stitching
- **Canvas Processing**: OffscreenCanvas for image combination
- **Format Support**: PNG/JPEG with quality control
- **Rate Limiting**: Max 2 captures per second to respect Chrome limits
- **Error Handling**: Graceful fallbacks and user feedback

### TypeScript Type System (`src/types/global.d.ts`)

#### Core Interfaces
```typescript
interface ExtensionSettings {
  mediumFreedium: boolean;
  jsonViewer: boolean;
  historyDeletion: HistoryDeletionConfig;
  proxyConfig?: ProxyConfiguration;
}

interface ProxyConfiguration {
  enabled: boolean;
  profiles: ProxyProfile[];
  rules: ProxyRule[];
  globalProxyProfileId?: string;
}

interface HistoryDeletionConfig {
  enabled: boolean;
  interval: 'daily' | 'weekly' | 'monthly';
  retentionDays: number;
  deleteOnStartup: boolean;
  excludePatterns: string[];
}
```

#### Message System
- **ChromeMessage**: Base interface for all inter-component communication
- **BackgroundMessage**: Background script message routing with action types
- **ContentMessage**: Content script feature toggles

### Build System and Configuration

#### Webpack Configuration (`webpack.config.js`)
**Advanced Setup**:
- **Multiple Entry Points**: popup, options, background, content scripts
- **TypeScript Compilation**: ts-loader with transpileOnly optimization
- **CSS Processing**: Development vs production loaders
- **Asset Pipeline**: CopyWebpackPlugin for static assets
- **Optimization**: TerserPlugin for minification, CSS minimization
- **Source Maps**: Development debugging support
- **Path Aliases**: `@/` pointing to `src/` directory

#### TypeScript Configuration (`tsconfig.json`)
- **Target**: ES2020 with DOM libraries
- **Module System**: ESNext with Node resolution
- **Strict Mode**: Full type checking enabled
- **Chrome Types**: Extension API type definitions
- **Path Mapping**: Alias resolution support

#### ESLint Configuration (`.eslintrc.js`)
- **Parser**: TypeScript ESLint with latest ECMAScript
- **Environment**: Browser + WebExtensions globals
- **Rules**: Modern JavaScript patterns, unused variable warnings
- **Chrome Global**: Extension API namespace

### UI and Styling

#### Popup Interface (`public/popup.html`)
**Design**: Compact 380px interface with gradient header
**Sections**:
- **Header**: Branded title with version info
- **Quick Actions**: Screen capture controls with status feedback
- **History Actions**: Immediate deletion options with confirmation
- **Status Display**: Feature count and URL information

#### Options Interface (`public/options.html`)
**Design**: Full-page settings with responsive layout
**Sections**:
- **Feature Controls**: Toggle switches with descriptions
- **History Configuration**: Advanced scheduling and exclusion settings
- **Proxy Management**: Profile creation, rule management, testing tools
- **Import/Export**: Configuration backup and restore

#### CSS Architecture
- **Popup Styles** (`src/assets/styles/popup.css`): Compact popup design with gradients
- **Options Styles** (`src/assets/styles/options.css`): Full-page responsive layout
- **JSON Viewer Styles**: Dark theme with syntax highlighting
- **Content Styles**: Freedium button styling with animations

### Chrome Extension Integration

#### Manifest V3 Configuration (`public/manifest.json`)
**Permissions**:
- `activeTab`, `storage`, `contextMenus` - Core extension functionality
- `desktopCapture`, `downloads` - Screen capture and file download
- `proxy`, `webRequest`, `webRequestAuthProvider` - Network management
- `<all_urls>` host permission - Universal content script access

**Service Worker**: Background script with persistent state management
**Content Scripts**: Universal injection for page enhancement
**Web Accessible Resources**: Icon and asset access for content scripts

#### Chrome API Usage
- **chrome.storage**: Sync and local storage for settings and analytics
- **chrome.tabs**: Tab management and screen capture
- **chrome.proxy**: Network routing configuration
- **chrome.webRequest**: Authentication and request interception
- **chrome.alarms**: Scheduled task management
- **chrome.downloads**: File download management
- **chrome.contextMenus**: Right-click menu integration

### Icon System (`tools/icons/`)
**Professional Design**: Blue-to-purple gradient theme (`#667eea` → `#764ba2`)
**Comprehensive Sizes**: 16, 19, 24, 32, 38, 48, 64, 128px variants
**Source Format**: SVG with automated PNG conversion
**Conversion Tools**: Shell scripts with multiple rendering options (librsvg, Inkscape, ImageMagick)

### Development Workflow

#### Local Development
1. `npm run watch` - Start development build with file watching
2. Load unpacked extension in Chrome from `dist/` directory
3. Use Chrome DevTools for debugging (popup, options, background)
4. Content script debugging via page DevTools

#### Production Build
1. `npm run clean` - Clear previous builds
2. `npm run lint` and `npm run type-check` - Code quality verification
3. `npm run build` - Production optimization
4. `npm run package` - Create Chrome Web Store zip

#### Code Quality Standards
- **TypeScript**: Strict type checking with Chrome API types
- **ESLint**: Modern JavaScript patterns and best practices
- **No Console Logs**: Allowed for extension debugging
- **Arrow Functions**: Preferred over function declarations
- **Const/Let**: No var declarations allowed

### Performance Considerations

#### Memory Management
- **Singleton Patterns**: ProxyManager, ScreenCapture instances
- **Event Cleanup**: Proper listener removal in content scripts
- **Storage Optimization**: Local analytics with automatic cleanup (100 events max)
- **Background Persistence**: Service worker state management

#### Network Efficiency
- **PAC Script Optimization**: Minimal regex patterns, caching
- **Rate Limiting**: Screen capture timing controls
- **Bulk Operations**: History deletion optimization
- **Request Filtering**: Targeted webRequest interception

### Security Implementation

#### Data Protection
- **No Sensitive Storage**: Proxy passwords in encrypted sync storage only
- **Sandboxed Execution**: Content script isolation
- **Permission Minimization**: Specific Chrome API access only
- **HTTPS Enforcement**: Proxy authentication over secure connections

#### Extension Security
- **Manifest V3**: Latest security model compliance
- **Content Security Policy**: Strict script execution rules
- **Host Permissions**: Explicit URL access control
- **Web Accessible Resources**: Minimal asset exposure

### Testing and Debugging

#### Built-in Debug Tools
- **Proxy Debug Panel**: Live PAC script analysis and connection testing
- **History Statistics**: Real-time count tracking
- **Feature Status**: Active component monitoring
- **Console Logging**: Comprehensive debug output with emoji prefixes

#### Manual Testing Procedures
- **Proxy Validation**: httpbin.org/ip for IP verification
- **JSON Viewer**: dummyjson.com/products for format testing
- **Medium Redirect**: Any Medium article for button functionality
- **History Deletion**: Chrome history verification before/after

This architecture provides a robust, scalable foundation for developer productivity tools while maintaining Chrome extension best practices and security standards.