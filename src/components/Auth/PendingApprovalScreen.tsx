import React, { useState } from 'react';
import { useBar } from '../../context/BarContext';
import { Clock, ShieldAlert, LogOut, RefreshCw, CheckCircle2, AlertCircle, UserX } from 'lucide-react';

export const PendingApprovalScreen: React.FC = () => {
  const { currentUser, logout, settings, updateUserProfileName } = useBar();
  const [checking, setChecking] = useState(false);
  const [nameInput, setNameInput] = useState(currentUser?.displayName || '');
  const [nameSaved, setNameSaved] = useState(false);

  const isRejected = currentUser?.status === 'rejected';
  const isSuspended = currentUser?.status === 'suspended';

  const handleRefresh = () => {
    setChecking(true);
    setTimeout(() => {
      setChecking(false);
    }, 800);
  };

  const handleSaveName = async () => {
    if (!currentUser || !nameInput.trim()) return;
    await updateUserProfileName(currentUser.uid, nameInput.trim());
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2500);
  };

  const getStatusBadge = () => {
    if (isSuspended) {
      return <span className="px-2.5 py-1 text-[11px] font-black rounded-full shrink-0 bg-orange-100 text-orange-800">Suspendu</span>;
    }
    if (isRejected) {
      return <span className="px-2.5 py-1 text-[11px] font-black rounded-full shrink-0 bg-red-100 text-red-700">Refusé</span>;
    }
    return <span className="px-2.5 py-1 text-[11px] font-black rounded-full shrink-0 bg-amber-100 text-amber-800">En Attente</span>;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden text-slate-900">
        
        {/* Header */}
        <div className={`p-8 text-white text-center relative ${
          isSuspended
            ? 'bg-gradient-to-br from-orange-900 to-slate-900'
            : isRejected 
              ? 'bg-gradient-to-br from-red-900 to-slate-900' 
              : 'bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950'
        }`}>
          {/* BarExp Brand Logo */}
          <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-950 p-1 shadow-lg flex items-center justify-center mb-3 border border-white/20">
            <img 
              src="/icons/icon-192.png" 
              alt="BarExp Logo" 
              className="w-full h-full object-contain rounded-xl"
            />
          </div>

          <div className="mx-auto w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 mb-3 shadow-inner">
            {isSuspended ? (
              <UserX className="w-8 h-8 text-orange-400" />
            ) : isRejected ? (
              <ShieldAlert className="w-8 h-8 text-red-400" />
            ) : (
              <Clock className="w-8 h-8 text-amber-400 animate-pulse" />
            )}
          </div>

          <h2 className="text-2xl font-black tracking-tight">
            {isSuspended 
              ? "Compte Temporairement Suspendu" 
              : isRejected 
                ? "Accès Non Autorisé" 
                : "Compte En Attente de Validation"}
          </h2>
          <p className="text-xs text-slate-300 mt-1 font-medium">
            {settings.barName} — Gestion des Autorisations
          </p>
        </div>

        {/* Content Body */}
        <div className="p-8 space-y-6">
          
          {/* User badge */}
          <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            {currentUser?.photoURL ? (
              <img src={currentUser.photoURL} alt={currentUser.displayName} className="w-12 h-12 rounded-full border border-slate-300 object-cover shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-amber-500 text-slate-950 font-black text-lg flex items-center justify-center shrink-0">
                {currentUser?.displayName?.charAt(0) || 'U'}
              </div>
            )}
            <div className="truncate flex-1">
              <h4 className="font-bold text-slate-900 truncate">{currentUser?.displayName}</h4>
              <p className="text-xs text-slate-500 truncate">{currentUser?.email}</p>
            </div>
            {getStatusBadge()}
          </div>

          {/* Cashier Name Customization */}
          {!isRejected && !isSuspended && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <label className="text-xs font-bold text-slate-800 block">Nom de Caissier / Prénom sur les Reçus</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Ex: Paul (Caisse 1)"
                  className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={handleSaveName}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-2 rounded-xl text-xs transition cursor-pointer shrink-0"
                >
                  {nameSaved ? 'Enregistré ✓' : 'Modifier'}
                </button>
              </div>
              <p className="text-[10px] text-slate-400">Permet à l'administrateur d'identifier vos activités de caisse.</p>
            </div>
          )}

          {/* Explanation Message */}
          {isSuspended ? (
            <div className="space-y-2 text-xs text-orange-800 bg-orange-50 border border-orange-200 p-4 rounded-2xl">
              <p className="font-bold">Votre accès a été temporairement suspendu par un administrateur.</p>
              <p className="text-slate-600">Vos identifiants restent enregistrés. Votre compte peut être réactivé à tout moment depuis le panneau d'administration sans avoir à refaire de demande.</p>
            </div>
          ) : isRejected ? (
            <div className="space-y-2 text-xs text-red-700 bg-red-50 border border-red-200 p-4 rounded-2xl">
              <p className="font-bold">Votre demande d'accès n'a pas été retenue.</p>
              <p className="text-slate-600">Veuillez contacter la gérance du bar si vous pensez qu'il s'agit d'une erreur.</p>
            </div>
          ) : (
            <div className="space-y-3 text-xs text-slate-600 leading-relaxed bg-amber-50/60 border border-amber-200/80 p-4 rounded-2xl">
              <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                Validation Unique Requise
              </div>
              <p>
                Votre compte Google a été enregistré avec succès. Pour des raisons de sécurité, un administrateur du bar doit approuver votre profil une seule fois. Dès cette validation effectuée, votre accès restera permanent sur tous vos appareils.
              </p>
              <div className="pt-2 border-t border-amber-200/60 flex items-center gap-1.5 text-amber-800 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>La validation s'effectue en temps réel dès confirmation par un responsable.</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            {!isRejected && (
              <button
                onClick={handleRefresh}
                disabled={checking}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all active:scale-[0.98] cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
                <span>{checking ? 'Vérification en cours...' : 'Vérifier le Statut d\'Accès'}</span>
              </button>
            )}

            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl border border-slate-200 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-slate-500" />
              <span>Se Déconnecter</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
