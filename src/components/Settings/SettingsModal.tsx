import React, { useState } from 'react';
import { useBar } from '../../context/BarContext';
import { BusinessSector } from '../../types';
import { SECTOR_PRESETS } from '../../data/sectorPresets';
import { EnterpriseReportModal } from '../Reports/EnterpriseReportModal';
import { 
  Settings, 
  Save, 
  RotateCcw, 
  Download, 
  Upload, 
  ShieldCheck, 
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
  Landmark,
  FileCheck,
  AlertTriangle,
  Sparkles,
  Laptop,
  Smartphone,
  CheckCircle2
} from 'lucide-react';

export const SettingsModal: React.FC = () => {
  const { settings, updateSettings, applyBusinessSectorPreset } = useBar();

  const [barName, setBarName] = useState(settings.barName);
  const [tagline, setTagline] = useState(settings.tagline);
  const [address, setAddress] = useState(settings.address);
  const [phone, setPhone] = useState(settings.phone);
  const [currency, setCurrency] = useState(settings.currency);
  const [cashierName, setCashierName] = useState(settings.cashierName);
  const [logo, setLogo] = useState<string>(settings.logo || '');
  const [majorTransactionThreshold, setMajorTransactionThreshold] = useState<number>(settings.majorTransactionThreshold || 2500);
  const [nifCif, setNifCif] = useState(settings.nifCif || '');
  const [rcNumber, setRcNumber] = useState(settings.rcNumber || '');
  const [taxRate, setTaxRate] = useState<number>(settings.taxRate ?? 10);

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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      barName,
      tagline,
      address,
      phone,
      currency,
      cashierName,
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
      alert(`Secteur d'activité appliqué avec succès : ${SECTOR_PRESETS[pendingSector].name}`);
    } catch (err) {
      console.error("Erreur lors de l'application du secteur :", err);
      alert("Une erreur est survenue lors de la configuration du secteur.");
    } finally {
      setIsApplyingSector(false);
    }
  };

  const getSectorIcon = (sectorId: BusinessSector) => {
    switch (sectorId) {
      case 'print_cyber': return <Briefcase className="w-5 h-5 text-blue-600" />;
      case 'gas_station': return <Fuel className="w-5 h-5 text-amber-600" />;
      case 'stationery_bookstore': return <BookOpen className="w-5 h-5 text-emerald-600" />;
      case 'bar_restaurant': return <Wine className="w-5 h-5 text-purple-600" />;
      case 'general_retail': return <ShoppingBag className="w-5 h-5 text-indigo-600" />;
      default: return <Building className="w-5 h-5 text-slate-600" />;
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6 text-slate-900 animate-fadeIn pb-24 md:pb-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-amber-500/20 text-amber-600 rounded-xl border border-amber-500/30">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">Paramètres de l'Entreprise</h1>
            <p className="text-xs text-slate-500">
              Secteur d'activité, profil fiscal (DGI), banques et tickets de caisse
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {isSaved && (
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1 animate-fadeIn">
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Enregistré !</span>
            </span>
          )}

          <button
            type="button"
            onClick={() => {
              setReportModalType('tax_compliance_dgi');
              setShowReportModal(true);
            }}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
          >
            <Scale className="w-3.5 h-3.5 text-amber-400" />
            <span>Rapports DGI & Banques</span>
          </button>
        </div>
      </div>

      {/* MINIMALIST SECTOR SELECTOR */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <h2 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
              Secteur d'Activité
            </h2>
          </div>
          <span className="text-[11px] font-black px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200">
            {SECTOR_PRESETS[selectedSector]?.name || 'Bar / Restaurant'}
          </span>
        </div>

        {/* Compact & Refined Sector Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {(Object.keys(SECTOR_PRESETS) as BusinessSector[]).map((sectorKey) => {
            const preset = SECTOR_PRESETS[sectorKey];
            const isSelected = selectedSector === sectorKey;
            return (
              <button
                key={sectorKey}
                type="button"
                onClick={() => handleTriggerSectorChange(sectorKey)}
                className={`py-2 px-2.5 rounded-xl border text-left transition flex items-center justify-between gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'border-amber-500 bg-amber-50 text-slate-950 font-black shadow-2xs ring-1 ring-amber-500/30'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-100 text-slate-700 font-bold'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                    {getSectorIcon(sectorKey)}
                  </div>
                  <span className="text-xs truncate">{preset.name}</span>
                </div>
                {isSelected && (
                  <Check className="w-3.5 h-3.5 text-amber-600 shrink-0 stroke-[3]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Profile & Identification de l'Entreprise */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-md">
          <h2 className="font-extrabold text-slate-900 text-sm border-b border-slate-200 pb-3 flex items-center justify-between">
            <span>Profil & En-tête des Factures</span>
            <Building className="w-4 h-4 text-slate-400" />
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Logo de l'Établissement</label>
              <div className="flex items-center space-x-3 bg-slate-50 p-2.5 border border-slate-300 rounded-xl">
                {logo ? (
                  <div className="relative group shrink-0">
                    <img
                      src={logo}
                      alt="Logo Entreprise"
                      className="w-12 h-12 object-contain rounded-lg border border-slate-200 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setLogo('')}
                      className="absolute -top-1.5 -right-1.5 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition shadow-xs"
                      title="Supprimer le logo"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-amber-100 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                )}

                <div className="flex-1">
                  <label className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 hover:bg-slate-100 cursor-pointer transition shadow-2xs">
                    <Upload className="w-3.5 h-3.5 text-amber-600" />
                    <span>{logo ? 'Changer le logo' : 'Charger une image (PNG/JPG)'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[10px] text-slate-500 mt-1">S'affiche sur les reçus, factures et rapports officiels.</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Raison Sociale / Nom Commercial</label>
              <input
                type="text"
                required
                value={barName}
                onChange={(e) => setBarName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-bold p-2.5 rounded-xl focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Slogan / Description Commerciale</label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 p-2.5 rounded-xl focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Adresse Physique</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 p-2.5 rounded-xl focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Numéro de Téléphone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 p-2.5 rounded-xl focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Fiscalité, DGI & Caisse */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-md">
          <h2 className="font-extrabold text-slate-900 text-sm border-b border-slate-200 pb-3 flex items-center justify-between">
            <span>Fiscalité, DGI & Caisse</span>
            <Scale className="w-4 h-4 text-slate-400" />
          </h2>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">NIF / CIF / Patente (DGI)</label>
                <input
                  type="text"
                  placeholder="ex: 004-829-102-3"
                  value={nifCif}
                  onChange={(e) => setNifCif(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-bold p-2.5 rounded-xl focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Registre du Commerce (RC)</label>
                <input
                  type="text"
                  placeholder="ex: RC-PAP-2024-B-992"
                  value={rcNumber}
                  onChange={(e) => setRcNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-bold p-2.5 rounded-xl focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Taux TVA / Taxe Légale (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-bold p-2.5 rounded-xl focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Monnaie Principale</label>
                <input
                  type="text"
                  required
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-amber-600 font-bold p-2.5 rounded-xl focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nom du / de la Caissier(e) par Défaut</label>
              <input
                type="text"
                required
                value={cashierName}
                onChange={(e) => setCashierName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-bold p-2.5 rounded-xl focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Seuil de Confirmation Caisse ({currency})</label>
              <input
                type="number"
                min="100"
                step="100"
                required
                value={majorTransactionThreshold}
                onChange={(e) => setMajorTransactionThreshold(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-bold p-2.5 rounded-xl focus:outline-none focus:border-amber-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Avertissement de sécurité avant validation d'encaissements élevés.
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="md:col-span-2 flex justify-end">
          <button
            type="submit"
            className="w-full sm:w-auto px-8 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-1.5 transition active:scale-95 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Sauvegarder les Paramètres</span>
          </button>
        </div>

      </form>

      {/* SECTOR PRESET CONFIRMATION MODAL */}
      {showSectorConfirmModal && pendingSector && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-lg w-full max-h-[92dvh] flex flex-col overflow-hidden border border-slate-200 shadow-2xl my-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center space-x-3 text-amber-600 shrink-0 mb-3">
              <div className="p-3 bg-amber-100 rounded-2xl">
                <AlertTriangle className="w-6 h-6 text-amber-700" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Appliquer le Profil : {SECTOR_PRESETS[pendingSector].name}
                </h3>
                <p className="text-xs text-slate-500">Configuration des catégories et du catalogue</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3.5 overscroll-contain pr-1">
              <p className="text-xs text-slate-700 leading-relaxed">
                Vous allez configurer l'application pour le secteur <strong>{SECTOR_PRESETS[pendingSector].name}</strong>. Comment souhaitez-vous traiter le catalogue de produits existant ?
              </p>

              <div className="space-y-2">
                <label className={`p-3 rounded-xl border-2 flex items-start space-x-3 cursor-pointer transition ${
                  sectorApplyMode === 'replace' ? 'border-amber-500 bg-amber-50/50' : 'border-slate-200 hover:border-slate-300'
                }`}>
                  <input
                    type="radio"
                    name="sectorMode"
                    checked={sectorApplyMode === 'replace'}
                    onChange={() => setSectorApplyMode('replace')}
                    className="mt-0.5 text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <span className="font-bold text-xs text-slate-900 block">Remplacer le catalogue (Nouveau départ)</span>
                    <span className="text-[11px] text-slate-500">
                      Installe les catégories, unités et articles standards du secteur (recommandé pour une nouvelle entreprise).
                    </span>
                  </div>
                </label>

                <label className={`p-3 rounded-xl border-2 flex items-start space-x-3 cursor-pointer transition ${
                  sectorApplyMode === 'merge' ? 'border-amber-500 bg-amber-50/50' : 'border-slate-200 hover:border-slate-300'
                }`}>
                  <input
                    type="radio"
                    name="sectorMode"
                    checked={sectorApplyMode === 'merge'}
                    onChange={() => setSectorApplyMode('merge')}
                    className="mt-0.5 text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <span className="font-bold text-xs text-slate-900 block">Fusionner (Conserver mes produits existants)</span>
                    <span className="text-[11px] text-slate-500">
                      Conserve tous vos articles actuels et ajoute simplement les nouvelles catégories et unités du secteur.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200 shrink-0 mt-3">
              <button
                type="button"
                disabled={isApplyingSector}
                onClick={() => {
                  setShowSectorConfirmModal(false);
                  setPendingSector(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Annuler
              </button>

              <button
                type="button"
                disabled={isApplyingSector}
                onClick={handleConfirmSectorApply}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition cursor-pointer flex items-center space-x-1.5"
              >
                {isApplyingSector ? (
                  <span>Application en cours...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirmer et Appliquer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OFFICIAL REPORT MODAL (DGI, BANK, CONSOLIDATED) */}
      {showReportModal && (
        <EnterpriseReportModal
          defaultReportType={reportModalType}
          onClose={() => setShowReportModal(false)}
        />
      )}

    </div>
  );
};
