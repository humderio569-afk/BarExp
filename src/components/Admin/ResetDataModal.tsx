import React, { useState } from 'react';
import { useBar } from '../../context/BarContext';
import { 
  AlertTriangle, 
  ShieldCheck, 
  Trash2, 
  RotateCcw, 
  X, 
  Check, 
  RefreshCw, 
  Database,
  Lock,
  Layers
} from 'lucide-react';

interface ResetDataModalProps {
  onClose: () => void;
}

export const ResetDataModal: React.FC<ResetDataModalProps> = ({ onClose }) => {
  const { clearAndResetData, sales, expenses, tabs, products } = useBar();

  const [mode, setMode] = useState<'transactions_only' | 'complete_reset'>('transactions_only');
  const [confirmKeyword, setConfirmKeyword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const REQUIRED_KEYWORD = 'SUPPRIMER';
  const isKeywordValid = confirmKeyword.trim().toUpperCase() === REQUIRED_KEYWORD;

  const handleExecuteReset = async () => {
    if (!isKeywordValid) {
      alert(`Veuillez saisir exactement le mot "${REQUIRED_KEYWORD}" pour confirmer.`);
      return;
    }

    setIsDeleting(true);
    try {
      await clearAndResetData(mode);
      setSuccessMessage(
        mode === 'transactions_only'
          ? "Toutes les transactions, ventes, dépenses et journaux ont été effacés de Firestore. Vos produits et catégories sont conservés."
          : "Base de données complètement réinitialisée avec succès dans Firestore."
      );
      setTimeout(() => {
        onClose();
      }, 2500);
    } catch (err: any) {
      console.error(err);
      alert("Erreur lors de la réinitialisation : " + (err.message || err));
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-slate-900 my-8 relative">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-red-100 text-red-600 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Zone de Sécurité & Purge des Données</h3>
              <p className="text-xs text-slate-500">Gestion sécurisée des suppressions de masse</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Protection Notice - ACCOUNTS PRESERVED */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-start space-x-3 text-xs text-emerald-900 shadow-xs">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-extrabold text-emerald-950 flex items-center gap-1.5">
              <span>Protection des Comptes & Accès Utilisateurs</span>
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
            </p>
            <p className="text-emerald-800 text-[11px] leading-relaxed">
              Vos comptes utilisateurs (administrateurs, gérants et employés) ainsi que leurs mots de passe et rôles sont <strong>strictement préservés</strong> et ne seront jamais supprimés.
            </p>
          </div>
        </div>

        {successMessage ? (
          <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3 animate-fadeIn">
            <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>
            <p className="text-sm font-black text-emerald-950">Opération Réussie !</p>
            <p className="text-xs text-emerald-700 font-medium">{successMessage}</p>
          </div>
        ) : (
          <>
            {/* Mode Selection */}
            <div className="space-y-2.5">
              <label className="block text-xs font-bold text-slate-800">
                Sélectionnez le type de suppression à effectuer :
              </label>

              {/* Option 1: Transactions only */}
              <button
                type="button"
                onClick={() => setMode('transactions_only')}
                className={`w-full text-left p-3.5 rounded-2xl border transition flex items-start space-x-3 cursor-pointer ${
                  mode === 'transactions_only'
                    ? 'bg-amber-500/10 border-amber-500 text-slate-950 font-medium shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className={`p-2 rounded-xl mt-0.5 ${mode === 'transactions_only' ? 'bg-amber-500 text-slate-950' : 'bg-slate-200 text-slate-500'}`}>
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-black text-slate-900">Purge Opérationnelle (Nouveau Départ)</p>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Recommandé</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                    Efface dans Firestore toutes les <strong>ventes ({sales.length})</strong>, <strong>dépenses ({expenses.length})</strong>, <strong>tickets de table ({tabs.length})</strong> et l'historique des stocks, mais <strong>conserve tous vos produits ({products.length})</strong> et catégories.
                  </p>
                </div>
              </button>

              {/* Option 2: Complete reset */}
              <button
                type="button"
                onClick={() => setMode('complete_reset')}
                className={`w-full text-left p-3.5 rounded-2xl border transition flex items-start space-x-3 cursor-pointer ${
                  mode === 'complete_reset'
                    ? 'bg-red-500/10 border-red-500 text-slate-950 font-medium shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className={`p-2 rounded-xl mt-0.5 ${mode === 'complete_reset' ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                  <Database className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-black text-slate-900">Remise à Zéro Complète du Système</p>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Total</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                    Efface toutes les données transactionnelles et recharge le catalogue de produits et catégories de base par défaut. (Les comptes restent intacts).
                  </p>
                </div>
              </button>
            </div>

            {/* Keyword Confirmation Input */}
            <div className="space-y-2 bg-red-50/70 border border-red-200 p-4 rounded-2xl">
              <label className="block text-xs font-bold text-red-900">
                Confirmation requise :
              </label>
              <p className="text-[11px] text-red-700 leading-snug">
                Pour éviter toute suppression accidentelle, veuillez taper <strong className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-red-300">{REQUIRED_KEYWORD}</strong> ci-dessous :
              </p>
              <input
                type="text"
                value={confirmKeyword}
                onChange={(e) => setConfirmKeyword(e.target.value)}
                placeholder={`Tapez ${REQUIRED_KEYWORD}`}
                className="w-full bg-white border border-red-300 text-slate-900 font-black p-2.5 rounded-xl text-xs uppercase tracking-wider focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                disabled={isDeleting}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={handleExecuteReset}
                disabled={!isKeywordValid || isDeleting}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-xs shadow-lg shadow-red-600/30 flex items-center space-x-2 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Suppression dans Firestore...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Confirmer et Effacer Définitivement</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
};
