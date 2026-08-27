// Quota and Database Health Tracker Service
// Tracks Firestore Spark Plan (Free Tier) and Gemini API real-time usage statistics accurately

export interface FirestoreQuotaStats {
  readsToday: number;
  writesToday: number;
  deletesToday: number;
  totalDocumentsCount: number;
  estimatedStorageBytes: number;
  estimatedStorageFormatted: string;
  readsLimit: number;      // 50,000 / day
  writesLimit: number;     // 20,000 / day
  deletesLimit: number;    // 20,000 / day
  storageLimitBytes: number; // 1 GiB = 1024 * 1024 * 1024 bytes (1,073,741,824 bytes)
  storageLimitFormatted: string;
  readsPercentage: number;
  writesPercentage: number;
  deletesPercentage: number;
  storagePercentage: number;
  status: 'healthy' | 'warning' | 'critical';
  lastUpdated: string;
}

export interface GeminiQuotaStats {
  requestsToday: number;
  estimatedTokensToday: number;
  errorsToday: number;
  requestsLimitPerDay: number; // 1,500 RPD
  requestsLimitPerMinute: number; // 15 RPM
  tokensLimitPerMinute: number; // 1,000,000 TPM
  requestsPercentage: number;
  status: 'healthy' | 'warning' | 'critical';
}

export interface LocalStorageStats {
  usedBytes: number;
  usedFormatted: string;
  quotaBytes: number;
  quotaFormatted: string;
  percentage: number;
  isPersisted: boolean;
  persistentStatusText: string;
}

const STORAGE_KEYS = {
  DAILY_STATS: 'barexpress_quota_daily_stats',
  GEMINI_STATS: 'barexpress_gemini_daily_stats',
};

// Get today's date string YYYY-MM-DD
function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

import { safeSetItem, safeGetItem } from '../utils/storage';

interface StoredDailyStats {
  date: string;
  reads: number;
  writes: number;
  deletes: number;
}

interface StoredGeminiStats {
  date: string;
  requests: number;
  tokens: number;
  errors: number;
}

function getStoredDailyStats(): StoredDailyStats {
  try {
    const raw = safeGetItem(STORAGE_KEYS.DAILY_STATS);
    const today = getTodayKey();
    if (raw) {
      const parsed: StoredDailyStats = JSON.parse(raw);
      if (parsed.date === today) {
        return parsed;
      }
    }
    // New day reset
    const fresh: StoredDailyStats = { date: today, reads: 0, writes: 0, deletes: 0 };
    safeSetItem(STORAGE_KEYS.DAILY_STATS, JSON.stringify(fresh));
    return fresh;
  } catch {
    return { date: getTodayKey(), reads: 0, writes: 0, deletes: 0 };
  }
}

function saveStoredDailyStats(stats: StoredDailyStats) {
  try {
    safeSetItem(STORAGE_KEYS.DAILY_STATS, JSON.stringify(stats));
  } catch (err) {
    console.warn('Could not save quota stats to localStorage:', err);
  }
}

function getStoredGeminiStats(): StoredGeminiStats {
  try {
    const raw = safeGetItem(STORAGE_KEYS.GEMINI_STATS);
    const today = getTodayKey();
    if (raw) {
      const parsed: StoredGeminiStats = JSON.parse(raw);
      if (parsed.date === today) {
        return parsed;
      }
    }
    const fresh: StoredGeminiStats = { date: today, requests: 0, tokens: 0, errors: 0 };
    safeSetItem(STORAGE_KEYS.GEMINI_STATS, JSON.stringify(fresh));
    return fresh;
  } catch {
    return { date: getTodayKey(), requests: 0, tokens: 0, errors: 0 };
  }
}

function saveStoredGeminiStats(stats: StoredGeminiStats) {
  try {
    safeSetItem(STORAGE_KEYS.GEMINI_STATS, JSON.stringify(stats));
  } catch (err) {
    console.warn('Could not save gemini stats to localStorage:', err);
  }
}

