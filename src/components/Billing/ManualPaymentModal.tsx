import React, { useState } from 'react';
import { useBar } from '../../context/BarContext';
import { PlanType } from '../../types';
import {
  X,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Phone,
  ArrowRight,
  Camera,
  FileCheck,
  ShieldCheck,
  Building2,
  Copy,
  Check
} from 'lucide-react';

interface ManualPaymentModalProps {
  onClose: () => void;
  initialPlan?: PlanType;
}

export const ManualPaymentModal: React.FC<ManualPaymentModalProps> = ({ onClose, initialPlan = 'annual' }) => {
  const {
    activeCompany,
    settings,
    currentUser,
    manualPaymentMethods,
    submitManualPaymentProof,
  } = useBar();

  const [selectedPlan, setSelectedPlan] = useState<PlanType>(initialPlan);
  const [selectedMethodId, setSelectedMethodId] = useState<string>(manualPaymentMethods[0]?.id || 'moncash');
  const [transactionRef, setTransactionRef] = useState('');
  const [amount, setAmount] = useState<number>(() => {
    if (initialPlan === 'monthly') return settings.platformBilling?.defaultMonthlyPrice ?? 15;
    if (initialPlan === 'lifetime') return settings.platformBilling?.defaultLifetimePrice ?? 450;
    return settings.platformBilling?.defaultAnnualPrice ?? 100;
  });
  const [currency, setCurrency] = useState('USD');
  const [proofPhotoUrl, setProofPhotoUrl] = useState<string>('');
  const [photoFileName, setPhotoFileName] = useState<string>('');
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedMethod = manualPaymentMethods.find(m => m.id === selectedMethodId) || manualPaymentMethods[0];

  const handlePlanChange = (plan: PlanType) => {
    setSelectedPlan(plan);
    if (plan === 'monthly') setAmount(settings.platformBilling?.defaultMonthlyPrice ?? 15);
    else if (plan === 'lifetime') setAmount(settings.platformBilling?.defaultLifetimePrice ?? 450);
    else setAmount(settings.platformBilling?.defaultAnnualPrice ?? 100);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedNumber(text);
    setTimeout(() => setCopiedNumber(null), 2000);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg("Veuillez sélectionner un fichier image valide (JPG, PNG).");
      return;
    }

    setPhotoFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setProofPhotoUrl(reader.result);
        setErrorMsg(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!activeCompany) {
      setErrorMsg("Aucun établissement actif sélectionné.");
      return;
    }

    if (!transactionRef.trim()) {
      setErrorMsg("Veuillez renseigner le numéro ou la référence de la transaction.");
      return;
    }

    if (!proofPhotoUrl) {
      setErrorMsg("Veuillez téléverser la capture d'écran ou photo du reçu de paiement.");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitManualPaymentProof({
        companyId: activeCompany.id,
        companyCode: activeCompany.code,
        companyName: activeCompany.name,
        adminEmail: currentUser?.email || activeCompany.adminEmail,
        planType: selectedPlan,
        paymentMethodId: selectedMethod.id,
        paymentMethodName: selectedMethod.name,
        amount: Number(amount),
        currency,
        transactionReference: transactionRef.trim().toUpperCase(),
        proofPhotoUrl,
      });

      setSubmittedSuccess(true);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Erreur lors de l'envoi de la preuve de paiement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full my-auto overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950 p-5 sm:p-6 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 text-amber-400 text-xs font-black uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Paiement Sécurisé &bull; MonCash / NatCash</span>
          </div>

          <h3 className="text-xl font-black text-white">Transmettre une Preuve de Paiement</h3>
          <p className="text-xs text-slate-300 mt-0.5">
            Établissement : <strong className="text-amber-300">{activeCompany?.name}</strong> ({activeCompany?.code})
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {submittedSuccess ? (
            <div className="py-4 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-2">
                <h4 className="text-lg font-black text-slate-900">Preuve envoyée avec succès !</h4>
                <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                  Votre preuve de paiement pour le plan <strong>{selectedPlan === 'annual' ? 'Annuel' : (selectedPlan === 'monthly' ? 'Mensuel' : 'À Vie')}</strong> a été transmise au Super Administrateur.
                </p>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs font-bold inline-block">
                  ⚡ Votre accès opérationnel complet est débloqué immédiatement pendant la vérification.
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs shadow-md transition cursor-pointer"
              >
                Continuer vers l'application
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* 1. Plan Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Choisissez votre formule</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handlePlanChange('annual')}
                    className={`p-3 rounded-2xl border-2 text-center transition cursor-pointer flex flex-col items-center justify-between ${
                      selectedPlan === 'annual'
                        ? 'border-amber-500 bg-amber-50 text-slate-950'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-slate-50'
                    }`}
                  >
                    <span className="text-[10px] font-black uppercase text-amber-700">Recommandé</span>
                    <span className="text-sm font-black mt-0.5">Annuel</span>
                    <span className="text-xs font-bold text-slate-900 mt-1">${settings.platformBilling?.defaultAnnualPrice ?? 100}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePlanChange('monthly')}
                    className={`p-3 rounded-2xl border-2 text-center transition cursor-pointer flex flex-col items-center justify-between ${
                      selectedPlan === 'monthly'
                        ? 'border-amber-500 bg-amber-50 text-slate-950'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-slate-50'
                    }`}
                  >
                    <span className="text-[10px] font-bold text-slate-400">Flexibilité</span>
                    <span className="text-sm font-black mt-0.5">Mensuel</span>
                    <span className="text-xs font-bold text-slate-900 mt-1">${settings.platformBilling?.defaultMonthlyPrice ?? 15}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePlanChange('lifetime')}
                    className={`p-3 rounded-2xl border-2 text-center transition cursor-pointer flex flex-col items-center justify-between ${
                      selectedPlan === 'lifetime'
                        ? 'border-amber-500 bg-amber-50 text-slate-950'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-slate-50'
                    }`}
                  >
                    <span className="text-[10px] font-black text-purple-600">Illimité</span>
                    <span className="text-sm font-black mt-0.5">À Vie</span>
                    <span className="text-xs font-bold text-slate-900 mt-1">${settings.platformBilling?.defaultLifetimePrice ?? 450}</span>
                  </button>
                </div>
              </div>

              {/* 2. Payment Method Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Moyen de paiement manuel</label>
                <div className="grid grid-cols-2 gap-2">
                  {manualPaymentMethods.filter(m => m.active).map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMethodId(m.id)}
                      className={`p-3 rounded-2xl border-2 text-left transition cursor-pointer flex items-center justify-between ${
                        selectedMethodId === m.id
                          ? 'border-amber-500 bg-amber-50/80 text-slate-950'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-black">{m.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{m.accountNumber}</p>
                      </div>
                      {selectedMethodId === m.id && (
                        <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Account Details Card with 1-click Copy */}
              {selectedMethod && (
                <div className="p-3.5 bg-slate-900 text-white rounded-2xl space-y-2 border border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Numéro de transfert {selectedMethod.name} :</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(selectedMethod.accountNumber)}
                      className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 font-mono font-bold text-xs bg-slate-800 px-2 py-0.5 rounded-lg cursor-pointer transition active:scale-95"
                    >
                      <span>{selectedMethod.accountNumber}</span>
                      {copiedNumber === selectedMethod.accountNumber ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-300">
                    <span>Titulaire du compte :</span>
                    <strong className="text-white">{selectedMethod.accountName}</strong>
                  </div>

                  <p className="text-[10px] text-amber-200/80 border-t border-slate-800 pt-1.5 leading-relaxed">
                    {selectedMethod.instructions}
                  </p>
                </div>
              )}

              {/* 4. Transaction Reference & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Référence de Transaction <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: MC9928192 ou NAT8812"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Montant Envoyé
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      required
                      min={1}
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                    >
                      <option value="USD">USD</option>
                      <option value="HTG">HTG</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 5. Photo Upload Proof */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Photo / Capture d'écran de la preuve <span className="text-red-500">*</span>
                </label>
                
                {proofPhotoUrl ? (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-amber-400 bg-slate-900 group max-h-44">
                    <img
                      src={proofPhotoUrl}
                      alt="Preuve de paiement"
                      className="w-full h-44 object-contain"
                    />
                    <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
                      <label className="px-3 py-1.5 bg-white text-slate-900 font-bold text-xs rounded-xl cursor-pointer hover:bg-slate-100">
                        Changer la photo
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setProofPhotoUrl('');
                          setPhotoFileName('');
                        }}
                        className="px-3 py-1.5 bg-red-600 text-white font-bold text-xs rounded-xl cursor-pointer hover:bg-red-700"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-50 hover:bg-amber-50/30 transition-all text-center">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        Cliquez pour téléverser ou prendre une photo du reçu
                      </p>
                      <p className="text-[10px] text-slate-400">JPG, PNG, capture SMS MonCash/NatCash</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !proofPhotoUrl || !transactionRef.trim()}
                  className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-2xl text-xs shadow-md transition active:scale-[0.98] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Envoyer la Preuve & Débloquer l'Accès</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
