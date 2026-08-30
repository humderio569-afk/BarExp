import React, { useState } from 'react';
import { useBar } from '../../context/BarContext';
import { BusinessSector, RoleLabelsConfig } from '../../types';
import { SECTOR_PRESETS } from '../../data/sectorPresets';
import { EnterpriseReportModal } from '../Reports/EnterpriseReportModal';
import { 
  Settings, 
  Save, 
  Upload, 
  Check, 
  Image as ImageIcon, 
  Trash2,
  Briefcase,
  Building,
  Fuel,
  BookOpen,
  Wine,
  ShoppingBag,
  Scale,
  Sparkles,
  Users,
  UserCheck,
  Tag,
  AlertTriangle,
  X
} from 'lucide-react';

export const SettingsModal: React.FC = () => {
  const { 
    settings, 
    updateSettings, 
    applyBusinessSectorPreset, 
    currentUser, 
    allUsers, 
    preRegistrations,
    activeCompany 
  } = useBar();

  const [barName, setBarName] = useState(settings.barName);
  const [tagline, setTagline] = useState(settings.tagline);
  const [address, setAddress] = useState(settings.address);
  const [phone, setPhone] = useState(settings.phone);
  const [currency, setCurrency] = useState(settings.currency);
  const [cashierName, setCashierName] = useState(settings.cashierName);
  const [cashierUserId, setCashierUserId] = useState<string>(settings.cashierUserId || '');
  const [logo, setLogo] = useState<string>(settings.logo || '');
  const [majorTransactionThreshold, setMajorTransactionThreshold] = useState<number>(settings.majorTransactionThreshold || 2500);
  const [nifCif, setNifCif] = useState(settings.nifCif || '');
  const [rcNumber, setRcNumber] = useState(settings.rcNumber || '');
  const [taxRate, setTaxRate] = useState<number>(settings.taxRate ?? 10);

  // Role Customization State
  const [customRoleAdmin, setCustomRoleAdmin] = useState(settings.customRoleLabels?.admin || '');
  const [customRoleManager, setCustomRoleManager] = useState(settings.customRoleLabels?.manager || '');
  const [customRoleEmployee, setCustomRoleEmployee] = useState(settings.customRoleLabels?.employee || '');

  // Business Sector state
  const [selectedSector, setSelectedSector] = useState<BusinessSector>(settings.businessSector || 'bar_restaurant');
  const [showSectorConfirmModal, setShowSectorConfirmModal] = useState(false);
  const [pendingSector, setPendingSector] = useState<BusinessSector | null>(null);
  const [sectorApplyMode, setSectorApplyMode] = useState<'replace' | 'merge'>('replace');
  const [isApplyingSector, setIsApplyingSector] = useState(false);

  // Official Report Modal
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportModalType, setReportModalType] = useState<'tax_compliance_dgi' | 'bank_credit_statement' | 'consolidated_financial'>('consolidated_financial');

  const [isSaved, setIsSaved] = useState(false);

  // Company registered members for cashier selection
  const approvedMembers = allUsers.filter(u => 
    u.status === 'approved' && (!activeCompany || u.companyId === activeCompany.id || u.email.toLowerCase() === activeCompany.adminEmail.toLowerCase())
  );

  const companyPreRegs = preRegistrations.filter(p =>
    !activeCompany || p.companyId === activeCompany.id || p.companyCode.toUpperCase() === activeCompany.code.toUpperCase()
  );

  const handleSelectCashierMember = (val: string) => {
    if (val === 'self_admin') {
      const adminName = currentUser?.displayName || currentUser?.email.split('@')[0] || 'Administrateur';
      setCashierName(adminName);
      setCashierUserId('self_admin');
      return;
    }

    const member = approvedMembers.find(m => m.uid === val);
    if (member) {
      setCashierName(member.displayName || member.email.split('@')[0]);
      setCashierUserId(member.uid);
      return;
    }

    const preReg = companyPreRegs.find(p => p.id === val);
    if (preReg) {
      setCashierName(preReg.name);
      setCashierUserId(preReg.id);
      return;
    }

    if (val === 'custom') {
      setCashierUserId('custom');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const customRoleLabels: RoleLabelsConfig = {
      admin: customRoleAdmin.trim() || undefined,
      manager: customRoleManager.trim() || undefined,
      employee: customRoleEmployee.trim() || undefined,
      cashier: cashierName.trim() || undefined,
    };

    updateSettings({
      barName,
      tagline,
      address,
      phone,
      currency,
      cashierName,
      cashierUserId,
      customRoleLabels,
      logo,
      majorTransactionThreshold: Number(majorTransactionThreshold) || 2500,
      nifCif,
      rcNumber,
      taxRate: Number(taxRate) || 0,
      businessSector: selectedSector,
      businessSectorName: SECTOR_PRESETS[selectedSector]?.name || 'Établissement Commercial',
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Le fichier image est trop grand. Veuillez choisir une image de moins de 2 Mo.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setLogo(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleTriggerSectorChange = (sector: BusinessSector) => {
    if (sector === (settings.businessSector || 'bar_restaurant')) {
      setSelectedSector(sector);
      return;
    }
    setPendingSector(sector);
    setShowSectorConfirmModal(true);
  };

  const handleConfirmSectorApply = async () => {
    if (!pendingSector) return;
    try {
      setIsApplyingSector(true);
      await applyBusinessSectorPreset(pendingSector, sectorApplyMode === 'replace');
      setSelectedSector(pendingSector);
      setShowSectorConfirmModal(false);
      setPendingSector(null);
    } catch (err) {
      console.error("Erreur lors de l'application du secteur :", err);
      alert("Une erreur est survenue lors de la configuration du secteur.");
    } finally {
      setIsApplyingSector(false);
    }
  };

  const getSectorIcon = (sectorId: BusinessSector) => {
    switch (sectorId) {
      case 'print_cyber': return <Briefcase className="w-4 h-4 text-slate-500" />;
      case 'gas_station': return <Fuel className="w-4 h-4 text-slate-500" />;
      case 'stationery_bookstore': return <BookOpen className="w-4 h-4 text-slate-500" />;
      case 'bar_restaurant': return <Wine className="w-4 h-4 text-slate-500" />;
      case 'general_retail': return <ShoppingBag className="w-4 h-4 text-slate-500" />;
      default: return <Building className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-4 text-slate-900 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2.5">
          <Settings className="w-5 h-5 text-slate-600" />
          <div>
            <h1 className="text-base font-bold text-slate-900">Paramètres de l'Établissement</h1>
            <p className="text-xs text-slate-500">
              Secteur d'activité, profil fiscal et tickets de caisse
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isSaved && (
            <span className="bg-slate-100 text-slate-800 border border-slate-200 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1">
              <Check className="w-3.5 h-3.5 text-slate-700" />
              <span>Enregistré</span>
            </span>
          )}

          <button
            type="button"
            onClick={() => {
              setReportModalType('tax_compliance_dgi');
              setShowReportModal(true);
            }}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition flex items-center gap-1.5 cursor-pointer"
          >
            <Scale className="w-3.5 h-3.5 text-slate-300" />
            <span>Rapports Fiscaux & DGI</span>
          </button>
        </div>
      </div>

      {/* Sector Selector */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-slate-500" />
            <h2 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
              Secteur d'Activité
            </h2>
          </div>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
            {SECTOR_PRESETS[selectedSector]?.name || 'Bar / Restaurant'}
          </span>
        </div>

        {/* Sector Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {(Object.keys(SECTOR_PRESETS) as BusinessSector[]).map((sectorKey) => {
            const preset = SECTOR_PRESETS[sectorKey];
            const isSelected = selectedSector === sectorKey;
            return (
              <button
                key={sectorKey}
                type="button"
                onClick={() => handleTriggerSectorChange(sectorKey)}
                className={`py-1.5 px-2 rounded-lg border text-left transition flex items-center justify-between gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'border-amber-500 bg-amber-50 text-slate-950 font-bold'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-100 text-slate-700 font-medium'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-5 h-5 rounded bg-white border border-slate-200 flex items-center justify-center shrink-0">
                    {getSectorIcon(sectorKey)}
                  </div>
                  <span className="text-xs truncate">{preset.name}</span>
                </div>
                {isSelected && (
                  <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Profile & Identification de l'Entreprise */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
          <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
            <h2 className="font-bold text-slate-900 text-xs">Profil de l'Établissement</h2>
            <Building className="w-3.5 h-3.5 text-slate-400" />
          </div>

          <div className="space-y-2.5 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Logo</label>
              <div className="flex items-center gap-2.5 bg-slate-50 p-2 border border-slate-200 rounded-lg">
                {logo ? (
                  <div className="relative shrink-0">
                    <img
                      src={logo}
                      alt="Logo"
                      className="w-10 h-10 object-contain rounded border border-slate-200 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setLogo('')}
                      className="absolute -top-1 -right-1 bg-red-500 text-white p-0.5 rounded-full hover:bg-red-600 transition"
                      title="Supprimer"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded bg-slate-100 text-slate-400 border border-slate-200 flex items-center justify-center shrink-0">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                )}

                <div className="flex-1">
                  <label className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer transition">
                    <Upload className="w-3 h-3 text-slate-500" />
                    <span>{logo ? 'Changer le logo' : 'Charger une image'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nom de l'Établissement *</label>
              <input
                type="text"
                required
                value={barName}
                onChange={(e) => setBarName(e.target.value)}
                placeholder="Ex: Bar Le Spot"
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold p-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 focus:bg-white text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Slogan / Description</label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 p-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Adresse</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 p-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Téléphone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 p-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Fiscalité, DGI & Poste de Caisse */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
          <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
            <h2 className="font-bold text-slate-900 text-xs">Fiscalité & Poste de Caisse</h2>
            <Scale className="w-3.5 h-3.5 text-slate-400" />
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">NIF / Patente (DGI)</label>
                <input
                  type="text"
                  placeholder="000-000-000-0"
                  value={nifCif}
                  onChange={(e) => setNifCif(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 p-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Registre du Commerce</label>
                <input
                  type="text"
                  placeholder="RC-2024-B-000"
                  value={rcNumber}
                  onChange={(e) => setRcNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 p-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Taxe légale (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 p-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Devise</label>
                <input
                  type="text"
                  required
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-amber-600 font-bold p-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
                />
              </div>
            </div>

            {/* Affectation Poste de Caisse */}
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <label className="block font-semibold text-slate-800 flex items-center gap-1">
                  <Users className="w-3 h-3 text-slate-500" />
                  <span>Caissier(e) Titulaire</span>
                </label>
                <button
                  type="button"
                  onClick={() => handleSelectCashierMember('self_admin')}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 hover:text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 transition cursor-pointer"
                >
                  <UserCheck className="w-2.5 h-2.5" />
                  <span>M'assigner</span>
                </button>
              </div>

              <div className="space-y-1.5">
                <select
                  value={cashierUserId || (approvedMembers.find(m => m.displayName === cashierName)?.uid || 'custom')}
                  onChange={(e) => handleSelectCashierMember(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-900 p-2 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <optgroup label="Direction">
                    <option value="self_admin">
                      {currentUser?.displayName || 'Administrateur'} (Moi-même)
                    </option>
                  </optgroup>

                  {approvedMembers.length > 0 && (
                    <optgroup label="Membres de l'établissement">
                      {approvedMembers.map(member => (
                        <option key={member.uid} value={member.uid}>
                          {member.displayName} ({member.email})
                        </option>
                      ))}
                    </optgroup>
                  )}

                  {companyPreRegs.length > 0 && (
                    <optgroup label="Personnel pré-inscrit">
                      {companyPreRegs.map(preReg => (
                        <option key={preReg.id} value={preReg.id}>
                          {preReg.name} ({preReg.email})
                        </option>
                      ))}
                    </optgroup>
                  )}

                  <optgroup label="Autre">
                    <option value="custom">Nom libre...</option>
                  </optgroup>
                </select>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-500 shrink-0">Nom sur ticket :</span>
                  <input
                    type="text"
                    required
                    value={cashierName}
                    onChange={(e) => {
                      setCashierName(e.target.value);
                      setCashierUserId('custom');
                    }}
                    placeholder="Nom du/de la caissier(e)"
                    className="w-full bg-white border border-slate-200 text-slate-900 font-semibold px-2 py-1 rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Custom Role Labels */}
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
              <div className="flex items-center gap-1">
                <Tag className="w-3 h-3 text-slate-500" />
                <label className="text-xs font-semibold text-slate-800">
                  Intitulés de Rôles
                </label>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">Admin</label>
                  <input
                    type="text"
                    placeholder="Gérant"
                    value={customRoleAdmin}
                    onChange={(e) => setCustomRoleAdmin(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-900 p-1.5 rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">Manager</label>
                  <input
                    type="text"
                    placeholder="Chef"
                    value={customRoleManager}
                    onChange={(e) => setCustomRoleManager(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-900 p-1.5 rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">Employé</label>
                  <input
                    type="text"
                    placeholder="Caissier"
                    value={customRoleEmployee}
                    onChange={(e) => setCustomRoleEmployee(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-900 p-1.5 rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Seuil de confirmation ({currency})
              </label>
              <input
                type="number"
                min="100"
                step="100"
                required
                value={majorTransactionThreshold}
                onChange={(e) => setMajorTransactionThreshold(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 p-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="md:col-span-2 flex justify-end">
          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Enregistrer les Paramètres</span>
          </button>
        </div>
      </form>

      {/* Sector Preset Confirmation Modal */}
      {showSectorConfirmModal && pendingSector && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-4 max-w-md w-full border border-slate-200 animate-in fade-in zoom-in-95 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Appliquer le secteur : {SECTOR_PRESETS[pendingSector].name}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowSectorConfirmModal(false);
                  setPendingSector(null);
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Choisissez comment adapter votre catalogue de produits actuel :
            </p>

            <div className="space-y-2 text-xs">
              <label className={`p-2.5 rounded-lg border flex items-start gap-2.5 cursor-pointer transition ${
                sectorApplyMode === 'replace' ? 'border-amber-500 bg-amber-50/50 font-semibold' : 'border-slate-200 bg-slate-50'
              }`}>
                <input
                  type="radio"
                  name="sectorMode"
                  checked={sectorApplyMode === 'replace'}
                  onChange={() => setSectorApplyMode('replace')}
                  className="mt-0.5 text-amber-500 focus:ring-amber-500"
                />
                <div>
                  <span className="text-slate-900 block">Remplacer le catalogue</span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    Installe les articles et catégories par défaut du secteur.
                  </span>
                </div>
              </label>

              <label className={`p-2.5 rounded-lg border flex items-start gap-2.5 cursor-pointer transition ${
                sectorApplyMode === 'merge' ? 'border-amber-500 bg-amber-50/50 font-semibold' : 'border-slate-200 bg-slate-50'
              }`}>
                <input
                  type="radio"
                  name="sectorMode"
                  checked={sectorApplyMode === 'merge'}
                  onChange={() => setSectorApplyMode('merge')}
                  className="mt-0.5 text-amber-500 focus:ring-amber-500"
                />
                <div>
                  <span className="text-slate-900 block">Fusionner</span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    Conserve les articles existants et ajoute les catégories du secteur.
                  </span>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isApplyingSector}
                onClick={() => {
                  setShowSectorConfirmModal(false);
                  setPendingSector(null);
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-lg cursor-pointer"
              >
                Annuler
              </button>

              <button
                type="button"
                disabled={isApplyingSector}
                onClick={handleConfirmSectorApply}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition cursor-pointer flex items-center gap-1"
              >
                {isApplyingSector ? "Application..." : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Report Modal */}
      {showReportModal && (
        <EnterpriseReportModal
          defaultReportType={reportModalType}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
};
