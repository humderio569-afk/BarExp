import React, { useState } from 'react';
import { useBar } from '../../context/BarContext';
import { Wifi, WifiOff, RefreshCw, Database, CheckCircle, AlertCircle, X, ShieldCheck } from 'lucide-react';

export const SyncStatusBanner: React.FC = () => {
  const {
    isOnline,
    isServerReachable,
    offlineQueue,
    lastSyncedAt,
    isSyncing,
    syncOfflineData,
    clearOfflineQueue,
    settings,
  } = useBar();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const pendingSalesCount = offlineQueue.filter(item => item.type === 'sale').length;
  const isConnected = isOnline && isServerReachable;

  const handleManualSync = async () => {
    setSyncFeedback(null);
    const result = await syncOfflineData();
    if (result.success) {
      if (result.syncedCount > 0) {
        setSyncFeedback(`${result.syncedCount} vente(s) synchronisée(s) avec succès !`);
      } else {
        setSyncFeedback('Toutes les données sont déjà à jour.');
      }
    } else {
      setSyncFeedback('La connexion au serveur a échoué. Les données restent en sécurité localement.');
    }
  };

  const formattedLastSync = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Jamais';

  return (
    <>
      {/* Standalone Wireless / Sync Icon Button (Clean, compact, no parent widget card) */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="relative p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition shrink-0 cursor-pointer flex items-center justify-center"
        title={isConnected 
          ? (pendingSalesCount > 0 ? `En ligne (${pendingSalesCount} vente(s) à synchroniser)` : 'En ligne & synchronisé') 
          : 'Mode Hors-Ligne (Stock et caisse 100% actifs)'
        }
      >
        {isConnected ? (
          <Wifi className="w-4 h-4 text-emerald-600" />
        ) : (
          <WifiOff className="w-4 h-4 text-red-500 animate-pulse" />
        )}

        {pendingSalesCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-500 rounded-full ring-2 ring-white" />
        )}
      </button>

      {/* Sync Details Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 text-slate-900 relative">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center space-x-2">
                <Database className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-base text-slate-900">
                  Mise en Cache & Synchronisation
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Network Status Card */}
            <div className={`p-4 rounded-2xl border flex items-center justify-between ${
              isConnected
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}>
              <div className="flex items-center space-x-3">
                {isConnected ? (
                  <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-red-600 shrink-0" />
                )}
                <div>
                  <p className="font-bold text-sm">
                    {isConnected ? 'Connecté au réseau BarExpress' : 'Mode Hors-Ligne Actif'}
                  </p>
                  <p className="text-xs opacity-80">
                    {isConnected
                      ? 'Les ventes sont synchronisées instantanément.'
                      : 'Les commandes sont enregistrées localement dans votre navigateur (localStorage).'}
                  </p>
                </div>
              </div>
            </div>

            {/* Offline Safeguard Guarantee Notice */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1 text-slate-700">
              <div className="flex items-center space-x-1.5 text-amber-600 font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>Garantie Zéro Perte de Données</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Toutes vos encaissements et réapprovisionnements fonctionnent sans coupure. Une fois la connexion rétablies, le système synchronise automatiquement la file d'attente.
              </p>
            </div>

            {/* Queue Counter & Last Sync Info */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-500 block mb-1">Ventes en attente:</span>
                <span className="text-lg font-black text-amber-600">
                  {pendingSalesCount} vente(s)
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-500 block mb-1">Dernière synchro:</span>
                <span className="text-sm font-bold text-slate-800">
                  {formattedLastSync}
                </span>
              </div>
            </div>

            {/* Feedback alert */}
            {syncFeedback && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs font-semibold">
                {syncFeedback}
              </div>
            )}

            {/* Pending items list */}
            {pendingSalesCount > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  File d'attente hors-ligne :
                </p>
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {offlineQueue
                    .filter(item => item.type === 'sale' && item.saleData)
                    .map(item => (
                      <div
                        key={item.id}
                        className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-amber-600">{item.saleData?.receiptNumber}</span>
                          <span className="text-slate-500 ml-2">({item.saleData?.tableName})</span>
                        </div>
                        <span className="font-bold text-slate-900">
                          {item.saleData?.total.toLocaleString()} {settings.currency}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 flex items-center space-x-2">
              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center justify-center space-x-2 transition"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'SYNCHRONISATION...' : 'SYNCHRONISER MAINTENANT'}</span>
              </button>

              {pendingSalesCount > 0 && (
                <button
                  onClick={() => {
                    if (window.confirm("Effacer la file d'attente hors-ligne localement ?")) {
                      clearOfflineQueue();
                      setSyncFeedback("File d'attente réinitialisée.");
                    }
                  }}
                  className="px-3 py-3 bg-slate-100 hover:bg-slate-200 text-red-600 font-bold text-xs rounded-xl border border-slate-200 transition"
                  title="Vider la file hors-ligne"
                >
                  Purger
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
};
