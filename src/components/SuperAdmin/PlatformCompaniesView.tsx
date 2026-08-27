import React, { useState } from 'react';
import { useBar } from '../../context/BarContext';
import { Company, CompanySubscription, SubscriptionBillingCycle, SubscriptionStatus } from '../../types';
import {
  Building2,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  ShieldCheck,
  TrendingUp,
  Receipt,
  Users,
  Phone,
  Mail,
  DollarSign,
  AlertTriangle,
  Trash2,
  Edit2,
  Shield,
  Lock,
  Layers,
  Database,
  CreditCard,
  Calendar,
  Clock,
  Infinity as InfinityIcon,
  Zap,
  Sliders,
  Sparkles
} from 'lucide-react';

export const PlatformCompaniesView: React.FC = () => {
  const {
    companies,
    sales,
    platformStats,
    createCompany,
    updateCompany,
    toggleCompanyStatus,
    deleteCompany,
    switchCompanySpace,
    canAccessCompanySpace,
    superAdminAssociatedCompany,
    settings,
  } = useBar();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // General Form State
  const [formName, setFormName] = useState('');
  const [formManager, setFormManager] = useState('');
  const [formAdminEmail, setFormAdminEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formCurrency, setFormCurrency] = useState('G');
  const [formCode, setFormCode] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formTagline, setFormTagline] = useState('');
  const [formTaxRate, setFormTaxRate] = useState(0);
  const [formCashierName, setFormCashierName] = useState('Caisse Principale');
  const [formAutoApprove, setFormAutoApprove] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Subscription Configuration Form State
  const defaultAnnual = settings.platformBilling?.defaultAnnualPrice ?? 100;
  const defaultMonthly = settings.platformBilling?.defaultMonthlyPrice ?? 15;
  const defaultLifetime = settings.platformBilling?.defaultLifetimePrice ?? 450;

  const [formPlanType, setFormPlanType] = useState<SubscriptionBillingCycle>('annual');
  const [formSubPrice, setFormSubPrice] = useState<number>(defaultAnnual);
  const [formSubStatus, setFormSubStatus] = useState<SubscriptionStatus>('active');
  const [formSubStartDate, setFormSubStartDate] = useState<string>('');
  const [formSubExpiryDate, setFormSubExpiryDate] = useState<string>('');
  const [formSubAutoRenew, setFormSubAutoRenew] = useState<boolean>(true);
  const [formSubChargeOverage, setFormSubChargeOverage] = useState<boolean>(
    settings.platformBilling?.globalQuotaPolicy?.chargeOverage ?? false
  );
  const [formSubMaxTx, setFormSubMaxTx] = useState<number>(
    settings.platformBilling?.globalQuotaPolicy?.maxTransactionsPerMonth ?? 5000
  );
  const [formSubMaxAi, setFormSubMaxAi] = useState<number>(
    settings.platformBilling?.globalQuotaPolicy?.maxAiQueriesPerMonth ?? 500
  );
  const [formSubOverageFee1000Tx, setFormSubOverageFee1000Tx] = useState<number>(
    settings.platformBilling?.globalQuotaPolicy?.overageFeePer1000Tx ?? 5
  );
  const [formSubOverageFee100Ai, setFormSubOverageFee100Ai] = useState<number>(
    settings.platformBilling?.globalQuotaPolicy?.overageFeePer100AiQueries ?? 2
  );
  const [formSubNotes, setFormSubNotes] = useState<string>('');

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleOpenCreateModal = () => {
    setEditingCompany(null);
    setFormName('');
    setFormManager('');
    setFormAdminEmail('');
    setFormPhone('');
    setFormCurrency('G');
    const randomDigits = Math.floor(10000 + Math.random() * 90000);
    setFormCode(`BAR${randomDigits}`);
    setFormAddress('');
    setFormTagline('');
    setFormTaxRate(0);
    setFormCashierName('Caisse Principale');
    setFormAutoApprove(true);

    // Reset Subscription with global defaults ($100/yr annual by default)
    setFormPlanType('annual');
    setFormSubPrice(settings.platformBilling?.defaultAnnualPrice ?? 100);
    setFormSubStatus('active');
    const today = new Date().toISOString().split('T')[0];
    const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setFormSubStartDate(today);
    setFormSubExpiryDate(nextYear);
    setFormSubAutoRenew(true);
    setFormSubChargeOverage(settings.platformBilling?.globalQuotaPolicy?.chargeOverage ?? false);
    setFormSubMaxTx(settings.platformBilling?.globalQuotaPolicy?.maxTransactionsPerMonth ?? 5000);
    setFormSubMaxAi(settings.platformBilling?.globalQuotaPolicy?.maxAiQueriesPerMonth ?? 500);
    setFormSubOverageFee1000Tx(settings.platformBilling?.globalQuotaPolicy?.overageFeePer1000Tx ?? 5);
    setFormSubOverageFee100Ai(settings.platformBilling?.globalQuotaPolicy?.overageFeePer100AiQueries ?? 2);
    setFormSubNotes('');

    setFormError(null);
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (comp: Company) => {
    setEditingCompany(comp);
    setFormName(comp.name);
    setFormManager(comp.managerName);
    setFormAdminEmail(comp.adminEmail);
    setFormPhone(comp.phone);
    setFormCurrency(comp.currency);
    setFormCode(comp.code);
    setFormAddress(comp.address || '');
    setFormTagline(comp.tagline || '');
    setFormTaxRate(comp.taxRate || 0);
    setFormCashierName(comp.cashierName || 'Caisse Principale');
    setFormAutoApprove(comp.autoApprovePreRegistered !== false);

    // Populate subscription values
    const sub = comp.subscription;
    const plan = sub?.planType || 'annual';
    setFormPlanType(plan);
    setFormSubStatus(sub?.status || (comp.status === 'active' ? 'active' : 'suspended'));
    setFormSubPrice(
      sub?.customPrice ?? (plan === 'annual' ? defaultAnnual : plan === 'monthly' ? defaultMonthly : defaultLifetime)
    );
    setFormSubStartDate(sub?.startDate ? sub.startDate.split('T')[0] : comp.createdAt.split('T')[0]);
    setFormSubExpiryDate(sub?.expiryDate ? sub.expiryDate.split('T')[0] : '');
    setFormSubAutoRenew(sub?.autoRenew !== false);
    setFormSubChargeOverage(sub?.quotaPolicy?.chargeOverage ?? (settings.platformBilling?.globalQuotaPolicy?.chargeOverage ?? false));
    setFormSubMaxTx(sub?.quotaPolicy?.maxTransactionsPerMonth ?? (settings.platformBilling?.globalQuotaPolicy?.maxTransactionsPerMonth ?? 5000));
    setFormSubMaxAi(sub?.quotaPolicy?.maxAiQueriesPerMonth ?? (settings.platformBilling?.globalQuotaPolicy?.maxAiQueriesPerMonth ?? 500));
    setFormSubOverageFee1000Tx(sub?.quotaPolicy?.overageFeePer1000Tx ?? (settings.platformBilling?.globalQuotaPolicy?.overageFeePer1000Tx ?? 5));
    setFormSubOverageFee100Ai(sub?.quotaPolicy?.overageFeePer100AiQueries ?? (settings.platformBilling?.globalQuotaPolicy?.overageFeePer100AiQueries ?? 2));
    setFormSubNotes(sub?.notes || '');

    setFormError(null);
    setIsCreateModalOpen(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formName.trim()) {
      setFormError("Le nom de l'établissement est requis.");
      return;
    }
    if (!formAdminEmail.trim() || !formAdminEmail.includes('@')) {
      setFormError("L'adresse email Google de l'administrateur est requise et doit être valide.");
      return;
    }
    if (!formManager.trim()) {
      setFormError("Le nom du gérant ou responsable est requis.");
      return;
    }

    const cleanCode = formCode.trim().toUpperCase();
    if (cleanCode.length !== 8) {
      setFormError("Le code unique de l'établissement doit comporter exactement 8 caractères (ex: BAR78901).");
      return;
    }

    const existingCodeMatch = companies.find(c => c.code.toUpperCase() === cleanCode && (!editingCompany || c.id !== editingCompany.id));
    if (existingCodeMatch) {
      setFormError(`Le code "${cleanCode}" est déjà utilisé par l'établissement "${existingCodeMatch.name}".`);
      return;
    }

    const subscriptionData: CompanySubscription = {
      planType: formPlanType,
      status: formSubStatus,
      customPrice: Number(formSubPrice) || 0,
      currency: 'USD',
      startDate: formSubStartDate ? new Date(formSubStartDate).toISOString() : new Date().toISOString(),
      expiryDate: formPlanType === 'lifetime' ? undefined : (formSubExpiryDate ? new Date(formSubExpiryDate).toISOString() : undefined),
      autoRenew: formSubAutoRenew,
      quotaPolicy: {
        chargeOverage: formSubChargeOverage,
        maxTransactionsPerMonth: Number(formSubMaxTx) || 5000,
        maxAiQueriesPerMonth: Number(formSubMaxAi) || 500,
        overageFeePer1000Tx: Number(formSubOverageFee1000Tx) || 5,
        overageFeePer100AiQueries: Number(formSubOverageFee100Ai) || 2,
      },
      notes: formSubNotes.trim(),
    };

    setIsSubmitting(true);
    try {
      if (editingCompany) {
        await updateCompany(editingCompany.id, {
          name: formName.trim(),
          managerName: formManager.trim(),
          adminEmail: formAdminEmail.trim().toLowerCase(),
          phone: formPhone.trim(),
          currency: formCurrency.trim(),
          code: cleanCode,
          address: formAddress.trim(),
          tagline: formTagline.trim(),
          taxRate: formTaxRate,
          cashierName: formCashierName.trim(),
          autoApprovePreRegistered: formAutoApprove,
          subscription: subscriptionData,
          status: formSubStatus === 'suspended' ? 'suspended' : 'active',
        });
      } else {
        await createCompany({
          name: formName.trim(),
          managerName: formManager.trim(),
          adminEmail: formAdminEmail.trim().toLowerCase(),
          phone: formPhone.trim(),
          currency: formCurrency.trim(),
          code: cleanCode,
          address: formAddress.trim(),
          tagline: formTagline.trim(),
          taxRate: formTaxRate,
          cashierName: formCashierName.trim(),
          autoApprovePreRegistered: formAutoApprove,
          subscription: subscriptionData,
          status: formSubStatus === 'suspended' ? 'suspended' : 'active',
        });
      }
      setIsCreateModalOpen(false);
    } catch (err: any) {
      console.error(err);
      setFormError("Erreur lors de l'enregistrement de l'entreprise.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!companyToDelete) return;
    try {
      await deleteCompany(companyToDelete.id);
      setCompanyToDelete(null);
    } catch (err) {
      console.error("Erreur suppression:", err);
    }
  };

  const filteredCompanies = companies.filter(c => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.managerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.adminEmail.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && c.status === 'active') ||
      (statusFilter === 'suspended' && c.status === 'suspended');

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Privacy Banner */}
      <div className="p-4 bg-slate-900 border border-slate-800 text-slate-200 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-black uppercase text-amber-400 tracking-wider">
              Cloisonnement & Confidentialité des Établissements
            </p>
            <p className="text-xs text-slate-300">
              L'espace Super Admin gère exclusivement l'administration de la plateforme (entreprises, quotas, bases de données, IA globale). Les données opérationnelles de vente, caisses et stocks de chaque bar restent strictement privées.
            </p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-1 px-2.5 py-1 bg-slate-800/80 rounded-lg text-[10px] font-bold text-slate-400 shrink-0">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Isolation Multi-Tenancy</span>
        </div>
      </div>

      {/* Platform Overview Metrics */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-600" />
              Parc des Établissements Clients
            </h3>
            <p className="text-xs text-slate-500">
              Gestion centralisée des accès, codes et statuts d'activité
            </p>
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-[0.98] cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Créer une Entreprise (Admin)</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Total Companies */}
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
              <span>Établissements Enregistrés</span>
              <Building2 className="w-4 h-4 text-amber-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{platformStats.totalCompanies}</span>
              <span className="text-xs font-bold text-emerald-600">
                {platformStats.activeCompanies} actifs
              </span>
            </div>
            {platformStats.suspendedCompanies > 0 && (
              <p className="text-[10px] text-red-500 font-medium mt-0.5">
                {platformStats.suspendedCompanies} établissement(s) suspendu(s)
              </p>
            )}
          </div>

          {/* Total Platform Transactions */}
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
              <span>Volume Global Transactions</span>
              <Receipt className="w-4 h-4 text-blue-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">
                {platformStats.totalPlatformTransactions.toLocaleString('fr-FR')}
              </span>
              <span className="text-xs font-bold text-slate-500">tickets</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Traitement consolidé sur la plateforme
            </p>
          </div>

          {/* Platform Gross Volume */}
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
              <span>Chiffre d'Affaires Global Réseau</span>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-900">
                {platformStats.totalPlatformRevenue.toLocaleString('fr-FR')}
              </span>
              <span className="text-xs font-bold text-slate-500">{settings.currency || 'G'}</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Flux d'affaires consolidé des bars
            </p>
          </div>

          {/* Total Accounts */}
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
              <span>Utilisateurs & Personnel</span>
              <Users className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{platformStats.totalStaffCount}</span>
              <span className="text-xs font-bold text-slate-500">comptes</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Admins, gérants et serveurs du parc
            </p>
          </div>
        </div>
      </div>

      {/* Companies List Section */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher par nom, code, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Tous ({companies.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                statusFilter === 'active'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Actifs ({companies.filter(c => c.status === 'active').length})
            </button>
            <button
              onClick={() => setStatusFilter('suspended')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                statusFilter === 'suspended'
                  ? 'bg-red-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Suspendus ({companies.filter(c => c.status === 'suspended').length})
            </button>
          </div>
        </div>

        {/* Company Cards */}
        <div className="divide-y divide-slate-100">
          {filteredCompanies.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Building2 className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-bold text-slate-600">Aucun établissement trouvé</p>
              <p className="text-xs mt-1">Créez un nouvel établissement pour étendre votre parc.</p>
            </div>
          ) : (
            filteredCompanies.map(company => {
              const isSuspended = company.status === 'suspended';
              const isAssociated = canAccessCompanySpace(company);

              return (
                <div
                  key={company.id}
                  className={`p-5 transition flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                    isAssociated
                      ? 'bg-amber-50/40 border-l-4 border-amber-500'
                      : isSuspended
                      ? 'bg-slate-50/60 opacity-80'
                      : 'hover:bg-slate-50/70'
                  }`}
                >
                  {/* Left info */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h4 className="text-base font-black text-slate-900 tracking-tight">
                        {company.name}
                      </h4>

                      {/* 8-Char Code Badge with Copy button */}
                      <button
                        onClick={() => handleCopyCode(company.code)}
                        title="Cliquer pour copier le code de l'entreprise"
                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-lg text-xs font-mono font-black shadow-xs transition active:scale-95 cursor-pointer"
                      >
                        <span>{company.code}</span>
                        {copiedCode === company.code ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3 text-slate-400" />
                        )}
                      </button>

                      {/* Associated Company Tag */}
                      {isAssociated && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950 border border-amber-500 shadow-xs flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-slate-950" />
                          Mon Établissement Associé
                        </span>
                      )}

                      {/* Status Tag */}
                      {isSuspended ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-700 border border-red-200">
                          Suspendu
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Actif
                        </span>
                      )}
                    </div>

                    {/* Metadata items */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Gérant : <strong className="text-slate-800">{company.managerName}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">Admin Google : <strong className="text-slate-800">{company.adminEmail}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Tél : <strong className="text-slate-800">{company.phone || 'Non renseigné'}</strong></span>
                      </div>
                    </div>

                    {/* Company Stats Bar & Subscription Info */}
                    {(() => {
                      const compSales = sales.filter(s => s.companyCode === company.code || (!s.companyCode && company.code === 'LMD88412'));
                      const compTx = compSales.length;
                      const compRevenue = compSales.reduce((acc, s) => acc + (Number(s.total) || 0), 0);
                      const sub = company.subscription;
                      const plan = sub?.planType || 'annual';
                      const price = sub?.customPrice ?? (plan === 'annual' ? defaultAnnual : plan === 'monthly' ? defaultMonthly : defaultLifetime);
                      const subStatus = sub?.status || (company.status === 'active' ? 'active' : 'suspended');
                      const quotaPolicy = sub?.quotaPolicy || {
                        chargeOverage: settings.platformBilling?.globalQuotaPolicy?.chargeOverage ?? false
                      };

                      return (
                        <div className="space-y-1.5 pt-1">
                          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500">
                            <span>Devise : <strong className="text-slate-900">{company.currency}</strong></span>
                            <span>•</span>
                            <span>Transactions : <strong className="text-slate-900">{compTx.toLocaleString('fr-FR')}</strong></span>
                            <span>•</span>
                            <span>CA Traité : <strong className="text-emerald-700">{compRevenue.toLocaleString('fr-FR')} {company.currency}</strong></span>
                            <span>•</span>
                            <span>Créé le : <strong className="text-slate-700">{new Date(company.createdAt).toLocaleDateString('fr-FR')}</strong></span>
                          </div>

                          {/* Subscription Pill Row */}
                          <div className="flex flex-wrap items-center gap-2 pt-0.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Abonnement SaaS :</span>
                            {plan === 'annual' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                                <Calendar className="w-3 h-3 text-amber-600" />
                                Annuel &bull; ${price} USD/an
                              </span>
                            )}
                            {plan === 'monthly' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-900 border border-blue-200">
                                <Clock className="w-3 h-3 text-blue-600" />
                                Mensuel &bull; ${price} USD/mois
                              </span>
                            )}
                            {plan === 'lifetime' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-purple-50 text-purple-900 border border-purple-200">
                                <InfinityIcon className="w-3 h-3 text-purple-600" />
                                À Vie &bull; ${price} USD unique
                              </span>
                            )}
                            {plan === 'custom' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-900 border border-slate-200">
                                <Sliders className="w-3 h-3 text-slate-600" />
                                Sur-mesure &bull; ${price} USD
                              </span>
                            )}

                            {/* Quota Policy Badge */}
                            {quotaPolicy.chargeOverage ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-md">
                                <Zap className="w-3 h-3 text-amber-600" />
                                Frais au dépassement
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Quotas Inclus
                              </span>
                            )}

                            {sub?.expiryDate && plan !== 'lifetime' && (
                              <span className="text-[10px] text-slate-400 font-medium">
                                Échéance : {new Date(sub.expiryDate).toLocaleDateString('fr-FR')}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Right actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {/* Switch to Company Space (Allowed ONLY for Super Admin's associated company) */}
                    {isAssociated ? (
                      <button
                        onClick={() => switchCompanySpace(company.id)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black rounded-xl text-xs shadow-md transition active:scale-95 cursor-pointer"
                        title="Accéder à l'espace opérationnel de votre entreprise associée (Caisse, Stock, Rapports)"
                      >
                        <Building2 className="w-3.5 h-3.5" />
                        <span>Accéder à mon espace</span>
                      </button>
                    ) : (
                      <div
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-500 rounded-xl text-xs font-bold border border-slate-200 select-none cursor-default"
                        title="Espace confidentiel réservé à l'administrateur de cet établissement. Le Super Admin gère la plateforme sans intrusion dans les caisses tierces."
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                        <span>Espace Client Dédié</span>
                      </div>
                    )}

                    {/* Suspend / Reactivate */}
                    <button
                      onClick={() => toggleCompanyStatus(company.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        isSuspended
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
                      }`}
                    >
                      {isSuspended ? 'Réactiver l\'accès' : 'Suspendre l\'accès'}
                    </button>

                    {/* Edit with Full Subscription controls */}
                    <button
                      onClick={() => handleOpenEditModal(company)}
                      className="inline-flex items-center gap-1 px-3 py-2 text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-xl text-xs font-bold transition cursor-pointer"
                      title="Modifier les informations et l'abonnement"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Modifier & Forfait</span>
                    </button>

                    {/* Delete Permanently */}
                    <button
                      onClick={() => setCompanyToDelete(company)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
                      title="Supprimer définitivement cet établissement"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal: Delete Confirmation */}
      {companyToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900">
                Supprimer définitivement l'établissement ?
              </h3>
              <p className="text-xs text-slate-500">
                Vous êtes sur le point de supprimer <strong className="text-slate-900">{companyToDelete.name}</strong> (Code: <span className="font-mono font-bold text-amber-600">{companyToDelete.code}</span>).
              </p>
            </div>

            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-[11px] text-red-700 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                Action irréversible
              </p>
              <p>
                Cette suppression effacera l'enregistrement de l'entreprise et révoquera les accès et pré-inscriptions associés.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setCompanyToDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-md transition cursor-pointer"
              >
                Confirmer la suppression
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create or Edit Company */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 to-amber-950 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    {editingCompany ? "Modifier l'Établissement" : "Créer une Entreprise (Admin)"}
                  </h3>
                  <p className="text-xs text-slate-300">
                    Définition des accès maîtres et du code unique à 8 caractères
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitForm} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Company Name */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-800">
                    Nom du Bar / Établissement *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Havana Club Port-au-Prince"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* 8-Character Unique Code */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      Code Unique (8 Caractères) *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const prefix = (formName.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase()) || 'BAR';
                        const randomDigits = Math.floor(10000 + Math.random() * 90000);
                        setFormCode(`${prefix.padEnd(3, 'X')}${randomDigits}`.slice(0, 8));
                      }}
                      className="text-[10px] text-amber-600 hover:text-amber-700 font-bold underline cursor-pointer"
                    >
                      Générer
                    </button>
                  </div>
                  <input
                    type="text"
                    maxLength={8}
                    required
                    placeholder="BAR78901"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 text-amber-400 font-mono tracking-widest font-black rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 uppercase"
                  />
                  <p className="text-[10px] text-slate-400">Code saisi par le personnel pour se connecter à ce bar.</p>
                </div>

                {/* Manager Name */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800">
                    Nom du Gérant / Responsable *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Jean-Baptiste Duval"
                    value={formManager}
                    onChange={(e) => setFormManager(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Admin Google Email */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                    <span>Email Google de l'Administrateur *</span>
                    <span className="text-[10px] font-normal text-amber-700">Droit d'administration direct</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="admin.bar@gmail.com"
                    value={formAdminEmail}
                    onChange={(e) => setFormAdminEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <p className="text-[10px] text-slate-400">Cette adresse aura les pleins pouvoirs de gestion sur cet établissement.</p>
                </div>

                {/* Phone */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800">
                    Numéro de Téléphone
                  </label>
                  <input
                    type="text"
                    placeholder="+509 3700-0000"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Currency */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800">
                    Devise Principale
                  </label>
                  <select
                    value={formCurrency}
                    onChange={(e) => setFormCurrency(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="G">Gourdes (G / HTG)</option>
                    <option value="$">Dollars US ($)</option>
                    <option value="€">Euros (€)</option>
                    <option value="FCFA">Franc CFA (FCFA)</option>
                  </select>
                </div>

                {/* Address */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-800">
                    Adresse / Ville
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 42 Rue Panaméricaine, Pétion-Ville"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Super Admin Subscription & Pricing Section */}
              <div className="p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950 rounded-2xl border border-slate-700 text-white space-y-4 shadow-inner">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-amber-400" />
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">
                      Paramétrage de l'Abonnement SaaS
                    </h4>
                  </div>
                  <span className="text-[10px] bg-amber-400/20 text-amber-300 font-bold px-2 py-0.5 rounded-md">
                    Contrôle Super-Admin
                  </span>
                </div>

                {/* Plan Selection Buttons */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300">
                    Formule attribuée à cet établissement *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFormPlanType('annual');
                        if (formSubPrice === defaultMonthly || formSubPrice === defaultLifetime) {
                          setFormSubPrice(defaultAnnual);
                        }
                      }}
                      className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition cursor-pointer ${
                        formPlanType === 'annual'
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-md'
                          : 'bg-slate-800/80 text-slate-200 border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Annuel</span>
                      </div>
                      <span className="text-[11px] mt-1 font-extrabold opacity-90">${defaultAnnual}/an</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setFormPlanType('monthly');
                        if (formSubPrice === defaultAnnual || formSubPrice === defaultLifetime) {
                          setFormSubPrice(defaultMonthly);
                        }
                      }}
                      className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition cursor-pointer ${
                        formPlanType === 'monthly'
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-md'
                          : 'bg-slate-800/80 text-slate-200 border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Mensuel</span>
                      </div>
                      <span className="text-[11px] mt-1 font-extrabold opacity-90">${defaultMonthly}/mois</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setFormPlanType('lifetime');
                        if (formSubPrice === defaultAnnual || formSubPrice === defaultMonthly) {
                          setFormSubPrice(defaultLifetime);
                        }
                      }}
                      className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition cursor-pointer ${
                        formPlanType === 'lifetime'
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-md'
                          : 'bg-slate-800/80 text-slate-200 border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold">
                        <InfinityIcon className="w-3.5 h-3.5" />
                        <span>À Vie</span>
                      </div>
                      <span className="text-[11px] mt-1 font-extrabold opacity-90">${defaultLifetime} unique</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormPlanType('custom')}
                      className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition cursor-pointer ${
                        formPlanType === 'custom'
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-md'
                          : 'bg-slate-800/80 text-slate-200 border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold">
                        <Sliders className="w-3.5 h-3.5" />
                        <span>Sur-mesure</span>
                      </div>
                      <span className="text-[11px] mt-1 font-extrabold opacity-90">Personnalisé</span>
                    </button>
                  </div>
                </div>

                {/* Custom Price & Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                      <span>Tarif Spécifique pour ce Bar (USD) *</span>
                      <span className="text-[9px] text-amber-300">Modifiable par client</span>
                    </label>
                    <div className="relative">
                      <DollarSign className="w-4 h-4 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={formSubPrice}
                        onChange={(e) => setFormSubPrice(Number(e.target.value))}
                        className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-black text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300">
                      Statut de l'Abonnement
                    </label>
                    <select
                      value={formSubStatus}
                      onChange={(e) => setFormSubStatus(e.target.value as SubscriptionStatus)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="active">Actif (En règle)</option>
                      <option value="trial">Période d'essai gratuit</option>
                      <option value="lifetime">Accès Permanent (À Vie)</option>
                      <option value="expired">Échu / En attente de paiement</option>
                      <option value="suspended">Suspendu (Accès bloqué)</option>
                    </select>
                  </div>
                </div>

                {/* Over-Quota & Surcharge Policy Toggle */}
                <div className="pt-2 border-t border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        Facturer des frais au dépassement de quota ?
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {formSubChargeOverage
                          ? "Oui, l'entreprise paiera des frais supplémentaires s'il dépasse son quota."
                          : "Non, aucun frais supplémentaire lors d'un volume élevé (inclus ou illimité)."}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formSubChargeOverage}
                        onChange={(e) => setFormSubChargeOverage(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                  </div>

                  {formSubChargeOverage && (
                    <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-950/60 rounded-xl border border-slate-800 animate-in fade-in duration-150">
                      <div>
                        <label className="text-[10px] text-slate-400 font-bold block">
                          Frais / +1,000 Trans. ($)
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={formSubOverageFee1000Tx}
                          onChange={(e) => setFormSubOverageFee1000Tx(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-amber-300"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 font-bold block">
                          Frais / +100 IA ($)
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={formSubOverageFee100Ai}
                          onChange={(e) => setFormSubOverageFee100Ai(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-amber-300"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting
                    ? "Enregistrement..."
                    : editingCompany
                    ? "Mettre à jour"
                    : "Créer l'Établissement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
