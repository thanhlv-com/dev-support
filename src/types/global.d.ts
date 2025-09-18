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
    mediumFreedium: boolean;
    jsonViewer: boolean;
    historyDeletion: HistoryDeletionConfig;
  }

  // Extension settings
  interface ExtensionSettings extends FeatureSettings {
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
    mediumFreedium: boolean;
    jsonViewer: boolean;
    [featureName: string]: boolean;
  }
}

export {};