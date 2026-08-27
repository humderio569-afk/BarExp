import React, { useState } from 'react';
import { useBar } from '../../context/BarContext';
import { Company } from '../../types';
import {
  Building2,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
  TrendingUp,
  Receipt,
  Users,
  Phone,
  Mail,
  Sliders,
  DollarSign,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Trash2,
  Edit2,
  ShieldCheck
} from 'lucide-react';

export const CompanyManagementTab: React.FC = () => {
  const {
    companies,
    platformStats,
    createCompany,
    updateCompany,
    toggleCompanyStatus,
    deleteCompany,
    switchCompanySpace,
    canAccessCompanySpace,
    impersonatedCompanyId,
    isImpersonating,
    activeCompany,
    settings,
  } = useBar();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Form State
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
    // Generate suggested 8-char code
    const randomDigits = Math.floor(10000 + Math.random() * 90000);
    setFormCode(`BAR${randomDigits}`);
    setFormAddress('');
    setFormTagline('');
    setFormTaxRate(0);
    setFormCashierName('Caisse Principale');
    setFormAutoApprove(true);
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

    // Check code collision if creating new or changing code
    const existingCodeMatch = companies.find(c => c.code.toUpperCase() === cleanCode && (!editingCompany || c.id !== editingCompany.id));
    if (existingCodeMatch) {
      setFormError(`Le code "${cleanCode}" est déjà utilisé par l'établissement "${existingCodeMatch.name}".`);
      return;
    }

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
      {/* Impersonation Alert Banner */}
      {isImpersonating && (
        <div className="p-4 bg-amber-500 text-slate-950 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 shrink-0" />
            <div>
              <p className="text-xs font-black uppercase tracking-wider">Mode Supervision Établissement Actif</p>
              <p className="text-sm font-bold">
                Vous êtes actuellement dans l'espace de : <span className="underline">{activeCompany?.name}</span> ({activeCompany?.code})
              </p>
            </div>
          </div>
          <button
            onClick={() => switchCompanySpace(null)}
            className="bg-slate-950 hover:bg-slate-900 text-white font-black text-xs px-4 py-2 rounded-xl transition shadow cursor-pointer shrink-0"
          >
            Quitter et revenir au mode Global
          </button>
        </div>
      )}

      {/* Platform Overview Metrics */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-600" />
              Tableau de Bord Global Plateforme
            </h3>
            <p className="text-xs text-slate-500">
              Indicateurs consolidés en temps réel de tous les établissements clients
            </p>
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Créer une Entreprise (Admin)</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Total Companies */}
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
              <span>Établissements Clients</span>
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

          {/* Total Revenue */}
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
              <span>Chiffre d'Affaires Global</span>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-900">
                {platformStats.totalPlatformRevenue.toLocaleString('fr-FR')}
              </span>
              <span className="text-xs font-bold text-slate-500">{settings.currency || 'G'}</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Cumul des ventes de l'ensemble du réseau
            </p>
          </div>

          {/* Total Transactions */}
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
              <span>Volume des Transactions</span>
              <Receipt className="w-4 h-4 text-blue-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">
                {platformStats.totalPlatformTransactions.toLocaleString('fr-FR')}
              </span>
              <span className="text-xs font-bold text-slate-500">tickets émis</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Trafic de caisse enregistré
            </p>
          </div>

          {/* Total Staff */}
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
              <span>Personnel & Caissiers</span>
              <Users className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{platformStats.totalStaffCount}</span>
              <span className="text-xs font-bold text-slate-500">utilisateurs</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Comptes actifs & pré-inscrits
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

        {/* Company Cards Grid */}
        <div className="divide-y divide-slate-100">
          {filteredCompanies.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Building2 className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-bold text-slate-600">Aucun établissement trouvé</p>
              <p className="text-xs mt-1">Essayez un autre mot-clé ou créez un nouvel établissement.</p>
            </div>
          ) : (
            filteredCompanies.map(company => {
              const isCurrentActive = activeCompany?.id === company.id;
              const isSuspended = company.status === 'suspended';

              return (
                <div
                  key={company.id}
                  className={`p-5 transition flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                    isCurrentActive
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

                      {isCurrentActive && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-200 text-slate-950 border border-amber-300">
                          Espace Sélectionné
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

                    {/* Company Stats Bar */}
                    <div className="flex flex-wrap items-center gap-4 text-xs font-semibold pt-1 text-slate-500">
                      <span>Devise : <strong className="text-slate-900">{company.currency}</strong></span>
                      <span>•</span>
                      <span>CA : <strong className="text-emerald-700">{(company.stats?.totalSalesAmount || 0).toLocaleString('fr-FR')} {company.currency}</strong></span>
                      <span>•</span>
                      <span>Transactions : <strong className="text-slate-900">{(company.stats?.totalTransactions || 0).toLocaleString('fr-FR')}</strong></span>
                      <span>•</span>
                      <span>Créé le : <strong className="text-slate-700">{new Date(company.createdAt).toLocaleDateString('fr-FR')}</strong></span>
                    </div>
                  </div>

                  {/* Right actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {/* Impersonate / Switch Space Button (Only for associated company) */}
                    {canAccessCompanySpace(company) ? (
                      <button
                        onClick={() => switchCompanySpace(isCurrentActive ? null : company.id)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition shadow-xs cursor-pointer ${
                          isCurrentActive
                            ? 'bg-slate-900 text-amber-400 hover:bg-slate-800'
                            : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                        }`}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>{isCurrentActive ? "Espace En Cours" : "Accéder à mon Bar"}</span>
                      </button>
                    ) : (
                      <div
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-500 rounded-xl text-xs font-bold border border-slate-200 select-none cursor-default"
                        title="Espace confidentiel réservé au gérant de cet établissement"
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
                          : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                      }`}
                    >
                      {isSuspended ? 'Réactiver' : 'Suspendre'}
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => handleOpenEditModal(company)}
                      className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                      title="Modifier les informations"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => {
                        if (confirm(`Êtes-vous sûr de vouloir supprimer définitivement l'établissement "${company.name}" ?`)) {
                          deleteCompany(company.id);
                        }
                      }}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
                      title="Supprimer cet établissement"
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
