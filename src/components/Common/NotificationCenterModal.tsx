import React, { useState, useEffect } from 'react';
import { useBar } from '../../context/BarContext';
import { ActiveTab } from '../../types';
import { 
  Bell, 
  X, 
  AlertTriangle, 
  AlertOctagon, 
  CheckCheck, 
  ArrowRight, 
  Info, 
  Volume2, 
  VolumeX, 
  ShieldCheck,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { 
  getNotificationPrefs, 
  saveNotificationPrefs, 
  getBrowserNotificationPermission, 
  requestNotificationPermission, 
  playGentleChime,
  NotificationPreferences 
} from '../../utils/notificationService';

interface NotificationCenterModalProps {
  onClose: () => void;
  onOpenInventoryModal?: () => void;
}

export interface SystemNotification {
  id: string;
  type: 'out_of_stock' | 'low_stock' | 'inventory_due' | 'user_pending' | 'spill_loss' | 'trial_expiry' | 'payment_status';
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
  const { products, allUsers, stockLogs, setActiveTab, isAdmin, activeCompanyTrialInfo } = useBar();
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const [prefs, setPrefs] = useState<NotificationPreferences>(getNotificationPrefs());
  const [browserPerm, setBrowserPerm] = useState<string>(getBrowserNotificationPermission());
  const [permFeedback, setPermFeedback] = useState<string | null>(null);

  useEffect(() => {
    setBrowserPerm(getBrowserNotificationPermission());
  }, []);

  // Build live notifications
  const notifications: SystemNotification[] = [];

  // 1. Trial status notification
  if (activeCompanyTrialInfo.isTrial && activeCompanyTrialInfo.trialDaysRemaining <= 3 && !activeCompanyTrialInfo.isTrialExpired) {
    notifications.push({
      id: 'trial-warning',
      type: 'trial_expiry',
      severity: 'warning',
      title: `Fin de période d'essai dans ${activeCompanyTrialInfo.trialDaysRemaining} jour(s)`,
      message: "Pour continuer à profiter de toutes les fonctionnalités après l'essai gratuit, pensez à activer votre abonnement.",
      timestamp: new Date().toISOString(),
      actionText: 'Voir les forfaits',
      actionTab: 'admin',
    });
  }

  // 2. Out of stock products
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

  // 3. Low stock products
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

  // 4. Pending users approval (Admin only)
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

  // 5. Recent losses/spills in the last 7 days
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

  const handleRequestPermission = async () => {
    setPermFeedback(null);
    const outcome = await requestNotificationPermission();
    setBrowserPerm(getBrowserNotificationPermission());
    if (outcome === 'granted') {
      setPermFeedback('Notifications autorisées ! Vous recevrez des alertes discrètes et non-agressives.');
      playGentleChime('success');
    } else {
      setPermFeedback('Notifications non autorisées par le navigateur.');
    }
  };

  const handleToggleSound = () => {
    const updated = saveNotificationPrefs({ soundEnabled: !prefs.soundEnabled });
    setPrefs(updated);
    if (updated.soundEnabled) {
      playGentleChime('info');
    }
  };

  const handleToggleQuietMode = () => {
    const updated = saveNotificationPrefs({ quietMode: !prefs.quietMode });
    setPrefs(updated);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 text-slate-900 relative max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Centre d'Alertes & Notifications</h3>
              <p className="text-[11px] text-slate-500 font-medium">Alertes intelligentes, non-agressives et respectueuses de votre caisse.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full transition cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Non-Aggressive Settings Bar */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Régulateur Non-Agressif</span>
            </div>
            <div className="flex items-center gap-2">
              {browserPerm !== 'granted' && (
                <button
                  onClick={handleRequestPermission}
                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] rounded-lg transition cursor-pointer shadow-xs"
                >
                  Activer alertes système
                </button>
              )}
              <button
                onClick={handleToggleSound}
                className={`p-1.5 rounded-lg border transition cursor-pointer ${
                  prefs.soundEnabled
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : 'bg-slate-200 border-slate-300 text-slate-600'
                }`}
                title={prefs.soundEnabled ? 'Son doux activé (Cliquer pour couper)' : 'Son coupé (Cliquer pour activer)'}
              >
                {prefs.soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
            <span>Volume doux & carillon harmonique</span>
            <span className="text-emerald-700 font-semibold">Anti-spam (1 alerte max/min)</span>
          </div>

          {permFeedback && (
            <div className="p-2 bg-amber-50 border border-amber-200 text-amber-950 rounded-lg text-[11px] font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{permFeedback}</span>
            </div>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 text-xs shrink-0">
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                filter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Toutes ({activeNotifications.length})
            </button>
            <button
              onClick={() => setFilter('critical')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                filter === 'critical' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'
              }`}
            >
              Critiques ({activeNotifications.filter(n => n.severity === 'critical').length})
            </button>
            <button
              onClick={() => setFilter('warning')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                filter === 'warning' ? 'bg-amber-500 text-slate-950' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              Alertes ({activeNotifications.filter(n => n.severity === 'warning').length})
            </button>
          </div>

          {activeNotifications.length > 0 && (
            <button
              onClick={handleDismissAll}
              className="text-[10px] font-bold text-slate-400 hover:text-slate-700 flex items-center space-x-1 cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Tout masquer</span>
            </button>
          )}
        </div>

        {/* List of Notifications */}
        <div className="overflow-y-auto flex-1 space-y-2.5 pr-1">
          {filteredNotifications.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto opacity-80" />
              <p className="text-sm font-bold text-slate-700">Aucune alerte en attente !</p>
              <p className="text-xs text-slate-400">Tous les stocks et opérations sont parfaitement sous contrôle.</p>
            </div>
          ) : (
            filteredNotifications.map((n) => {
              const isCritical = n.severity === 'critical';
              const isWarning = n.severity === 'warning';

              return (
                <div
                  key={n.id}
                  className={`p-3.5 rounded-2xl border transition flex flex-col space-y-1.5 relative ${
                    isCritical
                      ? 'bg-red-50/80 border-red-200 text-red-950'
                      : isWarning
                      ? 'bg-amber-50/80 border-amber-200 text-amber-950'
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
                      className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
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
                        className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center space-x-1 transition cursor-pointer shadow-xs ${
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
