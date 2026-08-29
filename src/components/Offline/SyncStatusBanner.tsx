import React, { useState, useEffect } from 'react';
import { useBar } from '../../context/BarContext';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Database, 
  CheckCircle, 
  AlertCircle, 
  X, 
  ShieldCheck, 
  Download, 
  HardDrive,
  Sparkles
} from 'lucide-react';
import { PwaInstallModal } from './PwaInstallModal';
import { getDetailedStorageStats, enableHighCapacity3GBStorage, StorageStats } from '../../utils/storageQuota';

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
  const [isPwaModalOpen, setIsPwaModalOpen] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [isActivating3GB, setIsActivating3GB] = useState(false);

  useEffect(() => {
    if (isModalOpen) {
      getDetailedStorageStats().then(setStorageStats);
    }
  }, [isModalOpen]);

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
    getDetailedStorageStats().then(setStorageStats);
  };

  const handleEnable3GBStorage = async () => {
    setIsActivating3GB(true);
    try {
      const res = await enableHighCapacity3GBStorage();
      setStorageStats(res.stats);
      setSyncFeedback(res.message);
    } catch (e: any) {
      setSyncFeedback(e?.message || 'Erreur lors de la réservation du stockage 3 Go');
    } finally {
      setIsActivating3GB(false);
    }
  };

  const formattedLastSync = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Jamais';

  return (
    <>
      {/* Standalone Wireless & Offline Status Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="relative p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition shrink-0 cursor-pointer flex items-center justify-center"
        title={isConnected 
          ? (pendingSalesCount > 0 ? `En ligne (${pendingSalesCount} vente(s) à synchroniser)` : 'En ligne & synchronisé (Coffre 3 Go actif)') 
          : 'Mode Hors-Ligne (Stock et caisse 100% actifs sans Internet)'
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

      {/* Sync & Offline 3GB Details Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 text-slate-900 relative max-h-[92vh] flex flex-col overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">
                    Mode Hors-Ligne & Coffre 3 Go
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Gestion autonome, synchronisation et stockage local sécurisé.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full transition cursor-pointer"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Network Status Card */}
            <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
              isConnected
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : 'bg-amber-50 border-amber-200 text-amber-950'
            }`}>
              <div className="flex items-center space-x-3">
                {isConnected ? (
                  <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
                )}
                <div>
                  <p className="font-bold text-xs sm:text-sm">
                    {isConnected ? 'Connecté au serveur en ligne' : 'Mode Hors-Ligne Actif (100% Fonctionnel)'}
                  </p>
                  <p className="text-[11px] opacity-80 leading-snug">
                    {isConnected
                      ? 'Les ventes sont enregistrées localement et synchronisées en direct.'
                      : 'Les encaissements et déstockages sont stockés dans le coffre local 3 Go.'}
                  </p>
                </div>
              </div>
            </div>

            {/* PWA Download Banner Prompt */}
            <div className="p-3.5 bg-gradient-to-r from-slate-900 to-slate-950 text-white rounded-2xl border border-slate-800 flex items-center justify-between gap-3 shadow-md">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-amber-400 font-black text-xs">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Installer l'application BarExp</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Téléchargeable sur PC, Mac, Android et iPhone pour un accès hors-ligne instantané.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setIsPwaModalOpen(true);
                }}
                className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition cursor-pointer shrink-0 flex items-center gap-1.5 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Installer</span>
              </button>
            </div>

            {/* 3GB Local Storage Quota Widget */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 font-bold text-slate-800">
                  <HardDrive className="w-4 h-4 text-amber-600" />
                  <span>Capacité du Stockage Local (3 Go)</span>
                </div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                  storageStats?.isPersisted
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-200 text-slate-800'
                }`}>
                  {storageStats?.isPersisted ? 'Persistance Non-Volatile Active' : 'Cache Local Actif'}
                </span>
              </div>

              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(2, storageStats?.usagePercentOf3GB || 1)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Espace utilisé : <b className="text-slate-900">{storageStats?.usedFormatted || '0 Mo'}</b></span>
                <span>Quota max alloué : <b className="text-amber-700">3.0 Go</b></span>
              </div>

              {!storageStats?.isPersisted && (
                <button
                  onClick={handleEnable3GBStorage}
                  disabled={isActivating3GB}
                  className="w-full mt-1 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-900 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{isActivating3GB ? 'Vérification...' : 'Garantir la réservation du stockage 3 Go'}</span>
                </button>
              )}
            </div>

            {/* Queue Counter & Last Sync Info */}
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-500 block mb-1">Ventes en attente:</span>
                <span className="text-base font-black text-amber-600">
                  {pendingSalesCount} vente(s)
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-500 block mb-1">Dernière synchro:</span>
                <span className="text-xs font-bold text-slate-800">
                  {formattedLastSync}
                </span>
              </div>
            </div>

            {/* Feedback alert */}
            {syncFeedback && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-950 rounded-xl text-xs font-medium">
                {syncFeedback}
              </div>
            )}

            {/* Pending items list */}
            {pendingSalesCount > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  File d'attente hors-ligne :
                </p>
                <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
                  {offlineQueue
                    .filter(item => item.type === 'sale' && item.saleData)
                    .map(item => (
                      <div
                        key={item.id}
                        className="bg-slate-50 p-2 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
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
            <div className="pt-1 flex items-center space-x-2">
              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center justify-center space-x-2 transition cursor-pointer"
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
                  className="px-3 py-3 bg-slate-100 hover:bg-slate-200 text-red-600 font-bold text-xs rounded-xl border border-slate-200 transition cursor-pointer"
                  title="Vider la file hors-ligne"
                >
                  Purger
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* PWA Install Modal */}
      {isPwaModalOpen && (
        <PwaInstallModal
          isOpen={isPwaModalOpen}
          onClose={() => setIsPwaModalOpen(false)}
        />
      )}
    </>
  );
};
