import React, { useState } from 'react';
import { useBar } from '../../context/BarContext';
import { ManualPaymentModal } from './ManualPaymentModal';
import {
  AlertTriangle,
  Clock,
  ShieldAlert,
  Send,
  MessageCircle,
  HelpCircle,
  Phone,
  Store,
  LogOut,
  ArrowRight,
  XCircle
} from 'lucide-react';

export const TrialExpiredScreen: React.FC = () => {
  const {
    activeCompany,
    activeCompanyTrialInfo,
    settings,
    logout,
  } = useBar();

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const proof = activeCompanyTrialInfo.latestPaymentProof;
  const isDisapproved = activeCompanyTrialInfo.hasDisapprovedPaymentProof;
  const supportPhone = settings.platformBilling?.supportContact?.phone || '+509 3700-1122';
  const supportEmail = settings.platformBilling?.supportContact?.email || 'support@barexpress.app';

  return (
    <div className="min-h-screen w-screen bg-slate-950 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full my-auto overflow-hidden animate-in fade-in zoom-in duration-300">
        
        {/* Header */}
        <div className={`p-6 text-white text-center relative ${
          isDisapproved 
            ? 'bg-gradient-to-br from-slate-900 via-red-950 to-slate-900' 
            : 'bg-gradient-to-br from-slate-900 via-amber-950 to-slate-900'
        }`}>
          <button
            type="button"
            onClick={() => logout()}
            className="absolute top-4 right-4 p-2 bg-slate-800/80 hover:bg-red-600 text-slate-300 hover:text-white rounded-xl transition cursor-pointer text-xs flex items-center gap-1.5 font-bold"
            title="Se déconnecter"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Déconnexion</span>
          </button>

          {/* BarExp Brand Logo */}
          <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-950 p-1 shadow-lg flex items-center justify-center mb-3 border border-white/20">
            <img 
              src="/icons/icon-192.png" 
              alt="BarExp Logo" 
              className="w-full h-full object-contain rounded-xl"
            />
          </div>

          <div className={`mx-auto w-14 h-14 rounded-2xl p-1 shadow-lg flex items-center justify-center mb-3 ${
            isDisapproved 
              ? 'bg-red-500 text-white shadow-red-500/30' 
              : 'bg-amber-500 text-slate-950 shadow-amber-500/30'
          }`}>
            {isDisapproved ? (
              <XCircle className="w-8 h-8" />
            ) : (
              <Clock className="w-8 h-8" />
            )}
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            {isDisapproved ? 'Paiement Désapprouvé' : 'Période d\'Essai Terminée'}
          </h2>
          <p className="text-xs text-slate-300 mt-1 font-medium">
            Établissement : <strong className="text-white">{activeCompany?.name}</strong> ({activeCompany?.code})
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Disapproval Notice with reason from Super Admin */}
          {isDisapproved && proof?.disapprovalReason ? (
            <div className="p-4 bg-red-50 border-2 border-red-200 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-red-900 text-xs font-black">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span>Motif de rejet spécifié par le Super Administrateur :</span>
              </div>
              <p className="text-xs font-bold text-red-800 bg-white p-3 rounded-xl border border-red-200 leading-relaxed italic">
                "{proof.disapprovalReason}"
              </p>
              <p className="text-[11px] text-red-700">
                Vous devez soit refaire le transfert et soumettre une nouvelle preuve valide, soit contacter le service client.
              </p>
            </div>
          ) : (
            <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl space-y-1.5">
              <p className="text-xs font-bold text-amber-950 leading-relaxed">
                Votre période d'essai gratuit de 14 jours est arrivée à échéance.
              </p>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Pour continuer à enregistrer vos ventes, gérer vos stocks et générer vos bilans financiers, effectuez votre règlement par <strong>MonCash</strong> ou <strong>NatCash</strong> et téléversez votre preuve.
              </p>
            </div>
          )}

          {/* Pricing Highlight */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400">Tarification Plateforme</span>
              <h4 className="text-sm font-black text-slate-900">Abonnement Annuel Illimité</h4>
              <p className="text-[11px] text-slate-500">Comprend toutes les fonctionnalités, rapports et Dona IA</p>
            </div>
            <div className="text-right">
              <span className="text-xl font-black text-slate-950">${settings.platformBilling?.defaultAnnualPrice ?? 100}</span>
              <span className="text-[10px] font-bold text-slate-500 block">/ an</span>
            </div>
          </div>

          {/* Main Actions */}
          <div className="space-y-3 pt-1">
            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(true)}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-2xl text-xs shadow-md transition active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>{isDisapproved ? 'Soumettre une Nouvelle Preuve de Paiement' : 'Payer par MonCash / NatCash & Envoyer Preuve'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Support contact info */}
            <div className="p-3 bg-slate-100 rounded-2xl flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 gap-2">
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-700" />
                <span>Service Client : <strong className="text-slate-900">{supportPhone}</strong></span>
              </div>
              <a
                href={`mailto:${supportEmail}`}
                className="text-amber-800 hover:text-amber-900 font-bold underline text-[11px]"
              >
                {supportEmail}
              </a>
            </div>
          </div>
        </div>
      </div>

      {isPaymentModalOpen && (
        <ManualPaymentModal onClose={() => setIsPaymentModalOpen(false)} />
      )}
    </div>
  );
};
