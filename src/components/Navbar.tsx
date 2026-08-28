import React, { useState } from 'react';
import { useBar } from '../context/BarContext';
import { ActiveTab } from '../types';
import { SyncStatusBanner } from './Offline/SyncStatusBanner';
import { NotificationCenterModal } from './Common/NotificationCenterModal';
import { 
  ShoppingBag, 
  Package, 
  TrendingUp, 
  Bell,
  Sliders,
  Settings as SettingsIcon,
  MessageSquare,
  Building2,
  Copy,
  Check,
  Sparkles,
  X,
  LogOut,
  Briefcase,
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
    logout,
  } = useBar();

  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
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
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-11 sm:h-12">
          
          {/* Brand Name & Quick Sector Switcher */}
          <div className="flex items-center space-x-2.5">
            <div 
              className="flex items-center cursor-pointer select-none group shrink-0" 
              onClick={() => setActiveTab('pos')}
              title="Retour à la caisse"
            >
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm sm:text-base text-slate-900 tracking-tight leading-none">
                  {settings.barName}
                </span>
                <span className="bg-amber-500 text-slate-950 text-[8px] sm:text-[9px] font-black px-1.5 py-0.2 rounded-md uppercase tracking-wider shadow-2xs">
                  EXPRESS
                </span>
              </div>
            </div>

            {/* Quick Sector Indicator (Click to open Settings) */}
            <button
              type="button"
              onClick={() => setActiveTab('admin')}
              title="Cliquer pour configurer le secteur d'activité et les paramètres"
              className="hidden sm:flex items-center space-x-1 px-2.5 py-0.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg text-[10.5px] font-black text-amber-900 transition cursor-pointer shadow-2xs"
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

          {/* Right Side: Company Code, Impersonation Banner, Wireless Status & Notifications */}
          <div className="flex items-center space-x-2">
            {/* Impersonation Indicator (Super Admin) */}
            {isSuperAdmin && isImpersonating && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500 text-slate-950 text-xs font-black rounded-xl shadow-xs">
                <Sparkles className="w-3.5 h-3.5" />
                <span className="truncate max-w-[120px]">{activeCompany?.name || 'Entreprise'}</span>
                <button
                  onClick={() => switchCompanySpace(null)}
                  className="ml-1 px-2 py-0.5 bg-slate-950 hover:bg-slate-800 text-white font-bold rounded-lg transition text-[10px] flex items-center gap-1 cursor-pointer"
                  title="Retourner à la Console Super Admin"
                >
                  <span>👑 Super Admin</span>
                  <X className="w-3 h-3 text-amber-400" />
                </button>
              </div>
            )}

            {/* Permanent Company Code Pill (1-Click Copy) */}
            {currentCode && (
              <button
                onClick={handleCopyCode}
                title="Cliquer pour copier le code de l'établissement"
                className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-amber-400 font-mono text-[11px] font-black rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
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

            {/* PWA App Install Button (Opens guide / triggers native prompt) */}
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('open-pwa-modal'))}
              title="Installer l'application PWA (Hors-ligne & Plein écran)"
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-950 rounded-xl text-xs font-black transition active:scale-95 cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>App PWA</span>
            </button>

            <SyncStatusBanner />

            {/* Notification Center Trigger */}
            <button
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
    </header>
  );
};
