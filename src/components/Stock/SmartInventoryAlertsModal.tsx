import React, { useState } from 'react';
import { useBar } from '../../context/BarContext';
import { SmartAlert } from '../../types';
import { 
  AlertTriangle, 
  X, 
  ShieldAlert, 
  TrendingDown, 
  RotateCcw, 
  CheckCircle2, 
  PlusCircle, 
  ClipboardCheck, 
  ArrowRight,
  PackageCheck,
  Clock,
  Sparkles,
  Zap,
  Info
} from 'lucide-react';

interface SmartInventoryAlertsModalProps {
  onClose: () => void;
  onOpenInventoryModal?: () => void;
}

export const SmartInventoryAlertsModal: React.FC<SmartInventoryAlertsModalProps> = ({ 
  onClose,
  onOpenInventoryModal 
}) => {
  const { products, sales, stockLogs, restockProduct, settings } = useBar();
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>([]);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Compute Smart Alerts dynamically
  const generateSmartAlerts = (): SmartAlert[] => {
    const alerts: SmartAlert[] = [];
    const nowISO = new Date().toISOString();

    // Calculate sales velocity per product (units sold in last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const salesIn7DaysMap: Record<string, number> = {};
    sales.forEach(s => {
      const saleDate = new Date(s.timestamp);
      if (saleDate >= sevenDaysAgo && s.status === 'completed') {
        s.items.forEach(item => {
          salesIn7DaysMap[item.product.id] = (salesIn7DaysMap[item.product.id] || 0) + item.quantity;
        });
      }
    });

    // 1. Critical Out-of-Stock or Low Stock with Velocity Estimate
    products.forEach(p => {
      const soldLast7 = salesIn7DaysMap[p.id] || 0;
      const dailyVelocity = soldLast7 / 7; // Average units per day

      if (p.stock === 0) {
        const reorderQty = Math.max(12, Math.ceil(dailyVelocity * 10) || 12);
        alerts.push({
          id: `alert-out-${p.id}`,
          type: 'critical_stockout',
          severity: 'critical',
          title: `Rupture Totale : ${p.name}`,
          message: `Le stock est à 0 ${p.unit}. Des ventes sont manquées à chaque demande client.`,
          productId: p.id,
          productName: p.name,
          suggestedAction: `Commander ${reorderQty} ${p.unit}s immédiatement`,
          actionType: 'restock',
          suggestedQuantity: reorderQty,
          createdAt: nowISO,
        });
      } else if (p.stock <= p.minStockAlert) {
        let timeRemainingText = "Stock sous le seuil d'alerte.";
        if (dailyVelocity > 0) {
          const daysLeft = (p.stock / dailyVelocity).toFixed(1);
          timeRemainingText = `Épuisement estimé dans ~${daysLeft} jour(s) au rythme de vente actuel (${dailyVelocity.toFixed(1)}/jour).`;
        }
        const reorderQty = Math.max(10, Math.ceil((p.minStockAlert * 3) - p.stock));

        alerts.push({
          id: `alert-low-${p.id}`,
          type: 'low_stock',
          severity: 'warning',
          title: `Stock Critique : ${p.name}`,
          message: `Stock actuel : ${p.stock} ${p.unit} (Seuil : ${p.minStockAlert}). ${timeRemainingText}`,
          productId: p.id,
          productName: p.name,
          suggestedAction: `Réapprovisionner +${reorderQty} ${p.unit}`,
          actionType: 'restock',
          suggestedQuantity: reorderQty,
          createdAt: nowISO,
        });
      } else if (dailyVelocity > 3 && p.stock < (dailyVelocity * 3)) {
        // High velocity item that will deplete in less than 3 days
        const reorderQty = Math.ceil(dailyVelocity * 7);
        alerts.push({
          id: `alert-reorder-${p.id}`,
          type: 'reorder_recommendation',
          severity: 'warning',
          title: `Forte Vente à Anticiper : ${p.name}`,
          message: `Produit à forte rotation (${soldLast7} vendus en 7j). Stock actuel (${p.stock}) risque la rupture sous 72h.`,
          productId: p.id,
          productName: p.name,
          suggestedAction: `Commander du stock préventif (+${reorderQty})`,
          actionType: 'restock',
          suggestedQuantity: reorderQty,
          createdAt: nowISO,
        });
      }
    });

    // 2. Discrepancy & Losses Alerts (Spillages, Losses in last 48h)
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const lossLogs = stockLogs.filter(l => 
      l.type === 'spill_loss' && new Date(l.timestamp) >= twoDaysAgo
    );

    if (lossLogs.length > 0) {
      const totalLossQty = lossLogs.reduce((sum, l) => sum + l.quantity, 0);
      alerts.push({
        id: `alert-loss-summary`,
        type: 'inventory_discrepancy',
        severity: 'warning',
        title: `Pertes & Casse Détectées (48h)`,
        message: `${lossLogs.length} signalement(s) de casse ou écart récent totalisant ${totalLossQty} unités de boisson.`,
        suggestedAction: `Vérifier le registre des mouvements de stock`,
        actionType: 'inventory',
        createdAt: nowISO,
      });
    }

    // 3. Periodic Count Reminder Alert
    const lastInventoryLog = stockLogs.find(l => l.reason.toLowerCase().includes('inventaire'));
    let daysSinceInventory = 999;
    if (lastInventoryLog) {
      const lastDate = new Date(lastInventoryLog.timestamp);
      daysSinceInventory = Math.floor((new Date().getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
    }

    if (daysSinceInventory >= 2) {
      alerts.push({
        id: `alert-count-due`,
        type: 'count_due',
        severity: 'info',
        title: `Inventaire Physique Recommandé`,
        message: lastInventoryLog 
          ? `Le dernier contrôle physique du stock remonte à ${daysSinceInventory} jours.` 
          : `Aucun inventaire physique n'a encore été enregistré ce mois-ci.`,
        suggestedAction: `Lancer une session d'inventaire rapide`,
        actionType: 'inventory',
        createdAt: nowISO,
      });
    }

    // 4. Slow Moving / Dead Stock Alert
    products.forEach(p => {
      const soldLast7 = salesIn7DaysMap[p.id] || 0;
      if (p.stock > 20 && soldLast7 === 0) {
        alerts.push({
          id: `alert-slow-${p.id}`,
          type: 'slow_moving',
          severity: 'info',
          title: `Stock Dormant : ${p.name}`,
          message: `${p.stock} ${p.unit}s en stock avec 0 vente sur les 7 derniers jours. Capital immobilisé.`,
          productId: p.id,
          productName: p.name,
          suggestedAction: `Promouvoir ce produit ou ajuster le prix`,
          actionType: 'review',
          createdAt: nowISO,
        });
      }
    });

    return alerts;
  };

  const rawAlerts = generateSmartAlerts();
  const activeAlerts = rawAlerts.filter(a => !dismissedAlertIds.includes(a.id));

  const handleQuickRestock = (productId: string, quantity: number, productName: string) => {
    restockProduct(productId, quantity, "Réapprovisionnement Intelligent 1-Clic");
    setSuccessToast(`+${quantity} unités ajoutées au stock de ${productName}`);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleDismiss = (id: string) => {
    setDismissedAlertIds(prev => [...prev, id]);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn overflow-y-auto overscroll-contain">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full max-h-[92dvh] flex flex-col shadow-2xl overflow-hidden text-slate-900 relative my-auto">
        
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md shrink-0">
              <Zap className="w-5 h-5 fill-slate-950" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-black leading-tight">
                  Centre d'Alertes Intelligentes
                </h2>
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold rounded-full">
                  IA Stock
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Détection automatique des ruptures, prévisions de vente et recommandations.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast Notification */}
        {successToast && (
          <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between animate-fadeIn shrink-0">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{successToast}</span>
            </div>
          </div>
        )}

        {/* Active Alerts List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeAlerts.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900">Stock Optimisé & Sous Contrôle !</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Aucune anomalie ni rupture critique détectée. Tous vos produits disposent de réserves suffisantes.
              </p>
            </div>
          ) : (
            activeAlerts.map(alert => {
              const isCritical = alert.severity === 'critical';
              const isWarning = alert.severity === 'warning';

              return (
                <div
                  key={alert.id}
                  className={`p-4 rounded-2xl border transition space-y-3 ${
                    isCritical
                      ? 'bg-red-50/60 border-red-200'
                      : isWarning
                      ? 'bg-amber-50/60 border-amber-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start space-x-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold mt-0.5 ${
                        isCritical
                          ? 'bg-red-500 text-white'
                          : isWarning
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-blue-500 text-white'
                      }`}>
                        {isCritical ? <ShieldAlert className="w-5 h-5" /> : isWarning ? <AlertTriangle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
                      </div>

                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                          <span>{alert.title}</span>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase ${
                            isCritical ? 'bg-red-200 text-red-900' : isWarning ? 'bg-amber-200 text-amber-900' : 'bg-blue-100 text-blue-900'
                          }`}>
                            {isCritical ? 'Urgente' : isWarning ? 'Attention' : 'Conseil'}
                          </span>
                        </h4>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                          {alert.message}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDismiss(alert.id)}
                      className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                      title="Masquer cette alerte"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Actions Bar inside alert card */}
                  <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-500 flex items-center space-x-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>{alert.suggestedAction}</span>
                    </span>

                    <div className="flex items-center space-x-2">
                      {alert.actionType === 'restock' && alert.productId && alert.suggestedQuantity && (
                        <button
                          type="button"
                          onClick={() => handleQuickRestock(alert.productId!, alert.suggestedQuantity!, alert.productName!)}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-xs transition flex items-center space-x-1 cursor-pointer active:scale-95"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>Réapprovisionner 1-Clic (+{alert.suggestedQuantity})</span>
                        </button>
                      )}

                      {alert.actionType === 'inventory' && onOpenInventoryModal && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenInventoryModal();
                          }}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1 cursor-pointer"
                        >
                          <ClipboardCheck className="w-3.5 h-3.5 text-amber-400" />
                          <span>Faire un Inventaire</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center space-x-1.5">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>Mise à jour en direct synchronisée avec les ventes</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
};
