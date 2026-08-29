import React, { useState } from 'react';
import { useBar } from '../../context/BarContext';
import { Category, Product } from '../../types';
import { PRESET_PRODUCT_IMAGES } from '../../data/presetImages';
import { DEFAULT_UNITS, VARIETY_LABEL_PRESETS } from '../../data/unitsConfig';
import { UnitManagerModal } from './UnitManagerModal';
import { X, Edit3, Image, Upload, Check, Trash2, Calculator, Scale, Sparkles, ScanBarcode } from 'lucide-react';
import { CrateCalculatorModal } from './CrateCalculatorModal';
import { compressImageFile } from '../../utils/imageCompressor';

interface EditProductModalProps {
  product: Product;
  onClose: () => void;
}

export const EditProductModal: React.FC<EditProductModalProps> = ({ product, onClose }) => {
  const { updateProduct, deleteProduct, settings, categories } = useBar();

  const availableUnits: string[] = settings.customUnits && settings.customUnits.length > 0 
    ? settings.customUnits 
    : DEFAULT_UNITS;

  const [name, setName] = useState(product.name);
  const [category, setCategory] = useState<Category>(product.category);
  const [barcode, setBarcode] = useState<string>(product.barcode || '');
  const [price, setPrice] = useState<string>(product.price.toString());
  const [costPrice, setCostPrice] = useState<string>(product.costPrice ? product.costPrice.toString() : '');
  const [stock, setStock] = useState<string>(product.stock.toString());
  const [minStockAlert, setMinStockAlert] = useState<string>(product.minStockAlert ? product.minStockAlert.toString() : '10');
  const [unit, setUnit] = useState(product.unit || 'Bouteille');
  const [customUnitInput, setCustomUnitInput] = useState('');
  const [isCustomUnit, setIsCustomUnit] = useState(false);
  const [isService, setIsService] = useState(product.isService || false);

  // Variety / Declinations
  const initialVarieties = product.varietyOptions && product.varietyOptions.length > 0
    ? product.varietyOptions
    : (product.flavors || []);

  const [varietyLabel, setVarietyLabel] = useState(product.varietyLabel || settings.defaultVarietyLabel || 'Saveur');
  const [flavorsInput, setFlavorsInput] = useState<string>(initialVarieties.join(', '));

  const [image, setImage] = useState(product.image || '');
  const [active, setActive] = useState(product.active !== false);
  const [isCompressing, setIsCompressing] = useState(false);

  const [showImagePicker, setShowImagePicker] = useState(false);
  const [showCrateCalc, setShowCrateCalc] = useState(false);
  const [showUnitManager, setShowUnitManager] = useState(false);

  const handleGenerateBarcode = () => {
    // Generate standard 13-digit code: prefix 200 (internal use) + 9 digits + checksum
    const raw = '200' + Math.floor(100000000 + Math.random() * 900000000).toString();
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(raw[i]) * (i % 2 === 0 ? 1 : 3);
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    setBarcode(raw + checkDigit.toString());
  };

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

    const parsedFlavors = flavorsInput
      ? flavorsInput.split(',').map(f => f.trim()).filter(Boolean)
      : undefined;

    updateProduct(product.id, {
      name: name.trim(),
      category,
      barcode: barcode.trim() || undefined,
      price: numPrice,
      costPrice: numCost,
      stock: numStock,
      minStockAlert: numAlert,
      unit: finalUnit,
      isService: isService,
      varietyLabel: parsedFlavors && parsedFlavors.length > 0 ? (varietyLabel.trim() || 'Variante') : undefined,
      varietyOptions: parsedFlavors,
      flavors: parsedFlavors,
      image,
      active,
    });

    onClose();
  };

  const parsedOptionChips = flavorsInput
    .split(',')
    .map(f => f.trim())
    .filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn overflow-y-auto overscroll-contain">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full max-h-[92dvh] flex flex-col p-4 sm:p-6 shadow-2xl text-slate-900 my-auto relative overflow-hidden">
        
        {/* Modal Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-slate-200 pb-3 mb-2">
          <div className="flex items-center space-x-2">
            <Edit3 className="w-5 h-5 text-amber-600" />
            <h3 className="text-base sm:text-lg font-black text-slate-900">Modifier le Produit</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 text-xs overscroll-contain pr-1 flex flex-col">
          <div className="space-y-4 flex-1">
          
          {/* Photo / Image Preview & Picker */}
          <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <label className="block font-bold text-slate-800">
              Photo du Produit / Boisson / Plat / Article
            </label>

            <div className="flex items-center space-x-3">
              {/* Image Preview Box */}
              <div className="w-16 h-16 rounded-xl bg-slate-200 border border-slate-300 overflow-hidden shrink-0 flex items-center justify-center relative group">
                {image ? (
                  <img src={image} alt="Aperçu" className="w-full h-full object-cover" />
                ) : (
                  <Image className="w-6 h-6 text-slate-400" />
                )}
                {image && (
                  <button
                    type="button"
                    onClick={() => setImage('')}
                    className="absolute inset-0 bg-red-600/90 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] font-bold transition cursor-pointer"
                  >
                    Effacer
                  </button>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowImagePicker(!showImagePicker)}
                    className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 font-bold rounded-xl border border-amber-500/30 transition flex items-center space-x-1 cursor-pointer"
                  >
                    <Image className="w-3.5 h-3.5" />
                    <span>Choisir modèle</span>
                  </button>

                  <label className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl border border-slate-300 cursor-pointer transition flex items-center space-x-1">
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
                  className="w-full bg-white border border-slate-300 text-slate-900 font-medium p-2 rounded-xl focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>
            </div>

            {/* Presets Grid */}
            {showImagePicker && (
              <div className="mt-2 p-2.5 bg-white border border-slate-200 rounded-xl space-y-2 max-h-40 overflow-y-auto">
                <p className="text-[10px] font-bold text-slate-500">Sélectionnez une photo modèle :</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {PRESET_PRODUCT_IMAGES.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setImage(preset.url);
                        setShowImagePicker(false);
                      }}
                      className="rounded-lg overflow-hidden border border-slate-200 hover:border-amber-500 transition aspect-square cursor-pointer"
                      title={preset.label}
                    >
                      <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Nom du produit & Code-Barres */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-900 mb-1">
                Nom du Produit / Article *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-medium p-2.5 rounded-xl focus:outline-none focus:border-amber-500 text-sm"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-900 text-xs flex items-center gap-1">
                  <ScanBarcode className="w-3.5 h-3.5 text-amber-600" />
                  <span>Code-Barres</span>
                </label>
                <button
                  type="button"
                  onClick={handleGenerateBarcode}
                  className="text-[10px] text-amber-700 hover:text-amber-800 font-bold underline cursor-pointer"
                  title="Générer un code-barres EAN-13 interne"
                >
                  Générer EAN
                </button>
              </div>
              <input
                type="text"
                placeholder="ex: 200123456789"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-mono font-bold p-2.5 rounded-xl focus:outline-none focus:border-amber-500 text-xs"
              />
            </div>
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
                    {!availableUnits.includes(unit) && (
                      <option value={unit}>{unit}</option>
                    )}
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
                    className="px-2 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs cursor-pointer"
                  >
                    Retour
                  </button>
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
                Type de déclinaison :
              </span>
              <div className="flex flex-wrap gap-1">
                {VARIETY_LABEL_PRESETS.slice(0, 7).map((presetLabel) => (
                  <button
                    key={presetLabel}
                    type="button"
                    onClick={() => setVarietyLabel(presetLabel)}
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
                Choix / Variantes disponibles (séparés par des virgules) :
              </label>
              <input
                type="text"
                placeholder="ex: Double Pomme, Menthe, Fraise OU S, M, L, XL OU Noir, Blanc"
                value={flavorsInput}
                onChange={(e) => setFlavorsInput(e.target.value)}
                className="w-full bg-white border border-slate-300 text-slate-900 font-medium p-2 rounded-xl focus:outline-none focus:border-amber-500 text-xs"
              />

              {/* Live Preview Chips */}
              {parsedOptionChips.length > 0 && (
                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                  <p className="text-[10px] font-bold text-amber-900">
                    Aperçu caisse ({varietyLabel}s disponibles) :
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

          {/* Quick Crate / Box Calculator Button */}
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs font-black text-amber-900 flex items-center space-x-1">
                <Calculator className="w-4 h-4 text-amber-600" />
                <span>Calculateur d'Achats Groupés (Caisses / Cartons)</span>
              </p>
              <p className="text-[10px] text-amber-700">Calculer le coût unitaire et le stock depuis un achat en gros.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowCrateCalc(true)}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-xs transition cursor-pointer shrink-0"
            >
              Calculer 🧮
            </button>
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Prix de Vente ({settings.currency}) *
              </label>
              <input
                type="number"
                required
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-amber-600 font-bold p-2.5 rounded-xl focus:outline-none focus:border-amber-500 text-sm"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Coût d'Achat Unitaire ({settings.currency})
              </label>
              <input
                type="number"
                min="0"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 font-bold p-2.5 rounded-xl focus:outline-none focus:border-amber-500 text-sm"
              />
            </div>
          </div>

          {/* Prestation / Service Toggle */}
          <div className="bg-amber-500/10 p-3 rounded-2xl border border-amber-500/30 flex items-center justify-between">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isService}
                onChange={(e) => {
                  setIsService(e.target.checked);
                  if (e.target.checked && unit === 'Bouteille') {
                    setUnit('Prestation');
                  }
                }}
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
              />
              <span className="font-black text-xs text-amber-950">
                ⚡ Prestation de Service (Impression, Rédaction, Saisie, Lavage...)
              </span>
            </label>
            {isService && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900">
                Stock illimité
              </span>
            )}
          </div>

          {/* Stock Initial & Seuil Alerte */}
          {!isService ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Quantité en Stock ({isCustomUnit ? customUnitInput || 'Qté' : unit})
                </label>
                <input
                  type="number"
                  min="0"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-bold p-2.5 rounded-xl focus:outline-none focus:border-amber-500 text-sm"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Seuil Alerte Stock Faible
                </label>
                <input
                  type="number"
                  min="1"
                  value={minStockAlert}
                  onChange={(e) => setMinStockAlert(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-amber-600 font-bold p-2.5 rounded-xl focus:outline-none focus:border-amber-500 text-sm"
                />
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs text-slate-600">
              <span className="font-bold text-slate-800">Gestion de Stock : </span>
              Ce service/prestation est toujours disponible en vente sans décompte physique de stock.
            </div>
          )}

          {/* Active / Desactivé */}
          <div className="pt-1 flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <p className="font-bold text-slate-800">Statut du Produit</p>
              <p className="text-[11px] text-slate-500">Si désactivé, le produit n'apparaîtra plus en caisse.</p>
            </div>
            <button
              type="button"
              onClick={() => setActive(!active)}
              className={`px-3 py-1.5 rounded-xl font-black text-xs transition cursor-pointer ${
                active ? 'bg-emerald-50 text-emerald-700 border border-emerald-300' : 'bg-red-50 text-red-700 border border-red-300'
              }`}
            >
              {active ? 'ACTIF' : 'DÉSACTIVÉ'}
            </button>
          </div>

          </div>

          {/* Submit */}
          <div className="pt-3 flex items-center justify-between border-t border-slate-200 shrink-0 mt-2">
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement "${product.name}" du stock ?`)) {
                  deleteProduct(product.id);
                  onClose();
                }
              }}
              className="px-3 py-2 text-red-600 hover:bg-red-50 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Supprimer ce produit</span>
            </button>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-amber-500/20 flex items-center space-x-1.5 transition cursor-pointer active:scale-95"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>ENREGISTRER</span>
              </button>
            </div>
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
