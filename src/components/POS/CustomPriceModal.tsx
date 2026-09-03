import React, { useState, useEffect, useRef } from 'react';
import { Product } from '../../types';
import { 
  X, 
  Gavel, 
  Tag, 
  Check, 
  TrendingUp, 
  TrendingDown, 
  RotateCcw,
  Keyboard
} from 'lucide-react';

interface CustomPriceModalProps {
  product: Product;
  currentUnitPrice: number;
  currentPriceType?: 'standard' | 'negotiated' | 'auction' | 'custom';
  currency: string;
  onClose: () => void;
  onConfirm: (newUnitPrice: number, priceType: 'standard' | 'negotiated' | 'auction' | 'custom') => void;
}

export const CustomPriceModal: React.FC<CustomPriceModalProps> = ({
  product,
  currentUnitPrice,
  currentPriceType = 'standard',
  currency,
  onClose,
  onConfirm,
}) => {
  const [selectedType, setSelectedType] = useState<'standard' | 'negotiated' | 'auction' | 'custom'>(
    currentPriceType === 'standard' && currentUnitPrice !== product.price ? 'negotiated' : currentPriceType
  );
  const [priceInput, setPriceInput] = useState<string>(currentUnitPrice.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const numericPrice = parseFloat(priceInput) || 0;
  const standardPrice = product.price;
  const diffFromStandard = numericPrice - standardPrice;
  const percentDiff = standardPrice > 0 ? ((diffFromStandard / standardPrice) * 100).toFixed(1) : '0';

  const handlePresetPercent = (percent: number) => {
    const calculated = Math.max(0, Math.round(standardPrice * (1 + percent / 100)));
    setPriceInput(calculated.toString());
    if (percent > 0) {
      setSelectedType('auction');
    } else if (percent < 0) {
      setSelectedType('negotiated');
    }
  };

  const handleResetStandard = () => {
    setPriceInput(standardPrice.toString());
    setSelectedType('standard');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (numericPrice <= 0 && selectedType !== 'standard') {
      alert("Veuillez saisir un prix valide supérieur à 0.");
      return;
    }
    onConfirm(numericPrice, selectedType);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col text-slate-900 animate-scaleUp">
        
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
              {selectedType === 'auction' ? <Gavel className="w-5 h-5" /> : <Tag className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm font-black text-white leading-tight">
                Tarification Libre, Négociée ou Enchères
              </h3>
              <p className="text-[11px] text-amber-400 truncate max-w-[240px]">
                {product.name}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Pricing Type Mode Selector */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3">
          <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">
            Type de tarification appliquée
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedType('negotiated');
              }}
              className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center space-y-1 transition cursor-pointer ${
                selectedType === 'negotiated'
                  ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Tag className="w-4 h-4" />
              <span className="leading-tight text-center">Prix Négocié / Incité</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedType('auction');
              }}
              className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center space-y-1 transition cursor-pointer ${
                selectedType === 'auction'
                  ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Gavel className="w-4 h-4" />
              <span className="leading-tight text-center">Aux Enchères</span>
            </button>

            <button
              type="button"
              onClick={handleResetStandard}
              className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center space-y-1 transition cursor-pointer ${
                selectedType === 'standard'
                  ? 'bg-slate-900 text-white border-slate-950 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              <span className="leading-tight text-center">Prix Standard ({standardPrice}{currency})</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          
          {/* Main Price Display & Input */}
          <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 text-center space-y-1 relative">
            <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">
              Nouveau Prix Unitaire de Vente
            </span>
            <div className="flex items-center justify-center space-x-2">
              <input
                ref={inputRef}
                type="number"
                min="0"
                step="any"
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                autoFocus
                className="text-3xl font-black text-amber-400 bg-transparent text-center focus:outline-none w-48 border-b-2 border-amber-500/40 focus:border-amber-400"
              />
              <span className="text-xl font-bold text-slate-300">{currency}</span>
            </div>

            {/* Comparison vs Catalogue */}
            <div className="pt-2 text-xs flex items-center justify-center space-x-3 text-slate-300">
              <span>Catalogue : <strong>{standardPrice} {currency}</strong></span>
              {numericPrice !== standardPrice && (
                <span className={`font-black flex items-center space-x-0.5 ${diffFromStandard > 0 ? 'text-emerald-400' : 'text-orange-400'}`}>
                  {diffFromStandard > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  <span>{diffFromStandard > 0 ? `+${diffFromStandard}` : diffFromStandard} {currency} ({percentDiff}%)</span>
                </span>
              )}
            </div>
          </div>

          {/* Quick Adjustment Chips */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Raccourcis rapides :</span>
            <div className="grid grid-cols-4 gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => handlePresetPercent(-20)}
                className="py-1.5 px-2 bg-orange-50 hover:bg-orange-100 text-orange-900 border border-orange-200 rounded-lg font-bold text-center transition"
              >
                -20%
              </button>
              <button
                type="button"
                onClick={() => handlePresetPercent(-10)}
                className="py-1.5 px-2 bg-orange-50 hover:bg-orange-100 text-orange-900 border border-orange-200 rounded-lg font-bold text-center transition"
              >
                -10%
              </button>
              <button
                type="button"
                onClick={() => handlePresetPercent(10)}
                className="py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-lg font-bold text-center transition"
              >
                +10%
              </button>
              <button
                type="button"
                onClick={() => handlePresetPercent(25)}
                className="py-1.5 px-2 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-lg font-bold text-center transition"
              >
                +25%
              </button>
            </div>
          </div>

          {/* Physical Keyboard Notice */}
          <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-center gap-2">
            <Keyboard className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Tapez le montant sur votre clavier, puis</span>
            <kbd className="px-1.5 py-0.5 bg-white text-slate-800 border border-slate-300 rounded font-mono text-[10px] font-bold">Entrée ↵</kbd>
          </div>

          {/* Footer Submit */}
          <div className="flex items-center space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 transition cursor-pointer"
            >
              Annuler (Échap)
            </button>
            <button
              type="submit"
              className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center justify-center space-x-1.5 transition active:scale-95 cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Appliquer ce Prix</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
