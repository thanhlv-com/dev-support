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

export interface IndexedDBData {
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

export interface StorageExport {
  domain: string;
  url: string;
  timestamp: number;
  cookies: CookieData[];
  localStorage: LocalStorageData;
  sessionStorage: LocalStorageData;
  indexedDB: IndexedDBData;
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

      // Export localStorage, sessionStorage, and IndexedDB
      let localStorageData: LocalStorageData = {};
      let sessionStorageData: LocalStorageData = {};
      let indexedDBData: IndexedDBData = {};
      
      if (tabId && chrome.scripting) {
        console.log('💾 [DEBUG] Exporting localStorage, sessionStorage, and IndexedDB...');
        try {
          const results = await chrome.scripting.executeScript({
            target: { tabId },
            world: 'MAIN',
            func: async () => {
              // Standalone function to extract storage data
              const localStorageData: {[key: string]: string} = {};
              const sessionStorageData: {[key: string]: string} = {};
              const indexedDBData: {[key: string]: any} = {};

              console.log('💾 [INJECT] Starting storage extraction...');
              console.log('💾 [INJECT] Window object available:', typeof window !== 'undefined');
              console.log('💾 [INJECT] localStorage available:', typeof localStorage !== 'undefined');
              console.log('💾 [INJECT] sessionStorage available:', typeof sessionStorage !== 'undefined');
              console.log('💾 [INJECT] IndexedDB available:', typeof indexedDB !== 'undefined');

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

              try {
                // Extract IndexedDB
                if (typeof indexedDB !== 'undefined') {
                  console.log('💾 [INJECT] Starting IndexedDB extraction...');
                  
                  // Get all database names
                  const databases = await indexedDB.databases();
                  console.log('💾 [INJECT] Found databases:', databases.length);
                  
                  for (const dbInfo of databases) {
                    if (!dbInfo.name) continue;
                    
                    console.log('💾 [INJECT] Processing database:', dbInfo.name, 'version:', dbInfo.version);
                    
                    try {
                      const db = await new Promise<IDBDatabase>((resolve, reject) => {
                        const request = indexedDB.open(dbInfo.name!, dbInfo.version);
                        request.onsuccess = () => resolve(request.result);
                        request.onerror = () => reject(request.error);
                        request.onblocked = () => reject(new Error('Database blocked'));
                      });
                      
                      const dbData: any = {
                        version: db.version,
                        objectStores: {}
                      };
                      
                      // Extract data from each object store
                      for (const storeName of Array.from(db.objectStoreNames)) {
                        console.log('💾 [INJECT] Processing object store:', storeName);
                        
                        const transaction = db.transaction([storeName], 'readonly');
                        const store = transaction.objectStore(storeName);
                        
                        // Get store metadata
                        const storeData: any = {
                          keyPath: store.keyPath,
                          autoIncrement: store.autoIncrement,
                          data: [],
                          indexes: {}
                        };
                        
                        // Get all index metadata
                        for (const indexName of Array.from(store.indexNames)) {
                          const index = store.index(indexName);
                          storeData.indexes[indexName] = {
                            keyPath: index.keyPath,
                            unique: index.unique,
                            multiEntry: index.multiEntry
                          };
                        }
                        
                        // Get all data from the store
                        const allData = await new Promise<any[]>((resolve, reject) => {
                          const request = store.getAll();
                          request.onsuccess = () => resolve(request.result || []);
                          request.onerror = () => reject(request.error);
                        });
                        
                        storeData.data = allData;
                        dbData.objectStores[storeName] = storeData;
                        
                        console.log('💾 [INJECT] Extracted', allData.length, 'items from store:', storeName);
                      }
                      
                      db.close();
                      indexedDBData[dbInfo.name] = dbData;
                      
                    } catch (dbError) {
                      console.warn('💾 [INJECT] Failed to process database:', dbInfo.name, dbError);
                    }
                  }
                  
                  console.log('💾 [INJECT] IndexedDB extraction complete, databases found:', Object.keys(indexedDBData).length);
                } else {
                  console.warn('💾 [INJECT] IndexedDB not available');
                }
              } catch (error) {
                console.error('💾 [INJECT] Failed to access IndexedDB:', error);
              }

              const result = { localStorage: localStorageData, sessionStorage: sessionStorageData, indexedDB: indexedDBData };
              console.log('💾 [INJECT] Final result:', result);
              return result;
            }
          });
          
          if (results && results[0] && results[0].result) {
            const storageResult = results[0].result;
            localStorageData = storageResult.localStorage || {};
            sessionStorageData = storageResult.sessionStorage || {};
            indexedDBData = storageResult.indexedDB || {};
            console.log('💾 [DEBUG] localStorage items:', Object.keys(localStorageData).length);
            console.log('💾 [DEBUG] sessionStorage items:', Object.keys(sessionStorageData).length);
            console.log('💾 [DEBUG] IndexedDB databases:', Object.keys(indexedDBData).length);
          }
        } catch (storageError) {
          console.warn('💾 [WARN] Failed to export localStorage/sessionStorage/IndexedDB:', storageError);
          console.warn('💾 [WARN] Error details:', storageError);
        }
      } else {
        console.warn('💾 [WARN] Cannot export localStorage/IndexedDB - missing tabId or scripting permission');
      }

