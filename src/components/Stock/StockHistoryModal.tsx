import React, { useState, useMemo } from 'react';
import { 
  X, 
  History, 
  Search, 
  Filter, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Calendar, 
  Download, 
  FileText,
  AlertTriangle,
  RefreshCw,
  Package,
  User
} from 'lucide-react';
import { StockLog, EnterpriseReportType } from '../../types';

interface StockHistoryModalProps {
  stockLogs: StockLog[];
  currency: string;
  barName: string;
  onClose: () => void;
  onOpenReport?: (type: EnterpriseReportType) => void;
}

type PeriodFilter = 'today' | '7days' | 'month' | 'last_month' | 'quarter' | 'year' | 'all_time' | 'custom';
type MovementTypeFilter = 'all' | 'in' | 'out' | 'sale' | 'spill_loss';

export const StockHistoryModal: React.FC<StockHistoryModalProps> = ({
  stockLogs,
  currency,
  barName,
  onClose,
  onOpenReport
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [period, setPeriod] = useState<PeriodFilter>('all_time');
  const [movementType, setMovementType] = useState<MovementTypeFilter>('all');
  const [selectedCashier, setSelectedCashier] = useState<string>('all');
  
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [customStartDate, setCustomStartDate] = useState(todayStr);
  const [customEndDate, setCustomEndDate] = useState(todayStr);

  // Available authors / cashiers in stock logs
  const availableCashiers = useMemo(() => {
    const set = new Set<string>();
    stockLogs.forEach(l => {
      if (l.recordedBy && l.recordedBy.trim()) {
        set.add(l.recordedBy.trim());
      }
    });
    return Array.from(set).sort();
  }, [stockLogs]);

  // Compute active date range
  const { startDate, endDate, periodLabel } = useMemo(() => {
    const now = new Date();
    let start = new Date(now);
    let end = new Date(now);
    let label = 'Historique Complet';

    if (period === 'today') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      label = "Aujourd'hui";
    } else if (period === '7days') {
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      label = '7 Derniers Jours';
    } else if (period === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      label = 'Ce Mois-ci';
    } else if (period === 'last_month') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      label = 'Mois Précédent';
    } else if (period === 'quarter') {
      const q = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), q * 3, 1, 0, 0, 0);
      end = new Date(now.getFullYear(), q * 3 + 3, 0, 23, 59, 59, 999);
      label = `Trimestre T${q + 1} ${now.getFullYear()}`;
    } else if (period === 'year') {
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      label = `Année ${now.getFullYear()}`;
    } else if (period === 'all_time') {
      start = new Date(2020, 0, 1, 0, 0, 0);
      end = new Date(now.getFullYear() + 1, 11, 31, 23, 59, 59, 999);
      label = 'Historique Complet (Tous les temps)';
    } else {
      const pStart = new Date(customStartDate + 'T00:00:00');
      const pEnd = new Date(customEndDate + 'T23:59:59');
      start = isNaN(pStart.getTime()) ? new Date(0) : pStart;
      end = isNaN(pEnd.getTime()) ? new Date() : pEnd;
      label = `Du ${start.toLocaleDateString('fr-FR')} au ${end.toLocaleDateString('fr-FR')}`;
    }

    return { startDate: start, endDate: end, periodLabel: label };
  }, [period, customStartDate, customEndDate]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return stockLogs.filter(log => {
      const logDate = new Date(log.timestamp);
      if (logDate < startDate || logDate > endDate) return false;

      if (movementType !== 'all') {
        if (movementType === 'in' && log.type !== 'in') return false;
        if (movementType === 'out' && log.type !== 'out') return false;
        if (movementType === 'sale' && log.type !== 'sale') return false;
        if (movementType === 'spill_loss' && log.type !== 'spill_loss') return false;
      }

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesProduct = log.productName.toLowerCase().includes(term);
        const matchesReason = (log.reason || '').toLowerCase().includes(term);
        if (!matchesProduct && !matchesReason) return false;
      }

      if (selectedCashier !== 'all' && log.recordedBy !== selectedCashier) {
        return false;
      }

      return true;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [stockLogs, startDate, endDate, movementType, searchTerm, selectedCashier]);

  // Aggregated KPIs
  const stats = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    let totalSalesUnits = 0;
    let totalLosses = 0;

    filteredLogs.forEach(l => {
      if (l.type === 'in') totalIn += l.quantity;
      else if (l.type === 'sale') totalSalesUnits += l.quantity;
      else if (l.type === 'spill_loss') totalLosses += l.quantity;
      else totalOut += l.quantity;
    });

    const netStockDelta = totalIn - (totalOut + totalSalesUnits + totalLosses);

    return { totalIn, totalOut, totalSalesUnits, totalLosses, netStockDelta };
  }, [filteredLogs]);

  // CSV Export
  const exportCSV = () => {
    const headers = ['Date', 'Produit', 'Type_Mouvement', 'Quantite', 'Stock_Precedent', 'Nouveau_Stock', 'Motif'];
    const rows = filteredLogs.map(l => [
      l.timestamp,
      `"${l.productName.replace(/"/g, '""')}"`,
      l.type,
      l.quantity,
      l.previousStock,
      l.newStock,
      `"${(l.reason || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Historique_Stock_${barName}_${startDate.toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fadeIn overflow-y-auto overscroll-contain">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full max-h-[92dvh] shadow-2xl flex flex-col text-slate-900 overflow-hidden my-auto">
        
        {/* Header */}
        <div className="shrink-0 p-3.5 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
              <History className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base md:text-lg font-black text-white truncate">Journal d'Audit & Historique des Stocks</h3>
                <span className="bg-amber-400/20 text-amber-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-amber-400/30 shrink-0">
                  {filteredLogs.length} mouvement(s)
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-300 truncate hidden xs:block">
                Consultez l'historique complet de vos entrées, sorties, ventes et ajustements dans le temps.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={exportCSV}
              className="px-2.5 sm:px-3 py-1.5 bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-bold rounded-xl flex items-center space-x-1 sm:space-x-1.5 transition cursor-pointer border border-white/10"
              title="Exporter les mouvements en CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-300" />
              <span className="hidden sm:inline">CSV</span>
            </button>

            {onOpenReport && (
              <button
                onClick={() => {
                  onClose();
                  onOpenReport('inventory_perpetual');
                }}
                className="px-2.5 sm:px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl flex items-center space-x-1 sm:space-x-1.5 transition cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Rapport</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-full transition cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="shrink-0 p-3 sm:p-4 bg-slate-50 border-b border-slate-200 space-y-2.5">
          
          {/* Period selector */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'today', label: "Aujourd'hui" },
              { id: '7days', label: '7 Jours' },
              { id: 'month', label: 'Ce Mois' },
              { id: 'last_month', label: 'Mois Précédent' },
              { id: 'quarter', label: 'Ce Trimestre' },
              { id: 'year', label: 'Cette Année' },
              { id: 'all_time', label: 'Historique Complet' },
              { id: 'custom', label: 'Période Libre' },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id as PeriodFilter)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  period === p.id
                    ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom Date Inputs */}
          {period === 'custom' && (
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-200">
              <div className="flex items-center space-x-2">
                <label className="text-xs font-bold text-slate-600">Date Début :</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-white border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-xs font-bold text-slate-600">Date Fin :</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-white border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          )}

          {/* Search, Movement Type and Cashier Filter */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pt-1">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Rechercher par article ou motif..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {availableCashiers.length > 0 && (
                <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs shrink-0 shadow-2xs">
                  <User className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="font-bold text-slate-500 whitespace-nowrap hidden sm:inline">Membre :</span>
                  <select
                    value={selectedCashier}
                    onChange={(e) => setSelectedCashier(e.target.value)}
                    className="bg-transparent font-black text-slate-800 focus:outline-none cursor-pointer text-xs max-w-[130px] truncate"
                  >
                    <option value="all">Tous ({availableCashiers.length})</option>
                    {availableCashiers.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0 shrink-0">
              {[
                { id: 'all', label: 'Tous' },
                { id: 'in', label: 'Entrées (+)' },
                { id: 'sale', label: 'Ventes (-)' },
                { id: 'out', label: 'Ajustements (-)' },
                { id: 'spill_loss', label: 'Pertes / Casses' },
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => setMovementType(m.id as MovementTypeFilter)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                    movementType === m.id
                      ? 'bg-slate-900 text-white font-black'
                      : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Period Summary Mini Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div className="bg-emerald-50 border border-emerald-200/60 rounded-xl p-2 text-center">
              <span className="text-[10px] font-bold text-emerald-800 uppercase block">Total Entrées</span>
              <span className="text-sm font-black text-emerald-700">+{stats.totalIn}</span>
            </div>
            <div className="bg-blue-50 border border-blue-200/60 rounded-xl p-2 text-center">
              <span className="text-[10px] font-bold text-blue-800 uppercase block">Ventes Caisse</span>
              <span className="text-sm font-black text-blue-700">-{stats.totalSalesUnits}</span>
            </div>
            <div className="bg-red-50 border border-red-200/60 rounded-xl p-2 text-center">
              <span className="text-[10px] font-bold text-red-800 uppercase block">Pertes & Casses</span>
              <span className="text-sm font-black text-red-700">-{stats.totalLosses}</span>
            </div>
            <div className="bg-slate-100 border border-slate-200 rounded-xl p-2 text-center">
              <span className="text-[10px] font-bold text-slate-600 uppercase block">Variation Nette</span>
              <span className={`text-sm font-black ${stats.netStockDelta >= 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                {stats.netStockDelta > 0 ? `+${stats.netStockDelta}` : stats.netStockDelta}
              </span>
            </div>
          </div>

        </div>

        {/* Logs Table / List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <Package className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-600">Aucun mouvement de stock pour la période sélectionnée.</p>
              <p className="text-[11px] text-slate-400">Modifiez la période ou effacez le filtre de recherche pour afficher plus de données.</p>
            </div>
          ) : (
            filteredLogs.map(log => {
              const isPositive = log.type === 'in';
              const isSpill = log.type === 'spill_loss';
              const isSale = log.type === 'sale';

              return (
                <div
                  key={log.id}
                  className="bg-white hover:bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs flex items-center justify-between gap-3 transition"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isPositive 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : isSpill 
                        ? 'bg-rose-100 text-rose-700' 
                        : isSale
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {isPositive ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : isSpill ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-extrabold text-slate-900 truncate">{log.productName}</p>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                          isPositive 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : isSpill 
                            ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                            : isSale
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {isPositive ? 'Réception / Entrée' : isSpill ? 'Perte / Casse' : isSale ? 'Vente Caisse' : 'Sortie / Ajustement'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-slate-700">{log.reason || 'Mouvement standard'}</span>
                        <span>•</span>
                        <span>{new Date(log.timestamp).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</span>
                        {log.recordedBy && (
                          <>
                            <span>•</span>
                            <span className="text-slate-700 font-bold bg-slate-100 px-1.5 py-0.2 rounded">
                              Par: {log.recordedBy}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className={`font-black text-base ${
                      isPositive ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {isPositive ? `+${log.quantity}` : `-${log.quantity}`}
                    </span>
                    <div className="text-[10px] font-semibold text-slate-500 mt-0.5 bg-slate-100 px-2 py-0.5 rounded-md">
                      Avant: <span className="font-bold text-slate-700">{log.previousStock}</span> → Après: <span className="font-black text-slate-900">{log.newStock}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span>{periodLabel}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition cursor-pointer"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
};
