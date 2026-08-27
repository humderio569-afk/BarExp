import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  CACHE_SIZE_UNLIMITED,
  getFirestore,
  setLogLevel,
  doc, 
  getDocFromServer,
  Firestore 
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Configure log level to error to avoid noisy transient offline notices in iframe/mobile
try {
  setLogLevel('error');
} catch {
  // Ignore if already configured
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

function setupFirestore(): Firestore {
  try {
    const databaseId = (firebaseConfig as any).firestoreDatabaseId;
    const cacheConfig = {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
        cacheSizeBytes: CACHE_SIZE_UNLIMITED,
      })
    };
    if (databaseId) {
      return initializeFirestore(app, cacheConfig, databaseId);
    }
    return initializeFirestore(app, cacheConfig);
  } catch {
    // If already initialized or in limited sandbox, fallback to standard getFirestore
    return (firebaseConfig as any).firestoreDatabaseId
      ? getFirestore(app, (firebaseConfig as any).firestoreDatabaseId)
      : getFirestore(app);
  }
}

export const db: Firestore = setupFirestore();

export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): void {
  const errMsg = error instanceof Error ? error.message : String(error);
  
  // Gracefully handle transient browser/iframe IndexedDB/offline lifecycle states and quota limits
  const isClosingOrTransient = 
    errMsg.toLowerCase().includes('closing') ||
    errMsg.toLowerCase().includes('hidden') ||
    errMsg.toLowerCase().includes('offline') ||
    errMsg.toLowerCase().includes('unavailable') ||
    errMsg.toLowerCase().includes('failed-precondition') ||
    errMsg.toLowerCase().includes('could not reach') ||
    errMsg.toLowerCase().includes('quota') ||
    errMsg.toLowerCase().includes('resource-exhausted') ||
    errMsg.toLowerCase().includes('free daily read units') ||
    errMsg.toLowerCase().includes('limit exceeded') ||
    errMsg.toLowerCase().includes('indexeddb');

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };

  if (isClosingOrTransient) {
    console.warn('Firestore Local/Quota/Transient Mode: ', JSON.stringify(errInfo));
    return;
  }

  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

export function cleanForFirestore<T>(data: T): T {
  if (data === undefined) return null as unknown as T;
  try {
    return JSON.parse(
      JSON.stringify(data, (_, value) => (value === undefined ? null : value))
    );
  } catch {
    return data;
  }
}

// Non-blocking connection test
export async function testConnection(): Promise<boolean> {
  try {
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection check timeout')), 4000)
    );
    await Promise.race([
      getDocFromServer(doc(db, '_connection_test', 'check')),
      timeoutPromise
    ]);
    return true;
  } catch {
    // Client remains in robust offline/cached mode
    return false;
  }
}

