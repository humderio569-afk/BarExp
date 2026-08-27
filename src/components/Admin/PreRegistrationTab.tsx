import React, { useState } from 'react';
import { useBar } from '../../context/BarContext';
import { PreRegisteredEmployee, UserRole, UserPermissions } from '../../types';
import {
  Users,
  Plus,
  Copy,
  Check,
  KeyRound,
  Mail,
  ShieldCheck,
  Trash2,
  Edit2,
  Sparkles,
  AlertCircle,
  Building2,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  UserPlus,
  Search,
  Filter,
  ShieldAlert,
  UserCheck,
  RefreshCw
} from 'lucide-react';

export const PreRegistrationTab: React.FC = () => {
  const {
    activeCompany,
    settings,
    preRegistrations,
    preRegisterEmployee,
    updatePreRegistration,
    deletePreRegistration,
    allUsers,
    isSuperAdmin
  } = useBar();

  const [copiedCompanyCode, setCopiedCompanyCode] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPreReg, setEditingPreReg] = useState<PreRegisteredEmployee | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PreRegisteredEmployee | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'manager' | 'employee'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pre_registered' | 'claimed'>('all');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState<'admin' | 'manager' | 'employee'>('employee');
  const [formPin, setFormPin] = useState('');
  const [visiblePins, setVisiblePins] = useState<Record<string, boolean>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Custom permissions state
  const [canAccessStock, setCanAccessStock] = useState(true);
  const [canManageStock, setCanManageStock] = useState(false);
  const [canViewCostPrices, setCanViewCostPrices] = useState(false);
  const [canAccessExpenses, setCanAccessExpenses] = useState(true);
  const [canAccessReports, setCanAccessReports] = useState(false);
  const [canAccessSettings, setCanAccessSettings] = useState(false);
  const [canManageUsers, setCanManageUsers] = useState(false);

  const currentCompanyCode = activeCompany?.code || settings.companyCode || 'BAR88412';
  const currentCompanyName = activeCompany?.name || settings.barName;

  // Filter pre-registrations belonging to this company
  const companyPreRegistrations = preRegistrations.filter(
    p => p.companyCode.toUpperCase() === currentCompanyCode.toUpperCase() ||
         (activeCompany && p.companyId === activeCompany.id)
  );

  const filteredStaff = companyPreRegistrations.filter(p => {
    const matchesSearch = searchQuery === '' ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.pinCode && p.pinCode.includes(searchQuery));
    
    const matchesRole = roleFilter === 'all' || p.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentCompanyCode);
    setCopiedCompanyCode(true);
    setTimeout(() => setCopiedCompanyCode(false), 2000);
  };

  const handleRoleChange = (role: 'admin' | 'manager' | 'employee') => {
    setFormRole(role);
    if (role === 'admin') {
      setCanAccessStock(true);
      setCanManageStock(true);
      setCanViewCostPrices(true);
      setCanAccessExpenses(true);
      setCanAccessReports(true);
      setCanAccessSettings(true);
      setCanManageUsers(true);
    } else if (role === 'manager') {
      setCanAccessStock(true);
      setCanManageStock(true);
      setCanViewCostPrices(false);
      setCanAccessExpenses(true);
      setCanAccessReports(true);
      setCanAccessSettings(false);
      setCanManageUsers(false);
    } else {
      setCanAccessStock(true);
      setCanManageStock(false);
      setCanViewCostPrices(false);
      setCanAccessExpenses(true);
      setCanAccessReports(false);
      setCanAccessSettings(false);
      setCanManageUsers(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingPreReg(null);
    setFormName('');
    setFormEmail('');
    setFormRole('employee');
    const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
    setFormPin(randomPin);
    handleRoleChange('employee');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: PreRegisteredEmployee) => {
    setEditingPreReg(item);
    setFormName(item.name);
    setFormEmail(item.email);
    setFormRole(item.role);
    setFormPin(item.pinCode || '');
    setCanAccessStock(item.permissions?.canAccessStock !== false);
    setCanManageStock(item.permissions?.canManageStock === true);
    setCanViewCostPrices(item.permissions?.canViewCostPrices === true);
    setCanAccessExpenses(item.permissions?.canAccessExpenses !== false);
    setCanAccessReports(item.permissions?.canAccessReports === true);
    setCanAccessSettings(item.permissions?.canAccessSettings === true);
    setCanManageUsers(item.permissions?.canManageUsers === true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const togglePinVisibility = (id: string) => {
    setVisiblePins(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleExecuteDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deletePreRegistration(deleteTarget.id, true);
      showToast(`L'employé "${deleteTarget.name}" a été définitivement supprimé.`);
      setDeleteTarget(null);
    } catch (err) {
      console.error("Erreur suppression:", err);
      alert("Une erreur est survenue lors de la suppression.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formName.trim()) {
      setFormError("Le nom de l'employé est requis.");
      return;
    }

    if (!formEmail.trim() || !formEmail.includes('@')) {
      setFormError("L'adresse email Google est requise pour l'association.");
      return;
    }

    if (formPin.trim() && (formPin.trim().length < 4 || formPin.trim().length > 6)) {
      setFormError("Le code PIN doit comporter entre 4 et 6 chiffres.");
      return;
    }

    setIsSubmitting(true);
    try {
      const perms: UserPermissions = {
        canAccessPOS: true,
        canAccessStock,
        canManageStock,
        canViewCostPrices,
        canAccessExpenses,
        canAccessReports,
        canAccessSettings,
        canAccessChat: true,
        canManageUsers,
      };

      if (editingPreReg) {
        await updatePreRegistration(editingPreReg.id, {
          name: formName.trim(),
          email: formEmail.trim().toLowerCase(),
          role: formRole,
          pinCode: formPin.trim() || undefined,
          permissions: perms,
        });
        showToast(`Pré-inscription mise à jour pour "${formName.trim()}".`);
      } else {
        await preRegisterEmployee({
          name: formName.trim(),
          email: formEmail.trim().toLowerCase(),
          role: formRole,
          pinCode: formPin.trim() || undefined,
          permissions: perms,
          companyId: activeCompany?.id,
          companyCode: currentCompanyCode,
        });
        showToast(`Nouvel employé "${formName.trim()}" pré-inscrit avec succès !`);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error(err);
      setFormError("Erreur lors de l'enregistrement de l'employé.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalCount = companyPreRegistrations.length;
  const claimedCount = companyPreRegistrations.filter(p => p.status === 'claimed').length;
  const pendingCount = totalCount - claimedCount;

  return (
    <div className="space-y-4">
      
      {/* Toast Feedback */}
      {successToast && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between shadow-xs animate-fadeIn">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            {successToast}
          </span>
          <button onClick={() => setSuccessToast(null)} className="text-emerald-700 hover:text-emerald-950 font-black ml-2 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* MINIMALIST & SLEEK COMPANY CODE CARD */}
      <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-900">{currentCompanyName}</span>
              <span className="bg-slate-100 text-slate-700 text-[10px] font-semibold px-2 py-0.2 rounded-md">
                {settings.businessSectorName || 'Entreprise'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Code d'accès pour rattacher automatiquement les employés lors de leur connexion.
            </p>
          </div>
        </div>

        {/* Minimalist Code Chip with 1-Click Copy */}
        <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl shrink-0 self-start sm:self-center">
          <span className="text-[10px] uppercase font-bold text-slate-400">Code :</span>
          <span className="font-mono font-black text-sm text-slate-900 tracking-wider select-all">
            {currentCompanyCode}
          </span>
          <button
            type="button"
            onClick={handleCopyCode}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              copiedCompanyCode
                ? 'bg-emerald-500 text-white'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-2xs'
            }`}
            title="Copier le code de l'établissement"
          >
            {copiedCompanyCode ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copié</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copier</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* STAFF MANAGEMENT & POWER CONTROLS */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        
        {/* Header toolbar */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 bg-slate-50/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-600" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                Personnel & Pré-inscriptions ({totalCount})
              </h3>
            </div>

            {/* Micro stats */}
            <div className="hidden sm:flex items-center gap-1.5 text-[10.5px]">
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-md border border-emerald-200">
                {claimedCount} actifs
              </span>
              <span className="px-2 py-0.5 bg-amber-50 text-amber-800 font-bold rounded-md border border-amber-200">
                {pendingCount} en attente
              </span>
            </div>
          </div>

          {/* Action buttons & Search */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher nom, email, PIN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="all">Tous les rôles</option>
              <option value="employee">Serveurs / Caissiers</option>
              <option value="manager">Gérants</option>
              <option value="admin">Administrateurs</option>
            </select>

            {/* Pre-Register New Staff Button */}
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-lg shadow-2xs flex items-center gap-1.5 transition cursor-pointer active:scale-95 shrink-0"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Pré-inscrire</span>
            </button>
          </div>
        </div>

        {/* Staff Table / List */}
        <div className="divide-y divide-slate-100">
          {filteredStaff.length === 0 ? (
            <div className="p-10 text-center text-slate-400">
              <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-bold text-slate-600">
                {searchQuery || roleFilter !== 'all'
                  ? 'Aucun résultat correspondant aux filtres'
                  : 'Aucun employé pré-inscrit pour le moment'}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Utilisez le bouton "Pré-inscrire" ci-dessus pour ajouter des employés avec code PIN caisse et droits sur mesure.
              </p>
            </div>
          ) : (
            filteredStaff.map((item) => {
              const isClaimed = item.status === 'claimed';
              const showPin = visiblePins[item.id];

              return (
                <div
                  key={item.id}
                  className="p-3.5 sm:p-4 hover:bg-slate-50/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-xs sm:text-sm text-slate-900">{item.name}</span>
                      
                      {/* Role Pill */}
                      <span className={`px-2 py-0.2 rounded-md text-[9.5px] font-black uppercase tracking-wider ${
                        item.role === 'admin'
                          ? 'bg-purple-100 text-purple-800'
                          : item.role === 'manager'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {item.role === 'admin' ? 'Admin' : item.role === 'manager' ? 'Gérant' : 'Serveur / Caisse'}
                      </span>

                      {/* Status */}
                      {isClaimed ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Compte associé
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          En attente
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <div className="flex items-center gap-1 text-[11px] truncate">
                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{item.email}</span>
                      </div>

                      {/* PIN Code Box */}
                      {item.pinCode && (
                        <div className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                          <KeyRound className="w-3 h-3 text-amber-600 shrink-0" />
                          <span className="font-mono font-bold text-slate-800">
                            PIN : {showPin ? item.pinCode : '••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePinVisibility(item.id)}
                            className="text-slate-400 hover:text-slate-700 ml-1 cursor-pointer"
                            title={showPin ? "Masquer" : "Afficher"}
                          >
                            {showPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Permissions tags */}
                    <div className="flex flex-wrap items-center gap-1 pt-0.5 text-[9.5px] text-slate-600">
                      {item.permissions?.canAccessPOS !== false && <span className="bg-slate-100 px-1.5 py-0.2 rounded">Caisse</span>}
                      {item.permissions?.canManageStock && <span className="bg-slate-100 px-1.5 py-0.2 rounded font-semibold text-slate-800">Stock</span>}
                      {item.permissions?.canAccessExpenses && <span className="bg-slate-100 px-1.5 py-0.2 rounded">Dépenses</span>}
                      {item.permissions?.canAccessReports && <span className="bg-slate-100 px-1.5 py-0.2 rounded font-semibold text-slate-800">Rapports</span>}
                      {item.permissions?.canAccessSettings && <span className="bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded font-semibold">Paramètres</span>}
                    </div>
                  </div>

                  {/* Actions: Edit & Direct Power Delete */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(item)}
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                      title="Modifier les droits ou le PIN"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    
                    {/* POWER DELETE BUTTON */}
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(item)}
                      className="px-2.5 py-1 text-red-600 hover:bg-red-50 hover:text-red-700 border border-red-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95"
                      title="Supprimer définitivement cet employé"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Supprimer</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* CONFIRM DELETE DIALOG (Empowered & Clear) */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-900">
                  Supprimer l'employé ?
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Êtes-vous sûr de vouloir supprimer définitivement la pré-inscription de <strong className="text-slate-900">{deleteTarget.name}</strong> ({deleteTarget.email}) ?
                </p>
                <p className="text-[11px] text-red-600 font-semibold mt-1">
                  Son code PIN caisse et toutes ses autorisations d'accès seront immédiatement révoqués.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleExecuteDelete}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Suppression...' : 'Supprimer définitivement'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT STAFF MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="bg-slate-900 px-5 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">
                    {editingPreReg ? "Modifier les Droits de l'Employé" : "Pré-inscrire un Employé"}
                  </h3>
                  <p className="text-[10.5px] text-slate-400">
                    Établissement : <span className="text-amber-400 font-bold">{currentCompanyName}</span> ({currentCompanyCode})
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white text-base font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-3">
                {/* Full Name */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800">
                    Nom & Prénom de l'Employé *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Alexandre Pierre"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Email Google */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                    <span>Email Google *</span>
                    <span className="text-[10px] text-slate-400 font-normal">Reconnaissance automatique</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="serveur.nom@gmail.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Role & PIN */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Role */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800">Rôle Opérationnel *</label>
                    <select
                      value={formRole}
                      onChange={(e) => handleRoleChange(e.target.value as 'admin' | 'manager' | 'employee')}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="employee">Serveur / Caissier</option>
                      <option value="manager">Gérant / Superviseur</option>
                      <option value="admin">Administrateur</option>
                    </select>
                  </div>

                  {/* PIN Code */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800">Code PIN Caisse</label>
                      <button
                        type="button"
                        onClick={() => setFormPin(Math.floor(1000 + Math.random() * 9000).toString())}
                        className="text-[10px] text-amber-600 hover:text-amber-700 font-bold underline cursor-pointer"
                      >
                        Générer PIN
                      </button>
                    </div>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="1234"
                      value={formPin}
                      onChange={(e) => setFormPin(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 text-amber-400 font-mono tracking-widest font-black rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                {/* Permissions Grid */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <span className="text-xs font-bold text-slate-800 block">
                    Autorisations & Accès aux modules
                  </span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                      <input
                        type="checkbox"
                        checked={canAccessStock}
                        onChange={(e) => setCanAccessStock(e.target.checked)}
                        className="rounded text-amber-500 focus:ring-amber-400"
                      />
                      <span>Consulter les stocks</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                      <input
                        type="checkbox"
                        checked={canManageStock}
                        onChange={(e) => setCanManageStock(e.target.checked)}
                        className="rounded text-amber-500 focus:ring-amber-400"
                      />
                      <span>Gérer stock & prix</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                      <input
                        type="checkbox"
                        checked={canAccessExpenses}
                        onChange={(e) => setCanAccessExpenses(e.target.checked)}
                        className="rounded text-amber-500 focus:ring-amber-400"
                      />
                      <span>Enregistrer dépenses</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                      <input
                        type="checkbox"
                        checked={canAccessReports}
                        onChange={(e) => setCanAccessReports(e.target.checked)}
                        className="rounded text-amber-500 focus:ring-amber-400"
                      />
                      <span>Rapports financiers</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-slate-700 sm:col-span-2">
                      <input
                        type="checkbox"
                        checked={canAccessSettings}
                        onChange={(e) => setCanAccessSettings(e.target.checked)}
                        className="rounded text-amber-500 focus:ring-amber-400"
                      />
                      <span>Accès aux paramètres de l'établissement</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? "Enregistrement..." : editingPreReg ? "Mettre à jour" : "Pré-inscrire l'Employé"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
