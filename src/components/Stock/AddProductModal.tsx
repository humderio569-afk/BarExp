import React, { useState } from 'react';
import { useBar } from '../../context/BarContext';
import { Category } from '../../types';
import { PRESET_PRODUCT_IMAGES } from '../../data/presetImages';
import { DEFAULT_UNITS, VARIETY_LABEL_PRESETS } from '../../data/unitsConfig';
import { UnitManagerModal } from './UnitManagerModal';
import { X, PlusCircle, Check, Image, Upload, Calculator, Scale, Sparkles, Plus, Tag } from 'lucide-react';
import { CrateCalculatorModal } from './CrateCalculatorModal';
import { compressImageFile } from '../../utils/imageCompressor';

interface AddProductModalProps {
  onClose: () => void;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({ onClose }) => {
  const { addProduct, settings, categories } = useBar();

  const availableUnits: string[] = settings.customUnits && settings.customUnits.length > 0 
    ? settings.customUnits 
    : DEFAULT_UNITS;

  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>(categories[0]?.name || 'Bières');
  const [price, setPrice] = useState<string>('');
  const [costPrice, setCostPrice] = useState<string>('');
  const [stock, setStock] = useState<string>('');
  const [minStockAlert, setMinStockAlert] = useState<string>('12');
  const [unit, setUnit] = useState(availableUnits[0] || 'Bouteille');
  const [customUnitInput, setCustomUnitInput] = useState('');
  const [isCustomUnit, setIsCustomUnit] = useState(false);
  const [isService, setIsService] = useState(false);
  
  // Variety / Declinations
  const [hasVarieties, setHasVarieties] = useState(false);
  const [varietyLabel, setVarietyLabel] = useState(settings.defaultVarietyLabel || 'Saveur');
  const [flavorsInput, setFlavorsInput] = useState<string>('');
  
  const [image, setImage] = useState<string>('');
  const [isCompressing, setIsCompressing] = useState(false);

  const [showImagePicker, setShowImagePicker] = useState(false);
  const [showCrateCalc, setShowCrateCalc] = useState(false);
  const [showUnitManager, setShowUnitManager] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressing(true);
      const compressedDataUrl = await compressImageFile(file, 600, 600, 0.85);
      setImage(compressedDataUrl);
    } catch (err) {
      console.error('Erreur compression image:', err);
      alert("Impossible de traiter cette image.");
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert("Veuillez saisir un nom de produit.");
      return;
    }

    const numPrice = parseFloat(price) || 0;
    const numCost = parseFloat(costPrice) || 0;
    const numStock = isService ? 999999 : (parseInt(stock) || 0);
    const numAlert = isService ? 0 : (parseInt(minStockAlert) || 5);

    if (numPrice <= 0) {
      alert("Le prix de vente doit être supérieur à zéro.");
      return;
    }

    const finalUnit = isCustomUnit && customUnitInput.trim() 
      ? customUnitInput.trim() 
      : (unit || 'Pièce');

    // Default image if none selected
    let finalImage = image;
    if (!finalImage) {
      const matchedPreset = PRESET_PRODUCT_IMAGES.find(p => p.category === category);
      if (matchedPreset) {
        finalImage = matchedPreset.url;
      }
    }

    const parsedFlavors = (hasVarieties || flavorsInput.trim())
      ? flavorsInput.split(',').map(f => f.trim()).filter(Boolean)
      : undefined;

    addProduct({
      name: name.trim(),
      category,
      price: numPrice,
      costPrice: numCost,
      stock: numStock,
      minStockAlert: numAlert,
      unit: finalUnit,
      isService: isService,
      varietyLabel: parsedFlavors && parsedFlavors.length > 0 ? (varietyLabel.trim() || 'Variante') : undefined,
      varietyOptions: parsedFlavors,
      flavors: parsedFlavors,
      image: finalImage,
      active: true,
    });

