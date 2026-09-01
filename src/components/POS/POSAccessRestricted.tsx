import React from 'react';
import { useBar } from '../../context/BarContext';
import { Lock, ShieldAlert, ArrowLeft, Building2, User } from 'lucide-react';

export const POSAccessRestricted: React.FC = () => {
  const { currentUser, settings, setActiveTab } = useBar();

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-slate-100">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center animate-in fade-in zoom-in-95">
        <div className="w-16 h-16 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-center mx-auto mb-5 text-red-600 shadow-xs">
          <Lock className="w-8 h-8" />
        </div>

        <h2 className="text-lg font-black text-slate-900 mb-1">
          Accès Caisse Restreint
        </h2>
        <p className="text-xs text-slate-500 mb-6">
          Établissement : <strong className="text-slate-700">{settings.barName}</strong>
        </p>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left space-y-3 mb-6">
          <div className="flex items-start space-x-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-700 leading-relaxed">
              Pour utiliser le terminal de caisse et enregistrer des ventes, chaque utilisateur doit impérativement disposer du profil <strong>Admin</strong>, <strong>Caissier</strong> ou d'une autorisation explicite de caisse.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-200 text-xs text-slate-600 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium">
              <User className="w-3.5 h-3.5 text-slate-400" />
              {currentUser?.displayName || currentUser?.email}
            </span>
            <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md font-bold text-[10px]">
              {currentUser?.role ? currentUser.role.toUpperCase() : 'EMPLOYÉ'}
            </span>
          </div>
        </div>

        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => setActiveTab('stock')}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Accéder aux Stocks & Inventaires</span>
          </button>
          
          <p className="text-[11px] text-slate-400">
            Contactez le gérant de votre entreprise pour vous attribuer le rôle Caissier.
          </p>
        </div>
      </div>
    </div>
  );
};
