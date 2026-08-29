import React, { useState } from 'react';
import { useBar } from '../../context/BarContext';
import { Product } from '../../types';
import { X, ArrowDownUp, PlusCircle, AlertOctagon, Check, Calculator } from 'lucide-react';
import { CrateCalculatorModal } from './CrateCalculatorModal';

interface StockAdjustModalProps {
  product: Product;
  onClose: () => void;
}

export const StockAdjustModal: React.FC<StockAdjustModalProps> = ({ product, onClose }) => {
  const { restockProduct, updateProduct, settings } = useBar();

  const [quantity, setQuantity] = useState<string>('24');
  const [type, setType] = useState<'in' | 'spill_loss'>('in');
  const [reason, setReason] = useState<string>('Approvisionnement fournisseur');
  const [showCrateCalc, setShowCrateCalc] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(quantity) || 0;
    if (qty <= 0) {
      alert("Veuillez saisir une quantité valide.");
      return;
    }

    const adjustAmount = type === 'in' ? qty : -qty;
    restockProduct(product.id, adjustAmount, reason);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn overflow-y-auto overscroll-contain">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full max-h-[92dvh] flex flex-col p-4 sm:p-6 shadow-2xl text-slate-900 relative my-auto overflow-hidden">
        
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-slate-200 pb-3 mb-2">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900">Ajustement de Stock</h3>
            <p className="text-xs text-amber-600 font-bold">{product.name} ({product.unit})</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto space-y-4 text-xs overscroll-contain pr-1 flex flex-col">
          <div className="space-y-4 flex-1">
            {/* Current stock status */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
              <span className="text-slate-500">Stock actuel disponible:</span>
              <span className="text-base font-black text-emerald-600">{product.stock} {product.unit}(s)</span>
            </div>

            {/* Movement type selector */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setType('in');
                  setReason('Approvisionnement fournisseur / caisse');
                }}
                className={`p-3 rounded-xl border flex items-center justify-center space-x-2 font-bold transition cursor-pointer ${
                  type === 'in'
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                }`}
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Entrée Stock</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('spill_loss');
                  setReason('Perte / Casse / Bouteille brisée');
                }}
                className={`p-3 rounded-xl border flex items-center justify-center space-x-2 font-bold transition cursor-pointer ${
                  type === 'spill_loss'
                    ? 'bg-red-600 text-white border-red-500 shadow-md'
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                }`}
              >
                <AlertOctagon className="w-4 h-4" />
                <span>- Perte / Casse</span>
              </button>
            </div>

            {/* Quantity Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700">
                  Quantité à {type === 'in' ? 'Ajouter' : 'DÉDUIRE'} ({product.unit}s)
                </label>
                {type === 'in' && (
                  <button
                    type="button"
                    onClick={() => setShowCrateCalc(true)}
                    className="text-[11px] font-extrabold text-amber-700 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded-lg transition flex items-center space-x-1 cursor-pointer"
                  >
                    <Calculator className="w-3 h-3 text-amber-600" />
                    <span>Calculer par Caisses 🧮</span>
                  </button>
                )}
              </div>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-black text-lg p-2.5 rounded-xl focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Reason */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Motif / Motif de mouvement</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="ex: Achats 2 caisses, bouteille cassée..."
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 font-medium p-2.5 rounded-xl focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="pt-3 border-t border-slate-100 shrink-0 flex justify-end space-x-2 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-lg shadow-amber-500/20 flex items-center space-x-1 cursor-pointer transition active:scale-95"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Valider Ajustement</span>
            </button>
          </div>

        </form>

        {showCrateCalc && (
          <CrateCalculatorModal
            currency={settings.currency}
            currentSellingPrice={product.price}
            onClose={() => setShowCrateCalc(false)}
            onApply={(res) => {
              setQuantity(res.totalUnits.toString());
              if (res.unitCost > 0) {
                updateProduct(product.id, { costPrice: res.unitCost });
              }
              setReason(`Approvisionnement par caisses (${res.totalUnits} unités à ${res.unitCost} ${settings.currency}/u)`);
            }}
          />
        )}

      </div>
    </div>
  );
};
