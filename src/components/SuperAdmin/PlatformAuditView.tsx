import React, { useState } from 'react';
import { useBar } from '../../context/BarContext';
import {
  History,
  Search,
  Filter,
  Download,
  Calendar,
  Building2,
  ShieldAlert,
  UserCheck,
  UserX,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';

export const PlatformAuditView: React.FC = () => {
  const { auditLogs } = useBar();

  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch =
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesAction = actionFilter === 'all' || log.action === actionFilter;

    return matchesSearch && matchesAction;
  });

  const exportAuditCSV = () => {
    const headers = ['Date', 'Action', 'Détails', 'Auteur', 'Email'];
    const rows = filteredLogs.map(l => [
      new Date(l.timestamp).toLocaleString('fr-FR'),
      l.action,
      `"${l.details.replace(/"/g, '""')}"`,
      l.userName,
      l.userEmail,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BarExpress_Audit_Global_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-amber-600" />
            Journal d'Audit Global & Événements Système
          </h3>
          <p className="text-xs text-slate-500">
            Traçabilité immuable des créations, suppressions, suspensions et opérations d'administration
          </p>
        </div>

        <button
          onClick={exportAuditCSV}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 shadow-2xs transition cursor-pointer self-start sm:self-auto"
        >
          <Download className="w-4 h-4 text-slate-500" />
          <span>Exporter l'Audit (CSV)</span>
        </button>
      </div>

      {/* Audit Table Card */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
        {/* Filter bar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher dans les événements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">Toutes les actions ({auditLogs.length})</option>
              <option value="company_created">Création d'entreprise</option>
              <option value="company_deleted">Suppression d'entreprise</option>
              <option value="company_suspended">Suspension d'entreprise</option>
              <option value="company_reactivated">Réactivation d'entreprise</option>
              <option value="user_approved">Approbation utilisateur</option>
              <option value="user_rejected">Rejet utilisateur</option>
              <option value="settings_updated">Mise à jour paramètres</option>
            </select>
          </div>
        </div>

        {/* List */}
        <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <AlertCircle className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-bold text-slate-600">Aucun événement d'audit trouvé</p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const isCompanyAction = log.action.startsWith('company_');
              const isDanger = log.action.includes('delete') || log.action.includes('suspend') || log.action.includes('reject');

              return (
                <div key={log.id} className="p-4 hover:bg-slate-50/70 transition flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                        isDanger
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : isCompanyAction
                          ? 'bg-amber-100 text-amber-900 border border-amber-200'
                          : 'bg-slate-100 text-slate-800 border border-slate-200'
                      }`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>

                      <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(log.timestamp).toLocaleString('fr-FR')}
                      </span>
                    </div>

                    <p className="text-xs font-bold text-slate-800 pt-0.5">
                      {log.details}
                    </p>

                    <p className="text-[10px] text-slate-500">
                      Auteur : <strong className="text-slate-700">{log.userName}</strong> ({log.userEmail || 'Système'})
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
