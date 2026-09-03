import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Product, CartItem, Sale, Expense, BarTab, BarSettings, ActiveTab, Category, CategoryItem, StockLog, PaymentMethod, OfflineSyncQueueItem, AppUser, UserRole, UserStatus, UserPermissions, SUPER_ADMIN_EMAIL, AuditLog, AuditAction, Company, PreRegisteredEmployee, BusinessSector, ManualPaymentMethodConfig, ManualPaymentProof, CompanySubscription } from '../types';
import { INITIAL_PRODUCTS, INITIAL_EXPENSES, INITIAL_SETTINGS, INITIAL_SALES, CATEGORIES_CONFIG, INITIAL_COMPANIES, INITIAL_PRE_REGISTRATIONS, INITIAL_MANUAL_PAYMENT_PROOFS } from '../data/initialData';
import { SECTOR_PRESETS } from '../data/sectorPresets';
import { collection, doc, setDoc, deleteDoc, onSnapshot, getDocs, getDoc, query, where } from 'firebase/firestore';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType, cleanForFirestore } from '../firebase';
import { QuotaTracker } from '../services/quotaTracker';
import { safeSetItem, safeGetItem, safeRemoveItem, requestPersistentStorage } from '../utils/storage';
import { recordApprovedUser, removeApprovedUserRecord, findApprovedRecord, isUserApprovedPermanently } from '../utils/authPersistence';
import { storeInVault } from '../utils/storageQuota';
import { sendSmartNotification } from '../utils/notificationService';

export interface PlatformStats {
  totalCompanies: number;
  activeCompanies: number;
  suspendedCompanies: number;
  totalPlatformRevenue: number;
  totalPlatformTransactions: number;
  totalStaffCount: number;
}

interface BarContextType {
  products: Product[];
  categories: CategoryItem[];
  cart: CartItem[];
  sales: Sale[];
  expenses: Expense[];
  tabs: BarTab[];
  settings: BarSettings;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  selectedCategory: Category | 'Tous';
  setSelectedCategory: (cat: Category | 'Tous') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeTable: string;
  setActiveTable: (tableName: string) => void;
  stockLogs: StockLog[];
  auditLogs: AuditLog[];

  // Multi-Tenancy & Platform Super Admin
  companies: Company[];
  activeCompany: Company | null;
  superAdminAssociatedCompany: Company | null;
  canAccessCompanySpace: (companyOrId: Company | string) => boolean;
  preRegistrations: PreRegisteredEmployee[];
  isImpersonating: boolean;
  impersonatedCompanyId: string | null;
  platformStats: PlatformStats;
  createCompany: (companyData: Omit<Company, 'id' | 'createdAt' | 'status'> & { code?: string; status?: 'active' | 'suspended' }) => Promise<Company>;
  updateCompany: (id: string, updates: Partial<Company>) => Promise<void>;
  toggleCompanyStatus: (id: string) => Promise<void>;
  deleteCompany: (id: string) => Promise<void>;
  switchCompanySpace: (companyId: string | null) => void;
  verifyCompanyCode: (code: string) => Promise<Company | null>;
  preRegisterEmployee: (data: Omit<PreRegisteredEmployee, 'id' | 'createdAt' | 'status' | 'companyId' | 'companyCode'> & { companyId?: string; companyCode?: string }) => Promise<PreRegisteredEmployee>;
  updatePreRegistration: (id: string, updates: Partial<PreRegisteredEmployee>) => Promise<void>;
  deletePreRegistration: (id: string, deleteLinkedUserAccount?: boolean) => Promise<void>;
  loginWithCompanyCodeAndGoogle: (companyCode: string) => Promise<{ success: boolean; message?: string }>;
  loginWithPin: (companyCode: string, pinCode: string) => Promise<{ success: boolean; user?: AppUser; message?: string }>;

  // Categories operations
  addCategory: (categoryData: Omit<CategoryItem, 'id'>) => void;
  updateCategory: (id: string, updates: Partial<CategoryItem>) => void;
  deleteCategory: (id: string) => void;

  // User Auth & Administration
  currentUser: AppUser | null;
  allUsers: AppUser[];
  authLoading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginAsDemo: (role?: UserRole, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  approveUser: (uid: string, role?: UserRole, permissions?: Partial<UserPermissions>) => Promise<void>;
  rejectUser: (uid: string) => Promise<void>;
  suspendUser: (uid: string) => Promise<void>;
  reactivateUser: (uid: string) => Promise<void>;
  addUserByEmail: (email: string, role?: UserRole, permissions?: Partial<UserPermissions>) => Promise<void>;
  updateUserPermissions: (uid: string, permissions: UserPermissions, role: UserRole, displayName?: string, customRoleTitle?: string) => Promise<void>;
  updateUserProfileName: (uid: string, newDisplayName: string) => Promise<void>;
  deleteUserAccount: (uid: string) => Promise<void>;
  isSuperAdmin: boolean;
  isAdmin: boolean;

  // Offline & Synchronization
  isOnline: boolean;
  isServerReachable: boolean;
  offlineQueue: OfflineSyncQueueItem[];
  lastSyncedAt: string | null;
  isSyncing: boolean;
  syncOfflineData: () => Promise<{ success: boolean; syncedCount: number }>;
  clearOfflineQueue: () => void;

  // Cart operations
  addToCart: (product: Product, quantity?: number, selectedFlavor?: string) => void;
  updateCartItemQuantity: (productId: string, quantity: number, flavor?: string) => void;
  updateCartItemUnitPrice: (productId: string, unitPrice: number, flavor?: string, priceType?: 'negotiated' | 'auction' | 'custom' | 'standard') => void;
  updateCartItemFlavor: (productId: string, newFlavor: string, currentFlavor?: string) => void;
  applyCartItemDiscount: (productId: string, discountAmount: number, flavor?: string) => void;
  removeFromCart: (productId: string, flavor?: string) => void;
  clearCart: () => void;
  cartSubtotal: number;
  cartDiscountTotal: number;
  cartTotal: number;

  // Checkout & Sales
  processCheckout: (paymentMethod: PaymentMethod, amountPaid: number, tableName?: string) => Sale;
  deleteSale: (saleId: string) => Promise<void>;
  
  // Products / Inventory
  addProduct: (productData: Omit<Product, 'id'>) => Product;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  restockProduct: (productId: string, quantityToAdd: number, reason: string) => void;
  performInventoryCount: (
    type: 'journalier' | 'hebdomadaire' | 'mensuel',
    counts: { productId: string; actualStock: number; notes?: string }[]
  ) => {
    totalItems: number;
    adjustedItems: number;
    totalVarianceValue: number;
  };

  // Expenses
  addExpense: (expenseData: Omit<Expense, 'id'>) => void;
  deleteExpense: (id: string) => void;

  // Tabs / Tables
  saveTabToTable: (tableName: string) => void;
  loadTabToCart: (tabId: string) => void;
  deleteTab: (tabId: string) => void;

  // Settings & System
  updateSettings: (newSettings: Partial<BarSettings>) => void;
  applyBusinessSectorPreset: (sectorId: BusinessSector, replaceCatalog?: boolean) => Promise<void>;
  closePeriod: () => Promise<void>;
  resetToDefaults: () => void;
  clearAndResetData: (mode: 'transactions_only' | 'complete_reset') => Promise<void>;
  exportBackup: () => void;
  importBackup: (jsonString: string) => boolean;

  // Manual Payments & 14-Day Free Trial Flow
  manualPaymentMethods: ManualPaymentMethodConfig[];
  manualPaymentProofs: ManualPaymentProof[];
  updateManualPaymentMethod: (id: string, updates: Partial<ManualPaymentMethodConfig>) => Promise<void>;
  submitManualPaymentProof: (proofData: Omit<ManualPaymentProof, 'id' | 'submittedAt' | 'status'>) => Promise<ManualPaymentProof>;
  approveManualPaymentProof: (proofId: string) => Promise<void>;
  disapproveManualPaymentProof: (proofId: string, reason: string) => Promise<void>;
  registerNewCompanyWithTrial: (data: { name: string; managerName: string; phone: string; currency?: string; businessSector?: BusinessSector; address?: string }) => Promise<Company>;
  requestJoinCompanyWithCode: (companyCode: string) => Promise<{ success: boolean; message: string }>;
  activeCompanyTrialInfo: {
    isTrial: boolean;
    trialDaysRemaining: number;
    isTrialExpired: boolean;
    hasPendingPaymentProof: boolean;
    hasDisapprovedPaymentProof: boolean;
    latestPaymentProof: ManualPaymentProof | null;
    isOperationalAccessAllowed: boolean;
  };
  isUnassociatedUser: boolean;
}

const BarContext = createContext<BarContextType | undefined>(undefined);

const STORAGE_KEYS = {
  PRODUCTS: 'barexpress_products',
  SALES: 'barexpress_sales',
  EXPENSES: 'barexpress_expenses',
  TABS: 'barexpress_tabs',
  SETTINGS: 'barexpress_settings',
  STOCK_LOGS: 'barexpress_stock_logs',
  CATEGORIES: 'barexpress_categories',
  OFFLINE_QUEUE: 'barexpress_offline_queue',
  LAST_SYNCED: 'barexpress_last_synced_at',
  CACHED_USER: 'barexpress_cached_user',
  USERS: 'barexpress_all_users',
  COMPANIES: 'barexpress_companies',
  PRE_REGISTRATIONS: 'barexpress_preregistrations',
  IMPERSONATED_COMPANY_ID: 'barexpress_impersonated_company_id',
  MANUAL_PAYMENTS: 'barexpress_manual_payment_proofs',
  PAYMENT_METHODS: 'barexpress_manual_payment_methods',
};

const DEFAULT_SUPER_ADMIN_USER: AppUser = {
  uid: 'admin_super_master',
  email: SUPER_ADMIN_EMAIL,
  displayName: 'Super Administrateur',
  photoURL: '',
  role: 'super_admin',
  status: 'approved',
  companyId: 'comp_lmd88412',
  companyCode: 'LMD88412',
  companyName: 'Lamadone Express',
  permissions: {
    canAccessPOS: true,
    canAccessStock: true,
    canManageStock: true,
    canViewCostPrices: true,
    canAccessExpenses: true,
    canAccessReports: true,
    canAccessSettings: true,
    canAccessChat: true,
    canManageUsers: true,
  },
  createdAt: new Date().toISOString(),
  lastLoginAt: new Date().toISOString(),
};

export const BarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load initial state from LocalStorage or Fallbacks safely
  const [rawProducts, setRawProducts] = useState<Product[]>(() => {
    try {
      const saved = safeGetItem(STORAGE_KEYS.PRODUCTS);
      return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
    } catch {
      return INITIAL_PRODUCTS;
    }
  });

  const [rawCategories, setRawCategories] = useState<CategoryItem[]>(() => {
    try {
      const saved = safeGetItem(STORAGE_KEYS.CATEGORIES);
      if (saved) return JSON.parse(saved);
    } catch {}
    return CATEGORIES_CONFIG.map((c, i) => ({
      id: `cat-${i + 1}`,
      name: c.name,
      icon: c.icon,
      color: c.color,
      bgLight: c.bgLight,
    }));
  });

  const [rawSales, setRawSales] = useState<Sale[]>(() => {
    try {
      const saved = safeGetItem(STORAGE_KEYS.SALES);
      return saved ? JSON.parse(saved) : INITIAL_SALES;
    } catch {
      return INITIAL_SALES;
    }
  });

  const [rawExpenses, setRawExpenses] = useState<Expense[]>(() => {
    try {
      const saved = safeGetItem(STORAGE_KEYS.EXPENSES);
      return saved ? JSON.parse(saved) : INITIAL_EXPENSES;
    } catch {
      return INITIAL_EXPENSES;
    }
  });

  const [rawTabs, setRawTabs] = useState<BarTab[]>(() => {
    try {
      const saved = safeGetItem(STORAGE_KEYS.TABS);
      return saved ? JSON.parse(saved) : [
        {
          id: 'tab-table1',
          tableName: 'Table 1',
          companyId: 'comp_lmd88412',
          companyCode: 'LMD88412',
          items: [
            { product: INITIAL_PRODUCTS[0], quantity: 2, discount: 0 },
            { product: INITIAL_PRODUCTS[1], quantity: 2, discount: 0 },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'open',
        },
        {
          id: 'tab-vip2',
          tableName: 'VIP 2',
          companyId: 'comp_lmd88412',
          companyCode: 'LMD88412',
          items: [
            { product: INITIAL_PRODUCTS[3], quantity: 1, discount: 0 },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'open',
        }
      ];
    } catch {
      return [];
    }
  });

  const [settings, setSettings] = useState<BarSettings>(() => {
    const saved = safeGetItem(STORAGE_KEYS.SETTINGS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.barName || parsed.barName === "L'Escale Bar & Lounge" || parsed.barName === "BarExpress" || parsed.barName === "BarExpress Pro" || parsed.barName === "L'amazone Express") {
          parsed.barName = "Lamadone Express";
        }
        return parsed;
      } catch {
        return INITIAL_SETTINGS;
      }
    }
    return INITIAL_SETTINGS;
  });

