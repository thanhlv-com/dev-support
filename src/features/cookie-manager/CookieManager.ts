/**
 * Storage Manager
 * Handles cookie and localStorage export/import for the current website
 */

export interface CookieData {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: chrome.cookies.SameSiteStatus;
  expirationDate?: number;
}

export interface LocalStorageData {
  [key: string]: string;
}

export interface StorageExport {
  domain: string;
  url: string;
  timestamp: number;
  cookies: CookieData[];
  localStorage: LocalStorageData;
  sessionStorage: LocalStorageData;
}

export class StorageManager {
  private static instance: StorageManager;

  public static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  /**
   * Export all storage data (cookies, localStorage, sessionStorage) for the current domain
   */
  async exportStorage(url: string, tabId?: number): Promise<StorageExport> {
    try {
      console.log('💾 [DEBUG] Starting storage export for URL:', url, 'tabId:', tabId);
      
      const urlObj = new URL(url);
      const domain = urlObj.hostname;
      console.log('💾 [DEBUG] Parsed domain:', domain);
      
      // Export cookies
      let cookieData: CookieData[] = [];
      if (chrome.cookies) {
        console.log('🍪 [DEBUG] Exporting cookies...');
        const cookies = await this.getCookiesForUrl(url);
        cookieData = cookies.map(cookie => ({
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain,
          path: cookie.path,
          secure: cookie.secure,
          httpOnly: cookie.httpOnly,
          sameSite: cookie.sameSite as chrome.cookies.SameSiteStatus,
          expirationDate: cookie.expirationDate
        }));
        console.log('🍪 [DEBUG] Retrieved cookies:', cookieData.length, 'cookies found');
      } else {
        console.warn('🍪 [WARN] Cookies API not available - missing permissions');
      }

      // Export localStorage and sessionStorage
      let localStorageData: LocalStorageData = {};
      let sessionStorageData: LocalStorageData = {};
      
      if (tabId && chrome.scripting) {
        console.log('💾 [DEBUG] Exporting localStorage and sessionStorage...');
        try {
          const results = await chrome.scripting.executeScript({
            target: { tabId },
            world: 'MAIN',
            func: () => {
              // Standalone function to extract storage data
              const localStorageData: {[key: string]: string} = {};
              const sessionStorageData: {[key: string]: string} = {};

              console.log('💾 [INJECT] Starting storage extraction...');
              console.log('💾 [INJECT] Window object available:', typeof window !== 'undefined');
              console.log('💾 [INJECT] localStorage available:', typeof localStorage !== 'undefined');
              console.log('💾 [INJECT] sessionStorage available:', typeof sessionStorage !== 'undefined');

              try {
                // Extract localStorage
                if (typeof localStorage !== 'undefined') {
                  console.log('💾 [INJECT] localStorage length:', localStorage.length);
                  for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key) {
                      const value = localStorage.getItem(key) || '';
                      localStorageData[key] = value;
                      console.log('💾 [INJECT] Found localStorage item:', key, '(', value.length, 'chars)');
                    }
                  }
                  console.log('💾 [INJECT] localStorage extraction complete, items found:', Object.keys(localStorageData).length);
                } else {
                  console.warn('💾 [INJECT] localStorage not available');
                }
              } catch (error) {
                console.error('💾 [INJECT] Failed to access localStorage:', error);
              }

              try {
                // Extract sessionStorage
                if (typeof sessionStorage !== 'undefined') {
                  console.log('💾 [INJECT] sessionStorage length:', sessionStorage.length);
                  for (let i = 0; i < sessionStorage.length; i++) {
                    const key = sessionStorage.key(i);
                    if (key) {
                      const value = sessionStorage.getItem(key) || '';
                      sessionStorageData[key] = value;
                      console.log('💾 [INJECT] Found sessionStorage item:', key, '(', value.length, 'chars)');
                    }
                  }
                  console.log('💾 [INJECT] sessionStorage extraction complete, items found:', Object.keys(sessionStorageData).length);
                } else {
                  console.warn('💾 [INJECT] sessionStorage not available');
                }
              } catch (error) {
                console.error('💾 [INJECT] Failed to access sessionStorage:', error);
              }

              const result = { localStorage: localStorageData, sessionStorage: sessionStorageData };
              console.log('💾 [INJECT] Final result:', result);
              return result;
            }
          });
          
          if (results && results[0] && results[0].result) {
            const storageResult = results[0].result;
            localStorageData = storageResult.localStorage || {};
            sessionStorageData = storageResult.sessionStorage || {};
            console.log('💾 [DEBUG] localStorage items:', Object.keys(localStorageData).length);
            console.log('💾 [DEBUG] sessionStorage items:', Object.keys(sessionStorageData).length);
          }
        } catch (storageError) {
          console.warn('💾 [WARN] Failed to export localStorage/sessionStorage:', storageError);
          console.warn('💾 [WARN] Error details:', storageError);
        }
      } else {
        console.warn('💾 [WARN] Cannot export localStorage - missing tabId or scripting permission');
      }

