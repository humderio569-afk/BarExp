import React, { useState } from 'react';
import { useBar } from '../../context/BarContext';
import { BusinessSector } from '../../types';
import {
  Building2,
  UserCheck,
  ArrowRight,
  ShieldCheck,
  LogOut,
  Clock,
  Phone,
  Store,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';

export const UnassociatedUserScreen: React.FC = () => {
  const {
    currentUser,
    registerNewCompanyWithTrial,
    requestJoinCompanyWithCode,
    logout,
  } = useBar();

  const [activeAction, setActiveAction] = useState<'choose' | 'create_company' | 'join_company'>('choose');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states for creating a new company
  const [companyName, setCompanyName] = useState('');
  const [managerName, setManagerName] = useState(currentUser?.displayName || '');
  const [phone, setPhone] = useState('');
  const [currency, setCurrency] = useState('G');
  const [businessSector, setBusinessSector] = useState<BusinessSector>('bar_restaurant');
  const [address, setAddress] = useState('');

  // Form states for joining an existing company
  const [joinCode, setJoinCode] = useState('');

  const handleCreateCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!companyName.trim()) {
      setErrorMsg("Veuillez renseigner le nom de votre établissement.");
      return;
    }
    if (!phone.trim()) {
      setErrorMsg("Veuillez renseigner un numéro de téléphone.");
      return;
    }

    setLoading(true);
    try {
      await registerNewCompanyWithTrial({
        name: companyName.trim(),
        managerName: managerName.trim() || 'Gérant',
        phone: phone.trim(),
        currency,
        businessSector,
        address: address.trim(),
      });
      // Context will automatically update currentUser and route into the company space
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Erreur lors de la création de l'établissement.");
      setLoading(false);
    }
  };

  const handleJoinCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanCode = joinCode.trim().toUpperCase();
    if (cleanCode.length !== 8) {
      setErrorMsg("Le code établissement doit comporter exactement 8 caractères.");
      return;
    }

    setLoading(true);
    try {
      const res = await requestJoinCompanyWithCode(cleanCode);
      if (!res.success) {
        setErrorMsg(res.message);
        setLoading(false);
      } else {
        setSuccessMsg(res.message);
        setLoading(false);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Erreur lors de la soumission de la demande.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-slate-950 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full my-auto overflow-hidden animate-in fade-in zoom-in duration-300">
        
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950 p-6 text-white text-center relative">
          <button
            type="button"
            onClick={() => logout()}
            className="absolute top-4 right-4 p-2 bg-slate-800/80 hover:bg-red-600/80 text-slate-300 hover:text-white rounded-xl transition cursor-pointer text-xs flex items-center gap-1.5 font-bold"
            title="Se déconnecter"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Déconnexion</span>
          </button>

          <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 p-1 shadow-lg shadow-amber-500/20 flex items-center justify-center mb-3">
            <span className="text-slate-950 font-black text-xl tracking-tighter">BE</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">BarExp Plateforme</h2>
          <p className="text-amber-400 text-xs font-bold mt-1">
            Compte Google connecté : <span className="text-white font-mono">{currentUser?.email}</span>
          </p>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-6">
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-bold flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-black">Demande envoyée avec succès !</p>
                <p>{successMsg}</p>
                <p className="text-[11px] text-emerald-700 font-normal">
                  L'administrateur de cet établissement a reçu votre demande de pré-inscription. Dès validation, vous accéderez à votre espace de travail.
                </p>
              </div>
            </div>
          )}

          {/* VIEW: MAIN SELECTION MENU */}
          {activeAction === 'choose' && !successMsg && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-slate-900 text-amber-400 rounded-xl font-bold shrink-0">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Aucun établissement associé à ce compte</h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Votre compte Google n'est actuellement rattaché à aucun bar ou restaurant enregistré. Que souhaitez-vous faire ?
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Option 1: Create New Company */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveAction('create_company');
                    setErrorMsg(null);
                  }}
                  className="p-5 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent hover:from-amber-500/20 border-2 border-amber-400/60 hover:border-amber-500 rounded-2xl text-left transition-all group cursor-pointer shadow-xs hover:shadow-md flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-xs">
                      <Store className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-black text-slate-950">Créer mon Entreprise</span>
                      <span className="px-2 py-0.5 bg-amber-500 text-slate-950 text-[10px] font-black rounded-full">
                        14j Gratuits
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Lancez votre bar ou restaurant en 1 minute. Deux semaines d'essai gratuit offertes avec toutes les fonctionnalités.
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-amber-200/60 flex items-center gap-1 text-xs font-black text-amber-800 group-hover:text-amber-900">
                    <span>Configurer maintenant</span>
                    <ArrowRight className="w-3.5 h-3.5 transition group-hover:translate-x-1" />
                  </div>
                </button>

                {/* Option 2: Join with Company Code */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveAction('join_company');
                    setErrorMsg(null);
                  }}
                  className="p-5 bg-slate-50 hover:bg-slate-100 border-2 border-slate-200 hover:border-slate-300 rounded-2xl text-left transition-all group cursor-pointer shadow-xs hover:shadow-md flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center shadow-xs">
                      <KeyRound className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-black text-slate-950 block">Rejoindre une Équipe</span>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Vous êtes employé, serveur ou gérant d'un établissement existant ? Entrez son code à 8 caractères pour demander votre accès.
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200 flex items-center gap-1 text-xs font-black text-slate-800 group-hover:text-slate-950">
                    <span>Saisir le code bar</span>
                    <ArrowRight className="w-3.5 h-3.5 transition group-hover:translate-x-1" />
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* VIEW: CREATE COMPANY FORM (14 DAYS FREE TRIAL) */}
          {activeAction === 'create_company' && (
            <form onSubmit={handleCreateCompanySubmit} className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <Store className="w-5 h-5 text-amber-600" />
                  <div>
                    <h3 className="text-base font-black text-slate-900">Nouvel Établissement</h3>
                    <p className="text-[11px] text-slate-500 font-medium">14 jours d'essai gratuit sans engagement</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveAction('choose')}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 underline cursor-pointer"
                >
                  Retour
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Nom du Bar / Restaurant / Commerce <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Le Palmier Royal Bar & Grill"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Nom du Gérant / Administrateur <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Jean-Baptiste Paul"
                      value={managerName}
                      onChange={(e) => setManagerName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Téléphone de Contact <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="Ex: +509 3700-0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Secteur d'Activité
                    </label>
                    <select
                      value={businessSector}
                      onChange={(e) => setBusinessSector(e.target.value as BusinessSector)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="bar_restaurant">Bar & Restaurant</option>
                      <option value="lounge_nightclub">Lounge & Nightclub</option>
                      <option value="bistrot_cafe">Bistrot & Café</option>
                      <option value="snack_fastfood">Snack & Fast-Food</option>
                      <option value="epicerie_boutique">Épicerie & Boutique</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Devise Principale
                    </label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="G">HTG - Gourde Haïtienne (G)</option>
                      <option value="$">USD - Dollar Américain ($)</option>
                      <option value="€">EUR - Euro (€)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Adresse physique / Ville (Optionnel)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Pétion-Ville, Port-au-Prince"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Trial terms highlight */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2.5 text-xs text-amber-900">
                <Clock className="w-4 h-4 shrink-0 text-amber-600" />
                <span>
                  Vous bénéficiez automatiquement de <strong>14 jours d'essai gratuit</strong>. Après cette période, vous pourrez renouveler par MonCash ou NatCash.
                </span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveAction('choose')}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-2 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-md transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Créer mon Établissement</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* VIEW: JOIN EXISTING COMPANY WITH CODE */}
          {activeAction === 'join_company' && (
            <form onSubmit={handleJoinCompanySubmit} className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-slate-800" />
                  <div>
                    <h3 className="text-base font-black text-slate-900">Rejoindre un Établissement</h3>
                    <p className="text-[11px] text-slate-500 font-medium">Demande de pré-inscription pour un membre d'équipe</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveAction('choose')}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 underline cursor-pointer"
                >
                  Retour
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Code Établissement (8 caractères) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={8}
                  autoFocus
                  required
                  placeholder="Ex: BAR12345"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-800 text-amber-400 text-center font-mono font-black text-xl tracking-widest rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500 uppercase placeholder:text-slate-600 placeholder:text-sm placeholder:font-sans placeholder:tracking-normal"
                />
                <p className="text-[11px] text-slate-500">
                  Demandez ce code à 8 lettres/chiffres à l'administrateur ou gérant de votre entreprise.
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                <p>
                  Une fois la demande envoyée, l'administrateur de cet établissement recevra votre demande d'adhésion pour activer votre rôle (serveur, caissier ou gestionnaire).
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveAction('choose')}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading || joinCode.trim().length !== 8}
                  className="flex-2 py-3 bg-slate-900 hover:bg-slate-800 text-amber-400 font-black rounded-xl text-xs shadow-md transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Envoyer la Demande</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Footer note */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span>BarExp Plateforme v3.5</span>
            <button
              type="button"
              onClick={() => logout()}
              className="text-red-600 hover:underline font-bold cursor-pointer"
            >
              Changer de compte Google
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
