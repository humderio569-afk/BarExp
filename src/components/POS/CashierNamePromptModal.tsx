import React, { useState } from 'react';
import { useBar } from '../../context/BarContext';
import { UserCheck, ShieldCheck, ArrowRight, User } from 'lucide-react';
import { safeSetItem } from '../../utils/storage';

interface CashierNamePromptModalProps {
  isOpen: boolean;
  onClose?: () => void;
}

export const CashierNamePromptModal: React.FC<CashierNamePromptModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, updateUserProfileName, settings } = useBar();
  const [fullName, setFullName] = useState(
    currentUser?.displayName && !currentUser.displayName.includes('@') ? currentUser.displayName : ''
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !currentUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = fullName.trim();
    if (clean.length < 3) {
      setError('Veuillez saisir au moins 3 caractères pour votre nom complet.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await updateUserProfileName(currentUser.uid, clean);
      safeSetItem(`barexpress_cashier_named_${currentUser.uid}`, 'true');
      if (onClose) onClose();
    } catch (err) {
      setError('Une erreur est survenue lors de la mise à jour de votre nom.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 bg-slate-900 text-white relative">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">Identification du Caissier</h2>
              <p className="text-xs text-slate-400">Établissement : {settings.barName}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Traçabilité & Séparation des actions :</span>
              <p className="mt-0.5 text-amber-800 leading-relaxed">
                Chaque vente, dépense et mouvement de stock doit être identifié au nom du membre qui l'a effectué. Veuillez indiquer votre nom complet officiel.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Votre Nom & Prénom Complet <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Ex : Jean-Baptiste Pierre"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
                autoFocus
                required
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Ce nom apparaîtra sur vos tickets de caisse, reçus et rapports de vente.
            </p>
          </div>

          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || fullName.trim().length < 3}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-amber-400 font-black rounded-xl text-xs tracking-wide uppercase transition flex items-center justify-center space-x-2 shadow-md cursor-pointer"
          >
            <span>{isSubmitting ? 'Enregistrement...' : 'Valider & Démarrer la Caisse'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
