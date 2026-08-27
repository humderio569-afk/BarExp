import { AppUser, UserRole, UserPermissions, SUPER_ADMIN_EMAIL } from '../types';
import { safeGetItem, safeSetItem, idbGetItem, idbSetItem } from './storage';

export interface PersistentApprovedUser {
  uid?: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: UserRole;
  permissions: UserPermissions;
  createdAt?: string;
  approvedAt: string;
  approvedBy: string;
  status: 'approved';
}

const APPROVED_REGISTRY_KEY = 'barexpress_approved_registry_v2';
const USERS_CACHE_KEY = 'barexpress_all_users';

// Retrieve all approved records from local persistent storage
export function getApprovedRegistry(): Record<string, PersistentApprovedUser> {
  try {
    const raw = safeGetItem(APPROVED_REGISTRY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// Save approved records to LocalStorage and IndexedDB
export function saveApprovedRegistry(registry: Record<string, PersistentApprovedUser>): void {
  try {
    const json = JSON.stringify(registry);
    safeSetItem(APPROVED_REGISTRY_KEY, json);
    idbSetItem(APPROVED_REGISTRY_KEY, json).catch(() => {});
  } catch (e) {
    console.warn('Could not persist approved registry:', e);
  }
}

// Record an approved user so their status is permanently remembered across logouts and sessions
export function recordApprovedUser(user: Partial<AppUser>): void {
  if (!user) return;
  const email = (user.email || '').toLowerCase().trim();
  const uid = (user.uid || '').trim();
  if (!email && !uid) return;

  const registry = getApprovedRegistry();
  const defaultPerms: UserPermissions = (user.role === 'admin') ? {
    canAccessPOS: true,
    canAccessStock: true,
    canManageStock: true,
    canViewCostPrices: true,
    canAccessExpenses: true,
    canAccessReports: true,
    canAccessSettings: true,
    canAccessChat: true,
    canManageUsers: true,
  } : {
    canAccessPOS: true,
    canAccessStock: true,
    canManageStock: false,
    canViewCostPrices: false,
    canAccessExpenses: false,
    canAccessReports: false,
    canAccessSettings: false,
    canAccessChat: true,
    canManageUsers: false,
  };

  const entry: PersistentApprovedUser = {
    uid: user.uid,
    email: user.email || email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    role: user.role || 'employee',
    permissions: user.permissions || defaultPerms,
    createdAt: user.createdAt || new Date().toISOString(),
    approvedAt: user.approvedAt || new Date().toISOString(),
    approvedBy: user.approvedBy || SUPER_ADMIN_EMAIL,
    status: 'approved',
  };

  if (email) {
    registry[`email:${email}`] = entry;
  }
  if (uid) {
    registry[`uid:${uid}`] = entry;
  }
  saveApprovedRegistry(registry);
}

// Remove an approval record if user is suspended, rejected, or deleted
export function removeApprovedUserRecord(emailOrUid: string): void {
  if (!emailOrUid) return;
  const clean = emailOrUid.toLowerCase().trim();
  const registry = getApprovedRegistry();
  delete registry[`email:${clean}`];
  delete registry[`uid:${clean}`];
  saveApprovedRegistry(registry);
}

// Look up if a user has ever been approved before
export function findApprovedRecord(email?: string | null, uid?: string | null): PersistentApprovedUser | null {
  const registry = getApprovedRegistry();
  if (email) {
    const cleanEmail = email.toLowerCase().trim();
    if (registry[`email:${cleanEmail}`]) {
      return registry[`email:${cleanEmail}`];
    }
  }
  if (uid && registry[`uid:${uid}`]) {
    return registry[`uid:${uid}`];
  }
  return null;
}

// Check if an email is the Super Admin or approved
export function isUserApprovedPermanently(email?: string | null, uid?: string | null): boolean {
  if (!email && !uid) return false;
  if (email && email.toLowerCase().trim() === SUPER_ADMIN_EMAIL.toLowerCase()) {
    return true;
  }
  const record = findApprovedRecord(email, uid);
  return !!record && record.status === 'approved';
}
