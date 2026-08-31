import React, { useState } from 'react';
import { Product } from '../../types';
import { X, Layers, Check, Plus, Minus, Calculator, Boxes } from 'lucide-react';

interface FlavorSelectionModalProps {
  product: Product;
  onClose: () => void;
  onSelectFlavor: (flavor: string, quantity: number) => void;
  currency: string;
}

export const FlavorSelectionModal: React.FC<FlavorSelectionModalProps> = ({
  product,
  onClose,
  onSelectFlavor,
  currency,
}) => {
  const varietyLabel = product.varietyLabel || 'Variante';
  const availableVarieties = (product.varietyOptions && product.varietyOptions.length > 0)
    ? product.varietyOptions
    : (product.flavors || []);

  const [selectedFlavor, setSelectedFlavor] = useState<string>(
    availableVarieties.length > 0 ? availableVarieties[0] : ''
  );
  const [customFlavor, setCustomFlavor] = useState<string>('');
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [quantity, setQuantity] = useState<number>(1);
  const [quantityInput, setQuantityInput] = useState<string>('1');

  const handleQtyChange = (val: string) => {
    if (val === '') {
      setQuantityInput('');
      setQuantity(1);
      return;
    }
    const clean = val.replace(/\D/g, '');
    if (clean === '') {
      setQuantityInput('');
      setQuantity(1);
      return;
    }
    const num = Math.min(Math.max(1, parseInt(clean, 10)), 99999);
    setQuantityInput(String(num));
    setQuantity(num);
  };

  const handleQtyBlur = () => {
    if (quantityInput === '' || quantity < 1) {
      setQuantityInput('1');
      setQuantity(1);
    }
  };

  const setPresetQty = (qty: number) => {
    const clamped = Math.max(1, qty);
    setQuantity(clamped);
    setQuantityInput(String(clamped));
  };

  const handleConfirm = () => {
    const finalFlavor = isCustomMode && customFlavor.trim() ? customFlavor.trim() : selectedFlavor;
    if (!finalFlavor) {
      alert(`Veuillez sélectionner ou saisir un(e) ${varietyLabel.toLowerCase()}`);
      return;
    }
    const finalQty = quantity >= 1 ? quantity : 1;
    onSelectFlavor(finalFlavor, finalQty);
  };

  const totalLinePrice = product.price * quantity;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn overflow-y-auto overscroll-contain">
      <div className="bg-white rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl border border-slate-200 relative overflow-hidden max-h-[92dvh] flex flex-col my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center space-x-3">
            {product.image ? (
              <img 
                src={product.image} 
                alt={product.name} 
                className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-xs"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-amber-500 text-slate-950 font-black text-xl flex items-center justify-center shadow">
                ✨
              </div>
            )}
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">{product.name}</h3>
              <p className="text-xs text-amber-600 font-bold">
                Prix: {product.price.toLocaleString()} {currency} / {product.unit || 'Pièce'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="py-4 space-y-4 overflow-y-auto flex-1">
          
          {/* Variety selection section */}
          <div>
            <span className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1 mb-2">
              <Layers className="w-3.5 h-3.5 text-amber-500" />
              <span>1. Choix du / de la {varietyLabel} :</span>
            </span>

            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
              {availableVarieties.map((item) => {
                const isSelected = !isCustomMode && selectedFlavor === item;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setSelectedFlavor(item);
                      setIsCustomMode(false);
                    }}
                    className={`px-3 py-2.5 rounded-xl text-xs font-black text-left flex items-center justify-between transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md ring-2 ring-amber-400/40'
                        : 'bg-slate-50 text-slate-800 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    <span className="truncate">{item}</span>
                    {isSelected && <Check className="w-4 h-4 text-slate-950 shrink-0 ml-1 stroke-[3]" />}
                  </button>
                );
              })}

              {/* Custom Variety Option Button */}
              <button
                type="button"
                onClick={() => setIsCustomMode(true)}
                className={`px-3 py-2.5 rounded-xl text-xs font-bold text-left flex items-center justify-between transition-all cursor-pointer border ${
                  isCustomMode
                    ? 'bg-slate-900 text-amber-400 border-slate-800 shadow-md ring-2 ring-amber-400/40'
                    : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                }`}
              >
                <span className="flex items-center gap-1 truncate">
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span>Autre {varietyLabel.toLowerCase()}...</span>
                </span>
                {isCustomMode && <Check className="w-4 h-4 text-amber-400 shrink-0 ml-1 stroke-[3]" />}
              </button>
            </div>

            {/* Custom Variety Text Input */}
            {isCustomMode && (
              <div className="mt-2 animate-fadeIn">
                <input
                  type="text"
                  value={customFlavor}
                  onChange={(e) => setCustomFlavor(e.target.value)}
                  placeholder={`Saisissez le/la ${varietyLabel.toLowerCase()} personnalisé(e)...`}
                  autoFocus
                  className="w-full bg-slate-50 border border-amber-400 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            )}
          </div>

          {/* Quantity Section with Direct Input and Presets */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                <Calculator className="w-3.5 h-3.5 text-amber-600" />
                <span>2. Quantité désirée :</span>
              </span>
              <span className="text-xs font-bold text-slate-500">
                Stock: {product.stock} {product.unit || 'unité'}(s)
              </span>
            </div>

            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setPresetQty(quantity - 1)}
                disabled={quantity <= 1}
                className="w-10 h-10 rounded-xl bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-700 font-black border border-slate-200 shadow-2xs flex items-center justify-center transition active:scale-95 cursor-pointer shrink-0"
              >
                <Minus className="w-4 h-4" />
              </button>

              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={quantityInput}
                onChange={(e) => handleQtyChange(e.target.value)}
                onBlur={handleQtyBlur}
                onFocus={(e) => e.target.select()}
                className="w-24 h-10 bg-white border-2 border-amber-500 rounded-xl text-center text-xl font-black text-slate-900 shadow-inner focus:outline-none focus:ring-2 focus:ring-amber-400/40"
              />

              <button
                type="button"
                onClick={() => setPresetQty(quantity + 1)}
                className="w-10 h-10 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black border border-amber-600 shadow-xs flex items-center justify-center transition active:scale-95 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
              </button>
            </div>

            {/* Quick Multipliers */}
            <div className="flex flex-wrap items-center justify-center gap-1 pt-1">
              <button
                type="button"
                onClick={() => setPresetQty(6)}
                className="px-2 py-1 rounded-lg text-[11px] font-black bg-white hover:bg-amber-100 text-slate-800 border border-slate-200 cursor-pointer"
              >
                6
              </button>
              <button
                type="button"
                onClick={() => setPresetQty(12)}
                className="px-2 py-1 rounded-lg text-[11px] font-black bg-white hover:bg-amber-100 text-slate-800 border border-slate-200 cursor-pointer"
              >
                12 (Pack)
              </button>
              <button
                type="button"
                onClick={() => setPresetQty(24)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-amber-500 hover:bg-amber-400 text-slate-950 border border-amber-600 shadow-xs cursor-pointer flex items-center gap-0.5"
              >
                <Boxes className="w-3 h-3" />
                <span>24 (Carton / Casier)</span>
              </button>
              <button
                type="button"
                onClick={() => setPresetQty(48)}
                className="px-2 py-1 rounded-lg text-[11px] font-black bg-white hover:bg-amber-100 text-slate-800 border border-slate-200 cursor-pointer"
              >
                48
              </button>
            </div>
          </div>

          {/* Subtotal Preview */}
          <div className="bg-slate-900 text-white px-3.5 py-2.5 rounded-xl flex items-center justify-between text-xs">
            <span className="text-slate-400">Total : {quantity} {product.unit || 'unité'}(s)</span>
            <span className="font-black text-amber-400 text-base">
              {totalLinePrice.toLocaleString()} {currency}
            </span>
          </div>

        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs cursor-pointer transition"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs shadow-md flex items-center space-x-1.5 cursor-pointer transition active:scale-95"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Ajouter {quantity} {product.unit || 'unité'}(s)</span>
          </button>
        </div>

      </div>
    </div>
  );
};
