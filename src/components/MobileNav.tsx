import React from 'react';
import { useBar } from '../context/BarContext';
import { ActiveTab } from '../types';
import { 
  ShoppingBag, 
  Package, 
  TrendingUp, 
  Sliders,
  Settings as SettingsIcon,
  MessageSquare
} from 'lucide-react';

export const MobileNav: React.FC = () => {
  const { activeTab, setActiveTab, cart, products, allUsers, currentUser, isAdmin, settings } = useBar();

  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const lowStockCount = products.filter(p => p.stock <= p.minStockAlert).length;
  const pendingUsersCount = allUsers.filter(u => u.status === 'pending').length;

  const perms = currentUser?.permissions;

  const items: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: number; show: boolean }[] = [
    {
      id: 'pos',
      label: 'Caisse',
      icon: <ShoppingBag className="w-5 h-5" />,
      badge: cartItemsCount,
      show: isAdmin || perms?.canAccessPOS !== false
    },
    {
      id: 'stock',
      label: 'Stock',
      icon: <Package className="w-5 h-5" />,
      badge: lowStockCount,
      show: isAdmin || perms?.canAccessStock !== false
    },
    {
      id: 'reports',
      label: 'Finances',
      icon: <TrendingUp className="w-5 h-5" />,
      show: isAdmin || perms?.canAccessReports === true
    },
    {
      id: 'chat',
      label: 'Dona Chat',
      icon: <MessageSquare className="w-5 h-5" />,
      show: (settings.enableDonaChat !== false) && (isAdmin || perms?.canAccessChat !== false)
    },
    {
      id: 'admin',
      label: 'Paramètres',
      icon: <SettingsIcon className="w-5 h-5" />,
      badge: isAdmin && pendingUsersCount > 0 ? pendingUsersCount : undefined,
      show: true
    },
  ];

  const visibleItems = items.filter(i => i.show);

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 text-slate-700 pb-safe">
      <div className={`grid h-14 items-center px-1 ${
        visibleItems.length === 5
          ? 'grid-cols-5'
          : visibleItems.length === 4 
          ? 'grid-cols-4' 
          : visibleItems.length === 3 
          ? 'grid-cols-3' 
          : visibleItems.length === 2 
          ? 'grid-cols-2' 
          : 'grid-cols-1'
      }`}>
        {visibleItems.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 transition cursor-pointer ${
                isActive
                  ? 'text-amber-600 font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <div className="relative">
                {item.icon}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`absolute -top-1.5 -right-2.5 text-[9px] font-bold px-1.5 py-0.2 rounded-full min-w-[16px] text-center ${
                    item.id === 'pos' 
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-900 text-white'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 truncate max-w-full font-medium">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
