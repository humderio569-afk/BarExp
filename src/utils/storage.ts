// High-Capacity Persistent Storage Helper for Desktop, iPhone (iOS Safari / PWA), and Android (Chrome / PWA)
// Bridges LocalStorage, IndexedDB (Multi-GB capacity), and StorageManager Persistent Quota API.

const IDB_DB_NAME = 'barexpress_persistent_storage';
const IDB_STORE_NAME = 'cache_store';
const IDB_VERSION = 1;

let dbPromise: Promise<IDBDatabase | null> | null = null;

function getIDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const request = window.indexedDB.open(IDB_DB_NAME, IDB_VERSION);
        request.onupgradeneeded = (event: any) => {
          try {
            const db = event.target.result as IDBDatabase;
            if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
              db.createObjectStore(IDB_STORE_NAME);
            }
          } catch {
            // Ignore upgrade errors in closing states
          }
        };
        request.onsuccess = () => {
          const db = request.result;
          db.onclose = () => {
            dbPromise = null;
          };
          db.onversionchange = () => {
            try {
              db.close();
            } catch {}
            dbPromise = null;
          };
          db.onerror = () => {
            dbPromise = null;
          };
          resolve(db);
        };
        request.onerror = () => {
          dbPromise = null;
          resolve(null);
        };
        request.onblocked = () => {
          dbPromise = null;
          resolve(null);
        };
      } catch {
        dbPromise = null;
        resolve(null);
      }
    });
  }
  return dbPromise;
}

// Asynchronous high-capacity IndexedDB operations with resilient reconnection
export async function idbSetItem(key: string, value: any): Promise<boolean> {
  try {
    const db = await getIDB();
    if (!db) return false;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => {
          resolve(false);
        };
        tx.onabort = () => {
          resolve(false);
        };
        const store = tx.objectStore(IDB_STORE_NAME);
        store.put(value, key);
      } catch (err: any) {
        // Reset DB connection if closing or invalid state
        const msg = err?.message || String(err);
        if (msg.toLowerCase().includes('closing') || msg.toLowerCase().includes('closed') || msg.toLowerCase().includes('invalidstate')) {
          dbPromise = null;
        }
        resolve(false);
      }
    });
  } catch {
    dbPromise = null;
    return false;
  }
}

export async function idbGetItem<T = any>(key: string): Promise<T | null> {
  try {
    const db = await getIDB();
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(IDB_STORE_NAME, 'readonly');
        tx.onerror = () => resolve(null);
        tx.onabort = () => resolve(null);
        const store = tx.objectStore(IDB_STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result !== undefined ? req.result : null);
        req.onerror = () => resolve(null);
      } catch (err: any) {
        const msg = err?.message || String(err);
        if (msg.toLowerCase().includes('closing') || msg.toLowerCase().includes('closed') || msg.toLowerCase().includes('invalidstate')) {
          dbPromise = null;
        }
        resolve(null);
      }
    });
  } catch {
    dbPromise = null;
    return null;
  }
}

export async function idbRemoveItem(key: string): Promise<boolean> {
  try {
    const db = await getIDB();
    if (!db) return false;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
        tx.onabort = () => resolve(false);
        const store = tx.objectStore(IDB_STORE_NAME);
        store.delete(key);
      } catch (err: any) {
        const msg = err?.message || String(err);
        if (msg.toLowerCase().includes('closing') || msg.toLowerCase().includes('closed') || msg.toLowerCase().includes('invalidstate')) {
          dbPromise = null;
        }
        resolve(false);
      }
    });
  } catch {
    dbPromise = null;
    return false;
  }
}

// Request persistent storage from browser (Chrome Android/Desktop, Safari iOS 15.2+)
export async function requestPersistentStorage(): Promise<{ persisted: boolean; reason: string }> {
  try {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      const isAlreadyPersisted = await navigator.storage.persisted().catch(() => false);
      if (isAlreadyPersisted) {
        return { persisted: true, reason: 'Stockage persistant illimité déjà activé par le navigateur.' };
      }
      const granted = await navigator.storage.persist().catch(() => false);
      if (granted) {
        return { persisted: true, reason: 'Autorisation accordée ! Vos données locales ne seront plus purgées par le système.' };
      } else {
        return { persisted: false, reason: 'Le navigateur utilise le mode standard avec cache étendu dynamique.' };
      }
    }
  } catch (err: any) {
    return { persisted: false, reason: err?.message || 'API StorageManager indisponible.' };
  }
  return { persisted: false, reason: 'Non pris en charge par cet environnement.' };
}

// Check if persistent storage is active
export async function isStoragePersisted(): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persisted) {
      return await navigator.storage.persisted().catch(() => false);
    }
  } catch {
    // ignore
  }
  return false;
}

// Enhanced synchronous LocalStorage + IndexedDB dual storage
export function safeSetItem(key: string, value: string): boolean {
  // Always mirror asynchronously to High-Capacity IndexedDB
  try {
    idbSetItem(key, value).catch(() => {});
  } catch {}

  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error: any) {
    console.warn(`[SafeStorage] LocalStorage quota reached for "${key}". Falling back to IndexedDB:`, error);
    
    // Attempt to clear disposable caches from LocalStorage (while keeping them in IndexedDB)
    if (
      error?.name === 'QuotaExceededError' || 
      error?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      error?.code === 22 ||
      error?.number === -2147024882
    ) {
      try {
        localStorage.removeItem('barexpress_gemini_daily_stats');
        localStorage.removeItem('barexpress_quota_daily_stats');
        localStorage.removeItem('dona_chat_sessions_v1');
        localStorage.setItem(key, value);
        return true;
      } catch (retryError) {
        console.info(`[SafeStorage] Persisted safely in high-capacity IndexedDB.`);
      }
    }
    return false;
  }
}

export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeRemoveItem(key: string): boolean {
  try {
    idbRemoveItem(key).catch(() => {});
  } catch {}
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
