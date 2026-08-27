import React, { useState } from 'react';
import { useBar } from '../../context/BarContext';
import { PaymentMethod, Sale } from '../../types';
import { Banknote, Smartphone, CreditCard, User, X, Check, Calculator, Printer, AlertTriangle } from 'lucide-react';

interface PaymentModalProps {
  onClose: () => void;
  onSuccess: (sale: Sale) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ onClose, onSuccess }) => {
  const { cartTotal, activeTable, processCheckout, settings } = useBar();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Espèces');
  const [amountPaidInput, setAmountPaidInput] = useState<string>(cartTotal.toString());
  const [customerNote, setCustomerNote] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [showMajorConfirm, setShowMajorConfirm] = useState<boolean>(false);

  const numericPaid = parseFloat(amountPaidInput) || 0;
  const changeDue = Math.max(0, numericPaid - cartTotal);
  const isSufficient = paymentMethod !== 'Espèces' || numericPaid >= cartTotal;

  // Preset cash buttons tailored for Gourdes (G)
  const cashPresets = [
    cartTotal,
    Math.ceil(cartTotal / 100) * 100,
    Math.ceil(cartTotal / 500) * 500,
    1000,
    2000,
    5000,
  ].filter((v, i, a) => v >= cartTotal && a.indexOf(v) === i);

  const executeCheckout = () => {
    setIsProcessing(true);

    try {
      const sale = processCheckout(paymentMethod, numericPaid, activeTable);
      onSuccess(sale);
    } catch (err) {
      alert("Erreur lors de l'encaissement: " + err);
      setIsProcessing(false);
    }
  };

  const handlePay = () => {
    if (!isSufficient) {
      alert("Le montant donné est inférieur au total !");
      return;
    }

    const threshold = settings.majorTransactionThreshold || 2500;
    if (cartTotal >= threshold) {
      setShowMajorConfirm(true);
      return;
    }

    executeCheckout();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6 text-slate-900 relative">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h3 className="text-lg font-black text-slate-900">Encaissement Rapide</h3>
            <p className="text-xs text-slate-500">Choix du mode de paiement ({activeTable})</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Big Total Display */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center space-y-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Total à payer
          </span>
          <div className="text-3xl sm:text-4xl font-black text-amber-600">
            {cartTotal.toLocaleString()} <span className="text-lg font-bold">{settings.currency}</span>
          </div>
        </div>

        {/* Payment Method Selector Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            onClick={() => {
              setPaymentMethod('Espèces');
              setAmountPaidInput(cartTotal.toString());
            }}
            className={`p-3 rounded-2xl border flex flex-col items-center justify-center space-y-1.5 transition ${
              paymentMethod === 'Espèces'
                ? 'bg-amber-500 text-slate-950 font-black border-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Banknote className="w-6 h-6" />
            <span className="text-xs font-bold">Espèces</span>
          </button>

          <button
            onClick={() => {
              setPaymentMethod('MonCash');
              setAmountPaidInput(cartTotal.toString());
            }}
            className={`p-3 rounded-2xl border flex flex-col items-center justify-center space-y-1.5 transition ${
              paymentMethod === 'MonCash'
                ? 'bg-red-600 text-white font-black border-red-500 shadow-md shadow-red-600/20'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Smartphone className="w-6 h-6" />
            <span className="text-xs font-bold">MonCash</span>
          </button>

          <button
            onClick={() => {
              setPaymentMethod('Carte');
              setAmountPaidInput(cartTotal.toString());
            }}
            className={`p-3 rounded-2xl border flex flex-col items-center justify-center space-y-1.5 transition ${
              paymentMethod === 'Carte'
                ? 'bg-blue-600 text-white font-black border-blue-500 shadow-md shadow-blue-600/20'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <CreditCard className="w-6 h-6" />
            <span className="text-xs font-bold">Carte</span>
          </button>

          <button
            onClick={() => {
              setPaymentMethod('Crédit Client');
              setAmountPaidInput(cartTotal.toString());
            }}
            className={`p-3 rounded-2xl border flex flex-col items-center justify-center space-y-1.5 transition ${
              paymentMethod === 'Crédit Client'
                ? 'bg-purple-600 text-white font-black border-purple-500 shadow-md shadow-purple-600/20'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <User className="w-6 h-6" />
            <span className="text-xs font-bold">Compte</span>
          </button>
        </div>

        {/* Specific Method UI Details */}
        {paymentMethod === 'Espèces' && (
          <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Montant Reçu du Client ({settings.currency}):
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={amountPaidInput}
                  onChange={(e) => setAmountPaidInput(e.target.value)}
                  className="w-full bg-white text-amber-600 font-black text-2xl px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:border-amber-500 text-right"
                />
              </div>
            </div>

            {/* Cash Presets Buttons */}
            <div className="flex flex-wrap gap-2">
              {cashPresets.map(preset => (
                <button
                  key={preset}
                  onClick={() => setAmountPaidInput(preset.toString())}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-lg border border-slate-200 transition"
                >
                  {preset.toLocaleString()} {settings.currency}
                </button>
              ))}
            </div>

            {/* Change Due Display */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700">Monnaie à rendre:</span>
              <span className={`text-2xl font-black ${
                changeDue > 0 ? 'text-emerald-600' : 'text-slate-400'
              }`}>
                {changeDue.toLocaleString()} {settings.currency}
              </span>
            </div>
          </div>
        )}

        {paymentMethod === 'MonCash' && (
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
            <p className="text-slate-700 font-medium">
              Veuillez vérifier le transfert MonCash du client sur le compte du bar.
            </p>
            <input
              type="text"
              placeholder="Numéro de téléphone / Référence MonCash (optionnel)"
              value={customerNote}
              onChange={(e) => setCustomerNote(e.target.value)}
              className="w-full bg-white text-slate-900 p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-red-500"
            />
          </div>
        )}

        {paymentMethod === 'Crédit Client' && (
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
            <p className="text-slate-700 font-medium">
              Inscrire cette consommation sur le compte du client habituel.
            </p>
            <input
              type="text"
              placeholder="Nom du Client (ex: Jean-Baptiste / VIP 1)"
              value={customerNote}
              onChange={(e) => setCustomerNote(e.target.value)}
              className="w-full bg-white text-slate-900 p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-purple-500"
            />
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handlePay}
          disabled={!isSufficient || isProcessing}
          className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-slate-950 font-black text-lg rounded-2xl shadow-xl shadow-amber-500/20 flex items-center justify-center space-x-2 transition active:scale-95 cursor-pointer"
        >
          <Check className="w-6 h-6 stroke-[3]" />
          <span>VALIDER & IMPRIMER TICKET</span>
        </button>

      </div>

      {/* Fenêtre de Confirmation pour Transaction Majeure */}
      {showMajorConfirm && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border-2 border-amber-500 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 text-slate-900 relative">
            <div className="flex items-start space-x-3.5">
              <div className="p-3 bg-amber-500 text-slate-950 rounded-2xl shrink-0 shadow-md">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div>
                <div className="inline-block bg-amber-100 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider mb-1">
                  Transaction Majeure (≥ {(settings.majorTransactionThreshold || 2500).toLocaleString()} {settings.currency})
                </div>
                <h3 className="text-xl font-black text-slate-900">Confirmation d'Encaissement</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Montant élevé détecté. Veuillez confirmer la validation finale du paiement.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5 text-xs">
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-200">
                <span className="text-slate-500 font-bold uppercase tracking-wider">Total Net à payer:</span>
                <span className="text-2xl font-black text-amber-600">
                  {cartTotal.toLocaleString()} {settings.currency}
                </span>
              </div>

              <div className="flex justify-between text-slate-700">
                <span className="font-semibold">Mode de paiement:</span>
                <span className="font-bold bg-amber-500 text-slate-950 px-2 py-0.5 rounded text-xs">{paymentMethod}</span>
              </div>

              {paymentMethod === 'Espèces' && (
                <>
                  <div className="flex justify-between text-slate-700">
                    <span className="font-semibold">Montant Reçu:</span>
                    <span className="font-bold text-slate-900">{numericPaid.toLocaleString()} {settings.currency}</span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span className="font-semibold">Monnaie à rendre:</span>
                    <span className="font-black text-emerald-600 text-sm">{changeDue.toLocaleString()} {settings.currency}</span>
                  </div>
                </>
              )}

              <div className="flex justify-between text-slate-700">
                <span className="font-semibold">Emplacement / Table:</span>
                <span className="font-bold text-slate-900">{activeTable}</span>
              </div>

              <div className="flex justify-between text-slate-700">
                <span className="font-semibold">Caissier(e):</span>
                <span className="font-bold text-slate-900">{settings.cashierName}</span>
              </div>
            </div>

            <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-center font-medium">
              💡 Cette transaction importante sera enregistrée dans les rapports de vente et déduira le stock.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowMajorConfirm(false)}
                className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 transition cursor-pointer"
              >
                Revoir / Modifier
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowMajorConfirm(false);
                  executeCheckout();
                }}
                disabled={isProcessing}
                className="py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center space-x-1.5 transition active:scale-95 cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Confirmer & Encaisser</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
