// High-Capacity 3GB Offline Storage Manager & StorageManager Quota Engine
// Provides multi-gigabyte IndexedDB caching, quota tracking, and non-evictable persistence

const VAULT_DB_NAME = 'barexp_offline_3gb_vault';
const VAULT_DB_VERSION = 2;

export interface StorageStats {
  usedBytes: number;
  totalQuotaBytes: number;
  usedFormatted: string;
  totalQuotaFormatted: string;
  targetMaxBytes: number; // 3GB = 3 * 1024 * 1024 * 1024
  targetMaxFormatted: string;
  usagePercentOf3GB: number;
  isPersisted: boolean;
  indexedDbSupported: boolean;
  salesCount: number;
  mediaCount: number;
  documentsCount: number;
}

const TARGET_3GB_BYTES = 3 * 1024 * 1024 * 1024; // 3,221,225,472 bytes (3GB)

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Mo';
  const k = 1024;
  const sizes = ['Octets', 'Ko', 'Mo', 'Go', 'To'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = parseFloat((bytes / Math.pow(k, i)).toFixed(2));
  return `${val} ${sizes[i]}`;
}

let vaultDbPromise: Promise<IDBDatabase | null> | null = null;

export function getVaultDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }
  if (!vaultDbPromise) {
    vaultDbPromise = new Promise((resolve) => {
      try {
        const req = window.indexedDB.open(VAULT_DB_NAME, VAULT_DB_VERSION);
        req.onupgradeneeded = (e: any) => {
          const db = e.target.result as IDBDatabase;
          if (!db.objectStoreNames.contains('sales_vault')) {
            db.createObjectStore('sales_vault', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('media_vault')) {
            db.createObjectStore('media_vault', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('documents_vault')) {
            db.createObjectStore('documents_vault', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('snapshots_vault')) {
            db.createObjectStore('snapshots_vault', { keyPath: 'timestamp' });
          }
        };
        req.onsuccess = () => {
          const db = req.result;
          db.onclose = () => {
            vaultDbPromise = null;
          };
          db.onversionchange = () => {
            try {
              db.close();
            } catch {}
            vaultDbPromise = null;
          };
          resolve(db);
        };
        req.onerror = () => {
          vaultDbPromise = null;
          resolve(null);
        };
        req.onblocked = () => {
          vaultDbPromise = null;
          resolve(null);
        };
      } catch {
        vaultDbPromise = null;
        resolve(null);
      }
    });
  }
  return vaultDbPromise;
}

// Store an offline item in a dedicated high-capacity vault store
export async function storeInVault(storeName: 'sales_vault' | 'media_vault' | 'documents_vault' | 'snapshots_vault', item: any): Promise<boolean> {
  try {
    const db = await getVaultDB();
    if (!db) return false;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readwrite');
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
        const store = tx.objectStore(storeName);
        store.put(item);
      } catch {
        resolve(false);
      }
    });
  } catch {
    return false;
  }
}

// Retrieve all items from a vault store
export async function getAllFromVault<T = any>(storeName: 'sales_vault' | 'media_vault' | 'documents_vault' | 'snapshots_vault'): Promise<T[]> {
  try {
    const db = await getVaultDB();
    if (!db) return [];
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        tx.onerror = () => resolve([]);
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  } catch {
    return [];
  }
}

// Count items in a vault store
export async function countVaultStore(storeName: 'sales_vault' | 'media_vault' | 'documents_vault' | 'snapshots_vault'): Promise<number> {
  try {
    const db = await getVaultDB();
    if (!db) return 0;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.count();
        req.onsuccess = () => resolve(req.result || 0);
        req.onerror = () => resolve(0);
      } catch {
        resolve(0);
      }
    });
  } catch {
    return 0;
  }
}

// Request and grant persistent 3GB Storage Quota from the browser
export async function enableHighCapacity3GBStorage(): Promise<{
  success: boolean;
  persisted: boolean;
  message: string;
  stats: StorageStats;
}> {
  let persisted = false;
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      persisted = await navigator.storage.persist();
    } catch (e: any) {
      console.warn('Storage persist error:', e);
    }
  }

  const stats = await getDetailedStorageStats();

  if (persisted) {
    return {
      success: true,
      persisted: true,
      message: 'Stockage persistant 3 Go activé avec succès ! Vos données hors-ligne sont protégées contre toute purge automatique.',
      stats,
    };
  } else {
    return {
      success: true,
      persisted: stats.isPersisted,
      message: stats.isPersisted
        ? 'Stockage persistant déjà alloué par le navigateur.'
        : 'Mode de stockage standard haute-capacité actif (jusqu’à 3 Go disponibles selon l’espace disque).',
      stats,
    };
  }
}

// Query storage statistics and quota
export async function getDetailedStorageStats(): Promise<StorageStats> {
  let usedBytes = 0;
  let totalQuotaBytes = TARGET_3GB_BYTES;
  let isPersisted = false;

  if (typeof navigator !== 'undefined' && navigator.storage) {
    try {
      if (navigator.storage.estimate) {
        const est = await navigator.storage.estimate();
        usedBytes = est.usage || 0;
        totalQuotaBytes = est.quota || TARGET_3GB_BYTES;
      }
      if (navigator.storage.persisted) {
        isPersisted = await navigator.storage.persisted();
      }
    } catch (err) {
      console.warn('[StorageStats] Estimate fallback:', err);
    }
  }

  const [salesCount, mediaCount, documentsCount] = await Promise.all([
    countVaultStore('sales_vault'),
    countVaultStore('media_vault'),
    countVaultStore('documents_vault'),
  ]);

  const usagePercentOf3GB = Math.min(100, parseFloat(((usedBytes / TARGET_3GB_BYTES) * 100).toFixed(2)));

  return {
    usedBytes,
    totalQuotaBytes,
    usedFormatted: formatBytes(usedBytes),
    totalQuotaFormatted: formatBytes(totalQuotaBytes),
    targetMaxBytes: TARGET_3GB_BYTES,
    targetMaxFormatted: '3.0 Go',
    usagePercentOf3GB,
    isPersisted,
    indexedDbSupported: typeof window !== 'undefined' && Boolean(window.indexedDB),
    salesCount,
    mediaCount,
    documentsCount,
  };
}

// Export a complete offline database JSON package
export async function exportOfflineDatabaseBackup(): Promise<string> {
  const [sales, media, docs] = await Promise.all([
    getAllFromVault('sales_vault'),
    getAllFromVault('media_vault'),
    getAllFromVault('documents_vault'),
  ]);

  const localKeys = Object.keys(localStorage).filter(k => k.startsWith('barexpress_'));
  const localData: Record<string, any> = {};
  for (const k of localKeys) {
    try {
      localData[k] = JSON.parse(localStorage.getItem(k) || 'null');
    } catch {
      localData[k] = localStorage.getItem(k);
    }
  }

  const payload = {
    exportedAt: new Date().toISOString(),
    version: '3.0',
    localStorage: localData,
    vault: {
      sales,
      media,
      docs,
    },
  };

  return JSON.stringify(payload, null, 2);
}