  const [rawStockLogs, setRawStockLogs] = useState<StockLog[]>(() => {
    try {
      const saved = safeGetItem(STORAGE_KEYS.STOCK_LOGS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Multi-Tenancy States (Companies & Pre-Registrations)
  const [companies, setCompanies] = useState<Company[]>(() => {
    try {
      const saved = safeGetItem(STORAGE_KEYS.COMPANIES);
      if (saved) {
        const parsed = JSON.parse(saved) as Company[];
        return parsed.map(c => ({
          ...c,
          allowCameraScanner: c.allowCameraScanner === true,
        }));
      }
      return INITIAL_COMPANIES;
    } catch {
      return INITIAL_COMPANIES;
    }
  });

  const [preRegistrations, setPreRegistrations] = useState<PreRegisteredEmployee[]>(() => {
    try {
      const saved = safeGetItem(STORAGE_KEYS.PRE_REGISTRATIONS);
      return saved ? JSON.parse(saved) : INITIAL_PRE_REGISTRATIONS;
    } catch {
      return INITIAL_PRE_REGISTRATIONS;
    }
  });

  const [manualPaymentProofs, setManualPaymentProofs] = useState<ManualPaymentProof[]>(() => {
    try {
      const saved = safeGetItem(STORAGE_KEYS.MANUAL_PAYMENTS);
      return saved ? JSON.parse(saved) : INITIAL_MANUAL_PAYMENT_PROOFS;
    } catch {
      return INITIAL_MANUAL_PAYMENT_PROOFS;
    }
  });

  const [manualPaymentMethods, setManualPaymentMethods] = useState<ManualPaymentMethodConfig[]>(() => {
    try {
      const saved = safeGetItem(STORAGE_KEYS.PAYMENT_METHODS);
      if (saved) return JSON.parse(saved);
    } catch {}
    return (
      settings.platformBilling?.manualPaymentMethods || [
        {
          id: 'moncash',
          name: 'MonCash',
          accountNumber: '+509 3700-1122',
          accountName: 'BarExp Platform / Direction',
          instructions: "Envoyez le montant exact sur ce numéro MonCash puis téléversez la capture d'écran du SMS de confirmation reçu de la Digicel.",
          active: true,
          logoType: 'moncash',
        },
        {
          id: 'natcash',
          name: 'NatCash',
          accountNumber: '+509 4812-3344',
          accountName: 'BarExp Platform / Trésorerie',
          instructions: "Effectuez le transfert vers ce numéro NatCash Natcom puis téléversez la capture d'écran du reçu de confirmation avec le numéro de transaction.",
          active: true,
          logoType: 'natcash',
        },
      ]
    );
  });

  const [impersonatedCompanyId, setImpersonatedCompanyId] = useState<string | null>(() => {
    return safeGetItem(STORAGE_KEYS.IMPERSONATED_COMPANY_ID) || null;
  });

  // Offline Caching & Sync States
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isServerReachable, setIsServerReachable] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => {
    return safeGetItem(STORAGE_KEYS.LAST_SYNCED) || null;
  });
  const [offlineQueue, setOfflineQueue] = useState<OfflineSyncQueueItem[]>(() => {
    try {
      const saved = safeGetItem(STORAGE_KEYS.OFFLINE_QUEUE);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('pos');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'Tous'>('Tous');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTable, setActiveTable] = useState<string>('Comptoir');

  // User Auth & Permissions State - Fast instant offline-first user initialization
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    try {
      const isExplicitlyLoggedOut = safeGetItem('barexpress_explicit_logout') === 'true';
      if (isExplicitlyLoggedOut) return null;
      const saved = safeGetItem(STORAGE_KEYS.CACHED_USER);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.uid || parsed.email)) {
          return parsed;
        }
      }
    } catch {}
    return null;
  });
  const [allUsers, setAllUsers] = useState<AppUser[]>(() => {
    try {
      const saved = safeGetItem(STORAGE_KEYS.USERS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [authLoading, setAuthLoading] = useState<boolean>(() => {
    try {
      const isExplicitlyLoggedOut = safeGetItem('barexpress_explicit_logout') === 'true';
      if (isExplicitlyLoggedOut) return false;
      const saved = safeGetItem(STORAGE_KEYS.CACHED_USER);
      if (saved) return false;
    } catch {}
    return true;
  });

  // Sync companies & preRegistrations to LocalStorage
  useEffect(() => {
    safeSetItem(STORAGE_KEYS.COMPANIES, JSON.stringify(companies));
  }, [companies]);

  useEffect(() => {
    safeSetItem(STORAGE_KEYS.PRE_REGISTRATIONS, JSON.stringify(preRegistrations));
  }, [preRegistrations]);

  useEffect(() => {
    safeSetItem(STORAGE_KEYS.MANUAL_PAYMENTS, JSON.stringify(manualPaymentProofs));
  }, [manualPaymentProofs]);

  useEffect(() => {
    safeSetItem(STORAGE_KEYS.PAYMENT_METHODS, JSON.stringify(manualPaymentMethods));
  }, [manualPaymentMethods]);

  useEffect(() => {
    if (impersonatedCompanyId) {
      safeSetItem(STORAGE_KEYS.IMPERSONATED_COMPANY_ID, impersonatedCompanyId);
    } else {
      safeRemoveItem(STORAGE_KEYS.IMPERSONATED_COMPANY_ID);
    }
  }, [impersonatedCompanyId]);

  const isSuperAdmin = currentUser?.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() || currentUser?.role === 'super_admin';
  const isImpersonating = isSuperAdmin && !!impersonatedCompanyId;

  // Super Admin's explicitly associated company
  const superAdminAssociatedCompany = useMemo<Company | null>(() => {
    if (currentUser?.companyId) {
      const match = companies.find(c => c.id === currentUser.companyId || c.code === currentUser.companyCode);
      if (match) return match;
    }
    if (currentUser?.companyCode) {
      const match = companies.find(c => c.code === currentUser.companyCode);
      if (match) return match;
    }
    if (currentUser?.email) {
      const match = companies.find(c => c.adminEmail?.toLowerCase() === currentUser.email?.toLowerCase());
      if (match) return match;
    }
    const defaultMaster = companies.find(c => c.adminEmail?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() || c.code === 'LMD88412');
    if (defaultMaster) return defaultMaster;

    return companies[0] || null;
  }, [companies, currentUser]);

  // Check whether user/super-admin has permission to open a company's operational space
  const canAccessCompanySpace = useCallback((companyOrId: Company | string): boolean => {
    if (!isSuperAdmin) return false;
    const targetComp = typeof companyOrId === 'string'
      ? companies.find(c => c.id === companyOrId || c.code === companyOrId)
      : companyOrId;
    if (!targetComp) return false;

    // The Super Administrator is strictly restricted to their own associated company
    if (superAdminAssociatedCompany && (targetComp.id === superAdminAssociatedCompany.id || targetComp.code === superAdminAssociatedCompany.code)) {
      return true;
    }
    if (targetComp.adminEmail?.toLowerCase() === currentUser?.email?.toLowerCase()) {
      return true;
    }
    if (currentUser?.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() && (targetComp.adminEmail?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() || targetComp.code === 'LMD88412')) {
      return true;
    }
    return false;
  }, [isSuperAdmin, companies, superAdminAssociatedCompany, currentUser]);

  // Active Company Determination
  const activeCompany = useMemo(() => {
    if (isImpersonating && impersonatedCompanyId) {
      const match = companies.find(c => c.id === impersonatedCompanyId || c.code === impersonatedCompanyId);
      if (match) return match;
    }
    if (currentUser?.companyId) {
      const match = companies.find(c => c.id === currentUser.companyId || c.code === currentUser.companyCode);
      if (match) return match;
    }
    if (currentUser?.companyCode) {
      const match = companies.find(c => c.code === currentUser.companyCode);
      if (match) return match;
    }
    // Fallback to superAdminAssociatedCompany
    if (superAdminAssociatedCompany) {
      return superAdminAssociatedCompany;
    }
    return companies.find(c => c.code === settings.companyCode) || companies[0] || null;
  }, [companies, impersonatedCompanyId, isImpersonating, currentUser, superAdminAssociatedCompany, settings.companyCode]);

  const isCompanyAdmin = currentUser?.role === 'admin' || (activeCompany && activeCompany.adminEmail?.toLowerCase() === currentUser?.email?.toLowerCase()) || currentUser?.permissions?.canManageUsers === true;
  const isAdmin = (isImpersonating && isSuperAdmin) || (!isSuperAdmin && isCompanyAdmin) || isCompanyAdmin;

  // Strictly Scoped Company Data Views (Complete Multi-Tenancy Isolation)
  const products = useMemo<Product[]>(() => {
    if (!activeCompany) return [];
    return rawProducts.filter(p => {
      if (p.companyId) return p.companyId === activeCompany.id || p.companyCode === activeCompany.code;
      if (p.companyCode) return p.companyCode === activeCompany.code;
      return activeCompany.code === 'LMD88412' || activeCompany.id === 'comp_lmd88412';
    });
  }, [rawProducts, activeCompany]);

  const categories = useMemo<CategoryItem[]>(() => {
    if (!activeCompany) return rawCategories;
    const companyCats = rawCategories.filter(c => {
      if (c.companyId) return c.companyId === activeCompany.id || c.companyCode === activeCompany.code;
      if (c.companyCode) return c.companyCode === activeCompany.code;
      return true;
    });
    return companyCats.length > 0 ? companyCats : rawCategories;
  }, [rawCategories, activeCompany]);

  const sales = useMemo<Sale[]>(() => {
    if (!activeCompany) return [];
    return rawSales.filter(s => {
      if (s.companyId) return s.companyId === activeCompany.id || s.companyCode === activeCompany.code;
      if (s.companyCode) return s.companyCode === activeCompany.code;
      return activeCompany.code === 'LMD88412' || activeCompany.id === 'comp_lmd88412';
    });
  }, [rawSales, activeCompany]);

  const expenses = useMemo<Expense[]>(() => {
    if (!activeCompany) return [];
    return rawExpenses.filter(e => {
      if (e.companyId) return e.companyId === activeCompany.id || e.companyCode === activeCompany.code;
      if (e.companyCode) return e.companyCode === activeCompany.code;
      return activeCompany.code === 'LMD88412' || activeCompany.id === 'comp_lmd88412';
    });
  }, [rawExpenses, activeCompany]);

  const tabs = useMemo<BarTab[]>(() => {
    if (!activeCompany) return [];
    return rawTabs.filter(t => {
      if (t.companyId) return t.companyId === activeCompany.id || t.companyCode === activeCompany.code;
      if (t.companyCode) return t.companyCode === activeCompany.code;
      return activeCompany.code === 'LMD88412' || activeCompany.id === 'comp_lmd88412';
    });
  }, [rawTabs, activeCompany]);

  const stockLogs = useMemo<StockLog[]>(() => {
    if (!activeCompany) return [];
    return rawStockLogs.filter(l => {
      if (l.companyId) return l.companyId === activeCompany.id || l.companyCode === activeCompany.code;
      if (l.companyCode) return l.companyCode === activeCompany.code;
      return activeCompany.code === 'LMD88412' || activeCompany.id === 'comp_lmd88412';
    });
  }, [rawStockLogs, activeCompany]);

  // Cart Isolation - clear cart whenever switching between different company spaces
  const prevActiveCompanyIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (activeCompany?.id && prevActiveCompanyIdRef.current && prevActiveCompanyIdRef.current !== activeCompany.id) {
      setCart([]);
    }
    prevActiveCompanyIdRef.current = activeCompany?.id || null;
  }, [activeCompany?.id]);

  // Synchronize active company settings into state (ensures scanner status strictly follows active company)
  useEffect(() => {
    if (activeCompany) {
      setSettings(prev => ({
        ...prev,
        barName: activeCompany.name || prev.barName,
        tagline: activeCompany.tagline ?? prev.tagline,
        address: activeCompany.address ?? prev.address,
        phone: activeCompany.phone ?? prev.phone,
        currency: activeCompany.currency || prev.currency,
        taxRate: activeCompany.taxRate ?? prev.taxRate,
        cashierName: activeCompany.cashierName || prev.cashierName,
        companyCode: activeCompany.code || prev.companyCode,
        allowCameraScanner: activeCompany.allowCameraScanner === true,
      }));
    }
  }, [activeCompany?.id, activeCompany?.allowCameraScanner, activeCompany?.name]);

  // Aggregated Platform Stats - Pure real-time consolidation from registered data
  const platformStats: PlatformStats = useMemo(() => {
    const totalCompanies = companies.length;
    const activeCompanies = companies.filter(c => c.status === 'active').length;
    const suspendedCompanies = companies.filter(c => c.status === 'suspended').length;
    
    // Real consolidated transactions & revenue directly from the sales state
    const totalPlatformTransactions = rawSales.length;
    const totalPlatformRevenue = rawSales.reduce((acc, s) => acc + (Number(s.total) || 0), 0);

    // Real platform-wide registered staff count
    const totalStaffCount = allUsers.length + preRegistrations.length;

    return {
      totalCompanies,
      activeCompanies,
      suspendedCompanies,
      totalPlatformRevenue,
      totalPlatformTransactions,
      totalStaffCount,
    };
  }, [companies, rawSales, allUsers, preRegistrations]);

  // Is this user logged in via Google with no company attached yet?
  const isUnassociatedUser = useMemo<boolean>(() => {
    if (!currentUser) return false;
    if (isSuperAdmin) return false;
    // Check if user already has an explicit company assigned
    if (currentUser.companyId || currentUser.companyCode) return false;
    // Check if user is the adminEmail of any company
    const matchesAdminEmail = companies.some(c => c.adminEmail?.toLowerCase() === currentUser.email?.toLowerCase());
    if (matchesAdminEmail) return false;
    // Check if user is in pre-registrations
    const matchesPreReg = preRegistrations.some(p => p.email?.toLowerCase() === currentUser.email?.toLowerCase());
    if (matchesPreReg) return false;
    return true;
  }, [currentUser, isSuperAdmin, companies, preRegistrations]);

  // Active Company Trial and Payment Status Info
  const activeCompanyTrialInfo = useMemo(() => {
    if (!activeCompany) {
      return {
        isTrial: false,
        trialDaysRemaining: 14,
        isTrialExpired: false,
        hasPendingPaymentProof: false,
        hasDisapprovedPaymentProof: false,
        latestPaymentProof: null,
        isOperationalAccessAllowed: true,
      };
    }

    // Super Administrator in non-impersonating mode always has complete access
    if (isSuperAdmin && !isImpersonating) {
      return {
        isTrial: false,
        trialDaysRemaining: 14,
        isTrialExpired: false,
        hasPendingPaymentProof: false,
        hasDisapprovedPaymentProof: false,
        latestPaymentProof: null,
        isOperationalAccessAllowed: true,
      };
    }

    const sub = activeCompany.subscription;
    const isTrial = sub?.status === 'trial';
    
    let trialDaysRemaining = 14;
    let isTrialExpired = false;

    if (isTrial) {
      const startDate = sub?.startDate ? new Date(sub.startDate).getTime() : new Date(activeCompany.createdAt).getTime();
      const expiryDate = sub?.expiryDate ? new Date(sub.expiryDate).getTime() : (startDate + 14 * 24 * 60 * 60 * 1000);
      const now = Date.now();
      const diffMs = expiryDate - now;
      trialDaysRemaining = Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
      isTrialExpired = diffMs <= 0;
    } else if (sub?.status === 'expired') {
      isTrialExpired = true;
      trialDaysRemaining = 0;
    }

    // Retrieve company's manual payment proofs
    const companyProofs = manualPaymentProofs.filter(p => p.companyId === activeCompany.id || p.companyCode === activeCompany.code);
    const latestProof = companyProofs.length > 0
      ? [...companyProofs].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0]
      : null;

    const hasPendingPaymentProof = latestProof?.status === 'pending';
    const hasDisapprovedPaymentProof = latestProof?.status === 'disapproved';
    const isApprovedPayment = latestProof?.status === 'approved' || sub?.status === 'active' || sub?.status === 'lifetime';

    // Access authorization:
    // 1. Trial is active (trialDaysRemaining > 0) -> ALLOWED
    // 2. Subscription is active/lifetime or latest payment approved -> ALLOWED
    // 3. Trial expired, but customer submitted payment proof (status === 'pending') -> PROVISIONAL ACCESS ALLOWED!
    // 4. Trial expired and no proof submitted OR proof is disapproved -> RESTRICTED
    const isOperationalAccessAllowed = (!isTrialExpired) || isApprovedPayment || hasPendingPaymentProof;

    return {
      isTrial,
      trialDaysRemaining,
      isTrialExpired,
      hasPendingPaymentProof,
      hasDisapprovedPaymentProof,
      latestPaymentProof: latestProof,
      isOperationalAccessAllowed,
    };
  }, [activeCompany, isSuperAdmin, isImpersonating, manualPaymentProofs]);

  // Initialize Persistent Storage quota for iOS Safari, Android Chrome, and Desktop
  useEffect(() => {
    requestPersistentStorage().then((res) => {
      if (res.persisted) {
        console.info('[Storage] Non-evictable persistent local storage granted.');
      }
    }).catch(() => {});
  }, []);

  // Sync currentUser to LocalStorage safely whenever it changes
  useEffect(() => {
    try {
      if (currentUser) {
        safeSetItem(STORAGE_KEYS.CACHED_USER, JSON.stringify(currentUser));
        if (currentUser.status === 'approved') {
          recordApprovedUser(currentUser);
        }
      } else {
        safeRemoveItem(STORAGE_KEYS.CACHED_USER);
      }
    } catch (e) {
      console.warn('Could not cache current user:', e);
    }
  }, [currentUser]);

  // Sync allUsers to LocalStorage whenever updated
  useEffect(() => {
    if (allUsers.length > 0) {
      safeSetItem(STORAGE_KEYS.USERS, JSON.stringify(allUsers));
    }
  }, [allUsers]);

  // Real-Time Users Subscription & Auth Listener
  useEffect(() => {
    let unsubscribeUsers: (() => void) | null = null;

    // Safety timeout to ensure authLoading never blocks the UI indefinitely
    const safetyTimer = setTimeout(() => {
      setAuthLoading(false);
    }, 600);

    // Listen to users collection
    try {
      if (db) {
        const usersColRef = collection(db, 'users');
        unsubscribeUsers = onSnapshot(
          usersColRef,
          (snapshot) => {
            QuotaTracker.trackReads(snapshot.docs.length || 1);
            const loadedUsers = snapshot.docs.map(docSnap => docSnap.data() as AppUser);
            setAllUsers(loadedUsers);

            // Record all approved users in the permanent registry
            loadedUsers.forEach(u => {
              if (u.status === 'approved') {
                recordApprovedUser(u);
              }
            });

            if (auth.currentUser) {
              const currentEmail = auth.currentUser.email?.toLowerCase();
              const userDoc = loadedUsers.find(
                u => u.uid === auth.currentUser?.uid || (u.email && u.email.toLowerCase() === currentEmail)
              );
              if (userDoc) {
                if (currentEmail === SUPER_ADMIN_EMAIL.toLowerCase()) {
                  const adminUser: AppUser = {
                    ...userDoc,
                    role: 'admin',
                    status: 'approved',
                    permissions: {
                      canAccessPOS: true,
                      canAccessStock: true,
                      canManageStock: true,
                      canViewCostPrices: true,
                      canAccessExpenses: true,
                      canAccessReports: true,
                      canAccessSettings: true,
                      canAccessChat: true,
                      canManageUsers: true,
                    }
                  };
                  setCurrentUser(adminUser);
                  recordApprovedUser(adminUser);
                } else if (userDoc.status === 'approved' || isUserApprovedPermanently(userDoc.email, userDoc.uid)) {
                  const approvedDoc: AppUser = {
                    ...userDoc,
                    status: 'approved',
                  };
                  setCurrentUser(approvedDoc);
                  recordApprovedUser(approvedDoc);
                } else {
                  setCurrentUser(userDoc);
                }
              }
            }
          },
          (error) => {
            setIsServerReachable(false);
            console.warn('Users subscription error / offline:', error);
          }
        );
      }
    } catch (e) {
      setIsServerReachable(false);
      console.warn('Could not initialize users subscription:', e);
    }

    // Auth state listener
    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      clearTimeout(safetyTimer);
      const isExplicitlyLoggedOut = safeGetItem('barexpress_explicit_logout') === 'true';
      if (isExplicitlyLoggedOut) {
        setCurrentUser(null);
        safeRemoveItem(STORAGE_KEYS.CACHED_USER);
        setAuthLoading(false);
        return;
      }

      if (fbUser && fbUser.email) {
        const userEmail = fbUser.email.toLowerCase();
        const isSuper = userEmail === SUPER_ADMIN_EMAIL.toLowerCase();
        const approvedRecord = findApprovedRecord(userEmail, fbUser.uid);
        const isKnownApproved = isSuper || isUserApprovedPermanently(userEmail, fbUser.uid);
        const userDocRef = doc(db, 'users', fbUser.uid);

        try {
          // 1. Check if the user document already exists in Firestore
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const existingData = userDocSnap.data() as AppUser;
            // PRESERVE approved status permanently!
            const isApproved = isKnownApproved || existingData.status === 'approved';
            const finalStatus: UserStatus = isApproved ? 'approved' : existingData.status;

            const updatedUser: AppUser = {
              ...existingData,
              uid: fbUser.uid,
              email: fbUser.email,
              displayName: fbUser.displayName || existingData.displayName || fbUser.email.split('@')[0],
              photoURL: fbUser.photoURL || existingData.photoURL || '',
              status: finalStatus,
              role: isSuper ? 'admin' : (existingData.role || approvedRecord?.role || 'employee'),
              permissions: isSuper ? {
                canAccessPOS: true,
                canAccessStock: true,
                canManageStock: true,
                canViewCostPrices: true,
                canAccessExpenses: true,
                canAccessReports: true,
                canAccessSettings: true,
                canAccessChat: true,
                canManageUsers: true,
              } : (existingData.permissions || approvedRecord?.permissions || {
                canAccessPOS: true,
                canAccessStock: true,
                canManageStock: false,
                canViewCostPrices: false,
                canAccessExpenses: false,
                canAccessReports: false,
                canAccessSettings: false,
                canAccessChat: true,
                canManageUsers: false,
              }),
              lastLoginAt: new Date().toISOString(),
            };

            if (isApproved) {
              recordApprovedUser(updatedUser);
            }

            await setDoc(userDocRef, cleanForFirestore(updatedUser), { merge: true });
            setCurrentUser(updatedUser);
          } else {
            // 2. Check if this email was pre-approved by an admin (e.g., invitation or whitelist)
            const usersColRef = collection(db, 'users');
            const q = query(usersColRef, where('email', '==', userEmail));
            const emailSnapshot = await getDocs(q);

            let preApprovedDoc: AppUser | null = null;
            let preDocIdToDelete: string | null = null;

            emailSnapshot.forEach((snap) => {
              const data = snap.data() as AppUser;
              if (data && (data.status === 'approved' || snap.id.startsWith('user-pre-') || data.uid?.startsWith('user-pre-'))) {
                preApprovedDoc = data;
                preDocIdToDelete = snap.id;
              }
            });

            if (preApprovedDoc || isKnownApproved) {
              const sourceDoc = preApprovedDoc || approvedRecord;
              const inheritedRole = isSuper ? 'admin' : (sourceDoc?.role || 'employee');
              const inheritedPerms = isSuper ? {
                canAccessPOS: true,
                canAccessStock: true,
                canManageStock: true,
                canViewCostPrices: true,
                canAccessExpenses: true,
                canAccessReports: true,
                canAccessSettings: true,
                canAccessChat: true,
                canManageUsers: true,
              } : (sourceDoc?.permissions || {
                canAccessPOS: true,
                canAccessStock: true,
                canManageStock: inheritedRole === 'admin',
                canViewCostPrices: inheritedRole === 'admin',
                canAccessExpenses: inheritedRole === 'admin',
                canAccessReports: inheritedRole === 'admin',
                canAccessSettings: inheritedRole === 'admin',
                canAccessChat: true,
                canManageUsers: inheritedRole === 'admin',
              });

              const migratedUser: AppUser = {
                uid: fbUser.uid,
                email: fbUser.email,
                displayName: fbUser.displayName || sourceDoc?.displayName || fbUser.email.split('@')[0],
                photoURL: fbUser.photoURL || sourceDoc?.photoURL || '',
                role: inheritedRole,
                status: 'approved',
                permissions: inheritedPerms,
                createdAt: sourceDoc?.createdAt || new Date().toISOString(),
                approvedBy: sourceDoc?.approvedBy || SUPER_ADMIN_EMAIL,
                approvedAt: sourceDoc?.approvedAt || new Date().toISOString(),
                lastLoginAt: new Date().toISOString(),
              };

              recordApprovedUser(migratedUser);
              await setDoc(userDocRef, cleanForFirestore(migratedUser));
              if (preDocIdToDelete && preDocIdToDelete !== fbUser.uid) {
                await deleteDoc(doc(db, 'users', preDocIdToDelete)).catch(console.error);
              }
              setCurrentUser(migratedUser);
            } else {
              // 3. Brand-new user first time registration (requires one-time validation from admin)
              const isWhitelistOnly = settings.registrationMode === 'whitelist_only';
              const newUser: AppUser = {
                uid: fbUser.uid,
                email: fbUser.email,
                displayName: fbUser.displayName || fbUser.email.split('@')[0],
                photoURL: fbUser.photoURL || '',
                role: isSuper ? 'admin' : 'employee',
                status: isSuper ? 'approved' : (isWhitelistOnly ? 'rejected' : 'pending'),
                permissions: isSuper ? {
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
                  canAccessPOS: false,
                  canAccessStock: false,
                  canManageStock: false,
                  canViewCostPrices: false,
                  canAccessExpenses: false,
                  canAccessReports: false,
                  canAccessSettings: false,
                  canAccessChat: false,
                  canManageUsers: false,
                },
                createdAt: new Date().toISOString(),
                lastLoginAt: new Date().toISOString(),
              };
              await setDoc(userDocRef, cleanForFirestore(newUser));
              setCurrentUser(newUser);
            }
          }
        } catch (err) {
          setIsServerReachable(false);
          console.warn('Firestore user fetch unavailable / quota limit fallback:', err);
          const isApproved = isKnownApproved || isSuper;
          const fallbackUser: AppUser = {
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName || approvedRecord?.displayName || (isSuper ? 'Super Administrateur' : fbUser.email.split('@')[0]),
            photoURL: fbUser.photoURL || approvedRecord?.photoURL || '',
            role: isSuper ? 'admin' : (approvedRecord?.role || 'employee'),
            status: isApproved ? 'approved' : 'pending',
            permissions: isSuper ? {
              canAccessPOS: true,
              canAccessStock: true,
              canManageStock: true,
              canViewCostPrices: true,
              canAccessExpenses: true,
              canAccessReports: true,
              canAccessSettings: true,
              canAccessChat: true,
              canManageUsers: true,
            } : (approvedRecord?.permissions || {
              canAccessPOS: true,
              canAccessStock: true,
              canManageStock: false,
              canViewCostPrices: false,
              canAccessExpenses: false,
              canAccessReports: false,
              canAccessSettings: false,
              canAccessChat: true,
              canManageUsers: false,
            }),
            createdAt: approvedRecord?.approvedAt || new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
          };
          if (isApproved) {
            recordApprovedUser(fallbackUser);
          }
          setCurrentUser(fallbackUser);
        }
      } else {
        // If Firebase Auth has no active user on this device (e.g. offline or unauthenticated)
        const isExplicitlyLoggedOut = safeGetItem('barexpress_explicit_logout') === 'true';
        if (isExplicitlyLoggedOut) {
          setCurrentUser(null);
          safeRemoveItem(STORAGE_KEYS.CACHED_USER);
          setAuthLoading(false);
          return;
        }

        // Check if there is an active local cached session (Google, Email or PIN employee)
        const cached = safeGetItem(STORAGE_KEYS.CACHED_USER);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed && (parsed.uid || parsed.email)) {
              setCurrentUser(parsed);
              setAuthLoading(false);
              return;
            }
          } catch {}
        }
        
        // No valid session on this device -> require login
        safeRemoveItem(STORAGE_KEYS.CACHED_USER);
        setCurrentUser(null);
      }
      setAuthLoading(false);
    });

    return () => {
      if (unsubscribeUsers) unsubscribeUsers();
      unsubscribeAuth();
    };
  }, []);

  // Multi-Tenancy Actions
  const createCompany = async (companyData: Omit<Company, 'id' | 'createdAt' | 'status' | 'code'> & { code?: string; status?: 'active' | 'suspended' }) => {
    let uniqueCode = (companyData.code || '').trim().toUpperCase();
    if (!uniqueCode || uniqueCode.length !== 8) {
      const prefix = (companyData.name.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase()) || 'BAR';
      const randomDigits = Math.floor(10000 + Math.random() * 90000).toString();
      uniqueCode = `${prefix.padEnd(3, 'X')}${randomDigits}`.slice(0, 8);
    }
    
    const defaultAnnualPrice = settings.platformBilling?.defaultAnnualPrice ?? 100;
    const defaultQuotaPolicy = settings.platformBilling?.globalQuotaPolicy ?? {
      chargeOverage: false,
      maxTransactionsPerMonth: 5000,
      maxAiQueriesPerMonth: 500,
      overageFeePer1000Tx: 5,
      overageFeePer100AiQueries: 2,
    };

    const initialSubscription = companyData.subscription || {
      planType: 'annual' as const,
      status: 'active' as const,
      customPrice: defaultAnnualPrice,
      currency: 'USD',
      startDate: new Date().toISOString(),
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      autoRenew: true,
      quotaPolicy: defaultQuotaPolicy,
      notes: `Abonnement initial créé le ${new Date().toLocaleDateString('fr-FR')}`,
    };

    const newCompanyId = `comp_${uniqueCode.toLowerCase()}_${Date.now().toString(36)}`;
    const newCompany: Company = {
      id: newCompanyId,
      code: uniqueCode,
      name: companyData.name.trim(),
      managerName: companyData.managerName.trim(),
      adminEmail: companyData.adminEmail.trim().toLowerCase(),
      phone: companyData.phone.trim(),
      currency: companyData.currency || 'G',
      status: companyData.status || 'active',
      createdAt: new Date().toISOString(),
      address: companyData.address || '',
      tagline: companyData.tagline || '',
      logo: companyData.logo || '',
      taxRate: companyData.taxRate ?? 0,
      cashierName: companyData.cashierName || 'Caisse Principale',
      autoApprovePreRegistered: companyData.autoApprovePreRegistered ?? true,
      subscription: initialSubscription,
      stats: {
        totalSalesAmount: 0,
        totalTransactions: 0,
        totalEmployees: 1,
        totalProducts: products.length,
      }
    };

    setCompanies(prev => [newCompany, ...prev]);
    try {
      await setDoc(doc(db, 'companies', newCompanyId), cleanForFirestore(newCompany));
    } catch (err) {
      console.warn('Could not persist company to Firestore:', err);
    }

    await addAuditLog('company_created', `Création de l'entreprise "${newCompany.name}" avec le code ${newCompany.code} (Admin: ${newCompany.adminEmail})`);

    return newCompany;
  };

  const updateCompany = async (id: string, updates: Partial<Company>) => {
    setCompanies(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));

    // If updating current active company or user's company, sync state
    if (activeCompany?.id === id || currentUser?.companyId === id) {
      if (updates.name) {
        setSettings(prev => ({ ...prev, barName: updates.name! }));
        if (currentUser && currentUser.companyId === id) {
          const updatedUser: AppUser = { ...currentUser, companyName: updates.name };
          setCurrentUser(updatedUser);
          safeSetItem(STORAGE_KEYS.CACHED_USER, JSON.stringify(updatedUser));
          recordApprovedUser(updatedUser);
        }
      }
      if (updates.cashierName) {
        setSettings(prev => ({ ...prev, cashierName: updates.cashierName! }));
      }
      if (updates.customRoleLabels) {
        setSettings(prev => ({ ...prev, customRoleLabels: updates.customRoleLabels }));
      }
      if (updates.currency) {
        setSettings(prev => ({ ...prev, currency: updates.currency! }));
      }
      if (updates.tagline !== undefined) {
        setSettings(prev => ({ ...prev, tagline: updates.tagline || '' }));
      }
      if (updates.phone !== undefined) {
        setSettings(prev => ({ ...prev, phone: updates.phone || '' }));
      }
      if (updates.address !== undefined) {
        setSettings(prev => ({ ...prev, address: updates.address || '' }));
      }
      if (updates.taxRate !== undefined) {
        setSettings(prev => ({ ...prev, taxRate: updates.taxRate }));
      }
      if (updates.allowCameraScanner !== undefined) {
        setSettings(prev => ({ ...prev, allowCameraScanner: updates.allowCameraScanner }));
      }
    }

    try {
      await setDoc(doc(db, 'companies', id), cleanForFirestore(updates), { merge: true });
    } catch (err) {
      console.warn('Could not update company in Firestore:', err);
    }
    await addAuditLog('company_updated', `Mise à jour des paramètres de l'entreprise "${updates.name || id}"`);
  };

  const toggleCompanyStatus = async (id: string) => {
    const comp = companies.find(c => c.id === id);
    if (!comp) return;
    const newStatus = comp.status === 'active' ? 'suspended' : 'active';
    await updateCompany(id, { status: newStatus });
    await addAuditLog(
      newStatus === 'suspended' ? 'company_suspended' : 'company_reactivated',
      `${newStatus === 'suspended' ? 'Suspension' : 'Réactivation'} de l'établissement "${comp.name}" (${comp.code})`
    );
  };

  const deleteCompany = async (id: string) => {
    const comp = companies.find(c => c.id === id || c.code === id);
    const targetId = comp ? comp.id : id;
    const targetCode = comp ? comp.code : '';

    // Remove from local state immediately
    setCompanies(prev => prev.filter(c => c.id !== targetId && (targetCode ? c.code !== targetCode : true)));

    // If currently impersonating/viewing this company, reset it
    if (impersonatedCompanyId === targetId || (targetCode && impersonatedCompanyId === targetCode)) {
      setImpersonatedCompanyId(null);
      safeRemoveItem(STORAGE_KEYS.IMPERSONATED_COMPANY_ID);
    }

    // Delete company document from Firestore
    try {
      await deleteDoc(doc(db, 'companies', targetId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `companies/${targetId}`);
    }

    // Cascade delete any pre-registrations linked to this company
    const linkedPreRegs = preRegistrations.filter(p => p.companyId === targetId || (targetCode && p.companyCode === targetCode));
    if (linkedPreRegs.length > 0) {
      setPreRegistrations(prev => prev.filter(p => p.companyId !== targetId && (targetCode ? p.companyCode !== targetCode : true)));
      for (const preReg of linkedPreRegs) {
        try {
          await deleteDoc(doc(db, 'pre_registrations', preReg.id));
        } catch (err) {
          console.warn('Error deleting linked pre-registration doc:', err);
        }
      }
    }

    // Cascade remove company association from any local user accounts
    setAllUsers(prev => prev.map(u => {
      if (u.companyId === targetId || (targetCode && u.companyCode === targetCode)) {
        const updated = { ...u, companyId: undefined, companyCode: undefined, companyName: undefined };
        setDoc(doc(db, 'users', u.uid), cleanForFirestore(updated), { merge: true }).catch(() => {});
        return updated;
      }
      return u;
    }));

    if (comp) {
      await addAuditLog('company_deleted', `Suppression définitive de l'établissement ${comp.name} (${comp.code})`);
    }
  };

  const switchCompanySpace = (companyId: string | null) => {
    if (!companyId) {
      setImpersonatedCompanyId(null);
      safeRemoveItem(STORAGE_KEYS.IMPERSONATED_COMPANY_ID);
      return;
    }
    const targetCompany = companies.find(c => c.id === companyId || c.code === companyId);
    if (targetCompany) {
      // Check permission: super admin can only enter their own associated company
      if (!canAccessCompanySpace(targetCompany)) {
        alert(
          `Accès restreint : En tant que Super Administrateur, vous pouvez uniquement accéder à l'espace opérationnel de votre propre établissement associé (${superAdminAssociatedCompany?.name || 'votre établissement'}).\n\nLes espaces de caisse et de gestion des autres établissements sont strictement privés et réservés à leurs administrateurs respectifs.`
        );
        return;
      }

      setImpersonatedCompanyId(targetCompany.id);
      safeSetItem(STORAGE_KEYS.IMPERSONATED_COMPANY_ID, targetCompany.id);
      setSettings(prev => ({
        ...prev,
        barName: targetCompany.name,
        tagline: targetCompany.tagline || prev.tagline,
        address: targetCompany.address || prev.address,
        phone: targetCompany.phone || prev.phone,
        currency: targetCompany.currency || prev.currency,
        companyCode: targetCompany.code,
      }));
      addAuditLog('company_switched', `Super Admin a accédé à son établissement associé "${targetCompany.name}" (${targetCompany.code})`);
    }
  };

  const verifyCompanyCode = async (code: string): Promise<Company | null> => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return null;
    const localMatch = companies.find(c => c.code.toUpperCase() === cleanCode);
    if (localMatch) return localMatch;
    try {
      const q = query(collection(db, 'companies'), where('code', '==', cleanCode));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs[0].data() as Company;
      }
    } catch (e) {
      console.warn('Error querying company by code:', e);
    }
    return null;
  };

  const preRegisterEmployee = async (data: Omit<PreRegisteredEmployee, 'id' | 'createdAt' | 'status' | 'companyId' | 'companyCode'> & { companyId?: string; companyCode?: string }) => {
    const targetCompany = (data.companyId ? companies.find(c => c.id === data.companyId) : activeCompany) || companies[0];
    const preRegId = `prereg_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 4)}`;
    const newPreReg: PreRegisteredEmployee = {
      id: preRegId,
      companyId: targetCompany.id,
      companyCode: targetCompany.code,
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      role: data.role || 'employee',
      pinCode: data.pinCode ? data.pinCode.trim() : undefined,
      permissions: data.permissions || {
        canAccessPOS: true,
        canAccessStock: true,
        canManageStock: data.role === 'admin' || data.role === 'manager',
        canViewCostPrices: data.role === 'admin',
        canAccessExpenses: true,
        canAccessReports: data.role === 'admin' || data.role === 'manager',
        canAccessSettings: data.role === 'admin',
        canAccessChat: true,
        canManageUsers: data.role === 'admin',
      },
      status: 'pre_registered',
      createdAt: new Date().toISOString(),
    };

    setPreRegistrations(prev => [newPreReg, ...prev]);
    try {
      await setDoc(doc(db, 'pre_registrations', preRegId), cleanForFirestore(newPreReg));
    } catch (err) {
      console.warn('Could not save pre-registration to Firestore:', err);
    }

    await addAuditLog('employee_preregistered', `Pré-inscription de l'employé ${newPreReg.name} (${newPreReg.email}) pour l'établissement ${targetCompany.name}`);
    return newPreReg;
  };

  const updatePreRegistration = async (id: string, updates: Partial<PreRegisteredEmployee>) => {
    setPreRegistrations(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    try {
      await setDoc(doc(db, 'pre_registrations', id), cleanForFirestore(updates), { merge: true });
    } catch (err) {
      console.warn('Error updating pre-registration:', err);
    }
  };

  const deletePreRegistration = async (id: string, deleteLinkedUserAccount: boolean = true) => {
    const target = preRegistrations.find(p => p.id === id);
    setPreRegistrations(prev => prev.filter(p => p.id !== id));
    try {
      await deleteDoc(doc(db, 'pre_registrations', id));
    } catch (err) {
      console.warn('Error deleting pre-registration:', err);
    }

    if (target && deleteLinkedUserAccount) {
      const linkedUser = allUsers.find(u =>
        (target.claimedByUid && u.uid === target.claimedByUid) ||
        (u.email && u.email.toLowerCase() === target.email.toLowerCase())
      );
      if (linkedUser) {
        removeApprovedUserRecord(linkedUser.email);
        removeApprovedUserRecord(linkedUser.uid);
        setAllUsers(prev => prev.filter(u => u.uid !== linkedUser.uid));
        try {
          await deleteDoc(doc(db, 'users', linkedUser.uid));
        } catch (err) {
          console.warn('Error deleting linked user account doc:', err);
        }
      }
    }

    if (target) {
      await addAuditLog('user_deleted', `Suppression définitive de la pré-inscription et révocation des accès pour ${target.name} (${target.email})`);
    }
  };

  const loginWithCompanyCodeAndGoogle = async (companyCode: string): Promise<{ success: boolean; message?: string }> => {
    const verified = await verifyCompanyCode(companyCode);
    if (!verified) {
      return { success: false, message: 'Code entreprise invalide ou introuvable.' };
    }
    if (verified.status === 'suspended') {
      return { success: false, message: 'Cet établissement est actuellement suspendu. Veuillez contacter le support.' };
    }

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const fbUser = result.user;
      if (!fbUser || !fbUser.email) {
        return { success: false, message: 'Erreur d\'authentification Google.' };
      }

      const userEmail = fbUser.email.toLowerCase();
      const isSuper = userEmail === SUPER_ADMIN_EMAIL.toLowerCase();

      const matchingPreReg = preRegistrations.find(
        p => p.companyCode.toUpperCase() === verified.code.toUpperCase() && p.email.toLowerCase() === userEmail
      );

      const isCompanyAdmin = verified.adminEmail.toLowerCase() === userEmail;

      const userRole: UserRole = isSuper ? 'super_admin' : (isCompanyAdmin ? 'admin' : (matchingPreReg?.role || 'employee'));
      const userPerms: UserPermissions = isSuper ? {
        canAccessPOS: true,
        canAccessStock: true,
        canManageStock: true,
        canViewCostPrices: true,
        canAccessExpenses: true,
        canAccessReports: true,
        canAccessSettings: true,
        canAccessChat: true,
        canManageUsers: true,
      } : (isCompanyAdmin ? {
        canAccessPOS: true,
        canAccessStock: true,
        canManageStock: true,
        canViewCostPrices: true,
        canAccessExpenses: true,
        canAccessReports: true,
        canAccessSettings: true,
        canAccessChat: true,
        canManageUsers: true,
      } : (matchingPreReg?.permissions || {
        canAccessPOS: true,
        canAccessStock: true,
        canManageStock: false,
        canViewCostPrices: false,
        canAccessExpenses: true,
        canAccessReports: false,
        canAccessSettings: false,
        canAccessChat: true,
        canManageUsers: false,
      }));

      const newUserSession: AppUser = {
        uid: fbUser.uid,
        email: fbUser.email,
        displayName: matchingPreReg?.name || fbUser.displayName || fbUser.email.split('@')[0],
        photoURL: fbUser.photoURL || '',
        role: userRole,
        status: (matchingPreReg || isCompanyAdmin || isSuper || verified.autoApprovePreRegistered) ? 'approved' : 'pending',
        permissions: userPerms,
        companyId: verified.id,
        companyCode: verified.code,
        companyName: verified.name,
        pinCode: matchingPreReg?.pinCode,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };

      setCurrentUser(newUserSession);
      safeRemoveItem('barexpress_explicit_logout');
      safeSetItem(STORAGE_KEYS.CACHED_USER, JSON.stringify(newUserSession));
      if (newUserSession.status === 'approved') {
        recordApprovedUser(newUserSession);
      }

      if (matchingPreReg) {
        await updatePreRegistration(matchingPreReg.id, {
          status: 'claimed',
          claimedByUid: fbUser.uid,
          claimedAt: new Date().toISOString(),
        });
        await addAuditLog('employee_claimed', `Employé ${matchingPreReg.name} a associé son compte Google au bar ${verified.name}`);
      }

      setSettings(prev => ({
        ...prev,
        barName: verified.name,
        tagline: verified.tagline || prev.tagline,
        currency: verified.currency || prev.currency,
        companyCode: verified.code,
      }));

      return { success: true };
    } catch (err: any) {
      console.error('Error during company Google login:', err);
      return { success: false, message: err.message || 'Échec de connexion Google.' };
    }
  };

  const loginWithPin = async (companyCode: string, pinCode: string): Promise<{ success: boolean; user?: AppUser; message?: string }> => {
    const verified = await verifyCompanyCode(companyCode);
    if (!verified) {
      return { success: false, message: 'Code établissement introuvable.' };
    }
    if (verified.status === 'suspended') {
      return { success: false, message: 'Cet établissement est suspendu.' };
    }

    const cleanPin = pinCode.trim();
    const matchingStaff = preRegistrations.find(
      p => p.companyCode.toUpperCase() === verified.code.toUpperCase() && p.pinCode === cleanPin
    );

    if (!matchingStaff) {
      return { success: false, message: 'Code PIN incorrect pour cet établissement.' };
    }

    const sessionUser: AppUser = {
      uid: `pin_${matchingStaff.id}_${Date.now()}`,
      email: matchingStaff.email,
      displayName: matchingStaff.name,
      photoURL: '',
      role: matchingStaff.role,
      status: 'approved',
      permissions: matchingStaff.permissions,
      companyId: verified.id,
      companyCode: verified.code,
      companyName: verified.name,
      pinCode: matchingStaff.pinCode,
      createdAt: matchingStaff.createdAt,
      lastLoginAt: new Date().toISOString(),
    };

    setCurrentUser(sessionUser);
    safeRemoveItem('barexpress_explicit_logout');
    safeSetItem(STORAGE_KEYS.CACHED_USER, JSON.stringify(sessionUser));
    recordApprovedUser(sessionUser);

    setSettings(prev => ({
      ...prev,
      barName: verified.name,
      tagline: verified.tagline || prev.tagline,
      currency: verified.currency || prev.currency,
      companyCode: verified.code,
    }));

    await addAuditLog('user_updated', `Connexion rapide par code PIN de ${matchingStaff.name} sur ${verified.name}`);
    return { success: true, user: sessionUser };
  };

  // Register New Company With 14-Day Free Trial
  const registerNewCompanyWithTrial = async (data: {
    name: string;
    managerName: string;
    phone: string;
    currency?: string;
    businessSector?: BusinessSector;
    address?: string;
  }): Promise<Company> => {
    if (!currentUser?.email) {
      throw new Error("Vous devez être connecté avec votre compte Google pour créer une entreprise.");
    }

    const now = new Date();
    const expiryDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const defaultAnnualPrice = settings.platformBilling?.defaultAnnualPrice ?? 100;
    const defaultQuotaPolicy = settings.platformBilling?.globalQuotaPolicy ?? {
      chargeOverage: false,
      maxTransactionsPerMonth: 5000,
      maxAiQueriesPerMonth: 500,
      overageFeePer1000Tx: 5,
      overageFeePer100AiQueries: 2,
    };

    const newCompany = await createCompany({
      name: data.name.trim(),
      managerName: (data.managerName || currentUser.displayName || 'Gérant').trim(),
      adminEmail: currentUser.email.trim().toLowerCase(),
      phone: data.phone.trim(),
      currency: data.currency || 'G',
      businessSector: data.businessSector || 'bar_restaurant',
      address: data.address?.trim() || '',
      status: 'active',
      subscription: {
        planType: 'annual',
        status: 'trial',
        customPrice: defaultAnnualPrice,
        currency: 'USD',
        startDate: now.toISOString(),
        expiryDate: expiryDate,
        autoRenew: true,
        quotaPolicy: defaultQuotaPolicy,
        notes: `Création de compte entreprise avec période d'essai gratuit de 14 jours accordée le ${now.toLocaleDateString('fr-FR')}`,
      },
    });

    // Automatically promote current Google user to Admin for this company
    const updatedUser: AppUser = {
      ...currentUser,
      role: 'admin',
      status: 'approved',
      companyId: newCompany.id,
      companyCode: newCompany.code,
      companyName: newCompany.name,
      permissions: {
        canAccessPOS: true,
        canAccessStock: true,
        canManageStock: true,
        canViewCostPrices: true,
        canAccessExpenses: true,
        canAccessReports: true,
        canAccessSettings: true,
        canAccessChat: true,
        canManageUsers: true,
      },
      approvedBy: 'Auto-Trial',
      approvedAt: now.toISOString(),
      lastLoginAt: now.toISOString(),
    };

    setCurrentUser(updatedUser);
    recordApprovedUser(updatedUser);
    safeSetItem(STORAGE_KEYS.CACHED_USER, JSON.stringify(updatedUser));

    try {
      await setDoc(doc(db, 'users', updatedUser.uid), cleanForFirestore(updatedUser));
    } catch (e) {
      console.warn('Could not save promoted user to Firestore:', e);
    }

    setSettings(prev => ({
      ...prev,
      barName: newCompany.name,
      tagline: newCompany.tagline || prev.tagline,
      currency: newCompany.currency || prev.currency,
      companyCode: newCompany.code,
      phone: newCompany.phone || prev.phone,
      address: newCompany.address || prev.address,
    }));

    await addAuditLog('company_created', `Nouvelle entreprise créée : "${newCompany.name}" (${newCompany.code}) avec 14 jours d'essai gratuit par ${currentUser.email}.`);

    return newCompany;
  };

  // Request to Join an Existing Company using 8-character Company Code
  const requestJoinCompanyWithCode = async (companyCode: string): Promise<{ success: boolean; message: string }> => {
    if (!currentUser) {
      return { success: false, message: "Vous devez être connecté avec votre compte Google." };
    }

    const cleanCode = companyCode.trim().toUpperCase();
    const verified = await verifyCompanyCode(cleanCode);
    if (!verified) {
      return { success: false, message: `Aucun établissement trouvé avec le code "${cleanCode}". Vérifiez le code avec votre gérant.` };
    }

    if (verified.status === 'suspended') {
      return { success: false, message: `L'établissement "${verified.name}" est actuellement suspendu. Contactez votre gérant.` };
    }

    // Submit pre-registration request for this company
    await preRegisterEmployee({
      companyId: verified.id,
      companyCode: verified.code,
      name: currentUser.displayName || currentUser.email.split('@')[0],
      email: currentUser.email,
      role: 'employee',
      permissions: {
        canAccessPOS: true,
        canAccessStock: true,
        canManageStock: false,
        canViewCostPrices: false,
        canAccessExpenses: false,
        canAccessReports: false,
        canAccessSettings: false,
        canAccessChat: true,
        canManageUsers: false,
      },
    });

    const pendingUser: AppUser = {
      ...currentUser,
      companyId: verified.id,
      companyCode: verified.code,
      companyName: verified.name,
      role: 'employee',
      status: 'pending',
    };

    setCurrentUser(pendingUser);
    safeSetItem(STORAGE_KEYS.CACHED_USER, JSON.stringify(pendingUser));

    try {
      await setDoc(doc(db, 'users', pendingUser.uid), cleanForFirestore(pendingUser));
    } catch (e) {
      console.warn('Could not save pending user to Firestore:', e);
    }

    await addAuditLog(
      'employee_preregistered',
      `Demande d'adhésion envoyée par ${currentUser.email} pour l'entreprise "${verified.name}" (${verified.code}). En attente de validation par l'administrateur de l'entreprise.`
    );

    return {
      success: true,
      message: `Votre demande a été transmise à l'administrateur de l'établissement "${verified.name}". Vous recevrez l'accès dès son approbation.`,
    };
  };

  // Submit Manual Payment Proof (MonCash / NatCash) with photo
  const submitManualPaymentProof = async (proofData: Omit<ManualPaymentProof, 'id' | 'submittedAt' | 'status'>): Promise<ManualPaymentProof> => {
    const newProof: ManualPaymentProof = {
      ...proofData,
      id: `proof_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      submittedAt: new Date().toISOString(),
      status: 'pending',
    };

    setManualPaymentProofs(prev => [newProof, ...prev.filter(p => p.id !== newProof.id)]);

    try {
      await setDoc(doc(db, 'manual_payment_proofs', newProof.id), cleanForFirestore(newProof));
    } catch (err) {
      console.warn('Could not persist payment proof to Firestore:', err);
    }

    await addAuditLog(
      'subscription_updated',
      `Preuve de paiement soumise par "${newProof.companyName}" (${newProof.companyCode}) - ${newProof.paymentMethodName} : ${newProof.amount} ${newProof.currency} (Réf: ${newProof.transactionReference}). Accès provisoire débloqué.`
    );

    return newProof;
  };

  // Super Admin: Approve Manual Payment Proof
  const approveManualPaymentProof = async (proofId: string) => {
    if (!isSuperAdmin) {
      throw new Error("Seul le Super Administrateur peut valider un paiement.");
    }

    const proof = manualPaymentProofs.find(p => p.id === proofId);
    if (!proof) return;

    const now = new Date();
    const updatedProof: ManualPaymentProof = {
      ...proof,
      status: 'approved',
      reviewedAt: now.toISOString(),
      reviewedBy: currentUser?.email || SUPER_ADMIN_EMAIL,
      disapprovalReason: undefined,
    };

    setManualPaymentProofs(prev => prev.map(p => p.id === proofId ? updatedProof : p));

    try {
      await setDoc(doc(db, 'manual_payment_proofs', proofId), cleanForFirestore(updatedProof), { merge: true });
    } catch (err) {
      console.warn('Could not update payment proof in Firestore:', err);
    }

    // Activate and extend the company's subscription
    const targetComp = companies.find(c => c.id === proof.companyId || c.code === proof.companyCode);
    if (targetComp) {
      const isAnnual = proof.planType === 'annual';
      const isMonthly = proof.planType === 'monthly';
      const isLifetime = proof.planType === 'lifetime';

      const durationDays = isLifetime ? undefined : (isAnnual ? 365 : (isMonthly ? 30 : 365));
      const expiryDate = durationDays ? new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString() : undefined;

      const updatedSub: CompanySubscription = {
        planType: proof.planType,
        status: isLifetime ? 'lifetime' : 'active',
        customPrice: proof.amount,
        currency: proof.currency,
        startDate: now.toISOString(),
        expiryDate,
        autoRenew: !isLifetime,
        paymentMethod: proof.paymentMethodName,
        notes: `Paiement ${proof.paymentMethodName} (${proof.transactionReference}) approuvé par le Super Admin le ${now.toLocaleDateString('fr-FR')}`,
        quotaPolicy: targetComp.subscription?.quotaPolicy || {
          chargeOverage: false,
          maxTransactionsPerMonth: 5000,
          maxAiQueriesPerMonth: 500,
          overageFeePer1000Tx: 5,
          overageFeePer100AiQueries: 2,
        },
      };

      await updateCompany(targetComp.id, {
        subscription: updatedSub,
        status: 'active',
      });
    }

    await addAuditLog(
      'subscription_updated',
      `Paiement ${proof.paymentMethodName} approuvé pour l'établissement "${proof.companyName}" (${proof.companyCode}) par le Super Admin.`
    );
  };

  // Super Admin: Disapprove Manual Payment Proof with custom reason
  const disapproveManualPaymentProof = async (proofId: string, reason: string) => {
    if (!isSuperAdmin) {
      throw new Error("Seul le Super Administrateur peut désapprouver un paiement.");
    }
    const cleanReason = reason.trim();
    if (!cleanReason) {
      throw new Error("Veuillez obligatoirement renseigner le motif de la désapprobation.");
    }

    const proof = manualPaymentProofs.find(p => p.id === proofId);
    if (!proof) return;

    const now = new Date();
    const updatedProof: ManualPaymentProof = {
      ...proof,
      status: 'disapproved',
      reviewedAt: now.toISOString(),
      reviewedBy: currentUser?.email || SUPER_ADMIN_EMAIL,
      disapprovalReason: cleanReason,
    };

    setManualPaymentProofs(prev => prev.map(p => p.id === proofId ? updatedProof : p));

    try {
      await setDoc(doc(db, 'manual_payment_proofs', proofId), cleanForFirestore(updatedProof), { merge: true });
    } catch (err) {
      console.warn('Could not update payment proof in Firestore:', err);
    }

    // Set company subscription to expired / suspended if not active
    const targetComp = companies.find(c => c.id === proof.companyId || c.code === proof.companyCode);
    if (targetComp && targetComp.subscription) {
      await updateCompany(targetComp.id, {
        subscription: {
          ...targetComp.subscription,
          status: 'expired',
          notes: `Paiement rejeté le ${now.toLocaleDateString('fr-FR')} : ${cleanReason}`,
        }
      });
    }

    await addAuditLog(
      'subscription_updated',
      `Paiement ${proof.paymentMethodName} pour "${proof.companyName}" rejeté par le Super Admin. Motif : ${cleanReason}`
    );
  };

  // Super Admin: Configure Payment Methods (Name, Phone number, Instructions, Active toggle)
  const updateManualPaymentMethod = async (id: string, updates: Partial<ManualPaymentMethodConfig>) => {
    if (!isSuperAdmin) {
      throw new Error("Seul le Super Administrateur peut configurer les moyens de paiement.");
    }

    setManualPaymentMethods(prev => {
      const exists = prev.some(m => m.id === id);
      if (exists) {
        return prev.map(m => m.id === id ? { ...m, ...updates } : m);
      }
      return [...prev, { id, name: id, accountNumber: '', accountName: '', instructions: '', active: true, ...updates } as ManualPaymentMethodConfig];
    });

    const updatedList = manualPaymentMethods.map(m => m.id === id ? { ...m, ...updates } : m);

    updateSettings({
      platformBilling: {
        defaultAnnualPrice: settings.platformBilling?.defaultAnnualPrice ?? 100,
        defaultMonthlyPrice: settings.platformBilling?.defaultMonthlyPrice ?? 15,
        defaultLifetimePrice: settings.platformBilling?.defaultLifetimePrice ?? 450,
        currency: settings.platformBilling?.currency ?? 'USD',
        availablePlans: settings.platformBilling?.availablePlans ?? { monthly: true, annual: true, lifetime: true },
        globalQuotaPolicy: settings.platformBilling?.globalQuotaPolicy ?? {
          chargeOverage: false,
          maxTransactionsPerMonth: 5000,
          maxAiQueriesPerMonth: 500,
          overageFeePer1000Tx: 5,
          overageFeePer100AiQueries: 2,
        },
        manualPaymentMethods: updatedList,
      }
    });

    await addAuditLog('platform_pricing_updated', `Mise à jour des paramètres du moyen de paiement "${id}" par le Super Admin.`);
  };

  // Auth & Admin Actions
  const loginWithGoogle = async () => {
    try {
      safeRemoveItem('barexpress_explicit_logout');
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Erreur lors de la connexion Google:', error);
      throw error;
    }
  };

  const loginAsDemo = async (role: UserRole = 'admin', name?: string) => {
    const isSuper = role === 'admin';
    const demoUser: AppUser = {
      uid: 'session_' + (isSuper ? 'admin' : 'staff') + '_' + Date.now(),
      email: isSuper ? SUPER_ADMIN_EMAIL : 'service@barexpress.app',
      displayName: name || (isSuper ? 'Super Administrateur' : 'Serveur Caisse'),
      photoURL: '',
      role,
      status: 'approved',
      permissions: isSuper ? {
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
        canAccessExpenses: true,
        canAccessReports: false,
        canAccessSettings: false,
        canAccessChat: true,
        canManageUsers: false,
      },
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };
    safeRemoveItem('barexpress_explicit_logout');
    setCurrentUser(demoUser);
    safeSetItem(STORAGE_KEYS.CACHED_USER, JSON.stringify(demoUser));
    recordApprovedUser(demoUser);
  };

  const logout = async () => {
    safeSetItem('barexpress_explicit_logout', 'true');
    safeRemoveItem(STORAGE_KEYS.CACHED_USER);
    safeRemoveItem(STORAGE_KEYS.IMPERSONATED_COMPANY_ID);
    setCurrentUser(null);
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('SignOut note:', e);
    }
  };

  const approveUser = async (uid: string, role: UserRole = 'employee', customPermissions?: Partial<UserPermissions>) => {
    const defaultPerms: UserPermissions = role === 'admin' ? {
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

    const targetUser = allUsers.find(u => u.uid === uid);
    if (!targetUser) return;

    const updated: AppUser = {
      ...targetUser,
      role,
      status: 'approved',
      permissions: { ...defaultPerms, ...customPermissions },
      approvedBy: currentUser?.email || SUPER_ADMIN_EMAIL,
      approvedAt: new Date().toISOString(),
    };

    // Immediate state & permanent registry persistence
    setAllUsers(prev => prev.map(u => u.uid === uid ? updated : u));
    recordApprovedUser(updated);
    if (currentUser && currentUser.uid === uid) {
      setCurrentUser(updated);
    }

    await setDoc(doc(db, 'users', uid), cleanForFirestore(updated), { merge: true });
    
    await addAuditLog(
      'user_approved', 
      `Approbation définitive de l'utilisateur ${targetUser.displayName} (${targetUser.email}) avec le rôle ${role}.`
    );
  };

  const rejectUser = async (uid: string) => {
    const targetUser = allUsers.find(u => u.uid === uid);
    if (!targetUser) return;

    const updated: AppUser = {
      ...targetUser,
      status: 'rejected',
    };

    removeApprovedUserRecord(targetUser.email);
    removeApprovedUserRecord(uid);
    setAllUsers(prev => prev.map(u => u.uid === uid ? updated : u));

    await setDoc(doc(db, 'users', uid), cleanForFirestore(updated), { merge: true });
    
    await addAuditLog(
      'user_rejected', 
      `Rejet de la demande d'accès de ${targetUser.displayName} (${targetUser.email}).`
    );
  };

  const suspendUser = async (uid: string) => {
    const targetUser = allUsers.find(u => u.uid === uid);
    if (!targetUser) return;

    if (targetUser.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
      alert("Le compte propriétaire ne peut pas être suspendu.");
      return;
    }

    const updated: AppUser = {
      ...targetUser,
      status: 'suspended',
    };

    removeApprovedUserRecord(targetUser.email);
    removeApprovedUserRecord(uid);
    setAllUsers(prev => prev.map(u => u.uid === uid ? updated : u));

    await setDoc(doc(db, 'users', uid), cleanForFirestore(updated), { merge: true });
    
    await addAuditLog(
      'user_suspended', 
      `Suspension temporaire du compte de ${targetUser.displayName} (${targetUser.email}).`
    );
  };

  const reactivateUser = async (uid: string) => {
    const targetUser = allUsers.find(u => u.uid === uid);
    if (!targetUser) return;

    const updated: AppUser = {
      ...targetUser,
      status: 'approved',
    };

    setAllUsers(prev => prev.map(u => u.uid === uid ? updated : u));
    recordApprovedUser(updated);

    await setDoc(doc(db, 'users', uid), cleanForFirestore(updated), { merge: true });
    
    await addAuditLog(
      'user_reactivated', 
      `Réactivation de l'accès pour ${targetUser.displayName} (${targetUser.email}).`
    );
  };

  const addUserByEmail = async (email: string, role: UserRole = 'employee', customPermissions?: Partial<UserPermissions>) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;

    const existing = allUsers.find(u => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      await approveUser(existing.uid, role, customPermissions);
      return;
    }

    const defaultPerms: UserPermissions = role === 'admin' ? {
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

    const tempUid = `user-pre-${Date.now()}`;
    const preUser: AppUser = {
      uid: tempUid,
      email: cleanEmail,
      displayName: cleanEmail.split('@')[0],
      role,
      status: 'approved',
      permissions: { ...defaultPerms, ...customPermissions },
      createdAt: new Date().toISOString(),
      approvedBy: currentUser?.email || SUPER_ADMIN_EMAIL,
      approvedAt: new Date().toISOString(),
    };

    setAllUsers(prev => [...prev, preUser]);
    recordApprovedUser(preUser);

    await setDoc(doc(db, 'users', tempUid), cleanForFirestore(preUser));
    
    await addAuditLog(
      'user_approved', 
      `Pré-approbation de l'email ${cleanEmail} avec le rôle ${role}.`
    );
  };

  const updateUserPermissions = async (uid: string, permissions: UserPermissions, role: UserRole, displayName?: string, customRoleTitle?: string) => {
    const targetUser = allUsers.find(u => u.uid === uid);
    if (!targetUser) return;

    const cleanName = displayName?.trim();
    const updated: AppUser = {
      ...targetUser,
      role,
      permissions,
      ...(cleanName ? { displayName: cleanName } : {}),
      customRoleTitle: customRoleTitle !== undefined ? customRoleTitle.trim() : targetUser.customRoleTitle,
    };

    setAllUsers(prev => prev.map(u => u.uid === uid ? updated : u));
    if (updated.status === 'approved') {
      recordApprovedUser(updated);
    }

    await setDoc(doc(db, 'users', uid), cleanForFirestore(updated), { merge: true });
    
    if (currentUser && currentUser.uid === uid) {
      setCurrentUser(updated);
      safeSetItem(STORAGE_KEYS.CACHED_USER, JSON.stringify(updated));
    }

    await addAuditLog(
      'permissions_updated', 
      `Mise à jour du profil et des permissions de ${updated.displayName} (${updated.email}). Rôle: ${role}${customRoleTitle ? ` (${customRoleTitle})` : ''}.`
    );
  };

  const updateUserProfileName = async (uid: string, newDisplayName: string) => {
    const cleanName = newDisplayName.trim();
    if (!cleanName) return;

    const targetUser = allUsers.find(u => u.uid === uid);
    if (!targetUser) return;

    const updated: AppUser = {
      ...targetUser,
      displayName: cleanName,
    };

    setAllUsers(prev => prev.map(u => u.uid === uid ? updated : u));
    if (updated.status === 'approved') {
      recordApprovedUser(updated);
    }

    await setDoc(doc(db, 'users', uid), cleanForFirestore(updated), { merge: true });

    if (currentUser && currentUser.uid === uid) {
      setCurrentUser(updated);
      safeSetItem(STORAGE_KEYS.CACHED_USER, JSON.stringify(updated));
    }

    await addAuditLog(
      'user_updated',
      `Modification du nom de profil/caisse pour ${targetUser.email} -> ${cleanName}`
    );
  };

  const deleteUserAccount = async (uid: string) => {
    const targetUser = allUsers.find(u => u.uid === uid);
    if (targetUser) {
      removeApprovedUserRecord(targetUser.email);
    }
    removeApprovedUserRecord(uid);
    setAllUsers(prev => prev.filter(u => u.uid !== uid));
    await deleteDoc(doc(db, 'users', uid));
    
    if (targetUser) {
      await addAuditLog(
        'user_deleted', 
        `Suppression définitive du compte de ${targetUser.displayName} (${targetUser.email}).`
      );
    }
  };

  const addAuditLog = async (action: AuditAction, details: string, metadata?: any) => {
    if (!currentUser) return;
    
    const logId = `audit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newLog: Record<string, any> = {
      id: logId,
      action,
      details,
      userId: currentUser.uid,
      userName: currentUser.displayName || 'Utilisateur',
      userEmail: currentUser.email || '',
      timestamp: new Date().toISOString(),
    };

    if (metadata !== undefined && metadata !== null) {
      newLog.metadata = metadata;
    }
    
    try {
      await setDoc(doc(db, 'auditLogs', logId), cleanForFirestore(newLog));
    } catch (err) {
      console.error('Error writing audit log:', err);
    }
  };

  // Sync to LocalStorage on changes safely
  useEffect(() => {
    safeSetItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(rawProducts));
  }, [rawProducts]);

  useEffect(() => {
    safeSetItem(STORAGE_KEYS.SALES, JSON.stringify(rawSales));
  }, [rawSales]);

  useEffect(() => {
    safeSetItem(STORAGE_KEYS.EXPENSES, JSON.stringify(rawExpenses));
  }, [rawExpenses]);

  useEffect(() => {
    safeSetItem(STORAGE_KEYS.TABS, JSON.stringify(rawTabs));
  }, [rawTabs]);

  useEffect(() => {
    safeSetItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    safeSetItem(STORAGE_KEYS.STOCK_LOGS, JSON.stringify(rawStockLogs));
  }, [rawStockLogs]);

  useEffect(() => {
    safeSetItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(rawCategories));
  }, [rawCategories]);

  useEffect(() => {
    safeSetItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(offlineQueue));
  }, [offlineQueue]);

  useEffect(() => {
    if (lastSyncedAt) {
      safeSetItem(STORAGE_KEYS.LAST_SYNCED, lastSyncedAt);
    }
  }, [lastSyncedAt]);

  // Firestore Realtime Subscriptions & Initial Seeding
  useEffect(() => {
    let unsubscribeProducts: (() => void) | null = null;
    let unsubscribeCategories: (() => void) | null = null;
    let unsubscribeSales: (() => void) | null = null;
    let unsubscribeExpenses: (() => void) | null = null;
    let unsubscribeTabs: (() => void) | null = null;
    let unsubscribeStockLogs: (() => void) | null = null;
    let unsubscribeAuditLogs: (() => void) | null = null;
    let unsubscribeSettings: (() => void) | null = null;
    let unsubscribeCompanies: (() => void) | null = null;
    let unsubscribePreRegistrations: (() => void) | null = null;

    const setupFirestore = async () => {
      if (!db) {
        console.warn('Firestore database instance is not available');
        return;
      }
      try {
        // 0. Settings first to check initial bootstrap
        const settingsDocRef = doc(db, 'settings', 'bar_settings');
        unsubscribeSettings = onSnapshot(
          settingsDocRef,
          async (docSnap) => {
            QuotaTracker.trackReads(1);
            if (!docSnap.exists()) {
              try {
                await setDoc(settingsDocRef, cleanForFirestore({ ...INITIAL_SETTINGS, isInitialized: true }));
                QuotaTracker.trackWrites(1);
                // One-time initial seeding for fresh installation
                for (const item of INITIAL_PRODUCTS) {
                  await setDoc(doc(db, 'products', item.id), cleanForFirestore(item)).catch(() => {});
                  QuotaTracker.trackWrites(1);
                }
                for (const cat of CATEGORIES_CONFIG) {
                  await setDoc(doc(db, 'categories', cat.id), cleanForFirestore(cat)).catch(() => {});
                  QuotaTracker.trackWrites(1);
                }
              } catch (err) {
                console.warn('Initial setup seeding error:', err);
              }
            } else {
              setSettings(docSnap.data() as BarSettings);
            }
          },
          (error) => {
            setIsServerReachable(false);
            handleFirestoreError(error, OperationType.GET, 'settings/bar_settings');
          }
        );

        // 1. Products
        const productsColRef = collection(db, 'products');
        unsubscribeProducts = onSnapshot(
          productsColRef,
          (snapshot) => {
            QuotaTracker.trackReads(snapshot.docs.length || 1);
            const loadedProducts = snapshot.docs.map(docSnap => docSnap.data() as Product);
            setRawProducts(loadedProducts);
          },
          (error) => {
            setIsServerReachable(false);
            handleFirestoreError(error, OperationType.LIST, 'products');
          }
        );

        // 2. Categories
        const categoriesColRef = collection(db, 'categories');
        unsubscribeCategories = onSnapshot(
          categoriesColRef,
          (snapshot) => {
            QuotaTracker.trackReads(snapshot.docs.length || 1);
            if (!snapshot.empty) {
              const loadedCategories = snapshot.docs.map(docSnap => docSnap.data() as CategoryItem);
              setRawCategories(loadedCategories);
            }
          },
          (error) => {
            setIsServerReachable(false);
            handleFirestoreError(error, OperationType.LIST, 'categories');
          }
        );

        // 3. Sales
        const salesColRef = collection(db, 'sales');
        unsubscribeSales = onSnapshot(
          salesColRef,
          (snapshot) => {
            QuotaTracker.trackReads(snapshot.docs.length || 1);
            const loadedSales = snapshot.docs.map(docSnap => docSnap.data() as Sale);
            loadedSales.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setRawSales(loadedSales);
          },
          (error) => {
            setIsServerReachable(false);
            handleFirestoreError(error, OperationType.LIST, 'sales');
          }
        );

        // 4. Expenses
        const expensesColRef = collection(db, 'expenses');
        unsubscribeExpenses = onSnapshot(
          expensesColRef,
          (snapshot) => {
            QuotaTracker.trackReads(snapshot.docs.length || 1);
            const loadedExpenses = snapshot.docs.map(docSnap => docSnap.data() as Expense);
            loadedExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setRawExpenses(loadedExpenses);
          },
          (error) => {
            setIsServerReachable(false);
            handleFirestoreError(error, OperationType.LIST, 'expenses');
          }
        );

        // 5. Bar Tabs
        const tabsColRef = collection(db, 'tabs');
        unsubscribeTabs = onSnapshot(
          tabsColRef,
          (snapshot) => {
            QuotaTracker.trackReads(snapshot.docs.length || 1);
            const loadedTabs = snapshot.docs.map(docSnap => docSnap.data() as BarTab);
            setRawTabs(loadedTabs);
          },
          (error) => {
            setIsServerReachable(false);
            handleFirestoreError(error, OperationType.LIST, 'tabs');
          }
        );

        // 6. Stock Logs
        const stockLogsColRef = collection(db, 'stockLogs');
        unsubscribeStockLogs = onSnapshot(
          stockLogsColRef,
          (snapshot) => {
            QuotaTracker.trackReads(snapshot.docs.length || 1);
            const loadedLogs = snapshot.docs.map(docSnap => docSnap.data() as StockLog);
            loadedLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setRawStockLogs(loadedLogs);
          },
          (error) => {
            setIsServerReachable(false);
            handleFirestoreError(error, OperationType.LIST, 'stockLogs');
          }
        );

        // 7. Audit Logs
        const auditLogsColRef = collection(db, 'auditLogs');
        unsubscribeAuditLogs = onSnapshot(
          auditLogsColRef,
          (snapshot) => {
            QuotaTracker.trackReads(snapshot.docs.length || 1);
            const loadedLogs = snapshot.docs.map(docSnap => docSnap.data() as AuditLog);
            loadedLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setAuditLogs(loadedLogs);
          },
          (error) => {
            setIsServerReachable(false);
            console.warn('Audit logs subscription error / offline:', error);
          }
        );

        // 8. Companies Real-Time Synchronized Subscription & Seeding
        const companiesColRef = collection(db, 'companies');
        unsubscribeCompanies = onSnapshot(
          companiesColRef,
          async (snapshot) => {
            QuotaTracker.trackReads(snapshot.docs.length || 1);
            if (!snapshot.empty) {
              const loadedCompanies = snapshot.docs.map(docSnap => {
                const data = docSnap.data() as Company;
                return {
                  ...data,
                  allowCameraScanner: data.allowCameraScanner === true,
                };
              });
              setCompanies(loadedCompanies);
              safeSetItem(STORAGE_KEYS.COMPANIES, JSON.stringify(loadedCompanies));
            } else {
              const isBootstrapped = safeGetItem('barexpress_companies_bootstrapped') === 'true';
              if (!isBootstrapped) {
                try {
                  for (const comp of INITIAL_COMPANIES) {
                    await setDoc(doc(db, 'companies', comp.id), cleanForFirestore(comp)).catch(() => {});
                  }
                  safeSetItem('barexpress_companies_bootstrapped', 'true');
                  setCompanies(INITIAL_COMPANIES);
                  safeSetItem(STORAGE_KEYS.COMPANIES, JSON.stringify(INITIAL_COMPANIES));
                } catch (e) {
                  console.warn('Initial companies bootstrap notice:', e);
                }
              } else {
                setCompanies([]);
                safeSetItem(STORAGE_KEYS.COMPANIES, JSON.stringify([]));
              }
            }
          },
          (error) => {
            setIsServerReachable(false);
            handleFirestoreError(error, OperationType.LIST, 'companies');
          }
        );

        // 9. Pre-Registrations Real-Time Synchronized Subscription & Seeding
        const preRegsColRef = collection(db, 'pre_registrations');
        unsubscribePreRegistrations = onSnapshot(
          preRegsColRef,
          async (snapshot) => {
            QuotaTracker.trackReads(snapshot.docs.length || 1);
            if (!snapshot.empty) {
              const loadedPreRegs = snapshot.docs.map(docSnap => docSnap.data() as PreRegisteredEmployee);
              setPreRegistrations(loadedPreRegs);
              safeSetItem(STORAGE_KEYS.PRE_REGISTRATIONS, JSON.stringify(loadedPreRegs));
            } else {
              const isBootstrapped = safeGetItem('barexpress_preregs_bootstrapped') === 'true';
              if (!isBootstrapped) {
                try {
                  for (const preReg of INITIAL_PRE_REGISTRATIONS) {
                    await setDoc(doc(db, 'pre_registrations', preReg.id), cleanForFirestore(preReg)).catch(() => {});
                  }
                  safeSetItem('barexpress_preregs_bootstrapped', 'true');
                  setPreRegistrations(INITIAL_PRE_REGISTRATIONS);
                  safeSetItem(STORAGE_KEYS.PRE_REGISTRATIONS, JSON.stringify(INITIAL_PRE_REGISTRATIONS));
                } catch (e) {
                  console.warn('Initial preregs bootstrap notice:', e);
                }
              } else {
                setPreRegistrations([]);
                safeSetItem(STORAGE_KEYS.PRE_REGISTRATIONS, JSON.stringify([]));
              }
            }
          },
          (error) => {
            setIsServerReachable(false);
            handleFirestoreError(error, OperationType.LIST, 'pre_registrations');
          }
        );
      } catch (err) {
        console.warn('Firestore subscription setup warning:', err);
      }
    };

    setupFirestore();

    return () => {
      if (unsubscribeProducts) unsubscribeProducts();
      if (unsubscribeCategories) unsubscribeCategories();
      if (unsubscribeSales) unsubscribeSales();
      if (unsubscribeExpenses) unsubscribeExpenses();
      if (unsubscribeTabs) unsubscribeTabs();
      if (unsubscribeStockLogs) unsubscribeStockLogs();
      if (unsubscribeAuditLogs) unsubscribeAuditLogs();
      if (unsubscribeSettings) unsubscribeSettings();
      if (unsubscribeCompanies) unsubscribeCompanies();
      if (unsubscribePreRegistrations) unsubscribePreRegistrations();
    };
  }, []);

  // Server health check function
  const checkServerHealth = useCallback(async (): Promise<boolean> => {
    if (!navigator.onLine) {
      setIsOnline(false);
      setIsServerReachable(false);
      return false;
    }
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch('/api/health', { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        setIsOnline(true);
        setIsServerReachable(true);
        return true;
      }
      setIsServerReachable(false);
      return false;
    } catch {
      setIsServerReachable(false);
      return false;
    }
  }, []);

  // Sync offline queued data with backend server
  const syncOfflineData = useCallback(async (): Promise<{ success: boolean; syncedCount: number }> => {
    const pendingItems = offlineQueue.filter(item => item.status !== 'synced');
    const pendingSales = pendingItems
      .filter(item => item.type === 'sale' && item.saleData)
      .map(item => item.saleData!);

    if (pendingSales.length === 0) {
      const now = new Date().toISOString();
      setLastSyncedAt(now);
      return { success: true, syncedCount: 0 };
    }

    setIsSyncing(true);

    try {
      const res = await fetch('/api/sync-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sales: pendingSales, deviceId: 'pos-terminal-1' })
      });

      if (res.ok) {
        const data = await res.json();
        const now = data.syncedAt || new Date().toISOString();
        const syncedIds: string[] = data.syncedIds || pendingSales.map(s => s.id);

        // Update sales in state to 'synced'
        setRawSales(prevSales =>
          prevSales.map(s => {
            if (syncedIds.includes(s.id)) {
              return { ...s, syncStatus: 'synced', syncedAt: now };
            }
            return s;
          })
        );

        // Remove synced items from queue
        setOfflineQueue(prev => prev.filter(item => !syncedIds.includes(item.id)));
        setLastSyncedAt(now);
        setIsSyncing(false);
        setIsServerReachable(true);

        if (syncedIds.length > 0) {
          sendSmartNotification({
            id: 'sync-complete',
            title: 'Synchronisation Réussie',
            message: `${syncedIds.length} vente(s) synchronisée(s) avec le serveur principal.`,
            type: 'success',
          });
        }

        return { success: true, syncedCount: syncedIds.length };
      } else {
        setIsSyncing(false);
        return { success: false, syncedCount: 0 };
      }
    } catch (err) {
      console.warn("Sync failed, offline data safely retained in localStorage:", err);
      setIsSyncing(false);
      return { success: false, syncedCount: 0 };
    }
  }, [offlineQueue]);

  // Monitor network status & SW messages
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      checkServerHealth().then((reachable) => {
        if (reachable) {
          syncOfflineData();
        }
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsServerReachable(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic check every 25 seconds
    const interval = setInterval(() => {
      checkServerHealth();
    }, 25000);

    // Initial check on mount
    checkServerHealth().then(reachable => {
      if (reachable && offlineQueue.length > 0) {
        syncOfflineData();
      }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [checkServerHealth, offlineQueue.length, syncOfflineData]);

  const clearOfflineQueue = () => {
    setOfflineQueue([]);
  };

  // Cart helper calculations (incorporates custom unit price for negotiated, auction, or promotional sales)
  const cartSubtotal = cart.reduce((sum, item) => {
    const unitPrice = item.customUnitPrice !== undefined ? item.customUnitPrice : item.product.price;
    return sum + (unitPrice * item.quantity);
  }, 0);
  const cartDiscountTotal = cart.reduce((sum, item) => sum + (item.discount * item.quantity), 0);
  const cartTotal = Math.max(0, cartSubtotal - cartDiscountTotal);

  // Cart operations
  const addToCart = (product: Product, quantity = 1, selectedFlavor?: string) => {
    if (product.stock <= 0) {
      alert(`Stock épuisé pour ${product.name}! Veuillez réapprovisionner.`);
    }

    setCart(prev => {
      const existingIndex = prev.findIndex(item => 
        item.product.id === product.id && item.selectedFlavor === selectedFlavor
      );
      if (existingIndex > -1) {
        const updated = [...prev];
        const newQty = updated[existingIndex].quantity + quantity;
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
        };
        return updated;
      } else {
        return [...prev, { product, quantity, discount: 0, selectedFlavor }];
      }
    });
  };

  const updateCartItemQuantity = (productId: string, quantity: number, flavor?: string) => {
    if (quantity <= 0) {
      removeFromCart(productId, flavor);
      return;
    }
    setCart(prev =>
      prev.map(item =>
        item.product.id === productId && item.selectedFlavor === flavor 
          ? { ...item, quantity } 
          : item
      )
    );
  };

  // Support for negotiated prices, open/incentivized pricing, or auctions
  const updateCartItemUnitPrice = (
    productId: string,
    unitPrice: number,
    flavor?: string,
    priceType: 'negotiated' | 'auction' | 'custom' | 'standard' = 'custom'
  ) => {
    setCart(prev =>
      prev.map(item => {
        if (item.product.id === productId && item.selectedFlavor === flavor) {
          if (priceType === 'standard' || unitPrice === item.product.price) {
            return {
              ...item,
              customUnitPrice: undefined,
              priceType: undefined,
            };
          }
          const validPrice = Math.max(0, isNaN(unitPrice) ? 0 : unitPrice);
          return {
            ...item,
            customUnitPrice: validPrice,
            priceType: priceType,
          };
        }
        return item;
      })
    );
  };

  const updateCartItemFlavor = (productId: string, newFlavor: string, currentFlavor?: string) => {
    setCart(prev =>
      prev.map(item =>
        item.product.id === productId && item.selectedFlavor === currentFlavor
          ? { ...item, selectedFlavor: newFlavor }
          : item
      )
    );
  };

  const applyCartItemDiscount = (productId: string, discountAmount: number, flavor?: string) => {
    setCart(prev =>
      prev.map(item =>
        item.product.id === productId && item.selectedFlavor === flavor 
          ? { ...item, discount: Math.max(0, discountAmount) } 
          : item
      )
    );
  };

  const removeFromCart = (productId: string, flavor?: string) => {
    setCart(prev => prev.filter(item => !(item.product.id === productId && item.selectedFlavor === flavor)));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Process Checkout & Deduct Stock in Real-time (with Offline Caching & Queue)
  const processCheckout = (paymentMethod: PaymentMethod = 'Espèces', amountPaid: number = cartTotal, tableName = activeTable): Sale => {
    if (cart.length === 0) {
      throw new Error("Le panier est vide");
    }

    const timestamp = new Date().toISOString();
    const receiptNum = `REC-${Date.now().toString().slice(-5)}`;
    const isOffline = !isOnline || !isServerReachable;
    const currentCompId = activeCompany?.id || currentUser?.companyId || 'comp_lmd88412';
    const currentCompCode = activeCompany?.code || currentUser?.companyCode || 'LMD88412';

    const newSale: Sale = {
      id: `sale-${Date.now()}`,
      companyId: currentCompId,
      companyCode: currentCompCode,
      receiptNumber: receiptNum,
      items: [...cart],
      subtotal: cartSubtotal,
      discountTotal: cartDiscountTotal,
      taxTotal: 0,
      total: cartTotal,
      amountPaid: Math.max(amountPaid, cartTotal),
      changeGiven: Math.max(0, amountPaid - cartTotal),
      paymentMethod,
      tableName,
      cashierName: currentUser?.displayName || settings.cashierName || currentUser?.email?.split('@')[0] || 'Caissier',
      timestamp,
      status: 'completed',
      offlineCreated: isOffline,
      syncStatus: isOffline ? 'pending' : 'synced',
      syncedAt: isOffline ? undefined : timestamp,
    };

    // Real-time stock deduction in local cache
    setRawProducts(prevProducts => {
      const newLogs: StockLog[] = [];
      const updated = prevProducts.map(prod => {
        const cartMatch = cart.find(item => item.product.id === prod.id);
        if (cartMatch) {
          const newQty = Math.max(0, prod.stock - cartMatch.quantity);
          const log: StockLog = {
            id: `log-${Date.now()}-${prod.id}`,
            productId: prod.id,
            productName: prod.name,
            companyId: currentCompId,
            companyCode: currentCompCode,
            type: 'sale',
            quantity: cartMatch.quantity,
            previousStock: prod.stock,
            newStock: newQty,
            reason: `Vente #${receiptNum}`,
            timestamp,
            recordedBy: currentUser?.displayName || settings.cashierName || currentUser?.email?.split('@')[0] || 'Caissier',
          };
          newLogs.push(log);

          // Save stock log to Firestore
          setDoc(doc(db, 'stockLogs', log.id), cleanForFirestore(log)).catch(err => {
            handleFirestoreError(err, OperationType.WRITE, `stockLogs/${log.id}`);
          });

          return { ...prod, stock: newQty };
        }
        return prod;
      });

      if (newLogs.length > 0) {
        setRawStockLogs(prev => [...newLogs, ...prev]);
      }

      return updated;
    });

    // Save sale to high-capacity 3GB offline vault
    storeInVault('sales_vault', newSale).catch(() => {});

    // Record sale in Firestore & local state
    setRawSales(prev => [newSale, ...prev]);
    setDoc(doc(db, 'sales', newSale.id), cleanForFirestore(newSale)).catch(err => {
      handleFirestoreError(err, OperationType.WRITE, `sales/${newSale.id}`);
    });

    // Update product stock in Firestore & trigger throttled alerts if low
    cart.forEach(item => {
      const prod = products.find(p => p.id === item.product.id);
      if (prod) {
        const newQty = Math.max(0, prod.stock - item.quantity);
        setDoc(doc(db, 'products', prod.id), cleanForFirestore({ ...prod, stock: newQty })).catch(err => {
          handleFirestoreError(err, OperationType.WRITE, `products/${prod.id}`);
        });

        if (newQty <= 0) {
          sendSmartNotification({
            id: `out-stock-${prod.id}`,
            title: `Rupture de Stock : ${prod.name}`,
            message: `Le stock de ${prod.name} est maintenant à 0 ${prod.unit}(s).`,
            type: 'error',
          });
        } else if (newQty <= prod.minStockAlert) {
          sendSmartNotification({
            id: `low-stock-${prod.id}`,
            title: `Stock Faible : ${prod.name}`,
            message: `Il ne reste que ${newQty} ${prod.unit}(s) en réserve.`,
            type: 'warning',
          });
        }
      }
    });

    // Remove paid table tab from Firestore if applicable
    const paidTab = tabs.find(t => t.tableName.toLowerCase() === tableName.toLowerCase());
    if (paidTab) {
      deleteDoc(doc(db, 'tabs', paidTab.id)).catch(err => {
        handleFirestoreError(err, OperationType.DELETE, `tabs/${paidTab.id}`);
      });
    }

    // Handle offline sync queueing / online server dispatch
    if (isOffline) {
      const queueItem: OfflineSyncQueueItem = {
        id: newSale.id,
        type: 'sale',
        saleData: newSale,
        createdOfflineAt: timestamp,
        status: 'pending',
      };
      setOfflineQueue(prev => [queueItem, ...prev]);
      sendSmartNotification({
        id: `sale-off-${newSale.id}`,
        title: 'Vente Hors-Ligne Validée',
        message: `Ticket #${receiptNum} enregistré en local (Coffre Illimité actif).`,
        type: 'info',
      });
    } else {
      fetch('/api/sync-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sales: [newSale], deviceId: 'pos-terminal-1' })
      }).catch(err => {
        console.warn("Direct server POST failed, fallback to offline queue:", err);
        const queueItem: OfflineSyncQueueItem = {
          id: newSale.id,
          type: 'sale',
          saleData: { ...newSale, syncStatus: 'pending' },
          createdOfflineAt: timestamp,
          status: 'pending',
        };
        setOfflineQueue(prev => [queueItem, ...prev]);
      });
    }

    // Clear cart and reset table tab if open
    clearCart();
    setRawTabs(prev => prev.filter(tab => tab.tableName.toLowerCase() !== tableName.toLowerCase()));

    return newSale;
  };

  const deleteSale = async (saleId: string) => {
    const saleToDelete = sales.find(s => s.id === saleId);
    if (!saleToDelete) return;

    setRawSales(prev => prev.filter(s => s.id !== saleId));
    await deleteDoc(doc(db, 'sales', saleId));
    
    await addAuditLog(
      'sale_deleted',
      `Suppression de la vente #${saleToDelete.receiptNumber} d'un montant de ${saleToDelete.total} ${settings.currency}.`,
      { sale: saleToDelete }
    );
  };

  // Category CRUD
  const addCategory = (categoryData: Omit<CategoryItem, 'id'>) => {
    const currentCompId = activeCompany?.id || currentUser?.companyId || 'comp_lmd88412';
    const currentCompCode = activeCompany?.code || currentUser?.companyCode || 'LMD88412';
    const newCategory: CategoryItem = {
      ...categoryData,
      id: `cat-${Date.now()}`,
      companyId: currentCompId,
      companyCode: currentCompCode,
    };
    setRawCategories(prev => [...prev, newCategory]);
    setDoc(doc(db, 'categories', newCategory.id), cleanForFirestore(newCategory)).catch(err => {
      handleFirestoreError(err, OperationType.WRITE, `categories/${newCategory.id}`);
    });
    addAuditLog('settings_updated', `Nouvelle catégorie créée : ${newCategory.name}`);
  };

  const updateCategory = (id: string, updates: Partial<CategoryItem>) => {
    setRawCategories(prev => {
      const updated = prev.map(c => (c.id === id ? { ...c, ...updates } : c));
      const target = updated.find(c => c.id === id);
      if (target) {
        setDoc(doc(db, 'categories', id), cleanForFirestore(target)).catch(err => {
          handleFirestoreError(err, OperationType.WRITE, `categories/${id}`);
        });
      }
      return updated;
    });
  };

  const deleteCategory = (id: string) => {
    const target = categories.find(c => c.id === id);
    if (!target) return;
    setRawCategories(prev => prev.filter(c => c.id !== id));
    deleteDoc(doc(db, 'categories', id)).catch(err => {
      handleFirestoreError(err, OperationType.DELETE, `categories/${id}`);
    });
    addAuditLog('settings_updated', `Suppression de la catégorie : ${target.name}`);
  };

  // Products CRUD & Fast Single-Time Product Addition ("entrer en une seule fois")
  const addProduct = (productData: Omit<Product, 'id'>): Product => {
    const currentCompId = activeCompany?.id || currentUser?.companyId || 'comp_lmd88412';
    const currentCompCode = activeCompany?.code || currentUser?.companyCode || 'LMD88412';
    const newProduct: Product = {
      ...productData,
      id: `prod-${Date.now()}`,
      companyId: currentCompId,
      companyCode: currentCompCode,
      active: true,
    };

    setRawProducts(prev => [newProduct, ...prev]);
    setDoc(doc(db, 'products', newProduct.id), cleanForFirestore(newProduct)).catch(err => {
      handleFirestoreError(err, OperationType.WRITE, `products/${newProduct.id}`);
    });

    // Log stock intake
    const newLog: StockLog = {
      id: `log-${Date.now()}`,
      productId: newProduct.id,
      productName: newProduct.name,
      companyId: currentCompId,
      companyCode: currentCompCode,
      type: 'in',
      quantity: newProduct.stock,
      previousStock: 0,
      newStock: newProduct.stock,
      reason: 'Création produit / Stock initial',
      timestamp: new Date().toISOString(),
      recordedBy: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Gérant',
    };
    setRawStockLogs(prev => [newLog, ...prev]);
    setDoc(doc(db, 'stockLogs', newLog.id), cleanForFirestore(newLog)).catch(err => {
      handleFirestoreError(err, OperationType.WRITE, `stockLogs/${newLog.id}`);
    });

    addAuditLog(
      'product_created',
      `Nouveau produit ajouté : ${newProduct.name} (Stock initial: ${newProduct.stock}).`
    );

    return newProduct;
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    const original = rawProducts.find(p => p.id === id);
    if (!original) return;

    const updatedProduct: Product = {
      ...original,
      ...updates,
      active: updates.active !== undefined ? updates.active : (original.active !== undefined ? original.active : true),
    };

    setRawProducts(prev => prev.map(p => (p.id === id ? updatedProduct : p)));
    
    setDoc(doc(db, 'products', id), cleanForFirestore(updatedProduct)).catch(err => {
      handleFirestoreError(err, OperationType.WRITE, `products/${id}`);
    });

    if (updates.price !== undefined && updates.price !== original.price) {
      addAuditLog(
        'price_change',
        `Changement de prix pour ${original.name} : ${original.price} -> ${updates.price} ${settings.currency}.`
      );
    } else if (updates.stock !== undefined && updates.stock !== original.stock) {
       addAuditLog(
        'stock_adjusted',
        `Ajustement manuel du stock pour ${original.name} : ${original.stock} -> ${updates.stock}.`
      );
    } else {
      addAuditLog(
        'product_updated',
        `Mise à jour du produit ${original.name}${updates.name && updates.name !== original.name ? ` -> ${updates.name}` : ''}.`
      );
    }
  };

  const deleteProduct = (id: string) => {
    const productToDelete = rawProducts.find(p => p.id === id);
    setRawProducts(prev => prev.filter(p => p.id !== id));
    deleteDoc(doc(db, 'products', id)).catch(err => {
      handleFirestoreError(err, OperationType.DELETE, `products/${id}`);
    });

    if (productToDelete) {
      addAuditLog(
        'product_deleted',
        `Suppression du produit ${productToDelete.name} du catalogue.`
      );
    }
  };

  const restockProduct = (productId: string, quantityToAdd: number, reason: string) => {
    const product = rawProducts.find(p => p.id === productId);
    if (!product) return;

    const previousStock = product.stock;
    const newStock = previousStock + quantityToAdd;

    updateProduct(productId, { stock: newStock });

    const recorder = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Gérant';
    const currentCompId = activeCompany?.id || currentUser?.companyId || 'comp_lmd88412';
    const currentCompCode = activeCompany?.code || currentUser?.companyCode || 'LMD88412';
    const newLog: StockLog = {
      id: `log-${Date.now()}`,
      productId,
      productName: product.name,
      companyId: currentCompId,
      companyCode: currentCompCode,
      type: quantityToAdd >= 0 ? 'in' : 'spill_loss',
      quantity: Math.abs(quantityToAdd),
      previousStock,
      newStock,
      reason: reason || (quantityToAdd >= 0 ? 'Réapprovisionnement' : 'Ajustement'),
      timestamp: new Date().toISOString(),
      recordedBy: recorder,
    };

    setRawStockLogs(prev => [newLog, ...prev]);
    setDoc(doc(db, 'stockLogs', newLog.id), cleanForFirestore(newLog)).catch(err => {
      handleFirestoreError(err, OperationType.WRITE, `stockLogs/${newLog.id}`);
    });

    addAuditLog(
      'stock_adjusted',
      `Remplissage de stock pour ${product.name} : État avant = ${previousStock}, Ajout = ${quantityToAdd >= 0 ? '+' : ''}${quantityToAdd}, Nouveau solde = ${newStock}. Motif : ${reason || 'Réapprovisionnement'}.`
    );
  };

  const performInventoryCount = (
    type: 'journalier' | 'hebdomadaire' | 'mensuel',
    counts: { productId: string; actualStock: number; notes?: string }[]
  ) => {
    const typeLabel = type === 'journalier' ? 'Journalier' : type === 'hebdomadaire' ? 'Hebdomadaire' : 'Mensuel';
    const timestamp = new Date().toISOString();
    const currentCompId = activeCompany?.id || currentUser?.companyId || 'comp_lmd88412';
    const currentCompCode = activeCompany?.code || currentUser?.companyCode || 'LMD88412';
    let adjustedItems = 0;
    let totalVarianceValue = 0;
    const newLogs: StockLog[] = [];

    setRawProducts(prevProducts => {
      return prevProducts.map(prod => {
        const match = counts.find(c => c.productId === prod.id);
        if (match !== undefined) {
          const previousStock = prod.stock;
          const newStock = Math.max(0, match.actualStock);
          const diff = newStock - previousStock;

          if (diff !== 0) {
            adjustedItems++;
            totalVarianceValue += diff * prod.price;

            const log: StockLog = {
              id: `log-${Date.now()}-${prod.id}`,
              productId: prod.id,
              productName: prod.name,
              companyId: currentCompId,
              companyCode: currentCompCode,
              type: diff > 0 ? 'in' : 'spill_loss',
              quantity: Math.abs(diff),
              previousStock,
              newStock,
              reason: `Inventaire ${typeLabel}${match.notes ? ' - ' + match.notes : ''}`,
              timestamp,
              recordedBy: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Responsable Inventaire',
            };
            newLogs.push(log);
            setDoc(doc(db, 'stockLogs', log.id), cleanForFirestore(log)).catch(err => {
              handleFirestoreError(err, OperationType.WRITE, `stockLogs/${log.id}`);
            });

            const updatedProd = { ...prod, stock: newStock };
            setDoc(doc(db, 'products', prod.id), cleanForFirestore(updatedProd)).catch(err => {
              handleFirestoreError(err, OperationType.WRITE, `products/${prod.id}`);
            });

            return updatedProd;
          }
        }
        return prod;
      });
    });

    if (newLogs.length > 0) {
      setRawStockLogs(prev => [...newLogs, ...prev]);
    }

    return {
      totalItems: counts.length,
      adjustedItems,
      totalVarianceValue,
    };
  };

  // Expenses
  const addExpense = (expenseData: Omit<Expense, 'id'>) => {
    const currentCompId = activeCompany?.id || currentUser?.companyId || 'comp_lmd88412';
    const currentCompCode = activeCompany?.code || currentUser?.companyCode || 'LMD88412';
    const recorder = expenseData.recordedBy || currentUser?.displayName || settings.cashierName || currentUser?.email?.split('@')[0] || 'Caissier';
    const newExpense: Expense = {
      ...expenseData,
      id: `exp-${Date.now()}`,
      companyId: currentCompId,
      companyCode: currentCompCode,
      recordedBy: recorder,
    };
    setRawExpenses(prev => [newExpense, ...prev]);
    setDoc(doc(db, 'expenses', newExpense.id), cleanForFirestore(newExpense)).catch(err => {
      handleFirestoreError(err, OperationType.WRITE, `expenses/${newExpense.id}`);
    });
  };

  const deleteExpense = (id: string) => {
    setRawExpenses(prev => prev.filter(e => e.id !== id));
    deleteDoc(doc(db, 'expenses', id)).catch(err => {
      handleFirestoreError(err, OperationType.DELETE, `expenses/${id}`);
    });
  };

  // Tabs management
  const saveTabToTable = (tableName: string) => {
    if (cart.length === 0) return;

    const now = new Date().toISOString();
    const currentCompId = activeCompany?.id || currentUser?.companyId || 'comp_lmd88412';
    const currentCompCode = activeCompany?.code || currentUser?.companyCode || 'LMD88412';
    let tabToSave: BarTab | null = null;

    setRawTabs(prev => {
      const existing = prev.find(t => t.tableName.toLowerCase() === tableName.toLowerCase() && (t.companyId === currentCompId || !t.companyId));
      if (existing) {
        tabToSave = { ...existing, items: [...cart], updatedAt: now, companyId: currentCompId, companyCode: currentCompCode };
        return prev.map(t => (t.id === existing.id ? tabToSave! : t));
      } else {
        tabToSave = {
          id: `tab-${Date.now()}`,
          tableName,
          companyId: currentCompId,
          companyCode: currentCompCode,
          items: [...cart],
          createdAt: now,
          updatedAt: now,
          status: 'open',
        };
        return [...prev, tabToSave!];
      }
    });

    if (tabToSave) {
      setDoc(doc(db, 'tabs', (tabToSave as BarTab).id), cleanForFirestore(tabToSave as BarTab)).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, `tabs/${(tabToSave as BarTab).id}`);
      });
    }

    clearCart();
  };

  const loadTabToCart = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
      setCart(tab.items);
      setActiveTable(tab.tableName);
      setActiveTab('pos');
    }
  };

  const deleteTab = (tabId: string) => {
    setRawTabs(prev => prev.filter(t => t.id !== tabId));
    deleteDoc(doc(db, 'tabs', tabId)).catch(err => {
      handleFirestoreError(err, OperationType.DELETE, `tabs/${tabId}`);
    });
  };

  const updateSettings = (newSettings: Partial<BarSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      setDoc(doc(db, 'settings', 'bar_settings'), cleanForFirestore(updated)).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, 'settings/bar_settings');
      });
      return updated;
    });

    if (activeCompany) {
      const compUpdates: Partial<Company> = {};
      if (newSettings.barName) compUpdates.name = newSettings.barName;
      if (newSettings.cashierName) compUpdates.cashierName = newSettings.cashierName;
      if (newSettings.customRoleLabels) compUpdates.customRoleLabels = newSettings.customRoleLabels;
      if (newSettings.tagline !== undefined) compUpdates.tagline = newSettings.tagline;
      if (newSettings.phone !== undefined) compUpdates.phone = newSettings.phone;
      if (newSettings.address !== undefined) compUpdates.address = newSettings.address;
      if (newSettings.taxRate !== undefined) compUpdates.taxRate = newSettings.taxRate;
      if (newSettings.currency) compUpdates.currency = newSettings.currency;
      if (newSettings.businessSector) compUpdates.businessSector = newSettings.businessSector;
      if (newSettings.businessSectorName) compUpdates.businessSectorName = newSettings.businessSectorName;

      if (Object.keys(compUpdates).length > 0) {
        setCompanies(prev => prev.map(c => c.id === activeCompany.id ? { ...c, ...compUpdates } : c));
        setDoc(doc(db, 'companies', activeCompany.id), cleanForFirestore(compUpdates), { merge: true }).catch(() => {});
        
        if (compUpdates.name && currentUser && currentUser.companyId === activeCompany.id) {
          const updatedUser: AppUser = { ...currentUser, companyName: compUpdates.name };
          setCurrentUser(updatedUser);
          safeSetItem(STORAGE_KEYS.CACHED_USER, JSON.stringify(updatedUser));
        }
      }
    }

    addAuditLog(
      'settings_updated',
      `Mise à jour des paramètres de l'établissement.`
    );
  };

  const applyBusinessSectorPreset = async (sectorId: BusinessSector, replaceCatalog: boolean = false) => {
    const preset = SECTOR_PRESETS[sectorId];
    if (!preset) return;
    const currentCompId = activeCompany?.id || currentUser?.companyId || 'comp_lmd88412';
    const currentCompCode = activeCompany?.code || currentUser?.companyCode || 'LMD88412';

    // Update settings
    await updateSettings({
      businessSector: sectorId,
      businessSectorName: preset.name,
    });

    if (activeCompany) {
      await updateCompany(activeCompany.id, {
        businessSector: sectorId,
        businessSectorName: preset.name,
      });
    }

    if (replaceCatalog) {
      // 1. Replace company categories
      const companyCatIds = rawCategories.filter(c => c.companyId === currentCompId).map(c => c.id);
      for (const cid of companyCatIds) {
        await deleteDoc(doc(db, 'categories', cid)).catch(() => {});
      }
      const newCategories: CategoryItem[] = preset.suggestedCategories.map((cat, idx) => ({
        ...cat,
        id: `cat-${sectorId}-${currentCompCode.toLowerCase()}-${idx}`,
        companyId: currentCompId,
        companyCode: currentCompCode,
      }));
      for (const cat of newCategories) {
        await setDoc(doc(db, 'categories', cat.id), cleanForFirestore(cat));
      }
      setRawCategories(prev => [...prev.filter(c => c.companyId !== currentCompId), ...newCategories]);

      // 2. Replace company products
      const companyProdIds = rawProducts.filter(p => p.companyId === currentCompId).map(p => p.id);
      for (const pid of companyProdIds) {
        await deleteDoc(doc(db, 'products', pid)).catch(() => {});
      }
      const newProducts: Product[] = preset.starterProducts.map((p, idx) => ({
        ...p,
        id: `prod-${sectorId}-${currentCompCode.toLowerCase()}-${Date.now()}-${idx}`,
        companyId: currentCompId,
        companyCode: currentCompCode,
      }));
      for (const prod of newProducts) {
        await setDoc(doc(db, 'products', prod.id), cleanForFirestore(prod));
      }
      setRawProducts(prev => [...prev.filter(p => p.companyId !== currentCompId), ...newProducts]);
    } else {
      // Merge categories if not existing
      const existingCatNames = new Set(categories.map(c => c.name.toLowerCase()));
      const categoriesToAdd = preset.suggestedCategories
        .filter(c => !existingCatNames.has(c.name.toLowerCase()))
        .map((cat, idx) => ({
          ...cat,
          id: `cat-${sectorId}-${currentCompCode.toLowerCase()}-${Date.now()}-${idx}`,
          companyId: currentCompId,
          companyCode: currentCompCode,
        }));
      if (categoriesToAdd.length > 0) {
        for (const cat of categoriesToAdd) {
          await setDoc(doc(db, 'categories', cat.id), cleanForFirestore(cat));
        }
        setRawCategories(prev => [...prev, ...categoriesToAdd]);
      }

      // Merge starter products if not existing
      const existingProdNames = new Set(products.map(p => p.name.toLowerCase()));
      const productsToAdd: Product[] = preset.starterProducts
        .filter(p => !existingProdNames.has(p.name.toLowerCase()))
        .map((p, idx) => ({
          ...p,
          id: `prod-${sectorId}-${currentCompCode.toLowerCase()}-${Date.now()}-${idx}`,
          companyId: currentCompId,
          companyCode: currentCompCode,
        }));

      if (productsToAdd.length > 0) {
        for (const prod of productsToAdd) {
          await setDoc(doc(db, 'products', prod.id), cleanForFirestore(prod));
        }
        setRawProducts(prev => [...prev, ...productsToAdd]);
      }
    }

    await addAuditLog(
      'settings_updated',
      `Secteur d'activité configuré : ${preset.name} (${replaceCatalog ? 'Catalogue remplacé' : 'Catalogue fusionné'}).`
    );
  };

  const closePeriod = async () => {
    const now = new Date().toISOString();
    await updateSettings({ lastPeriodClose: now });
    
    await addAuditLog(
      'period_closed',
      `Clôture officielle de la période comptable effectuée le ${new Date().toLocaleString()}.`
    );
  };

  // Safe Data Clear & Reset - Leaves user accounts & credentials strictly untouched!
  const clearAndResetData = async (mode: 'transactions_only' | 'complete_reset') => {
    try {
      const currentCompId = activeCompany?.id || currentUser?.companyId || 'comp_lmd88412';

      // 1. Delete company sales from Firestore
      const companySales = rawSales.filter(s => s.companyId === currentCompId || (!s.companyId && currentCompId === 'comp_lmd88412'));
      await Promise.all(companySales.map(s => deleteDoc(doc(db, 'sales', s.id))));
      setRawSales(prev => prev.filter(s => s.companyId !== currentCompId && (s.companyId || currentCompId !== 'comp_lmd88412')));

      // 2. Delete company expenses from Firestore
      const companyExp = rawExpenses.filter(e => e.companyId === currentCompId || (!e.companyId && currentCompId === 'comp_lmd88412'));
      await Promise.all(companyExp.map(e => deleteDoc(doc(db, 'expenses', e.id))));
      setRawExpenses(prev => prev.filter(e => e.companyId !== currentCompId && (e.companyId || currentCompId !== 'comp_lmd88412')));

      // 3. Delete company tabs from Firestore
      const companyTabs = rawTabs.filter(t => t.companyId === currentCompId || (!t.companyId && currentCompId === 'comp_lmd88412'));
      await Promise.all(companyTabs.map(t => deleteDoc(doc(db, 'tabs', t.id))));
      setRawTabs(prev => prev.filter(t => t.companyId !== currentCompId && (t.companyId || currentCompId !== 'comp_lmd88412')));

      // 4. Delete company stock logs from Firestore
      const companyLogs = rawStockLogs.filter(l => l.companyId === currentCompId || (!l.companyId && currentCompId === 'comp_lmd88412'));
      await Promise.all(companyLogs.map(l => deleteDoc(doc(db, 'stockLogs', l.id))));
      setRawStockLogs(prev => prev.filter(l => l.companyId !== currentCompId && (l.companyId || currentCompId !== 'comp_lmd88412')));

      // 5. Delete audit logs
      const auditSnap = await getDocs(collection(db, 'auditLogs'));
      await Promise.all(auditSnap.docs.map(d => deleteDoc(d.ref)));

      // 6. Handle Products & Categories for complete reset
      if (mode === 'complete_reset') {
        const companyProd = rawProducts.filter(p => p.companyId === currentCompId || (!p.companyId && currentCompId === 'comp_lmd88412'));
        await Promise.all(companyProd.map(p => deleteDoc(doc(db, 'products', p.id))));
        setRawProducts(prev => prev.filter(p => p.companyId !== currentCompId && (p.companyId || currentCompId !== 'comp_lmd88412')));
      }

      // 7. Clear cart & local storage cache
      setCart([]);

      // 8. Log the reset action (user accounts in /users are 100% PRESERVED)
      await addAuditLog(
        'settings_updated',
        `Purge des données effectuée pour l'établissement (${mode === 'complete_reset' ? 'Réinitialisation Totale' : 'Purge Opérationnelle'}). Tous les comptes utilisateurs et accès sont conservés.`
      );
    } catch (err: any) {
      console.error("Erreur lors de la purge des données:", err);
      throw err;
    }
  };

  const resetToDefaults = () => {
    clearAndResetData('complete_reset');
  };

  const exportBackup = () => {
    const data = {
      products,
      sales,
      expenses,
      tabs,
      settings,
      stockLogs,
      exportedAt: new Date().toISOString(),
    };
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BarExpress_Sauvegarde_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importBackup = (jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.products && Array.isArray(parsed.products)) {
        setRawProducts(parsed.products);
        if (parsed.sales) setRawSales(parsed.sales);
        if (parsed.expenses) setRawExpenses(parsed.expenses);
        if (parsed.tabs) setRawTabs(parsed.tabs);
        if (parsed.settings) setSettings(parsed.settings);
        if (parsed.stockLogs) setRawStockLogs(parsed.stockLogs);
        alert("Sauvegarde importée avec succès !");
        return true;
      }
      return false;
    } catch {
      alert("Erreur lors de la lecture du fichier de sauvegarde JSON.");
      return false;
    }
  };

  return (
    <BarContext.Provider
      value={{
        products,
        categories,
        addCategory,
        updateCategory,
        deleteCategory,
        cart,
        sales,
        expenses,
        tabs,
        settings,
        activeTab,
        setActiveTab,
        selectedCategory,
        setSelectedCategory,
        searchQuery,
        setSearchQuery,
        activeTable,
        setActiveTable,
        stockLogs,
        auditLogs,
        companies,
        activeCompany,
        superAdminAssociatedCompany,
        canAccessCompanySpace,
        preRegistrations,
        isImpersonating,
        impersonatedCompanyId,
        platformStats,
        createCompany,
        updateCompany,
        toggleCompanyStatus,
        deleteCompany,
        switchCompanySpace,
        verifyCompanyCode,
        preRegisterEmployee,
        updatePreRegistration,
        deletePreRegistration,
        loginWithCompanyCodeAndGoogle,
        loginWithPin,
        currentUser,
        allUsers,
        authLoading,
        loginWithGoogle,
        loginAsDemo,
        logout,
        approveUser,
        rejectUser,
        suspendUser,
        reactivateUser,
        addUserByEmail,
        updateUserPermissions,
        updateUserProfileName,
        deleteUserAccount,
        isSuperAdmin,
        isAdmin,
        isOnline,
        isServerReachable,
        offlineQueue,
        lastSyncedAt,
        isSyncing,
        syncOfflineData,
        clearOfflineQueue,
        addToCart,
        updateCartItemQuantity,
        updateCartItemUnitPrice,
        updateCartItemFlavor,
        applyCartItemDiscount,
        removeFromCart,
        clearCart,
        cartSubtotal,
        cartDiscountTotal,
        cartTotal,
        processCheckout,
        deleteSale,
        addProduct,
        updateProduct,
        deleteProduct,
        restockProduct,
        performInventoryCount,
        addExpense,
        deleteExpense,
        saveTabToTable,
        loadTabToCart,
        deleteTab,
        updateSettings,
        applyBusinessSectorPreset,
        closePeriod,
        resetToDefaults,
        clearAndResetData,
        exportBackup,
        importBackup,
        manualPaymentMethods,
        manualPaymentProofs,
        updateManualPaymentMethod,
        submitManualPaymentProof,
        approveManualPaymentProof,
        disapproveManualPaymentProof,
        registerNewCompanyWithTrial,
        requestJoinCompanyWithCode,
        activeCompanyTrialInfo,
        isUnassociatedUser,
      }}
    >
      {children}
    </BarContext.Provider>
  );
};

export const useBar = () => {
  const context = useContext(BarContext);
  if (!context) {
    throw new Error('useBar doit être utilisé à l\'intérieur d\'un BarProvider');
  }
  return context;
};
