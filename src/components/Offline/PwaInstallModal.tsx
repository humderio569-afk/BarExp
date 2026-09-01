import React, { useState, useEffect } from 'react';
import { 
  Download, 
  X, 
  Smartphone, 
  Laptop, 
  CheckCircle2, 
  Share, 
  PlusSquare, 
  HardDrive, 
  WifiOff, 
  ShieldCheck,
  Zap,
  Layers,
  ArrowRight
} from 'lucide-react';
import { getPwaState, promptPwaInstall, subscribePwaState, PwaInstallState } from '../../utils/pwaManager';
import { enableHighCapacity3GBStorage, getDetailedStorageStats, StorageStats } from '../../utils/storageQuota';

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PwaInstallModal: React.FC<PwaInstallModalProps> = ({ isOpen, onClose }) => {
  const [pwaState, setPwaState] = useState<PwaInstallState>(getPwaState());
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [isActivating3GB, setIsActivating3GB] = useState(false);
  const [installFeedback, setInstallFeedback] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribePwaState((state) => {
      setPwaState(state);
    });
    getDetailedStorageStats().then(setStorageStats);
    return () => unsubscribe();
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    setInstallFeedback(null);
    const result = await promptPwaInstall();
    if (result.outcome === 'accepted') {
      setInstallFeedback("Installation initiée avec succès ! L'icône BarExp sera ajoutée à vos applications.");
      setTimeout(() => {
        onClose();
      }, 2500);
    } else if (result.outcome === 'dismissed') {
      setInstallFeedback("Installation annulée. Vous pouvez l'installer à tout moment.");
    } else {
      // If prompt not available (e.g. already installed or iOS)
      if (pwaState.isIOS) {
        // Shown in UI
      } else {
        setInstallFeedback("Utilisez le menu de votre navigateur (icône d'installation dans la barre d'adresse ou 'Installer l'application').");
      }
    }
  };

  const handleEnable3GBStorage = async () => {
    setIsActivating3GB(true);
    try {
      const res = await enableHighCapacity3GBStorage();
      setStorageStats(res.stats);
      setInstallFeedback(res.message);
    } catch (e: any) {
      setInstallFeedback(e?.message || "Activation du stockage persistant terminée.");
    } finally {
      setIsActivating3GB(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-5 text-slate-900 relative max-h-[92vh] flex flex-col overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-slate-950 p-1 border border-slate-700 shadow-md flex items-center justify-center shrink-0">
              <img 
                src="/icons/icon-192.png" 
                alt="BarExp Logo" 
                className="w-full h-full object-contain rounded-xl"
              />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                Application BarExp & Mode Hors-Ligne
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Installable sur Ordinateur (PC/Mac) et Mobile (Android/iPhone)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Highlight Card */}
        <div className="p-4 bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-2xl border border-slate-800 space-y-3 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-1 bg-amber-500/20 border border-amber-400/30 text-amber-300 text-[10px] font-black rounded-lg uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-amber-400" />
              PWA 100% Autonome
            </span>
            <span className="text-[11px] text-slate-400 font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Zéro coupure
            </span>
          </div>

          <div className="space-y-1">
            <h4 className="text-sm font-black text-amber-400">
              Fonctionne sans connexion Internet
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Enregistrez vos ventes, encaissements, impressions de reçus et gestion des stocks même en cas de panne réseau. Dès le retour d’Internet, vos données se synchronisent automatiquement.
            </p>
          </div>

          {/* Offline Unlimited Badge */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 text-slate-300">
              <HardDrive className="w-4 h-4 text-amber-400" />
              <span>Stockage local sécurisé :</span>
            </div>
            <span className="font-black text-amber-300 bg-slate-800/80 px-2 py-0.5 rounded-md">
              Persistant &amp; Illimité
            </span>
          </div>
        </div>

        {/* 3 Key Benefits */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <div className="flex items-center gap-1.5 font-black text-slate-900">
              <WifiOff className="w-3.5 h-3.5 text-amber-600" />
              <span>Hors-Ligne Total</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">
              Caisse, stocks et impression restent 100% actifs.
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <div className="flex items-center gap-1.5 font-black text-slate-900">
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              <span>Multi-Appareils</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">
              Ordinateur de caisse, tablette tactile, smartphone.
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <div className="flex items-center gap-1.5 font-black text-slate-900">
              <HardDrive className="w-3.5 h-3.5 text-blue-600" />
              <span>Coffre Illimité</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">
              Historique complet, factures PDF et reçus stockés en local sans restriction.
            </p>
          </div>
        </div>

        {/* Instructions for iOS Safari */}
        {pwaState.isIOS ? (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2 text-xs text-amber-950">
            <div className="flex items-center gap-2 font-black text-amber-900">
              <Smartphone className="w-4 h-4 text-amber-600" />
              <span>Installation sur iPhone / iPad (Safari) :</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-700 font-medium pl-1">
              <li>
                Appuyez sur le bouton de partage <Share className="w-3.5 h-3.5 inline text-blue-600 mx-1" /> en bas de l’écran Safari.
              </li>
              <li>
                Faites défiler et choisissez <span className="font-bold text-slate-900">"Sur l'écran d'accueil"</span> <PlusSquare className="w-3.5 h-3.5 inline text-slate-800 mx-1" />.
              </li>
              <li>
                Appuyez sur <span className="font-bold text-slate-900">"Ajouter"</span> pour lancer l'app en plein écran sans barre d'adresse.
              </li>
            </ol>
          </div>
        ) : (
          /* Desktop / Android 1-Click Install Button */
          <div className="space-y-3">
            <button
              onClick={handleInstallClick}
              title="Installer l'application (Raccourci: F9 ou Alt+I)"
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm rounded-2xl shadow-lg flex items-center justify-center space-x-2 transition cursor-pointer active:scale-98"
            >
              <Download className="w-4 h-4" />
              <span>INSTALLER L'APPLICATION SUR CET APPAREIL</span>
              <kbd className="hidden sm:inline-block ml-1.5 px-2 py-0.5 bg-slate-950 text-amber-400 rounded-lg font-mono text-xs font-black shadow-xs">
                F9 / Alt + I
              </kbd>
            </button>
            <p className="text-[11px] text-center text-slate-500">
              Compatible Google Chrome, Microsoft Edge, Brave, Android et ordinateurs Windows / Mac / Linux.
            </p>
          </div>
        )}

        {/* Unlimited Local Storage Optimization Grant Button */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <HardDrive className="w-4 h-4 text-slate-700" />
              <span className="text-xs font-bold text-slate-900">
                Statut du Coffre Local (Persistant & Illimité) :
              </span>
            </div>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
              storageStats?.isPersisted
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-900'
            }`}>
              {storageStats?.isPersisted ? 'Persistant (Protégé)' : 'Actif'}
            </span>
          </div>

          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
            <div
              className="bg-amber-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.max(2, storageStats?.usagePercentOf3GB || 1)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Utilisé : {storageStats?.usedFormatted || '0 Mo'}</span>
            <span>Capacité : {storageStats?.targetMaxFormatted || 'Illimité'}</span>
          </div>

          {!storageStats?.isPersisted && (
            <button
              onClick={handleEnable3GBStorage}
              disabled={isActivating3GB}
              className="w-full mt-1 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center space-x-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isActivating3GB ? 'Vérification...' : 'Garantir la persistance illimitée'}</span>
            </button>
          )}
        </div>

        {/* Feedback message */}
        {installFeedback && (
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-950 rounded-xl text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{installFeedback}</span>
          </div>
        )}

      </div>
    </div>
  );
};
