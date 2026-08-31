import React, { useState, useEffect, useRef } from 'react';
import { Product } from '../../types';
import { 
  X, 
  Check, 
  Plus, 
  Minus, 
  Package, 
  Calculator, 
  Layers, 
  AlertTriangle,
  Boxes,
  ArrowRight,
  Delete
} from 'lucide-react';

interface QuickQuantityModalProps {
  product: Product;
  currentQuantity?: number;
  initialFlavor?: string;
  isEditingCartItem?: boolean;
  currency: string;
  onClose: () => void;
  onConfirm: (quantity: number, selectedFlavor?: string) => void;
}

export const QuickQuantityModal: React.FC<QuickQuantityModalProps> = ({
  product,
  currentQuantity = 1,
  initialFlavor,
  isEditingCartItem = false,
  currency,
  onClose,
  onConfirm,
}) => {
  const [quantity, setQuantity] = useState<number>(currentQuantity > 0 ? currentQuantity : 1);
  const [inputValue, setInputValue] = useState<string>(String(currentQuantity > 0 ? currentQuantity : 1));
  const [selectedFlavor, setSelectedFlavor] = useState<string>(
    initialFlavor || (product.flavors && product.flavors.length > 0 ? product.flavors[0] : '')
  );
  const [customFlavor, setCustomFlavor] = useState<string>('');
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus and select input text for immediate keyboard typing
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const handleInputChange = (val: string) => {
    // Allow empty string temporarily while typing
    if (val === '') {
      setInputValue('');
      setQuantity(1);
      return;
    }
    const clean = val.replace(/\D/g, '');
    if (clean === '') {
      setInputValue('');
      setQuantity(1);
      return;
    }
    const num = parseInt(clean, 10);
    const clamped = Math.min(Math.max(1, num), 99999);
    setInputValue(String(clamped));
    setQuantity(clamped);
  };

  const handleInputBlur = () => {
    if (inputValue === '' || quantity < 1) {
      setInputValue('1');
      setQuantity(1);
    }
  };

  // Numpad button click handler
  const handleNumpadPress = (digit: string) => {
    if (digit === 'C') {
      setInputValue('1');
      setQuantity(1);
      return;
    }
    if (digit === 'BACKSPACE') {
      const updated = inputValue.slice(0, -1);
      if (updated === '' || updated === '0') {
        setInputValue('1');
        setQuantity(1);
      } else {
        const num = parseInt(updated, 10);
        setInputValue(String(num));
        setQuantity(num);
      }
      return;
    }
    if (digit === '00') {
      if (inputValue === '0' || inputValue === '') {
        setInputValue('0');
        setQuantity(1);
      } else {
        const updated = inputValue + '00';
        const num = Math.min(parseInt(updated, 10), 99999);
        setInputValue(String(num));
        setQuantity(num);
      }
      return;
    }

    // Single digit 0-9
    let updated = inputValue;
    if (inputValue === '1' && currentQuantity === 1 && digit !== '0') {
      // If default 1 was not changed, start fresh with typed digit
      updated = digit;
    } else {
      updated = inputValue + digit;
    }
    const num = Math.min(Math.max(1, parseInt(updated, 10)), 99999);
    setInputValue(String(num));
    setQuantity(num);
  };

  // Quick Preset Adders / Setters
  const handleAddPreset = (delta: number) => {
    const next = Math.min(Math.max(1, quantity + delta), 99999);
    setQuantity(next);
    setInputValue(String(next));
  };

  const handleSetExactPreset = (exact: number) => {
    const val = Math.min(Math.max(1, exact), 99999);
    setQuantity(val);
    setInputValue(String(val));
  };

  const handleConfirm = () => {
    const finalQty = quantity >= 1 ? quantity : 1;
    let finalFlavor = undefined;
    if (product.flavors && product.flavors.length > 0) {
      finalFlavor = isCustomMode && customFlavor.trim() ? customFlavor.trim() : selectedFlavor;
      if (!finalFlavor) {
        alert('Veuillez sélectionner un parfum pour ce produit.');
        return;
      }
    }
    onConfirm(finalQty, finalFlavor);
  };

  const isStockExceeded = product.stock > 0 && quantity > product.stock;
  const isOutOfStock = product.stock <= 0;
  const totalAmount = product.price * quantity;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn overflow-y-auto overscroll-contain">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92dvh] my-auto">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 overflow-hidden flex items-center justify-center shrink-0">
              {product.image ? (
                <img 
                  src={product.image} 
                  alt={product.name} 
                  className="w-full h-full object-cover" 
                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                />
              ) : (
                <Package className="w-6 h-6 text-amber-400" />
              )}
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <Calculator className="w-3.5 h-3.5" />
                <span>{isEditingCartItem ? 'Modifier la Quantité' : 'Saisie Directe de Quantité'}</span>
              </span>
              <h3 className="font-extrabold text-base sm:text-lg text-white truncate">
                {product.name}
              </h3>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span className="font-black text-amber-400">
                  {product.price.toLocaleString()} {currency}
                </span>
                <span>/ {product.unit}</span>
                <span className="text-slate-500">•</span>
                <span className={`px-1.5 py-0.2 rounded font-bold text-[11px] ${
                  isOutOfStock 
                    ? 'bg-red-500/20 text-red-300 border border-red-500/30' 
                    : product.stock <= product.minStockAlert 
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  Stock: {product.stock}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer shrink-0"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* Flavor Selection if product has flavors */}
          {product.flavors && product.flavors.length > 0 && (
            <div className="bg-amber-50/70 border border-amber-200 p-3 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs font-black text-amber-950">
                <span className="flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-amber-600" />
                  <span>Choisir le parfum :</span>
                </span>
                {selectedFlavor && !isCustomMode && (
                  <span className="bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full text-[10px]">
                    Sélectionné : {selectedFlavor}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                {product.flavors.map(f => {
                  const isSel = !isCustomMode && selectedFlavor === f;
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => {
                        setSelectedFlavor(f);
                        setIsCustomMode(false);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        isSel
                          ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs ring-2 ring-amber-400/50'
                          : 'bg-white text-slate-700 hover:bg-amber-100/50 border-slate-200'
                      }`}
                    >
                      {f}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setIsCustomMode(true)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    isCustomMode
                      ? 'bg-slate-900 text-amber-400 border-slate-950 shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border-dashed border-slate-300'
                  }`}
                >
                  + Autre parfum...
                </button>
              </div>

              {isCustomMode && (
                <input
                  type="text"
                  value={customFlavor}
                  onChange={(e) => setCustomFlavor(e.target.value)}
                  placeholder="Ex: Spécial Cocktail Fraise"
                  className="w-full bg-white border border-amber-400 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              )}
            </div>
          )}

          {/* Big Interactive Quantity Input Display */}
          <div className="bg-slate-50 border-2 border-amber-500/40 rounded-2xl p-3 sm:p-4 text-center space-y-2">
            <label className="text-xs font-black uppercase text-slate-500 tracking-wider block">
              Quantité désirée ({product.unit}s)
            </label>

            <div className="flex items-center justify-center gap-2 sm:gap-3">
              {/* Stepper Minus */}
              <button
                type="button"
                onClick={() => handleAddPreset(-1)}
                disabled={quantity <= 1}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-700 font-black border border-slate-200 shadow-sm flex items-center justify-center transition active:scale-95 cursor-pointer shrink-0"
                title="Diminuer de 1"
              >
                <Minus className="w-5 h-5 stroke-[2.5]" />
              </button>

              {/* Direct Text Input */}
              <div className="flex-1 max-w-[200px] relative">
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={inputValue}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onBlur={handleInputBlur}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleConfirm();
                    }
                  }}
                  className="w-full h-12 sm:h-14 bg-white border-2 border-amber-500 rounded-2xl text-center text-2xl sm:text-3xl font-black text-slate-900 shadow-inner focus:outline-none focus:ring-4 focus:ring-amber-400/30"
                />
              </div>

              {/* Stepper Plus */}
              <button
                type="button"
                onClick={() => handleAddPreset(1)}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black border border-amber-600 shadow-md flex items-center justify-center transition active:scale-95 cursor-pointer shrink-0"
                title="Ajouter 1"
              >
                <Plus className="w-5 h-5 stroke-[3]" />
              </button>
            </div>

            {/* Quick Bar / Crate Presets Bar */}
            <div className="pt-2 border-t border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 block mb-1.5">
                Raccourcis rapides Bar & Casiers :
              </span>
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSetExactPreset(6)}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-black bg-white hover:bg-amber-100 text-slate-800 border border-slate-200 hover:border-amber-300 transition cursor-pointer shadow-2xs"
                >
                  6 (Pack)
                </button>
                <button
                  type="button"
                  onClick={() => handleSetExactPreset(12)}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-black bg-white hover:bg-amber-100 text-slate-800 border border-slate-200 hover:border-amber-300 transition cursor-pointer shadow-2xs"
                >
                  12 (Demi-Casier)
                </button>
                <button
                  type="button"
                  onClick={() => handleSetExactPreset(24)}
                  className="px-3 py-1.5 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-slate-950 border border-amber-600 shadow-xs transition cursor-pointer flex items-center gap-1"
                >
                  <Boxes className="w-3.5 h-3.5" />
                  <span>24 (1 Casier)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSetExactPreset(48)}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-black bg-white hover:bg-amber-100 text-slate-800 border border-slate-200 hover:border-amber-300 transition cursor-pointer shadow-2xs"
                >
                  48 (2 Casiers)
                </button>
                <button
                  type="button"
                  onClick={() => handleSetExactPreset(100)}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-black bg-slate-900 hover:bg-slate-800 text-amber-400 transition cursor-pointer shadow-2xs"
                >
                  100
                </button>
              </div>
            </div>
          </div>

          {/* Virtual Touch Numpad */}
          <div className="bg-slate-100/80 p-2.5 sm:p-3 rounded-2xl border border-slate-200">
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleNumpadPress(digit)}
                  className="h-10 sm:h-11 rounded-xl bg-white hover:bg-slate-50 text-slate-900 font-extrabold text-base sm:text-lg border border-slate-200 shadow-2xs transition active:scale-95 active:bg-amber-200 cursor-pointer flex items-center justify-center"
                >
                  {digit}
                </button>
              ))}

              {/* Clear All */}
              <button
                type="button"
                onClick={() => handleNumpadPress('C')}
                className="h-10 sm:h-11 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs sm:text-sm border border-red-200 shadow-2xs transition active:scale-95 cursor-pointer flex items-center justify-center"
                title="Effacer tout"
              >
                C (Effacer)
              </button>

              {/* Zero */}
              <button
                type="button"
                onClick={() => handleNumpadPress('0')}
                className="h-10 sm:h-11 rounded-xl bg-white hover:bg-slate-50 text-slate-900 font-extrabold text-base sm:text-lg border border-slate-200 shadow-2xs transition active:scale-95 active:bg-amber-200 cursor-pointer flex items-center justify-center"
              >
                0
              </button>

              {/* Backspace */}
              <button
                type="button"
                onClick={() => handleNumpadPress('BACKSPACE')}
                className="h-10 sm:h-11 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs sm:text-sm border border-slate-300 shadow-2xs transition active:scale-95 cursor-pointer flex items-center justify-center"
                title="Effacer le dernier chiffre"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Additive Steps */}
            <div className="grid grid-cols-4 gap-1.5 mt-2 pt-2 border-t border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => handleAddPreset(5)}
                className="py-1.5 rounded-lg bg-white hover:bg-amber-50 text-slate-800 font-bold border border-slate-200 cursor-pointer"
              >
                +5
              </button>
              <button
                type="button"
                onClick={() => handleAddPreset(10)}
                className="py-1.5 rounded-lg bg-white hover:bg-amber-50 text-slate-800 font-bold border border-slate-200 cursor-pointer"
              >
                +10
              </button>
              <button
                type="button"
                onClick={() => handleAddPreset(24)}
                className="py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-950 font-black border border-amber-300 cursor-pointer"
              >
                +24 (Casier)
              </button>
              <button
                type="button"
                onClick={() => handleAddPreset(50)}
                className="py-1.5 rounded-lg bg-white hover:bg-amber-50 text-slate-800 font-bold border border-slate-200 cursor-pointer"
              >
                +50
              </button>
            </div>
          </div>

          {/* Stock Warning Notice if needed */}
          {isStockExceeded && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl flex items-start space-x-2 text-amber-900 text-xs animate-fadeIn">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-black">Attention Stock Insuffisant : </span>
                <span>Vous commandez {quantity} {product.unit}s, alors que le stock actuel enregistré est de {product.stock} {product.unit}s.</span>
              </div>
            </div>
          )}

          {/* Live Total Calculation Preview Box */}
          <div className="bg-slate-900 text-white p-3.5 rounded-2xl flex items-center justify-between shadow-md">
            <div>
              <span className="text-[11px] text-slate-400 uppercase font-bold block">
                Total de la ligne :
              </span>
              <span className="text-xs text-amber-400 font-bold">
                {quantity} {product.unit}(s) × {product.price.toLocaleString()} {currency}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xl sm:text-2xl font-black text-amber-400">
                {totalAmount.toLocaleString()} {currency}
              </span>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200 transition cursor-pointer"
          >
            Annuler
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs sm:text-sm shadow-md shadow-amber-500/20 flex items-center justify-center space-x-2 transition active:scale-95 cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>
              {isEditingCartItem 
                ? `Mettre à jour (${quantity} ${product.unit}s)` 
                : `Ajouter ${quantity} ${product.unit}s au Panier`}
            </span>
          </button>
        </div>

      </div>
    </div>
  );
};
