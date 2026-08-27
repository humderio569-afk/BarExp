import React, { useState } from 'react';
import { useBar } from '../../context/BarContext';
import { ActiveTab } from '../../types';
import { 
  Bell, 
  X, 
  AlertTriangle, 
  AlertOctagon, 
  ClipboardCheck, 
  UserCheck, 
  TrendingDown, 
  CheckCheck, 
  ArrowRight,
  ShieldAlert,
  Info
} from 'lucide-react';

interface NotificationCenterModalProps {
  onClose: () => void;
  onOpenInventoryModal?: () => void;
}

export interface SystemNotification {
  id: string;
  type: 'out_of_stock' | 'low_stock' | 'inventory_due' | 'user_pending' | 'spill_loss';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  actionText?: string;
  actionTab?: ActiveTab | 'inventory';
  productId?: string;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  onClose,
  onOpenInventoryModal,
}) => {
  const { products, allUsers, stockLogs, setActiveTab, settings, isAdmin } = useBar();
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');

  // Build real live notifications
  const notifications: SystemNotification[] = [];

  // 1. Out of stock products
  products.filter(p => p.stock <= 0 && p.active).forEach(p => {
    notifications.push({
      id: `out-${p.id}`,
      type: 'out_of_stock',
      severity: 'critical',
      title: `Rupture de stock : ${p.name}`,
      message: `Stock à 0 ${p.unit}(s). Impossible d'effectuer des ventes pour cet article.`,
      timestamp: new Date().toISOString(),
      actionText: 'Réapprovisionner',
      actionTab: 'stock',
      productId: p.id,
    });
  });

  // 2. Low stock products
  products.filter(p => p.stock > 0 && p.stock <= p.minStockAlert && p.active).forEach(p => {
    notifications.push({
      id: `low-${p.id}`,
      type: 'low_stock',
      severity: 'warning',
      title: `Stock faible : ${p.name}`,
      message: `Il ne reste que ${p.stock} ${p.unit}(s) en réserve (seuil d'alerte à ${p.minStockAlert}).`,
      timestamp: new Date().toISOString(),
      actionText: 'Réapprovisionner',
      actionTab: 'stock',
      productId: p.id,
    });
  });

  // 3. Pending users approval (Admin only)
  if (isAdmin) {
    const pendingUsers = allUsers.filter(u => u.status === 'pending');
    if (pendingUsers.length > 0) {
      notifications.push({
        id: 'pending-users',
        type: 'user_pending',
        severity: 'warning',
        title: `Demandes d'accès caissier (${pendingUsers.length})`,
        message: `${pendingUsers.map(u => u.displayName).join(', ')} attend(ent) validation de leur compte.`,
        timestamp: new Date().toISOString(),
        actionText: 'Gérer les utilisateurs',
        actionTab: 'admin',
      });
    }
  }

  // 4. Recent losses/spills in the last 7 days
  const recentLosses = stockLogs.filter(l => l.type === 'spill_loss');
  if (recentLosses.length > 0) {
    const totalLossQty = recentLosses.reduce((sum, l) => sum + l.quantity, 0);
    notifications.push({
      id: 'spill-losses-summary',
      type: 'spill_loss',
      severity: 'info',
      title: `Pertes / Casses enregistrées : ${totalLossQty} unités`,
      message: `${recentLosses.length} incident(s) de perte/casse de stock enregistré(s) récemment.`,
      timestamp: recentLosses[0].timestamp,
      actionText: 'Voir historique stock',
      actionTab: 'stock',
    });
  }

  // Filter out dismissed
  const activeNotifications = notifications.filter(n => !dismissedIds.includes(n.id));

  const filteredNotifications = activeNotifications.filter(n => {
    if (filter === 'critical') return n.severity === 'critical';
    if (filter === 'warning') return n.severity === 'warning';
    if (filter === 'info') return n.severity === 'info';
    return true;
  });

  const handleAction = (n: SystemNotification) => {
    if (n.actionTab === 'inventory') {
      onClose();
      if (onOpenInventoryModal) {
        onOpenInventoryModal();
      } else {
        setActiveTab('stock');
      }
      return;
    }

    if (n.actionTab) {
      setActiveTab(n.actionTab);
    }
    onClose();
  };

  const handleDismiss = (id: string) => {
    setDismissedIds(prev => [...prev, id]);
  };

  const handleDismissAll = () => {
    setDismissedIds(activeNotifications.map(n => n.id));
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-slate-900 relative max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 shrink-0">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-amber-500/20 text-amber-600 rounded-xl">
              <Bell className="w-5 h-5 fill-amber-500/30" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Centre de Notifications & Alertes</h3>
              <p className="text-[11px] text-slate-500">Alertes temps réel générées par l'activité de votre établissement.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 text-xs shrink-0">
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                filter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Toutes ({activeNotifications.length})
            </button>
            <button
              onClick={() => setFilter('critical')}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                filter === 'critical' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'
              }`}
            >
              Critiques ({activeNotifications.filter(n => n.severity === 'critical').length})
            </button>
            <button
              onClick={() => setFilter('warning')}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                filter === 'warning' ? 'bg-amber-500 text-slate-950' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              Alertes ({activeNotifications.filter(n => n.severity === 'warning').length})
            </button>
          </div>

          {activeNotifications.length > 0 && (
            <button
              onClick={handleDismissAll}
              className="text-[10px] font-bold text-slate-400 hover:text-slate-700 flex items-center space-x-1"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Tout ignorer</span>
            </button>
          )}
        </div>

        {/* List of Notifications */}
        <div className="overflow-y-auto flex-1 space-y-3 pr-1">
          {filteredNotifications.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <CheckCheck className="w-12 h-12 text-emerald-500 mx-auto opacity-80" />
              <p className="text-sm font-bold text-slate-700">Aucune alerte en attente !</p>
              <p className="text-xs text-slate-400">Tous les stocks et paramètres de l'application sont sous contrôle.</p>
            </div>
          ) : (
            filteredNotifications.map((n) => {
              const isCritical = n.severity === 'critical';
              const isWarning = n.severity === 'warning';

              return (
                <div
                  key={n.id}
                  className={`p-3.5 rounded-2xl border transition flex flex-col space-y-2 relative ${
                    isCritical
                      ? 'bg-red-50/70 border-red-200 text-red-950'
                      : isWarning
                      ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      {isCritical ? (
                        <AlertOctagon className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      ) : isWarning ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      ) : (
                        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      )}
                      <h4 className="text-xs font-black leading-snug">{n.title}</h4>
                    </div>

                    <button
                      onClick={() => handleDismiss(n.id)}
                      className="text-slate-400 hover:text-slate-600 p-1"
                      title="Masquer cette alerte"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-[11px] opacity-90 leading-relaxed pl-6">{n.message}</p>

                  {n.actionText && (
                    <div className="pt-1 flex justify-end">
                      <button
                        onClick={() => handleAction(n)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center space-x-1 transition cursor-pointer shadow-2xs ${
                          isCritical
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : isWarning
                            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                            : 'bg-slate-900 hover:bg-slate-800 text-white'
                        }`}
                      >
                        <span>{n.actionText}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
};
