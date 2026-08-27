import React, { useState } from 'react';
import { X, Calculator, Check, ArrowRight, PackageCheck, DollarSign } from 'lucide-react';

interface CrateCalculatorModalProps {
  initialCrates?: number;
  initialUnitsPerCrate?: number;
  currency?: string;
  currentSellingPrice?: number;
  onApply: (result: { totalUnits: number; unitCost: number; totalInvoice: number }) => void;
  onClose: () => void;
}

export const CrateCalculatorModal: React.FC<CrateCalculatorModalProps> = ({
  initialCrates = 5,
  initialUnitsPerCrate = 24,
  currency = 'HTG',
  currentSellingPrice = 0,
  onApply,
  onClose,
}) => {
  const [crates, setCrates] = useState<string>(initialCrates.toString());
  const [unitsPerCrate, setUnitsPerCrate] = useState<string>(initialUnitsPerCrate.toString());
  const [pricingMode, setPricingMode] = useState<'per_crate' | 'total_invoice'>('per_crate');
  const [pricePerCrate, setPricePerCrate] = useState<string>('3600');
  const [totalInvoice, setTotalInvoice] = useState<string>('18000');

  const numCrates = Math.max(1, parseInt(crates) || 1);
  const numUnitsPerCrate = Math.max(1, parseInt(unitsPerCrate) || 1);
  const totalUnits = numCrates * numUnitsPerCrate;

  let calculatedUnitCost = 0;
  let calculatedTotalInvoice = 0;

  if (pricingMode === 'per_crate') {
    const pCrate = parseFloat(pricePerCrate) || 0;
    calculatedTotalInvoice = pCrate * numCrates;
    calculatedUnitCost = numUnitsPerCrate > 0 ? pCrate / numUnitsPerCrate : 0;
  } else {
    const totInv = parseFloat(totalInvoice) || 0;
    calculatedTotalInvoice = totInv;
    calculatedUnitCost = totalUnits > 0 ? totInv / totalUnits : 0;
  }

  const roundedUnitCost = Math.round(calculatedUnitCost * 100) / 100;

  const marginPerUnit = currentSellingPrice > 0 ? currentSellingPrice - roundedUnitCost : 0;
  const marginPercentage = roundedUnitCost > 0 ? Math.round((marginPerUnit / roundedUnitCost) * 100) : 0;

  const handleApply = () => {
    onApply({
      totalUnits,
      unitCost: roundedUnitCost,
      totalInvoice: Math.round(calculatedTotalInvoice * 100) / 100,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 text-slate-900 relative">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center space-x-2">
            <Calculator className="w-5 h-5 text-amber-600" />
            <div>
              <h3 className="text-base font-black text-slate-900">Calculateur par Caisses & Cartons</h3>
              <p className="text-[11px] text-slate-500">Calculez le coût unitaire d'achat et le stock facilement.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          
          {/* Preset Buttons for Quick Units per crate */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Combien de Caisses / Cartons achetés ?</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-500 font-bold block mb-0.5">Nombre de Caisses</span>
                <input
                  type="number"
                  min="1"
                  value={crates}
                  onChange={(e) => setCrates(e.target.value)}
                  placeholder="Ex: 5"
                  className="w-full bg-slate-50 p-2.5 rounded-xl border border-slate-300 font-extrabold text-slate-900 focus:ring-2 focus:ring-amber-500 text-sm"
                />
              </div>

              <div>
                <span className="text-[10px] text-slate-500 font-bold block mb-0.5">Unités par caisse</span>
                <input
                  type="number"
                  min="1"
                  value={unitsPerCrate}
                  onChange={(e) => setUnitsPerCrate(e.target.value)}
                  placeholder="Ex: 24"
                  className="w-full bg-slate-50 p-2.5 rounded-xl border border-slate-300 font-extrabold text-slate-900 focus:ring-2 focus:ring-amber-500 text-sm"
                />
              </div>
            </div>

            {/* Quick shortcuts for units per crate */}
            <div className="flex gap-1.5 mt-2">
              <span className="text-[10px] text-slate-400 self-center">Format classique:</span>
              {[12, 24, 30, 36].map(u => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnitsPerCrate(u.toString())}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${
                    parseInt(unitsPerCrate) === u 
                      ? 'bg-amber-500 text-slate-950 border-amber-600' 
                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  {u} btles
                </button>
              ))}
            </div>
          </div>

          {/* Pricing Mode Selector */}
          <div className="space-y-2">
            <label className="block font-bold text-slate-700">Mode de saisie du Prix d'Achat</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPricingMode('per_crate')}
                className={`p-2.5 rounded-xl border font-bold text-[11px] transition flex flex-col items-center cursor-pointer ${
                  pricingMode === 'per_crate'
                    ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>Prix par Caisse</span>
                <span className="text-[9px] font-normal opacity-80">(ex: 3,600 {currency} / caisse)</span>
              </button>

              <button
                type="button"
                onClick={() => setPricingMode('total_invoice')}
                className={`p-2.5 rounded-xl border font-bold text-[11px] transition flex flex-col items-center cursor-pointer ${
                  pricingMode === 'total_invoice'
                    ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>Facture Globale</span>
                <span className="text-[9px] font-normal opacity-80">(ex: 18,000 {currency} total)</span>
              </button>
            </div>

            {/* Input based on pricing mode */}
            {pricingMode === 'per_crate' ? (
              <div>
                <label className="block font-bold text-slate-700 mb-1">Prix d'achat d'une caisse ({currency})</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={pricePerCrate}
                  onChange={(e) => setPricePerCrate(e.target.value)}
                  placeholder="Ex: 3600"
                  className="w-full bg-slate-50 p-2.5 rounded-xl border border-slate-300 font-extrabold text-slate-900 focus:ring-2 focus:ring-amber-500 text-sm"
                />
              </div>
            ) : (
              <div>
                <label className="block font-bold text-slate-700 mb-1">Montant total de la facture ({currency})</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={totalInvoice}
                  onChange={(e) => setTotalInvoice(e.target.value)}
                  placeholder="Ex: 18000"
                  className="w-full bg-slate-50 p-2.5 rounded-xl border border-slate-300 font-extrabold text-slate-900 focus:ring-2 focus:ring-amber-500 text-sm"
                />
              </div>
            )}
          </div>

          {/* Realtime Result Summary Box */}
          <div className="bg-gradient-to-br from-amber-50 to-amber-100/80 p-4 rounded-2xl border border-amber-200 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-amber-900 font-bold">Quantité Totale d'Unités :</span>
              <span className="text-base font-black text-slate-900">{totalUnits} unités</span>
            </div>

            <div className="flex justify-between items-center text-xs border-t border-amber-200/80 pt-2">
              <span className="text-amber-900 font-bold">Coût d'Achat Unitaire Calculé :</span>
              <span className="text-base font-black text-emerald-700">{roundedUnitCost.toLocaleString()} {currency} / unité</span>
            </div>

            <div className="flex justify-between items-center text-[11px] text-amber-800 pt-1">
              <span>Montant Total Facture Achat :</span>
              <span className="font-bold">{calculatedTotalInvoice.toLocaleString()} {currency}</span>
            </div>

            {currentSellingPrice > 0 && (
              <div className="border-t border-amber-200/80 pt-2 flex justify-between items-center text-[11px]">
                <span className="text-slate-600 font-bold">Prix de vente actuel ({currentSellingPrice} {currency}):</span>
                <span className={`font-black ${marginPerUnit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                  Marge: +{marginPerUnit.toLocaleString()} {currency} ({marginPercentage}%)
                </span>
              </div>
            )}
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={handleApply}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-md transition cursor-pointer flex items-center justify-center space-x-2 text-sm"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Appliquer ces valeurs calculées</span>
          </button>

        </div>

      </div>
    </div>
  );
};
