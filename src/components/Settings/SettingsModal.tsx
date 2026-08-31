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
  Users,
  UserCheck,
  Tag,
  AlertTriangle,
  X,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  CheckCircle2,
  FileText
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

  // Accordion open/collapse states for sections
  const [openSections, setOpenSections] = useState<{
    sector: boolean;
    profile: boolean;
    fiscal: boolean;
    staff: boolean;
  }>({
    sector: true,
    profile: true,
    fiscal: true,
    staff: true,
  });

  // Save Confirmation Dialog state
  const [showSaveConfirmModal, setShowSaveConfirmModal] = useState(false);
  const [isSavedSuccess, setIsSavedSuccess] = useState(false);

  // Official Report Modal
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportModalType, setReportModalType] = useState<'tax_compliance_dgi' | 'bank_credit_statement' | 'consolidated_financial'>('consolidated_financial');

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleAllSections = () => {
    const allOpen = Object.values(openSections).every(Boolean);
    setOpenSections({
      sector: !allOpen,
      profile: !allOpen,
      fiscal: !allOpen,
      staff: !allOpen,
    });
  };

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

  const handleOpenSaveConfirmation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barName.trim()) {
      alert("Le nom de l'établissement est obligatoire.");
      return;
    }
    setShowSaveConfirmModal(true);
  };

  const handleExecuteSave = () => {
    const customRoleLabels: RoleLabelsConfig = {
      admin: customRoleAdmin.trim() || undefined,
      manager: customRoleManager.trim() || undefined,
      employee: customRoleEmployee.trim() || undefined,
      cashier: cashierName.trim() || undefined,
    };

    updateSettings({
      barName: barName.trim(),
      tagline: tagline.trim(),
      address: address.trim(),
      phone: phone.trim(),
      currency: currency.trim() || 'HTG',
      cashierName: cashierName.trim(),
      cashierUserId,
      customRoleLabels,
      logo,
      majorTransactionThreshold: Number(majorTransactionThreshold) || 2500,
      nifCif: nifCif.trim(),
      rcNumber: rcNumber.trim(),
      taxRate: Number(taxRate) || 0,
      businessSector: selectedSector,
      businessSectorName: SECTOR_PRESETS[selectedSector]?.name || 'Établissement Commercial',
    });

    setShowSaveConfirmModal(false);
    setIsSavedSuccess(true);
    setTimeout(() => setIsSavedSuccess(false), 3500);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Le fichier image est trop volumineux. Veuillez choisir une image de moins de 2 Mo.");
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
      case 'print_cyber': return <Briefcase className="w-4 h-4 text-slate-700" />;
      case 'gas_station': return <Fuel className="w-4 h-4 text-slate-700" />;
      case 'stationery_bookstore': return <BookOpen className="w-4 h-4 text-slate-700" />;
      case 'bar_restaurant': return <Wine className="w-4 h-4 text-slate-700" />;
      case 'general_retail': return <ShoppingBag className="w-4 h-4 text-slate-700" />;
      default: return <Building className="w-4 h-4 text-slate-700" />;
    }
  };

  const allSectionsOpen = Object.values(openSections).every(Boolean);

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-4 text-slate-900 pb-20 md:pb-6 font-sans">
      
      {/* Toast Feedback */}
      {isSavedSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-950 px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold">Modifications enregistrées avec succès.</span>
              <p className="text-[11px] text-emerald-800 font-normal mt-0.5">
                Les informations de l'établissement, de caisse et de fiscalité ont été mises à jour.
              </p>
            </div>
          </div>
          <button 
            onClick={() => setIsSavedSuccess(false)}
            className="text-emerald-700 hover:text-emerald-950 font-bold px-2 py-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Clean Word-Style Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
            <Settings className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900">Paramètres de l'Établissement</h1>
            <p className="text-xs text-slate-500">
              Configurez le secteur d'activité, les coordonnées, la fiscalité et le poste de caisse.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={toggleAllSections}
            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition flex items-center gap-1.5 cursor-pointer border border-slate-200"
            title={allSectionsOpen ? "Replier tous les blocs" : "Déplier tous les blocs"}
          >
            <ChevronsUpDown className="w-3.5 h-3.5" />
            <span>{allSectionsOpen ? "Tout replier" : "Tout déplier"}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setReportModalType('tax_compliance_dgi');
              setShowReportModal(true);
            }}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition flex items-center gap-1.5 cursor-pointer"
          >
            <Scale className="w-3.5 h-3.5 text-slate-300" />
            <span>Rapports Fiscaux</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleOpenSaveConfirmation} className="space-y-4">
        
        {/* ================= CARD 1: SECTEUR D'ACTIVITÉ (ACCORDION) ================= */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('sector')}
            className="w-full p-3.5 sm:p-4 bg-slate-50/70 hover:bg-slate-100/80 transition flex items-center justify-between gap-3 text-left border-b border-slate-100 cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Briefcase className="w-4 h-4 text-slate-800 shrink-0" />
              <div>
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Secteur d'Activité & Métier
                </h2>
                {!openSections.sector && (
                  <p className="text-[11px] text-slate-500 font-normal truncate mt-0.5">
                    Actuel : <strong className="text-slate-800 font-semibold">{SECTOR_PRESETS[selectedSector]?.name}</strong>
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-slate-900 text-white">
                {SECTOR_PRESETS[selectedSector]?.name}
              </span>
              {openSections.sector ? (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </div>
          </button>

          {openSections.sector && (
            <div className="p-3.5 sm:p-4 space-y-3 bg-white">
              <p className="text-xs text-slate-600">
                Sélectionnez la typologie de votre établissement pour pré-configurer automatiquement les catégories, unités et règles métier.
              </p>

              {/* Sector Options - Clean Minimalist Word style without text truncation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {(Object.keys(SECTOR_PRESETS) as BusinessSector[]).map((sectorKey) => {
                  const preset = SECTOR_PRESETS[sectorKey];
                  const isSelected = selectedSector === sectorKey;
                  return (
                    <button
                      key={sectorKey}
                      type="button"
                      onClick={() => handleTriggerSectorChange(sectorKey)}
                      className={`p-3 rounded-lg border text-left transition flex items-start justify-between gap-2.5 cursor-pointer ${
                        isSelected
                          ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${
                          isSelected ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                        }`}>
                          {getSectorIcon(sectorKey)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className={`text-xs block leading-tight ${isSelected ? 'font-bold text-white' : 'font-semibold text-slate-800'}`}>
                            {preset.name}
                          </span>
                          <span className={`text-[11px] block leading-tight mt-1 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                            {preset.shortLabel}
                          </span>
                        </div>
                      </div>
                      
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-white text-slate-900 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0 mt-1" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ================= TWO-COLUMN MAIN SETTINGS ================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* ================= CARD 2: PROFIL DE L'ÉTABLISSEMENT ================= */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
            <button
              type="button"
              onClick={() => toggleSection('profile')}
              className="w-full p-3.5 sm:p-4 bg-slate-50/70 hover:bg-slate-100/80 transition flex items-center justify-between gap-3 text-left border-b border-slate-100 cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Building className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Profil de l'Établissement
                  </h2>
                  {!openSections.profile && (
                    <p className="text-[11px] text-slate-500 font-normal truncate mt-0.5">
                      {barName || 'Non défini'} &bull; {phone || 'Pas de tél'}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
                {openSections.profile ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {openSections.profile && (
              <div className="p-4 space-y-3 text-xs flex-1 bg-white">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Logo officiel</label>
                  <div className="flex items-center gap-3 bg-slate-50 p-2.5 border border-slate-200 rounded-lg">
                    {logo ? (
                      <div className="relative shrink-0">
                        <img
                          src={logo}
                          alt="Logo"
                          className="w-12 h-12 object-contain rounded border border-slate-200 bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => setLogo('')}
                          className="absolute -top-1.5 -right-1.5 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition shadow-2xs cursor-pointer"
                          title="Supprimer le logo"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-white text-slate-400 border border-slate-200 flex items-center justify-center shrink-0">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                    )}

                    <div className="flex-1">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer transition shadow-2xs">
                        <Upload className="w-3.5 h-3.5 text-slate-500" />
                        <span>{logo ? 'Changer le logo' : 'Téléverser un logo'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                      </label>
                      <p className="text-[10px] text-slate-400 mt-1">PNG, JPG ou SVG (max 2 Mo)</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nom Commercial de l'Établissement *
                  </label>
                  <input
                    type="text"
                    required
                    value={barName}
                    onChange={(e) => setBarName(e.target.value)}
                    placeholder="Ex: Le Spot Resto-Bar"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold p-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 focus:bg-white text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Slogan ou Description courte</label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="Ex: Bar, Grillades & Cocktails d'exception"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 p-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 focus:bg-white text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Adresse Physique</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Ex: 14, Rue Pan Américaine, Pétion-Ville"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 p-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 focus:bg-white text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Téléphone de Contact</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ex: +509 3700-0000"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 p-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 focus:bg-white text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ================= CARD 3: FISCALITÉ & FACTURATION ================= */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
            <button
              type="button"
              onClick={() => toggleSection('fiscal')}
              className="w-full p-3.5 sm:p-4 bg-slate-50/70 hover:bg-slate-100/80 transition flex items-center justify-between gap-3 text-left border-b border-slate-100 cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Scale className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Fiscalité, Monnaie & Facturation
                  </h2>
                  {!openSections.fiscal && (
                    <p className="text-[11px] text-slate-500 font-normal truncate mt-0.5">
                      Devise : {currency} &bull; Taxe : {taxRate}% &bull; NIF : {nifCif || 'N/A'}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
                {openSections.fiscal ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {openSections.fiscal && (
              <div className="p-4 space-y-3 text-xs flex-1 bg-white">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">NIF / Patente (DGI)</label>
                    <input
                      type="text"
                      placeholder="000-000-000-0"
                      value={nifCif}
                      onChange={(e) => setNifCif(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 p-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 focus:bg-white text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Registre du Commerce</label>
                    <input
                      type="text"
                      placeholder="RC-2024-B-000"
                      value={rcNumber}
                      onChange={(e) => setRcNumber(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 p-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 focus:bg-white text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Taxe légale / TCA (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={taxRate}
                      onChange={(e) => setTaxRate(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 p-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 focus:bg-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Devise Principale</label>
                    <input
                      type="text"
                      required
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      placeholder="HTG, USD, EUR..."
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold p-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 focus:bg-white text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Seuil d'Alerte Transaction Majeure ({currency})
                  </label>
                  <input
                    type="number"
                    min="100"
                    step="100"
                    required
                    value={majorTransactionThreshold}
                    onChange={(e) => setMajorTransactionThreshold(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 p-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 focus:bg-white text-xs"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Déclenche une confirmation visuelle lors des ventes dépassant ce montant.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ================= CARD 4: POSTE DE CAISSE & INTITULÉS DE RÔLES ================= */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('staff')}
            className="w-full p-3.5 sm:p-4 bg-slate-50/70 hover:bg-slate-100/80 transition flex items-center justify-between gap-3 text-left border-b border-slate-100 cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Users className="w-4 h-4 text-amber-600 shrink-0" />
              <div>
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Poste de Caisse & Personnalisation des Rôles
                </h2>
                {!openSections.staff && (
                  <p className="text-[11px] text-slate-500 font-normal truncate mt-0.5">
                    Caissier(e) : <strong className="text-slate-800 font-semibold">{cashierName || 'Non désigné'}</strong>
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
              {openSections.staff ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {openSections.staff && (
            <div className="p-4 space-y-3.5 text-xs bg-white">
              {/* Affectation Poste de Caisse */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block font-semibold text-slate-900 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-slate-600" />
                    <span>Affectation du/de la Caissier(e) Titulaire</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleSelectCashierMember('self_admin')}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded border border-amber-300 transition cursor-pointer"
                  >
                    <span>M'assigner</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-slate-600 font-medium mb-1">Sélectionner dans l'équipe</label>
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
                        <option value="custom">Saisie manuelle d'un nom...</option>
                      </optgroup>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-600 font-medium mb-1">Nom imprimé sur le ticket</label>
                    <input
                      type="text"
                      required
                      value={cashierName}
                      onChange={(e) => {
                        setCashierName(e.target.value);
                        setCashierUserId('custom');
                      }}
                      placeholder="Nom du/de la caissier(e)"
                      className="w-full bg-white border border-slate-200 text-slate-900 font-semibold p-2 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Custom Role Labels */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <div className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-slate-500" />
                  <label className="text-xs font-semibold text-slate-900">
                    Intitulés Personnalisés des Rôles (Affichage dans l'application)
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[10.5px] text-slate-600 mb-1">Rôle Administrateur</label>
                    <input
                      type="text"
                      placeholder="Ex: Gérant, Directeur"
                      value={customRoleAdmin}
                      onChange={(e) => setCustomRoleAdmin(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-900 p-2 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] text-slate-600 mb-1">Rôle Manager</label>
                    <input
                      type="text"
                      placeholder="Ex: Responsable de Salle"
                      value={customRoleManager}
                      onChange={(e) => setCustomRoleManager(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-900 p-2 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] text-slate-600 mb-1">Rôle Employé</label>
                    <input
                      type="text"
                      placeholder="Ex: Serveur, Barman, Pompiste"
                      value={customRoleEmployee}
                      onChange={(e) => setCustomRoleEmployee(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-900 p-2 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Global Save Action Bar */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-slate-400" />
            <span>Toutes les modifications sont appliquées immédiatement aux sessions de caisse.</span>
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
          >
            <Save className="w-4 h-4 stroke-[2.5]" />
            <span>Enregistrer les Paramètres</span>
          </button>
        </div>
      </form>

      {/* Save Confirmation Modal */}
      {showSaveConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-5 max-w-md w-full border border-slate-200 shadow-xl animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
                  <Save className="w-4 h-4 text-slate-800" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Confirmer l'enregistrement
                  </h3>
                  <p className="text-[11px] text-slate-500">Mise à jour des paramètres système</p>
                </div>
              </div>
              <button
                onClick={() => setShowSaveConfirmModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs space-y-2 text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <p className="font-semibold text-slate-900 mb-1">Résumé des paramètres à appliquer :</p>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <div><span className="text-slate-500">Établissement :</span> <strong>{barName}</strong></div>
                <div><span className="text-slate-500">Secteur :</span> <strong>{SECTOR_PRESETS[selectedSector]?.name}</strong></div>
                <div><span className="text-slate-500">Devise :</span> <strong>{currency}</strong></div>
                <div><span className="text-slate-500">Taux Taxe :</span> <strong>{taxRate}%</strong></div>
                <div className="col-span-2"><span className="text-slate-500">Caissier(e) :</span> <strong>{cashierName}</strong></div>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Souhaitez-vous confirmer et enregistrer ces modifications dès maintenant ?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowSaveConfirmModal(false)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg cursor-pointer transition border border-slate-200"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={handleExecuteSave}
                className="px-5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition cursor-pointer shadow-2xs flex items-center gap-1.5"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Confirmer & Enregistrer</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sector Preset Confirmation Modal */}
      {showSectorConfirmModal && pendingSector && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-5 max-w-md w-full border border-slate-200 shadow-xl animate-in fade-in zoom-in-95 space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Basculer vers : {SECTOR_PRESETS[pendingSector].name}
                  </h3>
                  <p className="text-[11px] text-slate-500">Configuration métier & catalogue</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowSectorConfirmModal(false);
                  setPendingSector(null);
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Veuillez sélectionner comment adapter le catalogue et les catégories d'articles :
            </p>

            <div className="space-y-2 text-xs">
              <label className={`p-3 rounded-lg border flex items-start gap-2.5 cursor-pointer transition ${
                sectorApplyMode === 'replace' ? 'border-slate-900 bg-slate-50 font-semibold text-slate-950' : 'border-slate-200 bg-slate-50/50 text-slate-700'
              }`}>
                <input
                  type="radio"
                  name="sectorMode"
                  checked={sectorApplyMode === 'replace'}
                  onChange={() => setSectorApplyMode('replace')}
                  className="mt-0.5 text-slate-900 focus:ring-slate-900"
                />
                <div>
                  <span className="text-slate-900 block font-bold">Remplacer le catalogue</span>
                  <span className="text-[11px] text-slate-500 font-normal block mt-0.5">
                    Installe le catalogue complet par défaut spécifique à ce secteur.
                  </span>
                </div>
              </label>

              <label className={`p-3 rounded-lg border flex items-start gap-2.5 cursor-pointer transition ${
                sectorApplyMode === 'merge' ? 'border-slate-900 bg-slate-50 font-semibold text-slate-950' : 'border-slate-200 bg-slate-50/50 text-slate-700'
              }`}>
                <input
                  type="radio"
                  name="sectorMode"
                  checked={sectorApplyMode === 'merge'}
                  onChange={() => setSectorApplyMode('merge')}
                  className="mt-0.5 text-slate-900 focus:ring-slate-900"
                />
                <div>
                  <span className="text-slate-900 block font-bold">Fusionner avec les données actuelles</span>
                  <span className="text-[11px] text-slate-500 font-normal block mt-0.5">
                    Conserve tous vos articles actuels et ajoute les catégories clés du secteur.
                  </span>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isApplyingSector}
                onClick={() => {
                  setShowSectorConfirmModal(false);
                  setPendingSector(null);
                }}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg cursor-pointer transition border border-slate-200"
              >
                Annuler
              </button>

              <button
                type="button"
                disabled={isApplyingSector}
                onClick={handleConfirmSectorApply}
                className="px-5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition cursor-pointer shadow-2xs flex items-center gap-1.5"
              >
                {isApplyingSector ? "Application..." : "Appliquer le Secteur"}
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
