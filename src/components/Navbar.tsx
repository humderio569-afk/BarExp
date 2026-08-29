import React, { useState } from 'react';
import { useBar } from '../context/BarContext';
import { ActiveTab } from '../types';
import { SyncStatusBanner } from './Offline/SyncStatusBanner';
import { NotificationCenterModal } from './Common/NotificationCenterModal';
import { PwaInstallModal } from './Offline/PwaInstallModal';
import { 
  ShoppingBag, 
  Package, 
  TrendingUp, 
  Bell,
  Settings as SettingsIcon,
  MessageSquare,
  Building2,
  Copy,
  Check,
  Sparkles,
  LogOut,
  Briefcase,
  Crown,
  Clock,
  AlertTriangle,
  Download
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    products,
    settings,
    currentUser,
    allUsers,
    isAdmin,
    isSuperAdmin,
    activeCompany,
    isImpersonating,
    switchCompanySpace,
    activeCompanyTrialInfo,
    logout,
  } = useBar();

  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isPwaModalOpen, setIsPwaModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const currentCode = activeCompany?.code || settings.companyCode;

  const handleCopyCode = () => {
    if (!currentCode) return;
    navigator.clipboard.writeText(currentCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Calculate total active alerts count
  const outOfStockCount = products.filter(p => p.stock <= 0).length;
  const lowStockCount = products.filter(p => p.stock > 0 && p.stock <= p.minStockAlert).length;
  const pendingUsersCount = allUsers.filter(u => u.status === 'pending').length;
  const totalAlertsCount = outOfStockCount + lowStockCount + (isAdmin ? pendingUsersCount : 0);

  const perms = currentUser?.permissions;

  // Operational & Direction navigation tabs
  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: number; show: boolean }[] = [
    {
      id: 'pos',
      label: 'Caisse',
      icon: <ShoppingBag className="w-4 h-4" />,
      show: isAdmin || perms?.canAccessPOS !== false
    },
    {
      id: 'stock',
      label: 'Stock',
      icon: <Package className="w-4 h-4" />,
      badge: lowStockCount,
      show: isAdmin || perms?.canAccessStock !== false
    },
    {
      id: 'reports',
      label: 'Finances & Bilan',
      icon: <TrendingUp className="w-4 h-4" />,
      show: isAdmin || perms?.canAccessReports === true
    },
    {
      id: 'chat',
      label: 'Dona (IA)',
      icon: <MessageSquare className="w-4 h-4" />,
      show: (settings.enableDonaChat !== false) && (isAdmin || perms?.canAccessChat !== false)
    },
    {
      id: 'admin',
      label: 'Paramètres & Direction',
      icon: <SettingsIcon className="w-4 h-4" />,
      badge: isAdmin && pendingUsersCount > 0 ? pendingUsersCount : undefined,
      show: true
    },
  ];

  return (
    <header className="bg-white border-b border-slate-200 text-slate-900 sticky top-0 z-30 shadow-2xs">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-4 lg:px-8">
        <div className="flex items-center justify-between h-11 sm:h-12 gap-1.5 sm:gap-3">
          
          {/* Brand Name (BarExp) & Enterprise Context (Custom Name & Logo) */}
          <div className="flex items-center space-x-1.5 sm:space-x-2.5 min-w-0 flex-1 sm:flex-initial">
            <div 
              className="flex items-center cursor-pointer select-none group shrink-0 gap-1.5 sm:gap-2 min-w-0" 
              onClick={() => setActiveTab('pos')}
              title="BarExp - Retour à la caisse"
            >
              {/* Global App Logo/Badge: BarExp */}
              <div className="flex items-center gap-1 bg-slate-900 text-white px-2 py-1 rounded-xl shadow-2xs border border-slate-800 shrink-0">
                <span className="font-black text-xs sm:text-sm text-white tracking-tight leading-none">
                  BarExp
                </span>
              </div>

              {/* Separator */}
              <span className="text-slate-300 font-light text-xs hidden sm:inline shrink-0">|</span>

              {/* Enterprise Custom Name & Logo */}
              <div className="flex items-center gap-1.5 min-w-0">
                {(activeCompany?.logo || settings.logo) ? (
                  <img
                    src={activeCompany?.logo || settings.logo}
                    alt={activeCompany?.name || settings.barName}
                    className="w-5 h-5 sm:w-6 sm:h-6 rounded-md object-contain border border-slate-200 bg-white shrink-0 shadow-2xs"
                  />
                ) : (
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-amber-100 text-amber-900 font-bold text-[10px] flex items-center justify-center shrink-0 border border-amber-200">
                    <Building2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-700" />
                  </div>
                )}
                <span className="font-bold text-xs sm:text-sm text-slate-900 truncate max-w-[100px] xs:max-w-[130px] sm:max-w-[180px] md:max-w-[220px]" title={activeCompany?.name || settings.barName}>
                  {activeCompany?.name || settings.barName || 'Mon Établissement'}
                </span>
              </div>
            </div>

            {/* Quick Sector Indicator (Click to open Settings) */}
            <button
              type="button"
              onClick={() => setActiveTab('admin')}
              title="Cliquer pour configurer le secteur d'activité et les paramètres"
              className="hidden lg:flex items-center space-x-1 px-2.5 py-0.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg text-[10.5px] font-black text-amber-900 transition cursor-pointer shadow-2xs shrink-0"
            >
              <Briefcase className="w-3 h-3 text-amber-600 shrink-0" />
              <span className="truncate max-w-[140px]">{settings.businessSectorName || 'Secteur'}</span>
            </button>
          </div>

          {/* Desktop Navigation Links (Clean & Compact) */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.filter(item => item.show).map(item => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all relative cursor-pointer ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 shadow-2xs scale-[1.02]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>

                  {item.badge !== undefined && item.badge > 0 && (
                    <span className={`ml-1 px-1.5 py-0.2 text-[9px] font-black rounded-full ${
                      isActive ? 'bg-slate-950 text-amber-400' : 'bg-red-500 text-white'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Side: Impersonation Banner, Wireless Status, Notifications, Logout */}
          <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
            {/* Trial & Subscription Status Badge */}
            {!isSuperAdmin && activeCompanyTrialInfo.isTrial && !activeCompanyTrialInfo.isTrialExpired && (
              <div 
                className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-300 text-amber-900 rounded-lg text-[10px] font-bold shrink-0"
                title={`Période d'essai gratuite : ${activeCompanyTrialInfo.trialDaysRemaining} jours restants`}
              >
                <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                <span>Essai: {activeCompanyTrialInfo.trialDaysRemaining}j</span>
              </div>
            )}

            {!isSuperAdmin && activeCompanyTrialInfo.hasPendingPaymentProof && (
              <div 
                className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-300 text-blue-900 rounded-lg text-[10px] font-bold shrink-0"
                title="Preuve de paiement soumise, en cours de vérification par le Super Administrateur"
              >
                <Clock className="w-3 h-3 text-blue-600 animate-spin" />
                <span>Paiement en attente</span>
              </div>
            )}

            {!isSuperAdmin && activeCompanyTrialInfo.hasDisapprovedPaymentProof && (
              <div 
                className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 border border-red-300 text-red-900 rounded-lg text-[10px] font-bold shrink-0 animate-bounce"
                title="Dernier paiement rejeté par le Super Administrateur. Veuillez renouveler la preuve."
              >
                <AlertTriangle className="w-3 h-3 text-red-600" />
                <span>Paiement rejeté</span>
              </div>
            )}

            {/* Super Admin Console Button: STRICTLY ICON ONLY as requested */}
            {isSuperAdmin && (
              <button
                type="button"
                id="super-admin-nav-icon-btn"
                onClick={() => switchCompanySpace(null)}
                className={`p-1.5 rounded-xl transition shadow-2xs cursor-pointer flex items-center justify-center relative group shrink-0 ${
                  isImpersonating 
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 ring-2 ring-amber-300' 
                    : 'bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-500/30'
                }`}
                title={isImpersonating ? "Quitter l'établissement et revenir à la Console Super Admin" : "Console Super Administrateur"}
                aria-label="Console Super Administrateur"
              >
                <Crown className="w-4 h-4" />
                {isImpersonating && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 animate-ping" />
                )}
              </button>
            )}

            {/* Permanent Company Code Pill (1-Click Copy) - Desktop only */}
            {currentCode && (
              <button
                type="button"
                onClick={handleCopyCode}
                title="Cliquer pour copier le code de l'établissement"
                className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-amber-400 font-mono text-[11px] font-black rounded-xl shadow-xs transition active:scale-95 cursor-pointer shrink-0"
              >
                <span className="text-[9px] font-sans text-slate-400 uppercase">Code:</span>
                <span>{currentCode}</span>
                {copiedCode ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3 text-slate-400" />
                )}
              </button>
            )}

            {/* PWA Download / Offline Mode Trigger */}
            <button
              type="button"
              onClick={() => setIsPwaModalOpen(true)}
              className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-slate-100 rounded-lg transition shrink-0 cursor-pointer flex items-center justify-center"
              title="Installer l'application sur cet appareil (PC/Mobile) & Mode Hors-Ligne 3 Go"
              aria-label="Installer l'application"
            >
              <Download className="w-4 h-4" />
            </button>

            <SyncStatusBanner />

            {/* Notification Center Trigger */}
            <button
              type="button"
              onClick={() => setIsNotificationModalOpen(true)}
              className="relative p-1.5 text-slate-600 hover:text-amber-600 hover:bg-slate-100 rounded-lg transition shrink-0 cursor-pointer flex items-center justify-center"
              title="Centre de notifications et alertes"
            >
              <Bell className="w-4 h-4" />
              {totalAlertsCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 px-1 py-0.2 text-[8px] font-black rounded-full bg-red-600 text-white animate-pulse">
                  {totalAlertsCount}
                </span>
              )}
            </button>

            {/* Direct Logout Button */}
            <button
              type="button"
              onClick={() => logout()}
              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition shrink-0 cursor-pointer flex items-center justify-center"
              title="Se déconnecter de la session"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>

      {isNotificationModalOpen && (
        <NotificationCenterModal
          onClose={() => setIsNotificationModalOpen(false)}
        />
      )}

      {isPwaModalOpen && (
        <PwaInstallModal
          isOpen={isPwaModalOpen}
          onClose={() => setIsPwaModalOpen(false)}
        />
      )}
    </header>
  );
};
