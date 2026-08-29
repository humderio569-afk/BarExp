import React, { useState } from 'react';
import { useBar } from '../../context/BarContext';
import { Category, Product } from '../../types';
import { 
  ClipboardCheck, 
  X, 
  Search, 
  Plus, 
  Minus, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  CalendarDays, 
  BarChart3, 
  Check, 
  Boxes,
  ArrowRight
} from 'lucide-react';

interface InventoryModalProps {
  onClose: () => void;
}

type InventoryType = 'journalier' | 'hebdomadaire' | 'mensuel';

export const InventoryModal: React.FC<InventoryModalProps> = ({ onClose }) => {
  const { products, performInventoryCount, settings } = useBar();

  // Selected Inventory Type
  const [inventoryType, setInventoryType] = useState<InventoryType>('journalier');
  const [step, setStep] = useState<'type_selection' | 'counting' | 'summary'>('type_selection');

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tous');

  // Stock counts state: productId -> actualStock number
  const [countedStocks, setCountedStocks] = useState<Record<string, number>>(() => {
    const initialMap: Record<string, number> = {};
    products.forEach(p => {
      initialMap[p.id] = p.stock;
    });
    return initialMap;
  });

  // Result summary after validation
  const [inventoryResult, setInventoryResult] = useState<{
    totalItems: number;
    adjustedItems: number;
    totalVarianceValue: number;
  } | null>(null);

  const categories = ['Tous', ...Array.from(new Set(products.map(p => p.category)))];

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'Tous' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleStockChange = (productId: string, val: number) => {
    const nextVal = Math.max(0, isNaN(val) ? 0 : val);
    setCountedStocks(prev => ({
      ...prev,
      [productId]: nextVal
    }));
  };

  const resetAllToSystem = () => {
    const resetMap: Record<string, number> = {};
    products.forEach(p => {
      resetMap[p.id] = p.stock;
    });
    setCountedStocks(resetMap);
  };

  // Metrics calculation
  const totalItemsCounted = products.length;
  let adjustedItemsCount = 0;
  let totalVarianceValue = 0;

  products.forEach(p => {
    const counted = countedStocks[p.id] !== undefined ? countedStocks[p.id] : p.stock;
    const diff = counted - p.stock;
    if (diff !== 0) {
      adjustedItemsCount++;
      totalVarianceValue += diff * p.price;
    }
  });

  const handleSubmitInventory = () => {
    const countsPayload = products.map(p => ({
      productId: p.id,
      actualStock: countedStocks[p.id] !== undefined ? countedStocks[p.id] : p.stock
    }));

    const res = performInventoryCount(inventoryType, countsPayload);
    setInventoryResult(res);
    setStep('summary');
  };

  const getInventoryTypeLabel = (type: InventoryType) => {
    switch (type) {
      case 'journalier': return 'Inventaire Journalier';
      case 'hebdomadaire': return 'Inventaire Hebdomadaire';
      case 'mensuel': return 'Inventaire Mensuel';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn overflow-y-auto overscroll-contain">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full max-h-[92dvh] flex flex-col shadow-2xl overflow-hidden text-slate-900 relative my-auto">
        
        {/* Modal Header */}
        <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-xs shrink-0">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                Session d'Inventaire du Stock
              </h2>
              <p className="text-xs text-slate-500">
                {step === 'type_selection' && 'Étape 1 : Choisissez la fréquence de l\'inventaire'}
                {step === 'counting' && `Étape 2 : Comptage physique - ${getInventoryTypeLabel(inventoryType)}`}
                {step === 'summary' && 'Rapport d\'ajustement du stock'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-full transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP 1: TYPE SELECTION */}
        {step === 'type_selection' && (
          <div className="p-6 overflow-y-auto space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-1">
                Sélectionnez le type d'inventaire
              </h3>
              <p className="text-xs text-slate-500">
                Choisissez la fréquence pour adapter votre processus de contrôle des stocks.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Daily / Journalier */}
              <button
                type="button"
                onClick={() => setInventoryType('journalier')}
                className={`p-5 rounded-2xl border-2 text-left transition flex flex-col justify-between space-y-4 cursor-pointer ${
                  inventoryType === 'journalier'
                    ? 'border-amber-500 bg-amber-50/60 shadow-md ring-2 ring-amber-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                    <Calendar className="w-5 h-5" />
                  </div>
                  {inventoryType === 'journalier' && (
                    <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">Journalier</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Contrôle quotidien rapide des produits à forte rotation (Bières, sodas, spiritueux phares).
                  </p>
                </div>
                <span className="text-[10px] font-bold text-amber-800 bg-amber-200/60 px-2 py-1 rounded-md w-fit">
                  Fréquence : Chaque Soir
                </span>
              </button>

              {/* Weekly / Hebdomadaire */}
              <button
                type="button"
                onClick={() => setInventoryType('hebdomadaire')}
                className={`p-5 rounded-2xl border-2 text-left transition flex flex-col justify-between space-y-4 cursor-pointer ${
                  inventoryType === 'hebdomadaire'
                    ? 'border-amber-500 bg-amber-50/60 shadow-md ring-2 ring-amber-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                    <CalendarDays className="w-5 h-5" />
                  </div>
                  {inventoryType === 'hebdomadaire' && (
                    <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">Hebdomadaire</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Comptage de fin de semaine pour ajuster les commandes fournisseurs et préparer le week-end.
                  </p>
                </div>
                <span className="text-[10px] font-bold text-blue-800 bg-blue-200/60 px-2 py-1 rounded-md w-fit">
                  Fréquence : Fin de Semaine
                </span>
              </button>

              {/* Monthly / Mensuel */}
              <button
                type="button"
                onClick={() => setInventoryType('mensuel')}
                className={`p-5 rounded-2xl border-2 text-left transition flex flex-col justify-between space-y-4 cursor-pointer ${
                  inventoryType === 'mensuel'
                    ? 'border-amber-500 bg-amber-50/60 shadow-md ring-2 ring-amber-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  {inventoryType === 'mensuel' && (
                    <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">Mensuel</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Inventaire général exhaustif de fin de mois pour établir le bilan comptable précis.
                  </p>
                </div>
                <span className="text-[10px] font-bold text-purple-800 bg-purple-200/60 px-2 py-1 rounded-md w-fit">
                  Fréquence : Bilan Fin de Mois
                </span>
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  Prêt à démarrer l'{getInventoryTypeLabel(inventoryType)}
                </span>
                <span className="text-xs text-slate-500">
                  {products.length} références seront chargées pour la saisie des quantités physiques.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setStep('counting')}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition flex items-center space-x-2 cursor-pointer"
              >
                <span>Commencer la Saisie</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: COUNTING SHEET */}
        {step === 'counting' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Toolbar */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3 shrink-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Rechercher une boisson ou catégorie..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Reset button */}
                <button
                  type="button"
                  onClick={resetAllToSystem}
                  className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 flex items-center space-x-1.5 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Aligner au stock théorique</span>
                </button>
              </div>

              {/* Category Pills */}
              <div className="flex items-center space-x-1 overflow-x-auto pb-1">
                {categories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition ${
                      selectedCategory === cat
                        ? 'bg-slate-900 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Product Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  Aucun produit ne correspond à votre recherche.
                </div>
              ) : (
                filteredProducts.map(product => {
                  const currentCount = countedStocks[product.id] !== undefined ? countedStocks[product.id] : product.stock;
                  const diff = currentCount - product.stock;

                  return (
                    <div
                      key={product.id}
                      className={`p-3.5 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        diff !== 0
                          ? diff < 0 
                            ? 'bg-red-50/40 border-red-200' 
                            : 'bg-blue-50/40 border-blue-200'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      {/* Product details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-extrabold text-sm text-slate-900">{product.name}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                            {product.category}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center space-x-3">
                          <span>Prix unitaire : <strong className="text-slate-800">{product.price} {settings.currency}</strong></span>
                          <span>Unités : <strong>{product.unit}</strong></span>
                        </div>
                      </div>

                      {/* Stock controls & status */}
                      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                        {/* System Stock */}
                        <div className="text-right">
                          <span className="text-[10px] uppercase text-slate-400 font-bold block">Théorique</span>
                          <span className="text-xs font-black text-slate-600">{product.stock}</span>
                        </div>

                        {/* Interactive Counter */}
                        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                          <button
                            type="button"
                            onClick={() => handleStockChange(product.id, currentCount - 1)}
                            className="w-7 h-7 bg-white hover:bg-slate-200 rounded-lg flex items-center justify-center font-bold text-slate-700 shadow-2xs cursor-pointer active:scale-95 transition"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>

                          <input
                            type="number"
                            min="0"
                            value={currentCount}
                            onChange={(e) => handleStockChange(product.id, parseInt(e.target.value) || 0)}
                            className="w-14 text-center font-black text-sm bg-white border border-slate-300 rounded-lg py-1 focus:outline-none focus:border-amber-500"
                          />

                          <button
                            type="button"
                            onClick={() => handleStockChange(product.id, currentCount + 1)}
                            className="w-7 h-7 bg-white hover:bg-slate-200 rounded-lg flex items-center justify-center font-bold text-slate-700 shadow-2xs cursor-pointer active:scale-95 transition"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Status Badge */}
                        <div className="w-24 text-right">
                          {diff === 0 ? (
                            <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-lg">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Conforme</span>
                            </span>
                          ) : diff < 0 ? (
                            <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-red-700 bg-red-100 px-2 py-1 rounded-lg">
                              <AlertTriangle className="w-3 h-3" />
                              <span>{diff} {product.unit}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded-lg">
                              <Boxes className="w-3 h-3" />
                              <span>+{diff} {product.unit}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Sticky Action Bar */}
            <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 border-t border-slate-800">
              <div className="flex items-center space-x-4 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] block uppercase font-bold">Produits Vérifiés</span>
                  <span className="font-black text-sm">{totalItemsCounted} réf.</span>
                </div>
                <div className="border-l border-slate-700 pl-4">
                  <span className="text-slate-400 text-[10px] block uppercase font-bold">Ajustements</span>
                  <span className={`font-black text-sm ${adjustedItemsCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {adjustedItemsCount} réajustement(s)
                  </span>
                </div>
                <div className="border-l border-slate-700 pl-4">
                  <span className="text-slate-400 text-[10px] block uppercase font-bold">Écart Valeur</span>
                  <span className={`font-black text-sm ${totalVarianceValue < 0 ? 'text-red-400' : totalVarianceValue > 0 ? 'text-blue-400' : 'text-slate-200'}`}>
                    {totalVarianceValue > 0 ? `+${totalVarianceValue.toLocaleString()}` : totalVarianceValue.toLocaleString()} {settings.currency}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setStep('type_selection')}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Changer de Type
                </button>

                <button
                  type="button"
                  onClick={handleSubmitInventory}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center space-x-1.5 cursor-pointer active:scale-95"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Valider l'Inventaire</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: SUMMARY REPORT */}
        {step === 'summary' && inventoryResult && (
          <div className="p-6 overflow-y-auto space-y-6 text-center">
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900">
                {getInventoryTypeLabel(inventoryType)} Validé !
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Le stock système a été mis à jour avec succès et consigné dans l'historique des mouvements.
              </p>
            </div>

            {/* Summary Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto text-left">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Références comptées</span>
                <span className="text-lg font-black text-slate-900">{inventoryResult.totalItems} articles</span>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Stocks Réajustés</span>
                <span className="text-lg font-black text-amber-600">{inventoryResult.adjustedItems} article(s)</span>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Écart financier</span>
                <span className="text-lg font-black text-slate-900">
                  {inventoryResult.totalVarianceValue.toLocaleString()} {settings.currency}
                </span>
              </div>
            </div>

            <div className="pt-4 flex justify-center">
              <button
                type="button"
                onClick={onClose}
                className="px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-2xl shadow-xl transition cursor-pointer"
              >
                Terminer et Fermer
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