    onClose();
  };

  const parsedOptionChips = flavorsInput
    .split(',')
    .map(f => f.trim())
    .filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-slate-900 my-8 relative">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center space-x-2">
            <PlusCircle className="w-5 h-5 text-amber-600" />
            <h3 className="text-lg font-black text-slate-900">Nouveau Produit</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {/* Photo / Image Selection */}
          <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <label className="block font-bold text-slate-800">
              Photo du Produit
            </label>

            <div className="flex items-center space-x-3">
              <div className="w-14 h-14 rounded-xl bg-slate-200 border border-slate-300 overflow-hidden shrink-0 flex items-center justify-center">
                {image ? (
                  <img src={image} alt="Aperçu" className="w-full h-full object-cover" />
                ) : (
                  <Image className="w-6 h-6 text-slate-400" />
                )}
              </div>

              <div className="flex-1 space-y-1.5">
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowImagePicker(!showImagePicker)}
                    className="px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 font-bold rounded-xl border border-amber-500/30 transition flex items-center space-x-1"
                  >
                    <Image className="w-3.5 h-3.5" />
                    <span>Choisir modèle</span>
                  </button>

                  <label className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl border border-slate-300 cursor-pointer transition flex items-center space-x-1">
                    <Upload className="w-3.5 h-3.5 text-slate-600" />
                    <span>Téléverser</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <input
                  type="url"
                  placeholder="URL photo (https://...)"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  className="w-full bg-white border border-slate-300 text-slate-900 font-medium p-1.5 rounded-xl focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>
            </div>

            {/* Gallery picker */}
            {showImagePicker && (
              <div className="mt-2 p-2.5 bg-white border border-slate-200 rounded-xl space-y-2 max-h-40 overflow-y-auto">
                <p className="text-[10px] font-bold text-slate-500">Sélectionnez une photo :</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {PRESET_PRODUCT_IMAGES.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setImage(preset.url);
                        setShowImagePicker(false);
                      }}
                      className="rounded-lg overflow-hidden border border-slate-200 hover:border-amber-500 transition aspect-square"
                      title={preset.label}
                    >
                      <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Nom du produit */}
          <div>
            <label className="block font-bold text-slate-900 mb-1">
              Nom du Produit / Article / Boisson / Plat *
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="ex: Prestige Bouteille, Chemise Slim, Riz 25kg, Griot"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-medium p-2.5 rounded-xl focus:outline-none focus:border-amber-500 text-sm"
            />
          </div>

          {/* Catégorie & Unité */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Catégorie</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-medium p-2.5 rounded-xl focus:outline-none focus:border-amber-500 text-sm"
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700">Unité de Vente</label>
                <button
                  type="button"
                  onClick={() => setShowUnitManager(true)}
                  className="text-[11px] text-amber-700 hover:text-amber-800 font-bold flex items-center space-x-0.5 cursor-pointer underline"
                >
                  <Scale className="w-3 h-3" />
                  <span>Gérer unités</span>
                </button>
              </div>

              {!isCustomUnit ? (
                <div className="flex space-x-1.5">
                  <select
                    value={unit}
                    onChange={(e) => {
                      if (e.target.value === '__custom__') {
                        setIsCustomUnit(true);
                      } else {
                        setUnit(e.target.value);
                      }
                    }}
                    className="flex-1 bg-slate-50 border border-slate-300 text-slate-900 font-bold p-2.5 rounded-xl focus:outline-none focus:border-amber-500 text-sm"
                  >
                    {availableUnits.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                    <option value="__custom__">+ Autre unité libre...</option>
                  </select>
                </div>
              ) : (
                <div className="flex items-center space-x-1">
                  <input
                    type="text"
                    value={customUnitInput}
                    onChange={(e) => setCustomUnitInput(e.target.value)}
                    placeholder="ex: Sac, Flacon, Dose, Paire, Kg..."
                    autoFocus
                    className="flex-1 bg-white border border-amber-500 text-slate-900 font-bold p-2 rounded-xl text-xs focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomUnit(false);
                      if (customUnitInput.trim()) setUnit(customUnitInput.trim());
                    }}
                    className="px-2 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs"
                  >
                    Retour
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Prix de Vente & Stock Initial (Champs Clés) */}
          <div className="space-y-2 bg-amber-500/10 p-3 rounded-2xl border border-amber-500/30">
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isService}
                  onChange={(e) => {
                    setIsService(e.target.checked);
                    if (e.target.checked) {
                      setUnit('Prestation');
                    }
                  }}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                />
                <span className="font-black text-xs text-amber-950">
                  ⚡ Est-ce une Prestation ou un Service ? (Saisie, Impression, Rédaction, Lavage...)
                </span>
              </label>
              {isService && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900">
                  Stock illimité
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block font-bold text-amber-950 mb-1">
                  Prix de Vente ({settings.currency}) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  placeholder="ex: 250"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full bg-white border border-amber-300 text-amber-700 font-black p-2.5 rounded-xl focus:outline-none focus:border-amber-500 text-base"
                />
              </div>

              {!isService ? (
                <div>
                  <label className="block font-bold text-slate-900 mb-1">
                    Stock Initial ({isCustomUnit ? customUnitInput || 'Qté' : unit})
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="ex: 48"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full bg-white border border-slate-300 text-emerald-700 font-black p-2.5 rounded-xl focus:outline-none focus:border-amber-500 text-base"
                  />
                </div>
              ) : (
                <div className="flex flex-col justify-center bg-white/70 p-2 rounded-xl border border-amber-200">
                  <span className="text-[11px] font-bold text-slate-700">Gestion de Stock</span>
                  <span className="text-xs font-black text-amber-800">Prestation non plafonnée</span>
                </div>
              )}
            </div>
          </div>

          {/* Variétés / Déclinaisons (Saveurs, Parfums, Tailles, Pointures, Couleurs, Formats) */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-900 flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Déclinaisons & Variétés (Optionnel)</span>
              </label>
              <span className="text-[10px] text-slate-500">
                Tailles, Saveurs, Couleurs, Formats...
              </span>
            </div>

            {/* Variety Label Selector */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-600 block">
                Nom du type de déclinaison :
              </span>
              <div className="flex flex-wrap gap-1">
                {VARIETY_LABEL_PRESETS.slice(0, 7).map((presetLabel) => (
                  <button
                    key={presetLabel}
                    type="button"
                    onClick={() => {
                      setVarietyLabel(presetLabel);
                      setHasVarieties(true);
                    }}
                    className={`px-2 py-1 rounded-lg text-[10.5px] font-bold transition cursor-pointer border ${
                      varietyLabel.toLowerCase() === presetLabel.toLowerCase()
                        ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-2xs'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    {presetLabel}
                  </button>
                ))}
              </div>

              <div className="pt-1 flex items-center space-x-2">
                <input
                  type="text"
                  value={varietyLabel}
                  onChange={(e) => setVarietyLabel(e.target.value)}
                  placeholder="ex: Saveur, Parfum, Taille, Pointure, Couleur, Format..."
                  className="w-40 bg-white border border-slate-300 text-slate-900 font-bold p-1.5 rounded-xl text-xs focus:outline-none focus:border-amber-500"
                />
                <span className="text-[10px] text-slate-500">(Libellé affiché au caissier)</span>
              </div>
            </div>

            {/* Options list input */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Options / Choix disponibles (séparés par des virgules) :
              </label>
              <input
                type="text"
                placeholder={
                  varietyLabel.toLowerCase().includes('taille') || varietyLabel.toLowerCase().includes('pointure')
                    ? "ex: S, M, L, XL ou 38, 39, 40, 41, 42"
                    : varietyLabel.toLowerCase().includes('couleur')
                    ? "ex: Noir, Blanc, Rouge, Bleu marine"
                    : "ex: Double Pomme, Menthe Fraîche, Mangue, Passion"
                }
                value={flavorsInput}
                onChange={(e) => setFlavorsInput(e.target.value)}
                className="w-full bg-white border border-slate-300 text-slate-900 font-medium p-2 rounded-xl focus:outline-none focus:border-amber-500 text-xs"
              />

              {/* Live Preview Chips */}
              {parsedOptionChips.length > 0 && (
                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                  <p className="text-[10px] font-bold text-amber-900">
                    Aperçu au POS ({varietyLabel}s sélectionnables) :
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {parsedOptionChips.map((chip, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-amber-500 text-slate-950 font-black text-[10.5px] rounded-md shadow-2xs"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Toggle Options Avancées (Coût d'achat, Alerte, Calculateur de Caisses) */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl flex items-center justify-between text-xs transition cursor-pointer"
            >
              <span>{showAdvancedOptions ? 'Masquer les options de gestion' : '⚙️ Gestion des marges & seuil d\'alerte stock'}</span>
              <span className="text-slate-500 text-[11px]">{showAdvancedOptions ? '▲' : '▼'}</span>
            </button>
          </div>

          {/* Collapsible Advanced Section */}
          {showAdvancedOptions && (
            <div className="space-y-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 animate-fadeIn">
              
              {/* Coût d'Achat & Seuil Alerte */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Coût d'Achat Unitaire ({settings.currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="ex: 150"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="w-full bg-white border border-slate-300 text-slate-800 font-bold p-2 rounded-xl focus:outline-none focus:border-amber-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Seuil Alerte Stock Faible
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="ex: 12"
                    value={minStockAlert}
                    onChange={(e) => setMinStockAlert(e.target.value)}
                    className="w-full bg-white border border-slate-300 text-amber-600 font-bold p-2 rounded-xl focus:outline-none focus:border-amber-500 text-xs"
                  />
                </div>
              </div>

              {/* Quick Crate / Box Calculator Button */}
              <div className="bg-amber-100/60 border border-amber-300 p-2.5 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-amber-950 flex items-center space-x-1">
                    <Calculator className="w-3.5 h-3.5 text-amber-700" />
                    <span>Achat en Gros (Caisses / Cartons / Colis) ?</span>
                  </p>
                  <p className="text-[10px] text-amber-800">Calculer automatiquement le stock et le coût par {isCustomUnit ? customUnitInput || 'unité' : unit}.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCrateCalc(true)}
                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] rounded-lg shadow-2xs transition cursor-pointer shrink-0"
                >
                  Calculer
                </button>
              </div>

            </div>
          )}

          {/* Form Submit */}
          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-lg shadow-amber-500/20 flex items-center space-x-1 cursor-pointer transition active:scale-95"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Créer Produit</span>
            </button>
          </div>

        </form>

        {showCrateCalc && (
          <CrateCalculatorModal
            currency={settings.currency}
            currentSellingPrice={parseFloat(price) || 0}
            onClose={() => setShowCrateCalc(false)}
            onApply={(res) => {
              setStock(res.totalUnits.toString());
              setCostPrice(res.unitCost.toString());
            }}
          />
        )}

        {showUnitManager && (
          <UnitManagerModal
            onClose={() => setShowUnitManager(false)}
            onSelectUnit={(newSelectedUnit) => {
              setUnit(newSelectedUnit);
              setIsCustomUnit(false);
            }}
          />
        )}

      </div>
    </div>
  );
};

