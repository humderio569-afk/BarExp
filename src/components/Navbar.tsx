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
    <header className="bg-white border-b border-slate-200 text-slate-900 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        <div className="flex items-center justify-between h-12 gap-2 sm:gap-4">
          
          {/* Brand Name (BarExp) & Enterprise Context (Custom Name & Logo) */}
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1 sm:flex-initial">
            <div 
              className="flex items-center cursor-pointer select-none group shrink-0 gap-2 min-w-0" 
              onClick={() => setActiveTab('pos')}
              title="BarExp - Retour à la caisse"
            >
              {/* Global App Logo/Badge: BarExp */}
              <div className="flex items-center gap-1 bg-slate-900 text-white px-2.5 py-1 rounded-lg border border-slate-800 shrink-0">
                <span className="font-bold text-xs sm:text-sm text-white tracking-tight leading-none">
                  BarExp
                </span>
              </div>

              {/* Separator */}
              <span className="text-slate-300 font-light text-xs hidden sm:inline shrink-0">|</span>

              {/* Enterprise Custom Name & Logo */}
              <div className="flex items-center gap-2 min-w-0">
                {(activeCompany?.logo || settings.logo) ? (
                  <img
                    src={activeCompany?.logo || settings.logo}
                    alt={activeCompany?.name || settings.barName}
                    className="w-6 h-6 rounded-md object-contain border border-slate-200 bg-white shrink-0"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0 border border-slate-200">
                    <Building2 className="w-3.5 h-3.5 text-slate-600" />
                  </div>
                )}
                <span className="font-bold text-xs sm:text-sm text-slate-900 truncate max-w-[120px] xs:max-w-[160px] sm:max-w-[200px] md:max-w-[240px]" title={activeCompany?.name || settings.barName}>
                  {activeCompany?.name || settings.barName || 'Mon Établissement'}
                </span>
              </div>
            </div>

            {/* Quick Sector Indicator (Click to open Settings) */}
            <button
              type="button"
              onClick={() => setActiveTab('admin')}
              title="Cliquer pour configurer le secteur d'activité et les paramètres"
              className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition cursor-pointer shrink-0"
            >
              <Briefcase className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="whitespace-nowrap">{settings.businessSectorName || 'Secteur'}</span>
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
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    isActive
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>

                  {item.badge !== undefined && item.badge > 0 && (
                    <span className={`ml-1 px-1.5 py-0.2 text-[9px] font-bold rounded-full ${
                      isActive ? 'bg-slate-950 text-amber-400' : 'bg-slate-900 text-white'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Side: Impersonation Banner, Wireless Status, Notifications, Logout */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            {/* Trial & Subscription Status Badge */}
            {!isSuperAdmin && activeCompanyTrialInfo.isTrial && !activeCompanyTrialInfo.isTrialExpired && (
              <div 
                className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-800 rounded-lg text-xs font-medium shrink-0"
                title={`Période d'essai : ${activeCompanyTrialInfo.trialDaysRemaining} jours restants`}
              >
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Essai: {activeCompanyTrialInfo.trialDaysRemaining}j</span>
              </div>
            )}

            {!isSuperAdmin && activeCompanyTrialInfo.hasPendingPaymentProof && (
              <div 
                className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-800 rounded-lg text-xs font-medium shrink-0"
                title="Preuve de paiement soumise, en cours de vérification"
              >
                <Clock className="w-3.5 h-3.5 text-slate-500 animate-spin" />
                <span>Paiement en attente</span>
              </div>
            )}

            {!isSuperAdmin && activeCompanyTrialInfo.hasDisapprovedPaymentProof && (
              <div 
                className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-medium shrink-0"
                title="Dernier paiement rejeté. Veuillez renouveler la preuve."
              >
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                <span>Paiement rejeté</span>
              </div>
            )}

            {/* Super Admin Console Button */}
            {isSuperAdmin && (
              <button
                type="button"
                id="super-admin-nav-icon-btn"
                onClick={() => switchCompanySpace(null)}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition shrink-0 cursor-pointer flex items-center justify-center"
                title={isImpersonating ? "Quitter l'établissement et revenir à la Console Super Admin" : "Console Super Administrateur"}
                aria-label="Console Super Administrateur"
              >
                <Crown className="w-4 h-4" />
              </button>
            )}

            {/* Permanent Company Code Pill (1-Click Copy) - Desktop only */}
            {currentCode && (
              <button
                type="button"
                onClick={handleCopyCode}
                title="Cliquer pour copier le code de l'établissement"
                className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-mono text-xs font-bold rounded-lg transition cursor-pointer shrink-0"
              >
                <span className="text-[10px] font-sans text-slate-500 uppercase">Code:</span>
                <span>{currentCode}</span>
                {copiedCode ? (
                  <Check className="w-3.5 h-3.5 text-slate-900" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                )}
              </button>
            )}

            {/* PWA Download / Offline Mode Trigger */}
            <button
              type="button"
              onClick={() => setIsPwaModalOpen(true)}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition shrink-0 cursor-pointer flex items-center justify-center"
              title="Installer l'application sur cet appareil (PC/Mobile) & Mode Hors-Ligne"
              aria-label="Installer l'application"
            >
              <Download className="w-4 h-4" />
            </button>

            <SyncStatusBanner />

            {/* Notification Center Trigger */}
            <button
              type="button"
              onClick={() => setIsNotificationModalOpen(true)}
              className="relative p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition shrink-0 cursor-pointer flex items-center justify-center"
              title="Centre de notifications et alertes"
            >
              <Bell className="w-4 h-4" />
              {totalAlertsCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 px-1 py-0.2 text-[8px] font-bold rounded-full bg-slate-900 text-white">
                  {totalAlertsCount}
                </span>
              )}
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
