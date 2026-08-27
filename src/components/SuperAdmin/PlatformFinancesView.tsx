import React, { useState } from 'react';
import { useBar } from '../../context/BarContext';
import { Company, CompanySubscription, SubscriptionBillingCycle, SubscriptionStatus } from '../../types';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Building2,
  Layers,
  Zap,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Clock,
  Infinity as InfinityIcon,
  Edit2,
  Check,
  X,
  Search,
  SlidersHorizontal,
  Lock,
  ShieldCheck,
  Info
} from 'lucide-react';

export const PlatformFinancesView: React.FC = () => {
  const { companies, sales, platformStats, settings, updateSettings, updateCompany } = useBar();

  // Reference currency for GMV display
  const [currencySymbol, setCurrencySymbol] = useState<string>('G');

  // Search & Filter state for companies table
  const [companySearch, setCompanySearch] = useState('');
  const [planFilter, setPlanFilter] = useState<'all' | 'annual' | 'monthly' | 'lifetime' | 'custom'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'expired'>('all');

  // Global Pricing Modal State (Guarded edit mode to prevent accidental changes)
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [modalAnnualPrice, setModalAnnualPrice] = useState<number>(
    settings.platformBilling?.defaultAnnualPrice ?? 100
  );
  const [modalMonthlyPrice, setModalMonthlyPrice] = useState<number>(
    settings.platformBilling?.defaultMonthlyPrice ?? 15
  );
  const [modalLifetimePrice, setModalLifetimePrice] = useState<number>(
    settings.platformBilling?.defaultLifetimePrice ?? 450
  );
  const [modalEnableMonthly, setModalEnableMonthly] = useState<boolean>(
    settings.platformBilling?.availablePlans?.monthly ?? true
  );
  const [modalEnableAnnual, setModalEnableAnnual] = useState<boolean>(
    settings.platformBilling?.availablePlans?.annual ?? true
  );
  const [modalEnableLifetime, setModalEnableLifetime] = useState<boolean>(
    settings.platformBilling?.availablePlans?.lifetime ?? true
  );
  const [modalChargeOverage, setModalChargeOverage] = useState<boolean>(
    settings.platformBilling?.globalQuotaPolicy?.chargeOverage ?? false
  );
  const [modalMaxMonthlyTx, setModalMaxMonthlyTx] = useState<number>(
    settings.platformBilling?.globalQuotaPolicy?.maxTransactionsPerMonth ?? 5000
  );
  const [modalMaxMonthlyAi, setModalMaxMonthlyAi] = useState<number>(
    settings.platformBilling?.globalQuotaPolicy?.maxAiQueriesPerMonth ?? 500
  );
  const [modalOverageFeePer1000Tx, setModalOverageFeePer1000Tx] = useState<number>(
    settings.platformBilling?.globalQuotaPolicy?.overageFeePer1000Tx ?? 5
  );
  const [modalOverageFeePer100Ai, setModalOverageFeePer100Ai] = useState<number>(
    settings.platformBilling?.globalQuotaPolicy?.overageFeePer100AiQueries ?? 2
  );
  const [isSavedNotice, setIsSavedNotice] = useState(false);

  // Per-Company Subscription Edit Modal
  const [editingSubCompany, setEditingSubCompany] = useState<Company | null>(null);
  const [subPlanType, setSubPlanType] = useState<SubscriptionBillingCycle>('annual');
  const [subStatus, setSubStatus] = useState<SubscriptionStatus>('active');
  const [subCustomPrice, setSubCustomPrice] = useState<number>(100);
  const [subCurrency, setSubCurrency] = useState<string>('USD');
  const [subStartDate, setSubStartDate] = useState<string>('');
  const [subExpiryDate, setSubExpiryDate] = useState<string>('');
  const [subAutoRenew, setSubAutoRenew] = useState<boolean>(true);
  const [subChargeOverage, setSubChargeOverage] = useState<boolean>(false);
  const [subMaxTx, setSubMaxTx] = useState<number>(5000);
  const [subMaxAi, setSubMaxAi] = useState<number>(500);
  const [subOverageFee1000Tx, setSubOverageFee1000Tx] = useState<number>(5);
  const [subOverageFee100Ai, setSubOverageFee100Ai] = useState<number>(2);
  const [subNotes, setSubNotes] = useState<string>('');

  // Active Global Config Values
  const currentAnnualPrice = settings.platformBilling?.defaultAnnualPrice ?? 100;
  const currentMonthlyPrice = settings.platformBilling?.defaultMonthlyPrice ?? 15;
  const currentLifetimePrice = settings.platformBilling?.defaultLifetimePrice ?? 450;
  const currentPlans = settings.platformBilling?.availablePlans ?? { monthly: true, annual: true, lifetime: true };
  const currentQuotaPolicy = settings.platformBilling?.globalQuotaPolicy ?? {
    chargeOverage: false,
    maxTransactionsPerMonth: 5000,
    maxAiQueriesPerMonth: 500,
    overageFeePer1000Tx: 5,
    overageFeePer100AiQueries: 2
  };

  const activeCount = platformStats.activeCompanies;
  const totalVolume = platformStats.totalPlatformRevenue;
  const totalTx = platformStats.totalPlatformTransactions;

  // Real Real-time SaaS Breakdown from companies
  const subscriptionBreakdown = companies.reduce(
    (acc, comp) => {
      const sub = comp.subscription;
      const status = sub?.status || (comp.status === 'active' ? 'active' : 'suspended');
      const plan = sub?.planType || 'annual';
      const price = sub?.customPrice ?? (plan === 'annual' ? currentAnnualPrice : plan === 'monthly' ? currentMonthlyPrice : currentLifetimePrice);

      if (status === 'active' || status === 'lifetime') {
        if (plan === 'monthly') {
          acc.mrr += price;
          acc.monthlyCount += 1;
        } else if (plan === 'annual') {
          acc.mrr += Math.round(price / 12);
          acc.arr += price;
          acc.annualCount += 1;
        } else if (plan === 'lifetime') {
          acc.lifetimeTotal += price;
          acc.lifetimeCount += 1;
        }
      } else {
        acc.suspendedCount += 1;
      }

      // Check over-quota fees calculation
      const compSales = sales.filter(s => s.companyCode === comp.code || (!s.companyCode && comp.code === 'LMD88412'));
      const txCount = compSales.length;
      const quotaPolicy = sub?.quotaPolicy || currentQuotaPolicy;

      if (quotaPolicy.chargeOverage && txCount > (quotaPolicy.maxTransactionsPerMonth || 5000)) {
        const extraTx = txCount - (quotaPolicy.maxTransactionsPerMonth || 5000);
        const thousands = Math.ceil(extraTx / 1000);
        acc.overageFeesEst += thousands * (quotaPolicy.overageFeePer1000Tx || 5);
      }

      return acc;
    },
    {
      mrr: 0,
      arr: 0,
      lifetimeTotal: 0,
      monthlyCount: 0,
      annualCount: 0,
      lifetimeCount: 0,
      suspendedCount: 0,
      overageFeesEst: 0,
    }
  );

  // Open guarded pricing modal
  const handleOpenPricingModal = () => {
    setModalAnnualPrice(settings.platformBilling?.defaultAnnualPrice ?? 100);
    setModalMonthlyPrice(settings.platformBilling?.defaultMonthlyPrice ?? 15);
    setModalLifetimePrice(settings.platformBilling?.defaultLifetimePrice ?? 450);
    setModalEnableMonthly(settings.platformBilling?.availablePlans?.monthly ?? true);
    setModalEnableAnnual(settings.platformBilling?.availablePlans?.annual ?? true);
    setModalEnableLifetime(settings.platformBilling?.availablePlans?.lifetime ?? true);
    setModalChargeOverage(settings.platformBilling?.globalQuotaPolicy?.chargeOverage ?? false);
    setModalMaxMonthlyTx(settings.platformBilling?.globalQuotaPolicy?.maxTransactionsPerMonth ?? 5000);
    setModalMaxMonthlyAi(settings.platformBilling?.globalQuotaPolicy?.maxAiQueriesPerMonth ?? 500);
    setModalOverageFeePer1000Tx(settings.platformBilling?.globalQuotaPolicy?.overageFeePer1000Tx ?? 5);
    setModalOverageFeePer100Ai(settings.platformBilling?.globalQuotaPolicy?.overageFeePer100AiQueries ?? 2);
    setIsPricingModalOpen(true);
  };

  // Save changes from pricing modal
  const handleSavePlatformPricingModal = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      platformBilling: {
        defaultAnnualPrice: Number(modalAnnualPrice) || 100,
        defaultMonthlyPrice: Number(modalMonthlyPrice) || 15,
        defaultLifetimePrice: Number(modalLifetimePrice) || 450,
        currency: 'USD',
        availablePlans: {
          monthly: modalEnableMonthly,
          annual: modalEnableAnnual,
          lifetime: modalEnableLifetime,
        },
        globalQuotaPolicy: {
          chargeOverage: modalChargeOverage,
          maxTransactionsPerMonth: Number(modalMaxMonthlyTx) || 5000,
          maxAiQueriesPerMonth: Number(modalMaxMonthlyAi) || 500,
          overageFeePer1000Tx: Number(modalOverageFeePer1000Tx) || 5,
          overageFeePer100AiQueries: Number(modalOverageFeePer100Ai) || 2,
        },
      },
    });
    setIsPricingModalOpen(false);
    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 3000);
  };

  // Open individual company subscription editor
  const handleOpenEditSub = (comp: Company) => {
    setEditingSubCompany(comp);
    const sub = comp.subscription;
    const plan = sub?.planType || 'annual';
    setSubPlanType(plan);
    setSubStatus(sub?.status || (comp.status === 'active' ? 'active' : 'suspended'));
    setSubCustomPrice(sub?.customPrice ?? (plan === 'annual' ? currentAnnualPrice : plan === 'monthly' ? currentMonthlyPrice : currentLifetimePrice));
    setSubCurrency(sub?.currency || 'USD');
    setSubStartDate(sub?.startDate ? sub.startDate.split('T')[0] : comp.createdAt.split('T')[0]);
    setSubExpiryDate(sub?.expiryDate ? sub.expiryDate.split('T')[0] : '');
    setSubAutoRenew(sub?.autoRenew !== false);
    setSubChargeOverage(sub?.quotaPolicy?.chargeOverage ?? currentQuotaPolicy.chargeOverage);
    setSubMaxTx(sub?.quotaPolicy?.maxTransactionsPerMonth ?? currentQuotaPolicy.maxTransactionsPerMonth);
    setSubMaxAi(sub?.quotaPolicy?.maxAiQueriesPerMonth ?? currentQuotaPolicy.maxAiQueriesPerMonth);
    setSubOverageFee1000Tx(sub?.quotaPolicy?.overageFeePer1000Tx ?? currentQuotaPolicy.overageFeePer1000Tx);
    setSubOverageFee100Ai(sub?.quotaPolicy?.overageFeePer100AiQueries ?? currentQuotaPolicy.overageFeePer100AiQueries);
    setSubNotes(sub?.notes || '');
  };

  const handleSaveCompanySubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubCompany) return;

    const updatedSubscription: CompanySubscription = {
      planType: subPlanType,
      status: subStatus,
      customPrice: Number(subCustomPrice) || 0,
      currency: subCurrency,
      startDate: subStartDate ? new Date(subStartDate).toISOString() : new Date().toISOString(),
      expiryDate: subPlanType === 'lifetime' ? undefined : (subExpiryDate ? new Date(subExpiryDate).toISOString() : undefined),
      autoRenew: subAutoRenew,
      quotaPolicy: {
        chargeOverage: subChargeOverage,
        maxTransactionsPerMonth: Number(subMaxTx) || 5000,
        maxAiQueriesPerMonth: Number(subMaxAi) || 500,
        overageFeePer1000Tx: Number(subOverageFee1000Tx) || 5,
        overageFeePer100AiQueries: Number(subOverageFee100Ai) || 2,
      },
      notes: subNotes.trim(),
    };

    await updateCompany(editingSubCompany.id, {
      subscription: updatedSubscription,
      status: subStatus === 'suspended' ? 'suspended' : 'active',
    });

    setEditingSubCompany(null);
  };

  // Filtered companies list
  const filteredCompanies = companies.filter((comp) => {
    const q = companySearch.toLowerCase().trim();
    const matchQuery =
      !q ||
      comp.name.toLowerCase().includes(q) ||
      comp.code.toLowerCase().includes(q) ||
      comp.adminEmail.toLowerCase().includes(q);

    const plan = comp.subscription?.planType || 'annual';
    const matchPlan = planFilter === 'all' || plan === planFilter;

    const status = comp.subscription?.status || (comp.status === 'active' ? 'active' : 'suspended');
    const matchStatus = statusFilter === 'all' || status === statusFilter;

    return matchQuery && matchPlan && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header & Devise GMV */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-amber-600" />
            Finances & Modèle Économique de la Plateforme
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Suivi des revenus récurrents SaaS (MRR / ARR), politique de tarification et abonnements de l'ensemble du parc.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600">Devise GMV :</span>
          <select
            value={currencySymbol}
            onChange={(e) => setCurrencySymbol(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="G">Gourdes (G)</option>
            <option value="$">Dollars ($)</option>
            <option value="€">Euros (€)</option>
          </select>
        </div>
      </div>

      {isSavedNotice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>La tarification globale et les politiques de quotas ont été mises à jour avec succès.</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* MRR / ARR */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
            <span>Revenu Mensuel Récurrent (MRR)</span>
            <CreditCard className="w-4 h-4 text-purple-600" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900">
              ${subscriptionBreakdown.mrr.toLocaleString('fr-FR')}
            </span>
            <span className="text-xs font-bold text-slate-500">USD / mois</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            ARR Projeté : ${Math.round(subscriptionBreakdown.mrr * 12).toLocaleString('fr-FR')} USD / an
          </p>
        </div>

        {/* Breakdown by Subscription Plan */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
            <span>Parc d'Abonnements Actifs</span>
            <Layers className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {activeCount}
            </span>
            <span className="text-xs font-bold text-slate-500">bars abonnés</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1">
            <span className="text-amber-700 font-bold">{subscriptionBreakdown.annualCount} Annuels</span>
            <span>•</span>
            <span className="text-blue-700 font-bold">{subscriptionBreakdown.monthlyCount} Mensuels</span>
            <span>•</span>
            <span className="text-purple-700 font-bold">{subscriptionBreakdown.lifetimeCount} À Vie</span>
          </div>
        </div>

        {/* Gross Network GMV */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
            <span>Volume d'Affaires Global (GMV)</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900">
              {totalVolume.toLocaleString('fr-FR')}
            </span>
            <span className="text-xs font-bold text-slate-500">{currencySymbol}</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {totalTx.toLocaleString('fr-FR')} transactions enregistrées
          </p>
        </div>

        {/* Over-quota Fee / Lifetime Revenue */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
            <span>Licences & Dépassements</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900">
              ${(subscriptionBreakdown.lifetimeTotal + subscriptionBreakdown.overageFeesEst).toLocaleString('fr-FR')}
            </span>
            <span className="text-xs font-bold text-slate-500">USD</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {subscriptionBreakdown.lifetimeCount} licences à vie + {subscriptionBreakdown.overageFeesEst}$ frais quotas
          </p>
        </div>
      </div>

      {/* MINIMALIST & SECURE GLOBAL PRICING CARD (Read-Only Summary, Protected from Accidental Edits) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-black text-slate-900">
                  Grille Tarifaire Globale & Quotas par Défaut
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  Lecture Sécurisée
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Barèmes de référence appliqués automatiquement lors de la création d'un nouvel établissement.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenPricingModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer shrink-0"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>Modifier la Tarification Globale</span>
          </button>
        </div>

        {/* Read-Only Summary Grid (Clean & Minimalist) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4">
          {/* Annual Formula */}
          <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                Formule Annuelle
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${currentPlans.annual ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                {currentPlans.annual ? 'Actif' : 'Inactif'}
              </span>
            </div>
            <div className="mt-2">
              <div className="text-xl font-black text-slate-900">
                ${currentAnnualPrice} <span className="text-xs font-semibold text-slate-500">USD / an</span>
              </div>
              <span className="text-[10px] text-amber-700 font-bold">Standard Recommandé</span>
            </div>
          </div>

          {/* Monthly Formula */}
          <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                Formule Mensuelle
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${currentPlans.monthly ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                {currentPlans.monthly ? 'Actif' : 'Inactif'}
              </span>
            </div>
            <div className="mt-2">
              <div className="text-xl font-black text-slate-900">
                ${currentMonthlyPrice} <span className="text-xs font-semibold text-slate-500">USD / mois</span>
              </div>
              <span className="text-[10px] text-slate-500">Sans engagement</span>
            </div>
          </div>

          {/* Lifetime Formula */}
          <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                <InfinityIcon className="w-3.5 h-3.5 text-purple-600" />
                Licence À Vie
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${currentPlans.lifetime ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                {currentPlans.lifetime ? 'Actif' : 'Inactif'}
              </span>
            </div>
            <div className="mt-2">
              <div className="text-xl font-black text-slate-900">
                ${currentLifetimePrice} <span className="text-xs font-semibold text-slate-500">USD unique</span>
              </div>
              <span className="text-[10px] text-purple-700 font-bold">Paiement définitif</span>
            </div>
          </div>

          {/* Quota Policy */}
          <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                Politique Quotas
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${currentQuotaPolicy.chargeOverage ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                {currentQuotaPolicy.chargeOverage ? 'Frais dépassement' : 'Illimité sans surcoût'}
              </span>
            </div>
            <div className="mt-2 text-xs font-bold text-slate-800">
              <div>{currentQuotaPolicy.maxTransactionsPerMonth.toLocaleString()} tx/mois incluses</div>
              <div className="text-[10px] text-slate-500 font-normal">{currentQuotaPolicy.maxAiQueriesPerMonth} requêtes IA incluses</div>
            </div>
          </div>
        </div>
      </div>

      {/* PER-COMPANY SUBSCRIPTION TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {/* Table Top Toolbar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-700" />
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Abonnements & Tarifs par Établissement ({filteredCompanies.length})
              </h4>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Chaque établissement peut avoir un tarif ajusté sur-mesure ou une date d'échéance spécifique.
            </p>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher un bar..."
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 w-44 sm:w-56"
              />
            </div>

            {/* Plan Filter */}
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value as any)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">Toutes Formules</option>
              <option value="annual">Annuel</option>
              <option value="monthly">Mensuel</option>
              <option value="lifetime">À Vie</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">Tous Statuts</option>
              <option value="active">Actifs</option>
              <option value="suspended">Suspendus</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] font-bold">
              <tr>
                <th className="py-3 px-4">Établissement</th>
                <th className="py-3 px-4">Formule Attribuée</th>
                <th className="py-3 px-4">Tarif Facturé</th>
                <th className="py-3 px-4">Statut</th>
                <th className="py-3 px-4">Validité / Échéance</th>
                <th className="py-3 px-4">Politique Quota</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredCompanies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-normal">
                    Aucun établissement ne correspond aux critères de filtre.
                  </td>
                </tr>
              ) : (
                filteredCompanies.map((comp) => {
                  const sub = comp.subscription;
                  const plan = sub?.planType || 'annual';
                  const price = sub?.customPrice ?? (plan === 'annual' ? currentAnnualPrice : plan === 'monthly' ? currentMonthlyPrice : currentLifetimePrice);
                  const status = sub?.status || (comp.status === 'active' ? 'active' : 'suspended');
                  const quotaPolicy = sub?.quotaPolicy || currentQuotaPolicy;

                  return (
                    <tr key={comp.id} className="hover:bg-slate-50/80 transition">
                      {/* Company Info */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{comp.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5">
                          <span>{comp.code}</span>
                          <span>•</span>
                          <span>{comp.adminEmail}</span>
                        </div>
                      </td>

                      {/* Plan Badge */}
                      <td className="py-3.5 px-4">
                        {plan === 'annual' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <Calendar className="w-3 h-3 text-amber-600" />
                            Annuel
                          </span>
                        )}
                        {plan === 'monthly' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                            <Clock className="w-3 h-3 text-blue-600" />
                            Mensuel
                          </span>
                        )}
                        {plan === 'lifetime' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                            <InfinityIcon className="w-3 h-3 text-purple-600" />
                            À Vie
                          </span>
                        )}
                        {plan === 'custom' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                            <Sliders className="w-3 h-3 text-slate-600" />
                            Sur-mesure
                          </span>
                        )}
                      </td>

                      {/* Custom Price */}
                      <td className="py-3.5 px-4">
                        <div className="font-black text-slate-900 text-xs">
                          ${price} {sub?.currency || 'USD'}
                          <span className="text-[10px] text-slate-400 font-normal">
                            {plan === 'annual' ? ' / an' : plan === 'monthly' ? ' / mois' : ' (unique)'}
                          </span>
                        </div>
                        {price !== (plan === 'annual' ? currentAnnualPrice : plan === 'monthly' ? currentMonthlyPrice : currentLifetimePrice) && (
                          <span className="inline-block text-[9px] font-bold text-amber-700 bg-amber-100/70 px-1.5 py-0.5 rounded mt-0.5">
                            Tarif Négocié
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {status === 'active' && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Actif
                          </span>
                        )}
                        {status === 'lifetime' && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                            À Vie
                          </span>
                        )}
                        {status === 'expired' && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                            Expiré
                          </span>
                        )}
                        {status === 'suspended' && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 text-slate-700 border border-slate-300">
                            Suspendu
                          </span>
                        )}
                      </td>

                      {/* Validity Date */}
                      <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                        {plan === 'lifetime' ? (
                          <span className="font-bold text-purple-700 flex items-center gap-1">
                            <InfinityIcon className="w-3.5 h-3.5" />
                            Illimité
                          </span>
                        ) : sub?.expiryDate ? (
                          <div>
                            <div className="font-bold text-slate-800">
                              {new Date(sub.expiryDate).toLocaleDateString('fr-FR')}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {sub.autoRenew ? 'Renouvellement auto' : 'Sans renouvellement auto'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">1 an par défaut</span>
                        )}
                      </td>

                      {/* Quota Policy */}
                      <td className="py-3.5 px-4">
                        {quotaPolicy.chargeOverage ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            <Zap className="w-3 h-3 text-amber-600" />
                            Frais au dépassement
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-500">
                            Quotas inclus
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenEditSub(comp)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg transition active:scale-95 cursor-pointer inline-flex items-center gap-1 text-[11px]"
                          title="Modifier l'abonnement ou le tarif de cet établissement"
                        >
                          <Edit2 className="w-3 h-3 text-amber-600" />
                          <span>Ajuster</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* GUARDED GLOBAL PRICING CONFIGURATION MODAL (Prevents Accidental Editing) */}
      {isPricingModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    Modifier la Tarification Globale & Politiques Réseau
                  </h3>
                  <p className="text-xs text-slate-300">
                    Définissez les formules disponibles et les tarifs de référence par défaut.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsPricingModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-xl hover:bg-slate-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSavePlatformPricingModal} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Formules de base */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-amber-600" />
                  Formules d'Abonnement de Référence
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Annual */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900">Annuel (Défaut)</span>
                      <input
                        type="checkbox"
                        checked={modalEnableAnnual}
                        onChange={(e) => setModalEnableAnnual(e.target.checked)}
                        className="rounded text-amber-500 focus:ring-amber-500 h-4 w-4"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Prix ($ USD / an)</label>
                      <input
                        type="number"
                        min="0"
                        max="5000"
                        value={modalAnnualPrice}
                        onChange={(e) => setModalAnnualPrice(Number(e.target.value) || 0)}
                        disabled={!modalEnableAnnual}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {/* Monthly */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900">Mensuel</span>
                      <input
                        type="checkbox"
                        checked={modalEnableMonthly}
                        onChange={(e) => setModalEnableMonthly(e.target.checked)}
                        className="rounded text-amber-500 focus:ring-amber-500 h-4 w-4"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Prix ($ USD / mois)</label>
                      <input
                        type="number"
                        min="0"
                        max="1000"
                        value={modalMonthlyPrice}
                        onChange={(e) => setModalMonthlyPrice(Number(e.target.value) || 0)}
                        disabled={!modalEnableMonthly}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {/* Lifetime */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900">Paiement À Vie</span>
                      <input
                        type="checkbox"
                        checked={modalEnableLifetime}
                        onChange={(e) => setModalEnableLifetime(e.target.checked)}
                        className="rounded text-amber-500 focus:ring-amber-500 h-4 w-4"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Prix ($ USD unique)</label>
                      <input
                        type="number"
                        min="0"
                        max="10000"
                        value={modalLifetimePrice}
                        onChange={(e) => setModalLifetimePrice(Number(e.target.value) || 0)}
                        disabled={!modalEnableLifetime}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Politique de Quotas & Dépassement */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-black text-slate-900">Facturer les Dépassements de Quotas</h5>
                    <p className="text-[11px] text-slate-500">
                      Applique des frais supplémentaires lorsque les volumes mensuels dépassent les seuils inclus.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setModalChargeOverage(!modalChargeOverage)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                      modalChargeOverage ? 'bg-amber-500' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        modalChargeOverage ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {modalChargeOverage && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-200">
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 block mb-1">
                        Transactions Incluses / mois
                      </label>
                      <input
                        type="number"
                        min="500"
                        step="500"
                        value={modalMaxMonthlyTx}
                        onChange={(e) => setModalMaxMonthlyTx(Number(e.target.value) || 0)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-700 block mb-1">
                        Frais par tranche de 1 000 tx au-delà ($)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={modalOverageFeePer1000Tx}
                        onChange={(e) => setModalOverageFeePer1000Tx(Number(e.target.value) || 0)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-amber-700 focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-700 block mb-1">
                        Requêtes IA Dona Incluses / mois
                      </label>
                      <input
                        type="number"
                        min="50"
                        step="50"
                        value={modalMaxMonthlyAi}
                        onChange={(e) => setModalMaxMonthlyAi(Number(e.target.value) || 0)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-700 block mb-1">
                        Frais par tranche de 100 requêtes IA ($)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={modalOverageFeePer100Ai}
                        onChange={(e) => setModalOverageFeePer100Ai(Number(e.target.value) || 0)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-amber-700 focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPricingModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-md transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Enregistrer la Tarification Globale</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INDIVIDUAL COMPANY SUBSCRIPTION EDIT MODAL */}
      {editingSubCompany && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-white">
                  Abonnement : {editingSubCompany.name}
                </h3>
                <p className="text-xs text-slate-300">
                  Code : {editingSubCompany.code} &bull; Gérant : {editingSubCompany.managerName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingSubCompany(null)}
                className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCompanySubscription} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Formule Attribuée</label>
                  <select
                    value={subPlanType}
                    onChange={(e) => {
                      const newPlan = e.target.value as SubscriptionBillingCycle;
                      setSubPlanType(newPlan);
                      if (newPlan === 'annual') setSubCustomPrice(currentAnnualPrice);
                      else if (newPlan === 'monthly') setSubCustomPrice(currentMonthlyPrice);
                      else if (newPlan === 'lifetime') setSubCustomPrice(currentLifetimePrice);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  >
                    <option value="annual">Annuel (${currentAnnualPrice}/an)</option>
                    <option value="monthly">Mensuel (${currentMonthlyPrice}/mois)</option>
                    <option value="lifetime">Paiement À Vie (${currentLifetimePrice})</option>
                    <option value="custom">Sur-mesure</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tarif Personnalisé ($ USD)</label>
                  <input
                    type="number"
                    min="0"
                    value={subCustomPrice}
                    onChange={(e) => setSubCustomPrice(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Statut de l'Abonnement</label>
                  <select
                    value={subStatus}
                    onChange={(e) => setSubStatus(e.target.value as SubscriptionStatus)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  >
                    <option value="active">Actif</option>
                    <option value="suspended">Suspendu</option>
                    <option value="trial">Essai</option>
                    <option value="expired">Expiré</option>
                    <option value="lifetime">À Vie</option>
                  </select>
                </div>

                {subPlanType !== 'lifetime' && (
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Date d'Échéance / Expiration</label>
                    <input
                      type="date"
                      value={subExpiryDate}
                      onChange={(e) => setSubExpiryDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                    />
                  </div>
                )}
              </div>

              {/* Policy overage */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={subChargeOverage}
                    onChange={(e) => setSubChargeOverage(e.target.checked)}
                    className="rounded text-amber-500"
                  />
                  <span>Facturer les frais en cas de dépassement de quota</span>
                </label>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Notes / Conditions Particulières</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Tarif négocié pour 3 ans, contrat partenaire..."
                  value={subNotes}
                  onChange={(e) => setSubNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingSubCompany(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-xs"
                >
                  Sauvegarder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
