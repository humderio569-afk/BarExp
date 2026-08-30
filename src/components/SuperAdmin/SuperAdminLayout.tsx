import React, { useState } from 'react';
import { useBar } from '../../context/BarContext';
import { PlatformCompaniesView } from './PlatformCompaniesView';
import { PlatformFinancesView } from './PlatformFinancesView';
import { PlatformAIView } from './PlatformAIView';
import { PlatformDatabasesView } from './PlatformDatabasesView';
import { PlatformAuditView } from './PlatformAuditView';
import {
  Building2,
  TrendingUp,
  Bot,
  Database,
  History,
  LogOut,
  Sparkles,
  ShieldCheck,
  Activity,
  Server,
  ArrowRight,
  X,
  Store,
  Layers
} from 'lucide-react';

export type SuperAdminTab = 'companies' | 'finances' | 'ai' | 'databases' | 'audit';

export const SuperAdminLayout: React.FC = () => {
  const { currentUser, logout, isServerReachable, companies, superAdminAssociatedCompany, canAccessCompanySpace, switchCompanySpace } = useBar();
  const [activeTab, setActiveTab] = useState<SuperAdminTab>('companies');
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

  const handleOpenAssociatedCompany = () => {
    if (superAdminAssociatedCompany) {
      switchCompanySpace(superAdminAssociatedCompany.id);
    }
  };

  const navTabs: { id: SuperAdminTab; label: string; icon: React.ReactNode }[] = [
    { id: 'companies', label: 'Établissements & Plateforme', icon: <Building2 className="w-4 h-4" /> },
    { id: 'finances', label: 'Finances Plateforme', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'ai', label: 'IA Dona Globale', icon: <Bot className="w-4 h-4" /> },
    { id: 'databases', label: 'Bases de Données & Quotas', icon: <Database className="w-4 h-4" /> },
    { id: 'audit', label: 'Journal d\'Audit', icon: <History className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen w-screen bg-slate-100 flex flex-col font-sans text-slate-900 select-none overflow-x-hidden">
      {/* Top Super Admin Header */}
      <header className="bg-slate-950 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            
            {/* Brand Logo & Super Admin Identifier */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-lg text-white tracking-tight leading-none">
                  BarExp
                </span>
                <span className="bg-amber-500 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                  SUPER ADMIN
                </span>
              </div>
              <span className="hidden md:inline-block text-slate-600 text-xs">|</span>
              <span className="hidden md:inline-block text-xs font-semibold text-slate-400">
                Administration Centrale de la Plateforme
              </span>
            </div>

            {/* Right Status & Profile Actions */}
            <div className="flex items-center gap-2">
              
              {/* Quick Direct Access to Super Admin's Associated Company */}
              {superAdminAssociatedCompany && (
                <button
                  type="button"
                  onClick={handleOpenAssociatedCompany}
                  className="p-1.5 text-slate-300 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition shrink-0 cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                  title={`Accéder à l'espace de votre établissement associé (${superAdminAssociatedCompany.name} - ${superAdminAssociatedCompany.code})`}
                >
                  <Store className="w-4 h-4 text-amber-400" />
                  <span className="hidden sm:inline">Mon Entreprise</span>
                  <span className="hidden md:inline-block px-1.5 py-0.2 bg-slate-900 border border-slate-700 text-amber-400 text-[10px] rounded font-mono">
                    {superAdminAssociatedCompany.code}
                  </span>
                </button>
              )}

              {/* Cloud Server Indicator */}
              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-[11px] font-bold text-slate-300">
                <span className={`w-2 h-2 rounded-full ${isServerReachable ? 'bg-emerald-400' : 'bg-red-400'}`} />
                <span>{isServerReachable ? 'Cloud Connecté' : 'Hors-ligne'}</span>
              </div>

              {/* Super Admin User Pill */}
              <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs">
                <div className="w-5 h-5 rounded bg-amber-500 text-slate-950 font-black text-[10px] flex items-center justify-center">
                  SA
                </div>
                <span className="font-bold text-slate-200 truncate max-w-[140px]">
                  {currentUser?.email}
                </span>
              </div>

              {/* Logout Button */}
              <button
                type="button"
                onClick={() => logout()}
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition shrink-0 cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                title="Se déconnecter"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Déconnexion</span>
              </button>
            </div>

          </div>
        </div>

        {/* Desktop Navigation Tabs */}
        <div className="border-t border-slate-800/80 bg-slate-950/60 backdrop-blur-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-1 overflow-x-auto py-2">
              {navTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {activeTab === 'companies' && <PlatformCompaniesView />}
        {activeTab === 'finances' && <PlatformFinancesView />}
        {activeTab === 'ai' && <PlatformAIView />}
        {activeTab === 'databases' && <PlatformDatabasesView />}
        {activeTab === 'audit' && <PlatformAuditView />}
      </main>

      {/* Quick Company Switcher Modal */}
      {isSwitcherOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black">Basculer sur un compte Entreprise</h3>
                  <p className="text-xs text-slate-400">
                    Accédez directement à l'espace de travail (Caisse, Stock, Finances)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSwitcherOpen(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              {companies.length === 0 ? (
                <div className="text-center p-8 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-500">
                  Aucune entreprise enregistrée sur la plateforme pour le moment.
                </div>
              ) : (
                <div className="space-y-2">
                  {companies.map((company) => {
                    const isAssociated = canAccessCompanySpace(company);

                    return (
                      <div
                        key={company.id}
                        onClick={() => {
                          if (isAssociated) {
                            setIsSwitcherOpen(false);
                            switchCompanySpace(company.id);
                          }
                        }}
                        className={`p-3.5 rounded-2xl border transition flex items-center justify-between ${
                          isAssociated
                            ? 'bg-amber-50/70 hover:bg-amber-100/70 border-amber-300 cursor-pointer group shadow-xs'
                            : 'bg-slate-50/70 border-slate-200 opacity-75 cursor-not-allowed'
                        }`}
                      >
                        <div className="min-w-0 flex items-center space-x-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center font-black transition ${
                              isAssociated
                                ? 'bg-amber-500 text-slate-950 shadow-xs'
                                : 'bg-white border border-slate-200 text-slate-400'
                            }`}
                          >
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-extrabold text-sm text-slate-900 truncate">
                                {company.name}
                              </h4>
                              {isAssociated && (
                                <span className="px-2 py-0.2 bg-amber-400 text-slate-950 text-[9px] font-black rounded-md uppercase">
                                  Votre Établissement
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                              <span className="font-mono bg-white px-1.5 py-0.2 rounded border border-slate-200 font-bold">
                                {company.code}
                              </span>
                              <span>•</span>
                              <span className="capitalize">{company.subscription?.planType || 'Standard'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          {isAssociated ? (
                            <span className="text-xs font-black text-amber-900 bg-amber-200/80 px-2.5 py-1 rounded-lg transition flex items-center gap-1">
                              <span>Ouvrir</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                              Espace Client Privé
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsSwitcherOpen(false)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition cursor-pointer"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 px-6 text-center text-xs text-slate-400">
        Plateforme BarExpress &bull; Console Super Administrateur &bull; Système multi-établissements sécurisé
      </footer>
    </div>
  );
};
