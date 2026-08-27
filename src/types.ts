export type Category = string;

export interface CategoryItem {
  id: string;
  name: string;
  icon: string;
  color?: string;
  bgLight?: string;
}

export interface Product {
  id: string;
  name: string;
  category: Category;
  price: number; // Prix de vente (Gourdes HTG)
  costPrice: number; // Coût d'achat
  stock: number; // Quantité en stock
  minStockAlert: number; // Seuil d'alerte stock
  unit: string; // 'Bouteille', 'Cannette', 'Verre', 'Plat', 'Portion', 'Kg', 'Pièce', etc.
  varietyLabel?: string; // Nom de la variété personnalisé (ex: 'Saveur', 'Parfum', 'Taille', 'Pointure', 'Couleur', 'Format', 'Arôme', 'Modèle')
  varietyOptions?: string[]; // Options de variantes (ex: ['S', 'M', 'L'], ['Double Pomme', 'Menthe'], ['Rouge', 'Bleu'])
  iconName?: string;
  color?: string;
  image?: string;
  barcode?: string;
  flavors?: string[]; // Rétrocompatibilité pour les parfums/arômes
  isService?: boolean; // Indique si c'est une prestation/service (ex: saisie de document, impression, lavage)
  active: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
  discount: number; // Montant de remise sur cet article
  note?: string;
  selectedFlavor?: string; // Parfum / déclinaison sélectionné (rétrocompatible)
  selectedVariety?: string; // Variante / Déclinaison sélectionnée
}

export type PaymentMethod = 'Espèces' | 'MonCash' | 'Carte' | 'Crédit Client';

export interface Sale {
  id: string;
  receiptNumber: string;
  items: CartItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  amountPaid: number;
  changeGiven: number;
  paymentMethod: PaymentMethod;
  tableName?: string;
  cashierName: string;
  timestamp: string; // ISO date string
  status: 'completed' | 'refunded' | 'cancelled';
  companyCode?: string;
  companyId?: string;
  offlineCreated?: boolean;
  syncStatus?: 'synced' | 'pending' | 'failed';
  syncedAt?: string;
}

export interface OfflineSyncQueueItem {
  id: string;
  type: 'sale' | 'expense' | 'stock_log';
  saleData?: Sale;
  expenseData?: Expense;
  createdOfflineAt: string;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  errorMessage?: string;
  retryCount?: number;
}

export interface NetworkStatus {
  isOnline: boolean;
  isServerReachable: boolean;
  pendingCount: number;
  lastSyncedAt: string | null;
  isSyncing: boolean;
}

export interface Expense {
  id: string;
  category: 'Approvisionnement' | 'Électricité & Eau' | 'Salaires' | 'Glaçons' | 'Entretien' | 'Autre';
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD
  paymentMethod: PaymentMethod;
  supplier?: string;
  recordedBy: string;
}

export interface BarTab {
  id: string;
  tableName: string; // e.g. "Table 1", "Bar Principal", "VIP 2"
  items: CartItem[];
  createdAt: string;
  updatedAt: string;
  customerName?: string;
  status: 'open' | 'paid';
}

export interface StockLog {
  id: string;
  productId: string;
  productName: string;
  type: 'in' | 'out' | 'sale' | 'spill_loss';
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  timestamp: string;
  recordedBy?: string;
}

export type AuditAction = 
  | 'user_approved' 
  | 'user_rejected' 
  | 'user_suspended' 
  | 'user_reactivated'
  | 'user_deleted' 
  | 'user_updated'
  | 'permissions_updated'
  | 'product_created'
  | 'product_updated'
  | 'product_deleted'
  | 'price_change'
  | 'stock_adjusted'
  | 'settings_updated'
  | 'sale_deleted'
  | 'period_closed'
  | 'company_created'
  | 'company_updated'
  | 'company_suspended'
  | 'company_reactivated'
  | 'company_deleted'
  | 'company_switched'
  | 'subscription_updated'
  | 'platform_pricing_updated'
  | 'employee_preregistered'
  | 'employee_claimed';

export type SubscriptionBillingCycle = 'monthly' | 'annual' | 'lifetime' | 'custom';
export type SubscriptionStatus = 'active' | 'trial' | 'expired' | 'lifetime' | 'suspended';