      const exportData: StorageExport = {
        domain,
        url,
        timestamp: Date.now(),
        cookies: cookieData,
        localStorage: localStorageData,
        sessionStorage: sessionStorageData,
        indexedDB: indexedDBData
      };

      const indexedDBCount = Object.values(indexedDBData).reduce((total, db) => {
        return total + Object.values(db.objectStores).reduce((storeTotal, store) => storeTotal + store.data.length, 0);
      }, 0);
      const totalItems = cookieData.length + Object.keys(localStorageData).length + Object.keys(sessionStorageData).length + indexedDBCount;
      console.log('💾 [SUCCESS] Exported storage for:', domain, `(${totalItems} total items: ${cookieData.length} cookies, ${Object.keys(localStorageData).length} localStorage, ${Object.keys(sessionStorageData).length} sessionStorage, ${indexedDBCount} IndexedDB items)`);
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
      
      const { cookies, localStorage: localStorageData, sessionStorage: sessionStorageData, indexedDB: indexedDBData, url } = storageExport;
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

      // Import localStorage, sessionStorage, and IndexedDB
      let storageImportedCount = 0;
      if (tabId && chrome.scripting && (Object.keys(localStorageData).length > 0 || Object.keys(sessionStorageData).length > 0 || Object.keys(indexedDBData || {}).length > 0)) {
        console.log('💾 [DEBUG] Importing localStorage, sessionStorage, and IndexedDB...');
        try {
          await chrome.scripting.executeScript({
            target: { tabId },
            world: 'MAIN',
            func: async (localData: {[key: string]: string}, sessionData: {[key: string]: string}, indexedData: any) => {
              // Standalone function to inject storage data
              let localStorageRestored = 0;
              let sessionStorageRestored = 0;
              let indexedDBRestored = 0;

              console.log('💾 [INJECT-IMPORT] Starting storage import...');
              console.log('💾 [INJECT-IMPORT] localStorage items to import:', Object.keys(localData).length);
              console.log('💾 [INJECT-IMPORT] sessionStorage items to import:', Object.keys(sessionData).length);
              console.log('💾 [INJECT-IMPORT] IndexedDB databases to import:', Object.keys(indexedData || {}).length);
              console.log('💾 [INJECT-IMPORT] localStorage available:', typeof localStorage !== 'undefined');
              console.log('💾 [INJECT-IMPORT] sessionStorage available:', typeof sessionStorage !== 'undefined');
              console.log('💾 [INJECT-IMPORT] IndexedDB available:', typeof indexedDB !== 'undefined');

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

              try {
                // Restore IndexedDB
                if (typeof indexedDB !== 'undefined' && indexedData) {
                  console.log('💾 [INJECT-IMPORT] Restoring IndexedDB databases...');
                  
                  for (const [dbName, dbData] of Object.entries(indexedData)) {
                    console.log('💾 [INJECT-IMPORT] Restoring database:', dbName);
                    
                    try {
                      // Delete existing database first
                      await new Promise<void>((resolve, reject) => {
                        const deleteRequest = indexedDB.deleteDatabase(dbName);
                        deleteRequest.onsuccess = () => resolve();
                        deleteRequest.onerror = () => reject(deleteRequest.error);
                        deleteRequest.onblocked = () => {
                          console.warn('💾 [INJECT-IMPORT] Database deletion blocked for:', dbName);
                          resolve(); // Continue anyway
                        };
                      });
                      
                      // Create new database with imported data
                      const db = await new Promise<IDBDatabase>((resolve, reject) => {
                        const request = indexedDB.open(dbName, (dbData as any).version);
                        
                        request.onupgradeneeded = (event) => {
                          const db = (event.target as IDBOpenDBRequest).result;
                          const dbInfo = dbData as any;
                          
                          // Create object stores
                          for (const [storeName, storeData] of Object.entries(dbInfo.objectStores)) {
                            const storeInfo = storeData as any;
                            
                            // Create object store
                            const objectStore = db.createObjectStore(storeName, {
                              keyPath: storeInfo.keyPath,
                              autoIncrement: storeInfo.autoIncrement
                            });
                            
                            // Create indexes
                            if (storeInfo.indexes) {
                              for (const [indexName, indexInfo] of Object.entries(storeInfo.indexes)) {
                                const idx = indexInfo as any;
                                objectStore.createIndex(indexName, idx.keyPath, {
                                  unique: idx.unique,
                                  multiEntry: idx.multiEntry
                                });
                              }
                            }
                          }
                        };
                        
                        request.onsuccess = () => resolve(request.result);
                        request.onerror = () => reject(request.error);
                      });
                      
                      // Import data into object stores
                      const dbInfo = dbData as any;
                      for (const [storeName, storeData] of Object.entries(dbInfo.objectStores)) {
                        const storeInfo = storeData as any;
                        
                        if (storeInfo.data && storeInfo.data.length > 0) {
                          const transaction = db.transaction([storeName], 'readwrite');
                          const store = transaction.objectStore(storeName);
                          
                          for (const item of storeInfo.data) {
                            try {
                              await new Promise<void>((resolve, reject) => {
                                const request = store.add(item);
                                request.onsuccess = () => {
                                  indexedDBRestored++;
                                  resolve();
                                };
                                request.onerror = () => reject(request.error);
                              });
                            } catch (itemError) {
                              console.warn('⚠️ [INJECT-IMPORT] Failed to restore IndexedDB item:', itemError);
                            }
                          }
                          
                          console.log('✅ [INJECT-IMPORT] Restored', storeInfo.data.length, 'items to store:', storeName);
                        }
                      }
                      
                      db.close();
                      console.log('✅ [INJECT-IMPORT] Restored database:', dbName);
                      
                    } catch (dbError) {
                      console.warn('⚠️ [INJECT-IMPORT] Failed to restore database:', dbName, dbError);
                    }
                  }
                  
                  console.log('💾 [INJECT-IMPORT] IndexedDB restore complete:', indexedDBRestored, 'items');
                } else {
                  console.warn('💾 [INJECT-IMPORT] IndexedDB not available for import');
                }
              } catch (error) {
                console.error('💾 [INJECT-IMPORT] Failed to access IndexedDB for import:', error);
              }

              const result = { localStorageRestored, sessionStorageRestored, indexedDBRestored };
              console.log('💾 [INJECT-IMPORT] Final import result:', result);
              return result;
            },
            args: [localStorageData, sessionStorageData, indexedDBData || {}]
          });
          
          const indexedDBCount = Object.values(indexedDBData || {}).reduce((total, db) => {
            return total + Object.values(db.objectStores).reduce((storeTotal, store) => storeTotal + store.data.length, 0);
          }, 0);
          storageImportedCount = Object.keys(localStorageData).length + Object.keys(sessionStorageData).length + indexedDBCount;
          console.log('💾 [DEBUG] Storage data injected successfully');
        } catch (storageError) {
          console.warn('💾 [WARN] Failed to import localStorage/sessionStorage/IndexedDB:', storageError);
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
  async clearStorage(url: string, tabId?: number): Promise<{ cookies: number; localStorage: number; sessionStorage: number; indexedDB: number }> {
    try {
      console.log('🧹 [DEBUG] Starting storage clear for URL:', url);
      const urlObj = new URL(url);
      
      let cookiesClearedCount = 0;
      let localStorageClearedCount = 0;  
      let sessionStorageClearedCount = 0;
      let indexedDBClearedCount = 0;

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

      // Clear localStorage, sessionStorage, and IndexedDB
      if (tabId && chrome.scripting) {
        try {
          const results = await chrome.scripting.executeScript({
            target: { tabId },
            world: 'MAIN',
            func: async () => {
              // Standalone function to clear storage data
              let localStorageCleared = 0;
              let sessionStorageCleared = 0;
              let indexedDBCleared = 0;

              console.log('🧹 [INJECT-CLEAR] Starting storage clear...');
              console.log('🧹 [INJECT-CLEAR] localStorage available:', typeof localStorage !== 'undefined');
              console.log('🧹 [INJECT-CLEAR] sessionStorage available:', typeof sessionStorage !== 'undefined');
              console.log('🧹 [INJECT-CLEAR] IndexedDB available:', typeof indexedDB !== 'undefined');

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

              try {
                if (typeof indexedDB !== 'undefined') {
                  console.log('🧹 [INJECT-CLEAR] Starting IndexedDB clear...');
                  
                  // Get all database names
                  const databases = await indexedDB.databases();
                  console.log('🧹 [INJECT-CLEAR] Found databases to clear:', databases.length);
                  
                  for (const dbInfo of databases) {
                    if (!dbInfo.name) continue;
                    
                    console.log('🧹 [INJECT-CLEAR] Clearing database:', dbInfo.name);
                    
                    try {
                      // First, count items in the database
                      const db = await new Promise<IDBDatabase>((resolve, reject) => {
                        const request = indexedDB.open(dbInfo.name!, dbInfo.version);
                        request.onsuccess = () => resolve(request.result);
                        request.onerror = () => reject(request.error);
                        request.onblocked = () => reject(new Error('Database blocked'));
                      });
                      
                      // Count items in each object store
                      for (const storeName of Array.from(db.objectStoreNames)) {
                        const transaction = db.transaction([storeName], 'readonly');
                        const store = transaction.objectStore(storeName);
                        
                        const count = await new Promise<number>((resolve, reject) => {
                          const request = store.count();
                          request.onsuccess = () => resolve(request.result || 0);
                          request.onerror = () => reject(request.error);
                        });
                        
                        indexedDBCleared += count;
                      }
                      
                      db.close();
                      
                      // Delete the database
                      await new Promise<void>((resolve, reject) => {
                        const deleteRequest = indexedDB.deleteDatabase(dbInfo.name!);
                        deleteRequest.onsuccess = () => {
                          console.log('✅ [INJECT-CLEAR] Cleared database:', dbInfo.name);
                          resolve();
                        };
                        deleteRequest.onerror = () => reject(deleteRequest.error);
                        deleteRequest.onblocked = () => {
                          console.warn('🧹 [INJECT-CLEAR] Database deletion blocked for:', dbInfo.name);
                          resolve(); // Continue anyway
                        };
                      });
                      
                    } catch (dbError) {
                      console.warn('⚠️ [INJECT-CLEAR] Failed to clear database:', dbInfo.name, dbError);
                    }
                  }
                  
                  console.log('🧹 [INJECT-CLEAR] IndexedDB clear complete:', indexedDBCleared, 'items');
                }
              } catch (error) {
                console.error('🧹 [INJECT-CLEAR] Failed to clear IndexedDB:', error);
              }

              const result = { localStorage: localStorageCleared, sessionStorage: sessionStorageCleared, indexedDB: indexedDBCleared };
              console.log('🧹 [INJECT-CLEAR] Final clear result:', result);
              return result;
            }
          });
          
          if (results && results[0] && results[0].result) {
            const clearResult = results[0].result;
            localStorageClearedCount = clearResult.localStorage || 0;
            sessionStorageClearedCount = clearResult.sessionStorage || 0;
            indexedDBClearedCount = clearResult.indexedDB || 0;
          }
        } catch (storageError) {
          console.warn('💾 [WARN] Failed to clear localStorage/sessionStorage/IndexedDB:', storageError);
          console.warn('💾 [WARN] Error details:', storageError);
        }
      }

      const totalCleared = cookiesClearedCount + localStorageClearedCount + sessionStorageClearedCount + indexedDBClearedCount;
      console.log(`🧹 [SUCCESS] Cleared ${totalCleared} items for ${urlObj.hostname}: ${cookiesClearedCount} cookies, ${localStorageClearedCount} localStorage, ${sessionStorageClearedCount} sessionStorage, ${indexedDBClearedCount} IndexedDB items`);
      
      return {
        cookies: cookiesClearedCount,
        localStorage: localStorageClearedCount,
        sessionStorage: sessionStorageClearedCount,
        indexedDB: indexedDBClearedCount
      };
    } catch (error) {
      console.error('❌ Error clearing storage:', error);
      throw error;
    }
  }


  /**
   * Get storage counts for the current domain
   */
  async getStorageCount(url: string, tabId?: number): Promise<{ cookies: number; localStorage: number; sessionStorage: number; indexedDB: number; total: number }> {
    try {
      let cookieCount = 0;
      let localStorageCount = 0;
      let sessionStorageCount = 0;
      let indexedDBCount = 0;

      // Get cookie count
      if (chrome.cookies) {
        const cookies = await this.getCookiesForUrl(url);
        cookieCount = cookies.length;
      }

      // Get localStorage, sessionStorage, and IndexedDB counts
      if (tabId && chrome.scripting) {
        try {
          const results = await chrome.scripting.executeScript({
            target: { tabId },
            world: 'MAIN',
            func: async () => {
              // Standalone function to get storage counts
              let localStorageCount = 0;
              let sessionStorageCount = 0;
              let indexedDBCount = 0;

              console.log('📊 [INJECT-COUNT] Starting storage count...');
              console.log('📊 [INJECT-COUNT] localStorage available:', typeof localStorage !== 'undefined');
              console.log('📊 [INJECT-COUNT] sessionStorage available:', typeof sessionStorage !== 'undefined');
              console.log('📊 [INJECT-COUNT] IndexedDB available:', typeof indexedDB !== 'undefined');

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

              try {
                if (typeof indexedDB !== 'undefined') {
                  console.log('📊 [INJECT-COUNT] Starting IndexedDB count...');
                  
                  // Get all database names
                  const databases = await indexedDB.databases();
                  console.log('📊 [INJECT-COUNT] Found databases:', databases.length);
                  
                  for (const dbInfo of databases) {
                    if (!dbInfo.name) continue;
                    
                    console.log('📊 [INJECT-COUNT] Counting database:', dbInfo.name);
                    
                    try {
                      const db = await new Promise<IDBDatabase>((resolve, reject) => {
                        const request = indexedDB.open(dbInfo.name!, dbInfo.version);
                        request.onsuccess = () => resolve(request.result);
                        request.onerror = () => reject(request.error);
                        request.onblocked = () => reject(new Error('Database blocked'));
                      });
                      
                      // Count items in each object store
                      for (const storeName of Array.from(db.objectStoreNames)) {
                        const transaction = db.transaction([storeName], 'readonly');
                        const store = transaction.objectStore(storeName);
                        
                        const count = await new Promise<number>((resolve, reject) => {
                          const request = store.count();
                          request.onsuccess = () => resolve(request.result || 0);
                          request.onerror = () => reject(request.error);
                        });
                        
                        indexedDBCount += count;
                        console.log('📊 [INJECT-COUNT] Store', storeName, 'count:', count);
                      }
                      
                      db.close();
                      
                    } catch (dbError) {
                      console.warn('📊 [INJECT-COUNT] Failed to count database:', dbInfo.name, dbError);
                    }
                  }
                  
                  console.log('📊 [INJECT-COUNT] IndexedDB total count:', indexedDBCount);
                }
              } catch (error) {
                console.error('📊 [INJECT-COUNT] Failed to access IndexedDB for count:', error);
              }

              const result = { localStorage: localStorageCount, sessionStorage: sessionStorageCount, indexedDB: indexedDBCount };
              console.log('📊 [INJECT-COUNT] Final count result:', result);
              return result;
            }
          });
          
          if (results && results[0] && results[0].result) {
            const counts = results[0].result;
            localStorageCount = counts.localStorage || 0;
            sessionStorageCount = counts.sessionStorage || 0;
            indexedDBCount = counts.indexedDB || 0;
          }
        } catch (storageError) {
          console.warn('💾 [WARN] Failed to get localStorage/sessionStorage/IndexedDB counts:', storageError);
          console.warn('💾 [WARN] Error details:', storageError);
        }
      }

      const total = cookieCount + localStorageCount + sessionStorageCount + indexedDBCount;
      return { cookies: cookieCount, localStorage: localStorageCount, sessionStorage: sessionStorageCount, indexedDB: indexedDBCount, total };
    } catch (error) {
      console.error('❌ Error getting storage counts:', error);
      return { cookies: 0, localStorage: 0, sessionStorage: 0, indexedDB: 0, total: 0 };
    }
  }


  /**
   * Download storage data as JSON file
   */
  downloadStorageAsFile(storageExport: StorageExport): void {
    const jsonData = JSON.stringify(storageExport, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const indexedDBCount = Object.values(storageExport.indexedDB || {}).reduce((total, db) => {
      return total + Object.values(db.objectStores).reduce((storeTotal, store) => storeTotal + store.data.length, 0);
    }, 0);
    const totalItems = storageExport.cookies.length + Object.keys(storageExport.localStorage).length + Object.keys(storageExport.sessionStorage).length + indexedDBCount;
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
          if (storageExport.cookies && !storageExport.localStorage && !storageExport.sessionStorage && !storageExport.indexedDB) {
            console.log('📥 Converting legacy cookie file format...');
            const legacyData = storageExport as CookieData;
            const convertedData: StorageExport = {
              domain: legacyData.domain || new URL(storageExport.url).hostname,
              url: storageExport.url,
              timestamp: storageExport.timestamp || Date.now(),
              cookies: storageExport.cookies || [],
              localStorage: {},
              sessionStorage: {},
              indexedDB: {}
            };
            resolve(convertedData);
            return;
          }
          
          // Validate the new storage format
          if (!storageExport.domain || !Array.isArray(storageExport.cookies)) {
            throw new Error('Invalid storage file format - missing domain or cookies array');
          }
          
          // Ensure localStorage, sessionStorage, and indexedDB exist
          const validatedExport: StorageExport = {
            domain: storageExport.domain,
            url: storageExport.url,
            timestamp: storageExport.timestamp || Date.now(),
            cookies: storageExport.cookies || [],
            localStorage: storageExport.localStorage || {},
            sessionStorage: storageExport.sessionStorage || {},
            indexedDB: storageExport.indexedDB || {}
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