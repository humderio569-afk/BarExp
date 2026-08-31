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
  TrendingUp,
  Receipt,
  Users,
  Phone,
  Mail,
  AlertTriangle,
  Trash2,
  Edit2,
  ShieldCheck,
  X
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
    <div className="space-y-4">
      {/* Impersonation Alert Banner */}
      {isImpersonating && (
        <div className="p-3.5 bg-amber-500 text-slate-950 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-5 h-5 shrink-0" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider">Supervision d'établissement</p>
              <p className="text-xs font-semibold">
                Espace actif : {activeCompany?.name} ({activeCompany?.code})
              </p>
            </div>
          </div>
          <button
            onClick={() => switchCompanySpace(null)}
            className="bg-slate-950 hover:bg-slate-900 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition cursor-pointer shrink-0"
          >
            Quitter la supervision
          </button>
        </div>
      )}

      {/* Platform Overview Metrics */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-600" />
              Vue d'Ensemble des Établissements
            </h3>
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ajouter un Établissement</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Total Companies */}
          <div className="p-3.5 bg-white border border-slate-200 rounded-xl">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
              <span>Établissements</span>
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-slate-900">{platformStats.totalCompanies}</span>
              <span className="text-xs text-slate-500">
                ({platformStats.activeCompanies} actifs)
              </span>
            </div>
          </div>

          {/* Total Revenue */}
          <div className="p-3.5 bg-white border border-slate-200 rounded-xl">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
              <span>CA Réseau Global</span>
              <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-slate-900">
                {platformStats.totalPlatformRevenue.toLocaleString('fr-FR')}
              </span>
              <span className="text-xs text-slate-500">{settings.currency || 'G'}</span>
            </div>
          </div>

          {/* Total Transactions */}
          <div className="p-3.5 bg-white border border-slate-200 rounded-xl">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
              <span>Transactions</span>
              <Receipt className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-slate-900">
                {platformStats.totalPlatformTransactions.toLocaleString('fr-FR')}
              </span>
              <span className="text-xs text-slate-500">tickets</span>
            </div>
          </div>

          {/* Total Staff */}
          <div className="p-3.5 bg-white border border-slate-200 rounded-xl">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
              <span>Personnel Réseau</span>
              <Users className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-slate-900">{platformStats.totalStaffCount}</span>
              <span className="text-xs text-slate-500">utilisateurs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Companies List Section */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {/* Search & Filter Bar */}
        <div className="p-3 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher par nom, code, gérant..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-center gap-1 w-full sm:w-auto">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer border ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white font-bold border-slate-900 shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Tous ({companies.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer border ${
                statusFilter === 'active'
                  ? 'bg-slate-900 text-white font-bold border-slate-900 shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Actifs ({companies.filter(c => c.status === 'active').length})
            </button>
            <button
              onClick={() => setStatusFilter('suspended')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer border ${
                statusFilter === 'suspended'
                  ? 'bg-slate-900 text-white font-bold border-slate-900 shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Suspendus ({companies.filter(c => c.status === 'suspended').length})
            </button>
          </div>
        </div>

        {/* Company Cards Grid */}
        <div className="divide-y divide-slate-100">
          {filteredCompanies.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Aucun établissement ne correspond aux critères de recherche.
            </div>
          ) : (
            filteredCompanies.map(company => {
              const isCurrentActive = activeCompany?.id === company.id;
              const isSuspended = company.status === 'suspended';

              return (
                <div
                  key={company.id}
                  className={`p-3.5 transition flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${
                    isCurrentActive
                      ? 'bg-slate-50 border-l-2 border-amber-500'
                      : isSuspended
                      ? 'bg-slate-50/50 opacity-70'
                      : 'hover:bg-slate-50/60'
                  }`}
                >
                  {/* Left info */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">
                        {company.name}
                      </h4>

                      {/* 8-Char Code Badge with Copy button */}
                      <button
                        onClick={() => handleCopyCode(company.code)}
                        title="Copier le code de l'établissement"
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-xs font-mono font-semibold border border-slate-200 transition cursor-pointer"
                      >
                        <span>{company.code}</span>
                        {copiedCode === company.code ? (
                          <Check className="w-3 h-3 text-slate-700" />
                        ) : (
                          <Copy className="w-3 h-3 text-slate-400" />
                        )}
                      </button>

                      {/* Status Tag */}
                      {isSuspended ? (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-red-50 text-red-700 border border-red-200">
                          Suspendu
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          Actif
                        </span>
                      )}

                      {isCurrentActive && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                          Espace Actif
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
                        <span className="truncate">Admin : <strong className="text-slate-800">{company.adminEmail}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Tél : <strong className="text-slate-800">{company.phone || 'Non renseigné'}</strong></span>
                      </div>
                    </div>

                    {/* Company Stats Bar */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-0.5">
                      <span>Devise : <strong className="text-slate-800">{company.currency}</strong></span>
                      <span>&bull;</span>
                      <span>CA : <strong className="text-slate-800">{(company.stats?.totalSalesAmount || 0).toLocaleString('fr-FR')} {company.currency}</strong></span>
                      <span>&bull;</span>
                      <span>Transactions : <strong className="text-slate-800">{(company.stats?.totalTransactions || 0).toLocaleString('fr-FR')}</strong></span>
                    </div>
                  </div>

                  {/* Right actions */}
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    {/* Switch Space Button */}
                    {canAccessCompanySpace(company) ? (
                      <button
                        onClick={() => switchCompanySpace(isCurrentActive ? null : company.id)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                          isCurrentActive
                            ? 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200'
                            : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900 font-bold shadow-2xs'
                        }`}
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>{isCurrentActive ? "En cours" : "Accéder"}</span>
                      </button>
                    ) : (
                      <div
                        className="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 text-slate-400 rounded-lg text-xs border border-slate-200 select-none cursor-default"
                        title="Espace confidentiel réservé au gérant de cet établissement"
                      >
                        <ShieldCheck className="w-3 h-3 text-slate-400" />
                        <span>Espace Dédié</span>
                      </div>
                    )}

                    {/* Suspend / Reactivate */}
                    <button
                      onClick={() => toggleCompanyStatus(company.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                        isSuspended
                          ? 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {isSuspended ? 'Réactiver' : 'Suspendre'}
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => handleOpenEditModal(company)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer border border-transparent hover:border-slate-200"
                      title="Modifier les informations"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => {
                        if (confirm(`Êtes-vous sûr de vouloir supprimer définitivement l'établissement "${company.name}" ?`)) {
                          deleteCompany(company.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                      title="Supprimer cet établissement"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  {editingCompany ? "Modifier l'Établissement" : "Créer un Établissement"}
                </h3>
              </div>

              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitForm} className="p-4 space-y-3 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Company Name */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700">
                    Nom de l'Établissement *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Bar Le Spot"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                {/* 8-Character Unique Code */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">
                      Code (8 Caractères) *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const prefix = (formName.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase()) || 'BAR';
                        const randomDigits = Math.floor(10000 + Math.random() * 90000);
                        setFormCode(`${prefix.padEnd(3, 'X')}${randomDigits}`.slice(0, 8));
                      }}
                      className="text-[10px] text-amber-600 hover:text-amber-700 font-semibold underline cursor-pointer"
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
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 uppercase"
                  />
                </div>

                {/* Manager Name */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Nom du Gérant *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Jean Duval"
                    value={formManager}
                    onChange={(e) => setFormManager(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                {/* Admin Google Email */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700">
                    Email Google de l'Administrateur *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="admin@gmail.com"
                    value={formAdminEmail}
                    onChange={(e) => setFormAdminEmail(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Téléphone
                  </label>
                  <input
                    type="text"
                    placeholder="+509 3700-0000"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                {/* Currency */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Devise
                  </label>
                  <select
                    value={formCurrency}
                    onChange={(e) => setFormCurrency(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="G">Gourdes (G / HTG)</option>
                    <option value="$">Dollars US ($)</option>
                    <option value="€">Euros (€)</option>
                    <option value="FCFA">Franc CFA (FCFA)</option>
                  </select>
                </div>

                {/* Address */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700">
                    Adresse
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 42 Rue Panaméricaine"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition disabled:opacity-50 cursor-pointer shadow-2xs"
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