export interface QuotaFeePolicy {
  chargeOverage: boolean; // Si true: facture des frais supplémentaires lors du dépassement de quota
  maxTransactionsPerMonth: number; // Ex: 5000 tickets inclus
  maxAiQueriesPerMonth: number; // Ex: 500 requêtes IA incluses
  overageFeePer1000Tx: number; // Ex: 5 USD par tranche de 1000 tickets supplémentaires
  overageFeePer100AiQueries: number; // Ex: 2 USD par tranche de 100 requêtes IA supplémentaires
}

export interface CompanySubscription {
  planType: SubscriptionBillingCycle; // 'monthly' | 'annual' | 'lifetime' | 'custom'
  status: SubscriptionStatus; // 'active' | 'trial' | 'expired' | 'lifetime' | 'suspended'
  customPrice: number; // Prix personnalisé fixé par le Super Admin (ex: 100 pour annuel, 15 pour mensuel, 450 pour lifetime, ou tarif spécial)
  currency: string; // 'USD' par défaut
  startDate: string; // ISO date
  expiryDate?: string; // ISO date (laissé vide pour un forfait lifetime)
  autoRenew: boolean;
  paymentMethod?: string;
  notes?: string;
  quotaPolicy: QuotaFeePolicy; // Politique de quota spécifique à l'établissement
}

export interface PlatformBillingSettings {
  defaultAnnualPrice: number; // Prix annuel de base (ex: 100 USD/an)
  defaultMonthlyPrice: number; // Prix mensuel de base (ex: 15 USD/mois)
  defaultLifetimePrice: number; // Prix à vie de base (ex: 450 USD à vie)
  currency: string; // 'USD' par défaut
  availablePlans: {
    monthly: boolean;
    annual: boolean;
    lifetime: boolean;
  };
  globalQuotaPolicy: QuotaFeePolicy;
}

export interface StaffPinConfig {
  id: string;
  name: string;
  pin: string;
  role: 'admin' | 'manager' | 'employee';
  active: boolean;
  assignedCashier?: string;
  permissions?: UserPermissions;
}

export type BusinessSector = 
  | 'bar_restaurant' 
  | 'gas_station' 
  | 'print_cyber' 
  | 'stationery_bookstore' 
  | 'general_retail';

export interface Company {
  id: string;
  code: string; // 8-character unique uppercase code (e.g. BAR78901, LMD88412, HAV44921)
  name: string;
  managerName: string;
  adminEmail: string;
  phone: string;
  currency: string; // Default: 'G' | 'HTG' | 'USD' | 'EUR' | 'XOF'
  status: 'active' | 'suspended';
  createdAt: string;
  businessSector?: BusinessSector;
  businessSectorName?: string;
  rcNumber?: string; // Registre de Commerce
  logo?: string;
  address?: string;
  tagline?: string;
  taxRate?: number;
  cashierName?: string;
  nifCif?: string;
  autoApprovePreRegistered?: boolean;
  staffPins?: StaffPinConfig[];
  subscription?: CompanySubscription;
  stats?: {
    totalSalesAmount?: number;
    totalTransactions?: number;
    totalEmployees?: number;
    totalProducts?: number;
    aiRequestsCount?: number;
    aiTokensConsumed?: number;
    dbDocumentCount?: number;
    dbStorageKb?: number;
    lastActiveAt?: string;
  };
}

export interface PreRegisteredEmployee {
  id: string;
  companyId: string;
  companyCode: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'employee';
  pinCode?: string; // 4 or 6 digit PIN code for rapid POS access
  permissions: UserPermissions;
  status: 'pre_registered' | 'claimed' | 'suspended';
  createdAt: string;
  claimedByUid?: string;
  claimedAt?: string;
}

export interface AuditLog {
  id: string;
  action: AuditAction;
  details: string;
  userId: string;
  userName: string;
  userEmail: string;
  timestamp: string;
  metadata?: any;
}