      const exportData: StorageExport = {
        domain,
        url,
        timestamp: Date.now(),
        cookies: cookieData,
        localStorage: localStorageData,
        sessionStorage: sessionStorageData
      };

      const totalItems = cookieData.length + Object.keys(localStorageData).length + Object.keys(sessionStorageData).length;
      console.log('💾 [SUCCESS] Exported storage for:', domain, `(${totalItems} total items: ${cookieData.length} cookies, ${Object.keys(localStorageData).length} localStorage, ${Object.keys(sessionStorageData).length} sessionStorage)`);
      return exportData;
    } catch (error) {
      console.error('❌ [ERROR] Error exporting storage:', error);
      console.error('❌ [ERROR] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        url: url
      });
      throw error;
    }
  }

  /**
   * Helper method to get cookies for a URL
   */
  private async getCookiesForUrl(url: string): Promise<chrome.cookies.Cookie[]> {
    // Try the promise-based approach first, fallback to callback if needed
    try {
      return await chrome.cookies.getAll({ url });
    } catch (promiseError) {
      console.log('🍪 [DEBUG] Promise-based approach failed, trying callback approach:', promiseError);
      // Fallback to callback-based approach
      return new Promise<chrome.cookies.Cookie[]>((resolve, reject) => {
        chrome.cookies.getAll({ url }, (result) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(result || []);
          }
        });
      });
    }
  }


  /**
   * Import storage data (cookies, localStorage, sessionStorage)
   */
  async importStorage(storageExport: StorageExport, tabId?: number): Promise<void> {
    try {
      console.log('💾 [DEBUG] Starting storage import for:', storageExport.domain);
      
      const { cookies, localStorage: localStorageData, sessionStorage: sessionStorageData, url } = storageExport;
      const urlObj = new URL(url);
      
      let cookieImportedCount = 0;
      let cookieFailedCount = 0;

      // Import cookies
      if (chrome.cookies && cookies.length > 0) {
        console.log('🍪 [DEBUG] Importing', cookies.length, 'cookies...');
        for (const cookieData of cookies) {
          try {
            const cookieDetails: chrome.cookies.SetDetails = {
              url: url,
              name: cookieData.name,
              value: cookieData.value,
              domain: cookieData.domain,
              path: cookieData.path,
              secure: cookieData.secure,
              httpOnly: cookieData.httpOnly,
              sameSite: cookieData.sameSite,
              expirationDate: cookieData.expirationDate
            };

            await chrome.cookies.set(cookieDetails);
            cookieImportedCount++;
          } catch (error) {
            console.warn('⚠️ Failed to import cookie:', cookieData.name, error);
            cookieFailedCount++;
          }
        }
      }

      // Import localStorage and sessionStorage
      let storageImportedCount = 0;
      if (tabId && chrome.scripting && (Object.keys(localStorageData).length > 0 || Object.keys(sessionStorageData).length > 0)) {
        console.log('💾 [DEBUG] Importing localStorage and sessionStorage...');
        try {
          await chrome.scripting.executeScript({
            target: { tabId },
            world: 'MAIN',
            func: (localData: {[key: string]: string}, sessionData: {[key: string]: string}) => {
              // Standalone function to inject storage data
              let localStorageRestored = 0;
              let sessionStorageRestored = 0;

              console.log('💾 [INJECT-IMPORT] Starting storage import...');
              console.log('💾 [INJECT-IMPORT] localStorage items to import:', Object.keys(localData).length);
              console.log('💾 [INJECT-IMPORT] sessionStorage items to import:', Object.keys(sessionData).length);
              console.log('💾 [INJECT-IMPORT] localStorage available:', typeof localStorage !== 'undefined');
              console.log('💾 [INJECT-IMPORT] sessionStorage available:', typeof sessionStorage !== 'undefined');

              try {
                // Restore localStorage
                if (typeof localStorage !== 'undefined') {
                  console.log('💾 [INJECT-IMPORT] Restoring localStorage items...');
                  Object.entries(localData).forEach(([key, value]) => {
                    try {
                      localStorage.setItem(key, value);
                      localStorageRestored++;
                      console.log('✅ [INJECT-IMPORT] Restored localStorage item:', key);
                    } catch (error) {
                      console.warn('⚠️ [INJECT-IMPORT] Failed to restore localStorage item:', key, error);
                    }
                  });
                  console.log('💾 [INJECT-IMPORT] localStorage restore complete:', localStorageRestored, 'items');
                } else {
                  console.warn('💾 [INJECT-IMPORT] localStorage not available for import');
                }
              } catch (error) {
                console.error('💾 [INJECT-IMPORT] Failed to access localStorage for import:', error);
              }

              try {
                // Restore sessionStorage
                if (typeof sessionStorage !== 'undefined') {
                  console.log('💾 [INJECT-IMPORT] Restoring sessionStorage items...');
                  Object.entries(sessionData).forEach(([key, value]) => {
                    try {
                      sessionStorage.setItem(key, value);
                      sessionStorageRestored++;
                      console.log('✅ [INJECT-IMPORT] Restored sessionStorage item:', key);
                    } catch (error) {
                      console.warn('⚠️ [INJECT-IMPORT] Failed to restore sessionStorage item:', key, error);
                    }
                  });
                  console.log('💾 [INJECT-IMPORT] sessionStorage restore complete:', sessionStorageRestored, 'items');
                } else {
                  console.warn('💾 [INJECT-IMPORT] sessionStorage not available for import');
                }
              } catch (error) {
                console.error('💾 [INJECT-IMPORT] Failed to access sessionStorage for import:', error);
              }

              const result = { localStorageRestored, sessionStorageRestored };
              console.log('💾 [INJECT-IMPORT] Final import result:', result);
              return result;
            },
            args: [localStorageData, sessionStorageData]
          });
          storageImportedCount = Object.keys(localStorageData).length + Object.keys(sessionStorageData).length;
          console.log('💾 [DEBUG] Storage data injected successfully');
        } catch (storageError) {
          console.warn('💾 [WARN] Failed to import localStorage/sessionStorage:', storageError);
          console.warn('💾 [WARN] Error details:', storageError);
        }
      }

      const totalImported = cookieImportedCount + storageImportedCount;
      console.log(`💾 [SUCCESS] Imported ${totalImported} items for ${urlObj.hostname}: ${cookieImportedCount} cookies, ${storageImportedCount} storage items (${cookieFailedCount} failed)`);
    } catch (error) {
      console.error('❌ Error importing storage:', error);
      throw error;
    }
  }


  /**
   * Clear all storage data (cookies, localStorage, sessionStorage) for the current domain
   */
  async clearStorage(url: string, tabId?: number): Promise<{ cookies: number; localStorage: number; sessionStorage: number }> {
    try {
      console.log('🧹 [DEBUG] Starting storage clear for URL:', url);
      const urlObj = new URL(url);
      
      let cookiesClearedCount = 0;
      let localStorageClearedCount = 0;  
      let sessionStorageClearedCount = 0;

      // Clear cookies
      if (chrome.cookies) {
        const cookies = await this.getCookiesForUrl(url);
        for (const cookie of cookies) {
          try {
            await chrome.cookies.remove({
              url: url,
              name: cookie.name
            });
            cookiesClearedCount++;
          } catch (error) {
            console.warn('⚠️ Failed to remove cookie:', cookie.name, error);
          }
        }
      }

      // Clear localStorage and sessionStorage
      if (tabId && chrome.scripting) {
        try {
          const results = await chrome.scripting.executeScript({
            target: { tabId },
            world: 'MAIN',
            func: () => {
              // Standalone function to clear storage data
              let localStorageCleared = 0;
              let sessionStorageCleared = 0;

              console.log('🧹 [INJECT-CLEAR] Starting storage clear...');
              console.log('🧹 [INJECT-CLEAR] localStorage available:', typeof localStorage !== 'undefined');
              console.log('🧹 [INJECT-CLEAR] sessionStorage available:', typeof sessionStorage !== 'undefined');

              try {
                if (typeof localStorage !== 'undefined') {
                  localStorageCleared = localStorage.length;
                  console.log('🧹 [INJECT-CLEAR] localStorage items to clear:', localStorageCleared);
                  localStorage.clear();
                  console.log('🧹 [INJECT-CLEAR] localStorage cleared successfully');
                }
              } catch (error) {
                console.error('🧹 [INJECT-CLEAR] Failed to clear localStorage:', error);
              }

              try {
                if (typeof sessionStorage !== 'undefined') {
                  sessionStorageCleared = sessionStorage.length;
                  console.log('🧹 [INJECT-CLEAR] sessionStorage items to clear:', sessionStorageCleared);
                  sessionStorage.clear();
                  console.log('🧹 [INJECT-CLEAR] sessionStorage cleared successfully');
                }
              } catch (error) {
                console.error('🧹 [INJECT-CLEAR] Failed to clear sessionStorage:', error);
              }

              const result = { localStorage: localStorageCleared, sessionStorage: sessionStorageCleared };
              console.log('🧹 [INJECT-CLEAR] Final clear result:', result);
              return result;
            }
          });
          
          if (results && results[0] && results[0].result) {
            const clearResult = results[0].result;
            localStorageClearedCount = clearResult.localStorage || 0;
            sessionStorageClearedCount = clearResult.sessionStorage || 0;
          }
        } catch (storageError) {
          console.warn('💾 [WARN] Failed to clear localStorage/sessionStorage:', storageError);
          console.warn('💾 [WARN] Error details:', storageError);
        }
      }

      const totalCleared = cookiesClearedCount + localStorageClearedCount + sessionStorageClearedCount;
      console.log(`🧹 [SUCCESS] Cleared ${totalCleared} items for ${urlObj.hostname}: ${cookiesClearedCount} cookies, ${localStorageClearedCount} localStorage, ${sessionStorageClearedCount} sessionStorage`);
      
      return {
        cookies: cookiesClearedCount,
        localStorage: localStorageClearedCount,
        sessionStorage: sessionStorageClearedCount
      };
    } catch (error) {
      console.error('❌ Error clearing storage:', error);
      throw error;
    }
  }


  /**
   * Get storage counts for the current domain
   */
  async getStorageCount(url: string, tabId?: number): Promise<{ cookies: number; localStorage: number; sessionStorage: number; total: number }> {
    try {
      let cookieCount = 0;
      let localStorageCount = 0;
      let sessionStorageCount = 0;

      // Get cookie count
      if (chrome.cookies) {
        const cookies = await this.getCookiesForUrl(url);
        cookieCount = cookies.length;
      }

      // Get localStorage and sessionStorage counts
      if (tabId && chrome.scripting) {
        try {
          const results = await chrome.scripting.executeScript({
            target: { tabId },
            world: 'MAIN',
            func: () => {
              // Standalone function to get storage counts
              let localStorageCount = 0;
              let sessionStorageCount = 0;

              console.log('📊 [INJECT-COUNT] Starting storage count...');
              console.log('📊 [INJECT-COUNT] localStorage available:', typeof localStorage !== 'undefined');
              console.log('📊 [INJECT-COUNT] sessionStorage available:', typeof sessionStorage !== 'undefined');

              try {
                if (typeof localStorage !== 'undefined') {
                  localStorageCount = localStorage.length;
                  console.log('📊 [INJECT-COUNT] localStorage count:', localStorageCount);
                  // List all keys for debugging
                  for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    console.log('📊 [INJECT-COUNT] localStorage key:', key);
                  }
                }
              } catch (error) {
                console.error('📊 [INJECT-COUNT] Failed to access localStorage for count:', error);
              }

              try {
                if (typeof sessionStorage !== 'undefined') {
                  sessionStorageCount = sessionStorage.length;
                  console.log('📊 [INJECT-COUNT] sessionStorage count:', sessionStorageCount);
                  // List all keys for debugging
                  for (let i = 0; i < sessionStorage.length; i++) {
                    const key = sessionStorage.key(i);
                    console.log('📊 [INJECT-COUNT] sessionStorage key:', key);
                  }
                }
              } catch (error) {
                console.error('📊 [INJECT-COUNT] Failed to access sessionStorage for count:', error);
              }

              const result = { localStorage: localStorageCount, sessionStorage: sessionStorageCount };
              console.log('📊 [INJECT-COUNT] Final count result:', result);
              return result;
            }
          });
          
          if (results && results[0] && results[0].result) {
            const counts = results[0].result;
            localStorageCount = counts.localStorage || 0;
            sessionStorageCount = counts.sessionStorage || 0;
          }
        } catch (storageError) {
          console.warn('💾 [WARN] Failed to get localStorage/sessionStorage counts:', storageError);
          console.warn('💾 [WARN] Error details:', storageError);
        }
      }

      const total = cookieCount + localStorageCount + sessionStorageCount;
      return { cookies: cookieCount, localStorage: localStorageCount, sessionStorage: sessionStorageCount, total };
    } catch (error) {
      console.error('❌ Error getting storage counts:', error);
      return { cookies: 0, localStorage: 0, sessionStorage: 0, total: 0 };
    }
  }


  /**
   * Download storage data as JSON file
   */
  downloadStorageAsFile(storageExport: StorageExport): void {
    const jsonData = JSON.stringify(storageExport, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const totalItems = storageExport.cookies.length + Object.keys(storageExport.localStorage).length + Object.keys(storageExport.sessionStorage).length;
    const filename = `storage_${storageExport.domain}_${totalItems}items_${new Date().toISOString().split('T')[0]}.json`;
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('📥 Downloaded storage file:', filename);
  }

  /**
   * Parse uploaded storage file
   */
  async parseUploadedFile(file: File): Promise<StorageExport> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const storageExport = JSON.parse(content) as any;
          
          // Check if it's the old cookie format and convert it
          if (storageExport.cookies && !storageExport.localStorage && !storageExport.sessionStorage) {
            console.log('📥 Converting legacy cookie file format...');
            const legacyData = storageExport as CookieData;
            const convertedData: StorageExport = {
              domain: legacyData.domain || new URL(storageExport.url).hostname,
              url: storageExport.url,
              timestamp: storageExport.timestamp || Date.now(),
              cookies: storageExport.cookies || [],
              localStorage: {},
              sessionStorage: {}
            };
            resolve(convertedData);
            return;
          }
          
          // Validate the new storage format
          if (!storageExport.domain || !Array.isArray(storageExport.cookies)) {
            throw new Error('Invalid storage file format - missing domain or cookies array');
          }
          
          // Ensure localStorage and sessionStorage exist
          const validatedExport: StorageExport = {
            domain: storageExport.domain,
            url: storageExport.url,
            timestamp: storageExport.timestamp || Date.now(),
            cookies: storageExport.cookies || [],
            localStorage: storageExport.localStorage || {},
            sessionStorage: storageExport.sessionStorage || {}
          };
          
          resolve(validatedExport);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }
}