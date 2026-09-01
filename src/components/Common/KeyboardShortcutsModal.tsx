import React, { useState, useEffect } from 'react';
import { 
  Keyboard, 
  X, 
  Download, 
  CreditCard, 
  Trash2, 
  Search, 
  ScanBarcode, 
  ShoppingBag, 
  Sparkles,
  Command,
  Laptop
} from 'lucide-react';
import { promptPwaInstall, getPwaState } from '../../utils/pwaManager';
import { showToast } from '../../utils/notificationService';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  const [pwaState, setPwaState] = useState(getPwaState());

  useEffect(() => {
    if (isOpen) {
      setPwaState(getPwaState());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const shortcuts = [
    {
      key: 'F1',
      action: 'Valider & Encaisser',
      desc: 'Ouvre directement le panneau d\'encaissement rapide ou valide la commande en cours.',
      badge: 'Caisse POS',
      color: 'bg-emerald-50 text-emerald-800 border-emerald-200'
    },
    {
      key: 'F2',
      action: 'Annuler le ticket',
      desc: 'Ouvre la boîte de confirmation pour vider le panier en cours.',
      badge: 'Caisse POS',
      color: 'bg-red-50 text-red-800 border-red-200'
    },
    {
      key: 'F3 ou Ctrl + K',
      action: 'Rechercher un produit',
      desc: 'Active et focalise la barre de recherche instantanée des produits.',
      badge: 'Navigation',
      color: 'bg-amber-50 text-amber-800 border-amber-200'
    },
    {
      key: 'F4 ou B',
      action: 'Scanner Code-Barres',
      desc: 'Ouvre instantanément le scanner de codes-barres par caméra / douchète.',
      badge: 'Outils',
      color: 'bg-purple-50 text-purple-800 border-purple-200'
    },
    {
      key: 'F8',
      action: 'Garder en Fiche',
      desc: 'Sauvegarde la commande en cours sur la table/emplacement actif.',
      badge: 'Caisse POS',
      color: 'bg-blue-50 text-blue-800 border-blue-200'
    },
    {
      key: 'F9 ou Alt + I',
      action: 'Installer l\'application (1 Clic)',
      desc: 'Installe directement BarExp comme application autonome sur votre PC ou tablette.',
      badge: 'Bureau / PWA',
      color: 'bg-amber-50 text-amber-900 border-amber-300'
    },
    {
      key: 'Échap (Escape)',
      action: 'Fermer les fenêtres',
      desc: 'Ferme la fenêtre active (paiement, scanner, recherche ou modal).',
      badge: 'Général',
      color: 'bg-slate-100 text-slate-700 border-slate-200'
    },
    {
      key: 'Alt + 1 à 6',
      action: 'Changer d\'onglet',
      desc: 'Navigue rapidement entre Caisse (1), Stock (2), Dépenses (3), Rapports (4), Chat (5), Admin (6).',
      badge: 'Navigation',
      color: 'bg-slate-100 text-slate-800 border-slate-200'
    }
  ];

  const handleQuickInstall = async () => {
    const res = await promptPwaInstall();
    if (res.outcome === 'accepted') {
      showToast({
        title: 'Application Installée',
        message: 'BarExp est maintenant installée sur votre ordinateur !',
        type: 'success'
      });
      onClose();
    } else {
      showToast({
        title: 'Raccourci d\'installation',
        message: 'Utilisez le bouton d\'installation dans la barre d\'adresse ou le menu du navigateur.',
        type: 'info'
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col p-5 sm:p-6 shadow-2xl text-slate-900 relative my-auto overflow-hidden">
        
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-500 text-slate-950 rounded-2xl shadow-md">
              <Keyboard className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <span>Raccourcis Clavier Pro</span>
                <span className="text-[10px] bg-slate-900 text-amber-400 px-2 py-0.5 rounded-full font-black uppercase">
                  POS & Web App
                </span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Accélérez vos encaissements et installez l'application en 1 frappe.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-full transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick 1-Click Install Banner */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 p-3.5 rounded-2xl shadow-md flex items-center justify-between gap-3 mb-4 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-slate-950/15 rounded-xl">
              <Laptop className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wide">
                Installation 1-Clic sur PC (PWA)
              </p>
              <p className="text-[11px] font-semibold opacity-90">
                Pressez <kbd className="px-1.5 py-0.5 bg-slate-950 text-white rounded font-mono text-[10px] font-black">F9</kbd> ou <kbd className="px-1.5 py-0.5 bg-slate-950 text-white rounded font-mono text-[10px] font-black">Alt + I</kbd> à tout moment
              </p>
            </div>
          </div>
          <button
            onClick={handleQuickInstall}
            className="px-3 py-1.5 bg-slate-950 hover:bg-slate-900 text-amber-400 text-xs font-black rounded-xl transition cursor-pointer shrink-0 shadow-xs flex items-center space-x-1"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Installer</span>
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {shortcuts.map((s, idx) => (
            <div 
              key={idx}
              className="p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-2xl flex items-center justify-between gap-3 transition"
            >
              <div className="space-y-0.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-black text-xs text-slate-900">{s.action}</span>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-md border ${s.color}`}>
                    {s.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">{s.desc}</p>
              </div>

              <div className="shrink-0 flex items-center gap-1">
                <kbd className="px-2.5 py-1.5 bg-white border-2 border-slate-300 rounded-xl shadow-xs font-mono text-xs font-black text-slate-800 tracking-wider">
                  {s.key}
                </kbd>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="shrink-0 pt-3 border-t border-slate-100 mt-3 flex items-center justify-between text-xs text-slate-500">
          <span>💡 Appuyez sur <kbd className="px-1 bg-slate-100 border border-slate-300 rounded font-mono text-[10px]">?</kbd> pour réafficher ce guide.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
};