export interface BarSettings {
  barName: string;
  tagline: string;
  address: string;
  phone: string;
  currency: string; // Default: 'G' or 'HTG'
  taxRate: number; // Default: 0% or 10%
  cashierName: string;
  enableStockAlerts: boolean;
  businessSector?: BusinessSector;
  businessSectorName?: string;
  rcNumber?: string; // Registre de Commerce (RC)
  logo?: string; // Data URL or Image URL for company logo
  nifCif?: string; // Numéro NIF/Patente entreprise (DGI)
  majorTransactionThreshold?: number; // Seuil pour confirmation de transaction majeure (ex: 2500 G)
  lastPeriodClose?: string; // ISO Date of the last official closure
  registrationMode?: 'approval_required' | 'whitelist_only'; // Mode de contrôle des inscriptions
  companyCode?: string;
  customUnits?: string[]; // Liste des unités personnalisées pour l'établissement
  defaultVarietyLabel?: string; // Libellé de déclinaison par défaut (ex: 'Saveur / Parfum', 'Taille / Format', etc.)
  
  // Configuration IA Dona & Clé API
  enableDonaChat?: boolean; // Activer/Désactiver l'assistant IA
  enableDonaWebSearch?: boolean; // Activer la recherche Google en direct
  enableDonaVoice?: boolean; // Activer le micro & la synthèse vocale
  customGeminiApiKey?: string; // Clé API Gemini personnalisée de l'établissement
  donaCustomInstructions?: string; // Instructions & directives spécifiques du bar
  donaAccessMode?: 'all' | 'admins_only' | 'custom'; // Politique d'accès par défaut

  // Configuration Abonnements & Quotas Plateforme (Super Admin)
  platformBilling?: PlatformBillingSettings;
}

export type SmartAlertType = 
  | 'critical_stockout' 
  | 'low_stock' 
  | 'reorder_recommendation' 
  | 'inventory_discrepancy' 
  | 'slow_moving' 
  | 'count_due';

export interface SmartAlert {
  id: string;
  type: SmartAlertType;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  productId?: string;
  productName?: string;
  suggestedAction: string;
  actionType: 'restock' | 'inventory' | 'review' | 'dismiss';
  suggestedQuantity?: number;
  createdAt: string;
}

export type EnterpriseReportType = 
  | 'consolidated_financial' 
  | 'tax_compliance_dgi'
  | 'bank_credit_statement'
  | 'profitability_margins'
  | 'weekly_sales_trends'
  | 'inventory_perpetual' 
  | 'z_close_cashier' 
  | 'expenses_procurement' 
  | 'sales_analytics';

export interface ReportCustomization {
  reportType: EnterpriseReportType;
  period: 'today' | 'yesterday' | '7days' | 'month' | 'last_month' | 'quarter' | 'year' | 'last_year' | 'all_time' | 'custom';
  startDate?: string;
  endDate?: string;
  includeLogo: boolean;
  includeManagerNotes: boolean;
  managerNotes?: string;
  includeSignatures: boolean;
  printFormat: 'a4' | 'receipt';
  targetEntity?: 'internal' | 'state_dgi' | 'bank' | 'custom';
  recipientName?: string; // Nom de la banque (ex: Unibank, Sogebank, BNC) ou Bureau DGI
  bankAccountReference?: string; // N° de compte bancaire pour attestation
  includeIntegrityHash?: boolean; // Hachage cryptographique anti-falsification (garantie zéro hallucination)
}

export type UserRole = 'super_admin' | 'admin' | 'manager' | 'employee';
export type UserStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface ChatAttachment {
  name: string;
  mimeType: string;
  base64: string;
  size?: number;
  previewUrl?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  attachments?: ChatAttachment[];
  sources?: Array<{ title: string; uri: string }>;
  isAudioTranscription?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  messages: ChatMessage[];
}

export interface UserPermissions {
  canAccessPOS: boolean;
  canAccessStock: boolean;
  canManageStock?: boolean;
  canViewCostPrices?: boolean;
  canAccessExpenses: boolean;
  canAccessReports: boolean;
  canAccessSettings: boolean;
  canAccessChat?: boolean;
  canManageUsers?: boolean;
}

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  status: UserStatus;
  permissions: UserPermissions;
  companyId?: string;
  companyCode?: string;
  companyName?: string;
  pinCode?: string;
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
  lastLoginAt?: string;
}

export const SUPER_ADMIN_EMAIL = 'humderio569@gmail.com';

export type ActiveTab = 'pos' | 'stock' | 'expenses' | 'reports' | 'settings' | 'admin' | 'super_admin' | 'chat';
