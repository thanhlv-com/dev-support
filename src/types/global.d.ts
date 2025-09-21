// Global type definitions for Dev Support Extension

declare global {
  interface Window {
    devSupportLoaded?: boolean;
    DevSupportUtils?: {
      highlight: (selector: string) => void;
      inspect: (element: Element) => any;
      performance: () => any;
      export: () => any;
      clearHighlights: () => void;
    };
  }

  // Chrome extension specific types
  interface ChromeStorageResult {
    [key: string]: any;
  }

  interface ChromeTabInfo {
    id: number;
    url: string;
    title: string;
    status: string;
    favIconUrl?: string;
  }

  interface ChromeMessage {
    action: string;
    [key: string]: any;
  }

  interface ChromeAnalyticsEvent {
    event: string;
    data: any;
    timestamp: number;
    userAgent: string;
  }

  // History deletion configuration
  interface HistoryDeletionConfig {
    enabled: boolean;
    interval: 'daily' | 'weekly' | 'monthly';
    retentionDays: number;
    deleteOnStartup: boolean;
    excludePatterns: string[];
  }

  // Feature settings interface
  interface FeatureSettings {
    freediumFeature: boolean;
    jsonViewer: boolean;
    imageDownloader: boolean;
    imageDownloaderButton: boolean;
    historyDeletion: HistoryDeletionConfig;
  }

  // Proxy configuration types
  interface ProxyProfile {
    id: string;
    name: string;
    proxyType: 'http' | 'https' | 'socks4' | 'socks5';
    host: string;
    port: number;
    username?: string;
    password?: string;
    description?: string;
  }

  interface ProxyRule {
    id: string;
    name: string;
    enabled: boolean;
    domainPatterns: string[];
    profileId: string; // References a ProxyProfile
    bypassList?: string[];
  }

  interface ProxyConfiguration {
    enabled: boolean;
    profiles: ProxyProfile[];
    globalProxyProfileId?: string; // References a ProxyProfile for global proxy
    rules: ProxyRule[];
  }

  // Extension settings
  interface ExtensionSettings extends FeatureSettings {
    proxyConfig?: ProxyConfiguration;
    [key: string]: any;
  }

  // Analytics data structure
  interface AnalyticsData {
    originalUrl: string;
    freediumUrl: string;
    timestamp: number;
  }

  // Feature toggle component state
  interface FeatureState {
    freediumFeature: boolean;
    jsonViewer: boolean;
    imageDownloader: boolean;
    imageDownloaderButton: boolean;
    [featureName: string]: boolean;
  }

  // Storage management types (cookies + localStorage + sessionStorage)
  interface CookieData {
    name: string;
    value: string;
    domain?: string;
    path?: string;
    secure?: boolean;
    httpOnly?: boolean;
    sameSite?: chrome.cookies.SameSiteStatus;
    expirationDate?: number;
  }

  interface LocalStorageData {
    [key: string]: string;
  }

  interface IndexedDBData {
    [databaseName: string]: {
      version: number;
      objectStores: {
        [storeName: string]: {
          keyPath?: string | string[];
          autoIncrement?: boolean;
          data: any[];
          indexes?: {
            [indexName: string]: {
              keyPath: string | string[];
              unique: boolean;
              multiEntry: boolean;
            };
          };
        };
      };
    };
  }

  interface StorageExport {
    domain: string;
    url: string;
    timestamp: number;
    cookies: CookieData[];
    localStorage: LocalStorageData;
    sessionStorage: LocalStorageData;
    indexedDB: IndexedDBData;
  }

  // Legacy cookie export interface for backward compatibility
  interface CookieExport {
    domain: string;
    url: string;
    timestamp: number;
    cookies: CookieData[];
  }

  interface StorageMessage extends ChromeMessage {
    action: 'exportStorage' | 'importStorage' | 'clearStorage' | 'getStorageCount';
    url?: string;  
    tabId?: number;
    storageData?: StorageExport;
  }

  // Legacy cookie message interface for backward compatibility
  interface CookieMessage extends ChromeMessage {
    action: 'exportCookies' | 'importCookies' | 'clearCookies' | 'getCookieCount';
    url?: string;
    cookieData?: CookieExport;
  }

  // Image downloader types
  interface ImageInfo {
    url: string;
    filename: string;
    size?: number;
    width?: number;
    height?: number;
    type?: string;
  }

  interface DownloadProgress {
    total: number;
    completed: number;
    failed: number;
    errors: string[];
  }

  interface ImageDownloadMessage extends ChromeMessage {
    action: 'downloadImages';
    images: ImageInfo[];
  }
}

export {};