export const QuotaTracker = {
  // Track Firestore Reads (e.g. from real-time snapshots or query loads)
  trackReads(count: number = 1) {
    const stats = getStoredDailyStats();
    stats.reads += count;
    saveStoredDailyStats(stats);
  },

  // Track Firestore Writes (setDoc, updateDoc, addDoc)
  trackWrites(count: number = 1) {
    const stats = getStoredDailyStats();
    stats.writes += count;
    saveStoredDailyStats(stats);
  },

  // Track Firestore Deletes (deleteDoc)
  trackDeletes(count: number = 1) {
    const stats = getStoredDailyStats();
    stats.deletes += count;
    saveStoredDailyStats(stats);
  },

  // Track Gemini AI requests
  trackGeminiRequest(estimatedTokens: number = 500, isError: boolean = false) {
    const stats = getStoredGeminiStats();
    stats.requests += 1;
    stats.tokens += estimatedTokens;
    if (isError) stats.errors += 1;
    saveStoredGeminiStats(stats);
  },

  // Calculate actual storage size based on in-memory collections state
  calculateDatabaseStats(collections: {
    products?: any[];
    sales?: any[];
    expenses?: any[];
    tabs?: any[];
    stockLogs?: any[];
    auditLogs?: any[];
    allUsers?: any[];
    categories?: any[];
    settings?: any;
    chatSessions?: any[];
  }): { totalDocs: number; totalBytes: number; collectionBreakdown: { name: string; count: number; bytes: number }[] } {
    let totalDocs = 0;
    let totalBytes = 0;
    const breakdown: { name: string; count: number; bytes: number }[] = [];

    const calculateItemBytes = (item: any): number => {
      try {
        const str = JSON.stringify(item);
        // UTF-8 byte length estimation + 64 bytes Firestore document overhead
        return new Blob([str]).size + 64;
      } catch {
        return 256;
      }
    };

    const processCollection = (name: string, items?: any[] | any) => {
      if (!items) return;
      if (Array.isArray(items)) {
        const count = items.length;
        const bytes = items.reduce((acc, item) => acc + calculateItemBytes(item), 0);
        totalDocs += count;
        totalBytes += bytes;
        breakdown.push({ name, count, bytes });
      } else {
        // Single document (like settings)
        const bytes = calculateItemBytes(items);
        totalDocs += 1;
        totalBytes += bytes;
        breakdown.push({ name, count: 1, bytes });
      }
    };

    processCollection('Produits & Articles', collections.products);
    processCollection('Ventes & Encaissements', collections.sales);
    processCollection('Dépenses & Factures', collections.expenses);
    processCollection('Tables & Additions', collections.tabs);
    processCollection('Historique Stock', collections.stockLogs);
    processCollection('Journal d\'Audit', collections.auditLogs);
    processCollection('Comptes & Utilisateurs', collections.allUsers);
    processCollection('Catégories', collections.categories);
    processCollection('Sessions Chat Dona', collections.chatSessions);
    processCollection('Configuration Établissement', collections.settings);

    return { totalDocs, totalBytes, collectionBreakdown: breakdown };
  },

  // Get aggregated stats
  getAggregatedStats(collections: {
    products?: any[];
    sales?: any[];
    expenses?: any[];
    tabs?: any[];
    stockLogs?: any[];
    auditLogs?: any[];
    allUsers?: any[];
    categories?: any[];
    settings?: any;
    chatSessions?: any[];
  }): { firestore: FirestoreQuotaStats; gemini: GeminiQuotaStats } {
    const daily = getStoredDailyStats();
    const gemini = getStoredGeminiStats();
    const dbMetrics = this.calculateDatabaseStats(collections);

    const READS_LIMIT = 50000;
    const WRITES_LIMIT = 20000;
    const DELETES_LIMIT = 20000;
    const STORAGE_LIMIT_BYTES = 1073741824; // 1 GiB in bytes

    const readsPercentage = Math.min(100, Number(((daily.reads / READS_LIMIT) * 100).toFixed(2)));
    const writesPercentage = Math.min(100, Number(((daily.writes / WRITES_LIMIT) * 100).toFixed(2)));
    const deletesPercentage = Math.min(100, Number(((daily.deletes / DELETES_LIMIT) * 100).toFixed(2)));
    const storagePercentage = Math.min(100, Number(((dbMetrics.totalBytes / STORAGE_LIMIT_BYTES) * 100).toFixed(4)));

    let firestoreStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (readsPercentage > 90 || writesPercentage > 90 || storagePercentage > 90) {
      firestoreStatus = 'critical';
    } else if (readsPercentage > 70 || writesPercentage > 70 || storagePercentage > 70) {
      firestoreStatus = 'warning';
    }

    const GEMINI_RPD_LIMIT = 1500;
    const geminiRequestsPercentage = Math.min(100, Number(((gemini.requests / GEMINI_RPD_LIMIT) * 100).toFixed(2)));
    let geminiStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (geminiRequestsPercentage > 90 || gemini.errors > 10) {
      geminiStatus = 'critical';
    } else if (geminiRequestsPercentage > 70 || gemini.errors > 3) {
      geminiStatus = 'warning';
    }

    const formatBytes = (bytes: number): string => {
      if (bytes < 1024) return `${bytes} o`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
      return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
    };

    return {
      firestore: {
        readsToday: daily.reads,
        writesToday: daily.writes,
        deletesToday: daily.deletes,
        totalDocumentsCount: dbMetrics.totalDocs,
        estimatedStorageBytes: dbMetrics.totalBytes,
        estimatedStorageFormatted: formatBytes(dbMetrics.totalBytes),
        readsLimit: READS_LIMIT,
        writesLimit: WRITES_LIMIT,
        deletesLimit: DELETES_LIMIT,
        storageLimitBytes: STORAGE_LIMIT_BYTES,
        storageLimitFormatted: '1.00 Gio (1 024 Mo)',
        readsPercentage,
        writesPercentage,
        deletesPercentage,
        storagePercentage,
        status: firestoreStatus,
        lastUpdated: new Date().toLocaleTimeString('fr-FR')
      },
      gemini: {
        requestsToday: gemini.requests,
        estimatedTokensToday: gemini.tokens,
        errorsToday: gemini.errors,
        requestsLimitPerDay: GEMINI_RPD_LIMIT,
        requestsLimitPerMinute: 15,
        tokensLimitPerMinute: 1000000,
        requestsPercentage: geminiRequestsPercentage,
        status: geminiStatus
      }
    };
  },

  // Estimate browser local storage & persistent storage status
  async getLocalStorageEstimate(): Promise<LocalStorageStats> {
    const formatBytes = (b: number) => {
      if (b < 1024) return `${b} o`;
      if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} Ko`;
      if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(2)} Mo`;
      return `${(b / (1024 * 1024 * 1024)).toFixed(2)} Go`;
    };

    let isPersisted = false;
    try {
      if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persisted) {
        isPersisted = await navigator.storage.persisted();
      }
    } catch {
      // ignore
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        const used = estimate.usage || 0;
        const quota = estimate.quota || (50 * 1024 * 1024);
        const percentage = Math.min(100, Number(((used / quota) * 100).toFixed(2)));

        return {
          usedBytes: used,
          usedFormatted: formatBytes(used),
          quotaBytes: quota,
          quotaFormatted: formatBytes(quota),
          percentage,
          isPersisted,
          persistentStatusText: isPersisted 
            ? 'Stockage persistant illimité actif (Non soumis aux purges système iOS/Android/Bureau)' 
            : 'Stockage standard dynamique (Persistance optimisable)'
        };
      }
    } catch {
      // Fallback
    }

    // Fallback: estimate based on localStorage length
    let localUsed = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const val = localStorage.getItem(key) || '';
          localUsed += (key.length + val.length) * 2; // UTF-16 characters = 2 bytes
        }
      }
    } catch {
      localUsed = 1024 * 50;
    }

    const quota = 50 * 1024 * 1024; // 50 MB fallback
    return {
      usedBytes: localUsed,
      usedFormatted: formatBytes(localUsed),
      quotaBytes: quota,
      quotaFormatted: formatBytes(quota),
      percentage: Number(((localUsed / quota) * 100).toFixed(2)),
      isPersisted,
      persistentStatusText: isPersisted 
        ? 'Stockage persistant actif' 
        : 'Stockage standard'
    };
  }
};
