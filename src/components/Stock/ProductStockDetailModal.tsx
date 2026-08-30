import React, { useState } from 'react';
import { Product, StockLog } from '../../types';
import { useBar } from '../../context/BarContext';
import {
  X,
  Package,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  History,
  Calendar,
  Layers,
  Scale,
  Sparkles,
  Edit3,
  Plus,
  Printer,
  BarChart3,
  Tag,
  ShieldAlert,
  Boxes
} from 'lucide-react';

interface ProductStockDetailModalProps {
  product: Product;
  onClose: () => void;
  onEdit: (product: Product) => void;
  onAdjust: (product: Product) => void;
}

export const ProductStockDetailModal: React.FC<ProductStockDetailModalProps> = ({
  product,
  onClose,
  onEdit,
  onAdjust,
}) => {
  const { settings, stockLogs, currentUser, isAdmin } = useBar();
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'varieties'>('overview');

  const perms = currentUser?.permissions;
  const canManageStock = isAdmin || perms?.canManageStock === true;
  const canViewCostPrices = isAdmin || perms?.canViewCostPrices === true || perms?.canAccessReports === true;

  // Filter logs for this specific product
  const productLogs = stockLogs.filter(
    (log) => log.productId === product.id || log.productName.toLowerCase() === product.name.toLowerCase()
  );

  // Stock status calculations
  const isOut = product.stock <= 0;
  const isLow = product.stock > 0 && product.stock <= product.minStockAlert;
  const stockRatio = product.minStockAlert > 0 
    ? Math.min(100, Math.round((product.stock / (product.minStockAlert * 3)) * 100))
    : 100;

  // Financial calculations
  const costPrice = product.costPrice || 0;
  const sellingPrice = product.price || 0;
  const unitMargin = Math.max(0, sellingPrice - costPrice);
  const marginPercent = sellingPrice > 0 ? (unitMargin / sellingPrice) * 100 : 0;
  const totalCostValue = costPrice * Math.max(0, product.stock);
  const totalSellingValue = sellingPrice * Math.max(0, product.stock);
  const totalPotentialProfit = Math.max(0, totalSellingValue - totalCostValue);

  const varieties = product.varietyOptions || product.flavors || [];

  const handlePrintSheet = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto overscroll-contain">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[92dvh] my-auto animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-3.5 sm:p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between gap-2.5 sm:gap-3 shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-md overflow-hidden">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <Package className="w-6 h-6" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white truncate">
                  {product.name}
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/20 text-amber-300 border border-white/10">
                  {product.category}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/20 text-slate-200 border border-white/10">
                  {product.unit}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Fiche détaillée & état des stocks en temps réel
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer shrink-0"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 px-4 sm:px-6 pt-2 shrink-0 overflow-x-auto gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'overview'
                ? 'border-amber-500 text-amber-800 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Vue d'ensemble & Valeur</span>
          </button>

          {varieties.length > 0 && (
            <button
              onClick={() => setActiveTab('varieties')}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold border-b-2 transition cursor-pointer ${
                activeTab === 'varieties'
                  ? 'border-amber-500 text-amber-800 font-black'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>
                {product.varietyLabel || 'Variantes'} ({varieties.length})
              </span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'history'
                ? 'border-amber-500 text-amber-800 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Historique mouvements ({productLogs.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              
              {/* Stock Status Banner */}
              <div
                className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isOut
                    ? 'bg-red-50 border-red-200 text-red-950'
                    : isLow
                    ? 'bg-amber-50 border-amber-200 text-amber-950'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-950'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-black shrink-0 ${
                      isOut
                        ? 'bg-red-600 text-white'
                        : isLow
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {isOut ? (
                      <ShieldAlert className="w-6 h-6" />
                    ) : isLow ? (
                      <AlertTriangle className="w-6 h-6" />
                    ) : (
                      <CheckCircle2 className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider">
                        {isOut
                          ? 'Rupture de Stock'
                          : isLow
                          ? 'Alerte Seuil Minimum'
                          : 'Stock Confortable'}
                      </span>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          isOut
                            ? 'bg-red-200 text-red-900'
                            : isLow
                            ? 'bg-amber-200 text-amber-900'
                            : 'bg-emerald-200 text-emerald-900'
                        }`}
                      >
                        {product.stock} {product.unit}s disponible(s)
                      </span>
                    </div>
                    <p className="text-xs opacity-80 mt-0.5">
                      Seuil d'alerte configuré à <strong>{product.minStockAlert} {product.unit}s</strong>
                    </p>
                  </div>
                </div>

                {/* Stock Gauge Progress */}
                <div className="w-full sm:w-44 space-y-1">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span>Niveau de réserve</span>
                    <span>{product.stock} / {product.minStockAlert * 2}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isOut
                          ? 'bg-red-600 w-0'
                          : isLow
                          ? 'bg-amber-500'
                          : 'bg-emerald-600'
                      }`}
                      style={{ width: `${Math.max(5, Math.min(100, stockRatio))}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Price & Margins Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Selling Price */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                    Prix de Vente
                  </span>
                  <div className="text-lg sm:text-xl font-black text-amber-600 mt-1">
                    {sellingPrice.toLocaleString()} <span className="text-xs font-bold text-slate-500">{settings.currency}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">par {product.unit}</span>
                </div>

                {/* Cost Price */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                    Coût d'Achat
                  </span>
                  <div className="text-lg sm:text-xl font-black text-slate-700 mt-1">
                    {canViewCostPrices ? `${costPrice.toLocaleString()} ` : '••• '}
                    <span className="text-xs font-bold text-slate-500">{settings.currency}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">prix de revient</span>
                </div>

                {/* Unit Margin */}
                <div className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-2xl">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">
                    Marge Unitaire
                  </span>
                  <div className="text-lg sm:text-xl font-black text-emerald-700 mt-1">
                    {canViewCostPrices ? `+${unitMargin.toLocaleString()} ` : '••• '}
                    <span className="text-xs font-bold text-emerald-600">{settings.currency}</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700">
                    {canViewCostPrices ? `${marginPercent.toFixed(1)}% marge` : 'Confidential'}
                  </span>
                </div>

                {/* Units in Stock */}
                <div className="p-3.5 bg-amber-50/50 border border-amber-200 rounded-2xl">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 block">
                    Stock Réel
                  </span>
                  <div className="text-lg sm:text-xl font-black text-slate-900 mt-1">
                    {product.stock} <span className="text-xs font-bold text-slate-500">{product.unit}(s)</span>
                  </div>
                  <span className="text-[10px] font-semibold text-amber-800">
                    {isOut ? 'À commander d\'urgence' : 'Disponible en rayon'}
                  </span>
                </div>
              </div>

              {/* Total Valuation of this Product in Stock */}
              {canViewCostPrices && (
                <div className="p-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4" />
                      Valorisation du Stock de cette Référence
                    </span>
                    <span className="text-xs text-slate-400">
                      Calcul sur {Math.max(0, product.stock)} {product.unit}s
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700">
                      <span className="text-slate-400 block text-[10px]">Valeur au Coût d'Achat</span>
                      <strong className="text-base font-black text-slate-200">
                        {totalCostValue.toLocaleString()} {settings.currency}
                      </strong>
                    </div>

                    <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700">
                      <span className="text-slate-400 block text-[10px]">Valeur Marchande (Vente)</span>
                      <strong className="text-base font-black text-amber-400">
                        {totalSellingValue.toLocaleString()} {settings.currency}
                      </strong>
                    </div>

                    <div className="p-2.5 bg-emerald-950/60 rounded-xl border border-emerald-800/60">
                      <span className="text-emerald-400 block text-[10px]">Bénéfice Potentiel Net</span>
                      <strong className="text-base font-black text-emerald-300">
                        +{totalPotentialProfit.toLocaleString()} {settings.currency}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* General Technical Information */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
                <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-amber-600" />
                  Caractéristiques & Identification
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-slate-600 pt-1">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Catégorie</span>
                    <span className="font-bold text-slate-800">{product.category}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Unité de vente</span>
                    <span className="font-bold text-slate-800">{product.unit}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Identifiant unique (ID)</span>
                    <span className="font-mono text-[10px] text-slate-500 truncate block">{product.id}</span>
                  </div>
                  {product.barcode && (
                    <div>
                      <span className="text-[10px] text-slate-400 block">Code Barre / SKU</span>
                      <span className="font-mono font-bold text-slate-800">{product.barcode}</span>
                    </div>
                  )}
                  {varieties.length > 0 && (
                    <div className="col-span-2">
                      <span className="text-[10px] text-slate-400 block">{product.varietyLabel || 'Variantes'}</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {varieties.map((v, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded-md text-[10px] font-bold border border-amber-200"
                          >
                            {v}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: VARIETIES */}
          {activeTab === 'varieties' && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl">
                <h4 className="text-xs font-black uppercase text-amber-950 tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  Options de {product.varietyLabel || 'Variantes'} pour {product.name}
                </h4>
                <p className="text-xs text-amber-900 mt-1">
                  Les serveurs et caissiers peuvent choisir l'une de ces variantes lors de la saisie d'une commande en caisse.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {varieties.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs flex items-center space-x-2"
                  >
                    <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center text-xs font-black">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-xs text-slate-900 truncate">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: HISTORY LOGS */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {productLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-slate-50 border border-slate-200 rounded-2xl text-xs">
                  Aucun mouvement de stock spécifique enregistré récemment pour ce produit.
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {productLogs.slice(0, 30).map((log) => {
                    const isPositive = log.type === 'in';
                    const isSale = log.type === 'sale';
                    const isLoss = log.type === 'spill_loss';

                    return (
                      <div
                        key={log.id}
                        className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs hover:bg-slate-50 transition"
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              isPositive
                                ? 'bg-emerald-100 text-emerald-700'
                                : isSale
                                ? 'bg-blue-100 text-blue-700'
                                : isLoss
                                ? 'bg-red-100 text-red-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {isPositive ? (
                              <ArrowUpRight className="w-4 h-4" />
                            ) : (
                              <ArrowDownRight className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate">
                              {log.reason || (isPositive ? 'Réapprovisionnement' : isSale ? 'Vente en caisse' : 'Ajustement')}
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1.5 flex-wrap mt-0.5">
                              <span>{new Date(log.timestamp).toLocaleString('fr-FR')}</span>
                              <span>•</span>
                              <span className="font-medium text-slate-700">Par: {log.recordedBy || 'Système'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className={`font-black text-sm ${
                              isPositive ? 'text-emerald-600' : 'text-slate-800'
                            }`}
                          >
                            {isPositive ? `+${log.quantity}` : `-${log.quantity}`} {product.unit}
                          </span>
                          <div className="text-[10px] text-slate-500 mt-0.5 bg-slate-100 px-2 py-0.5 rounded-md font-semibold">
                            Avant: <span className="font-bold text-slate-700">{log.previousStock}</span> → Après: <span className="font-black text-slate-900">{log.newStock}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition cursor-pointer"
          >
            Fermer
          </button>

          {canManageStock && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  onClose();
                  onEdit(product);
                }}
                className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 flex items-center space-x-1.5 transition cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                <span>Modifier Fiche</span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  onAdjust(product);
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl shadow-xs flex items-center space-x-1.5 transition active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Réapprovisionner</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
