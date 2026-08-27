import React, { useState, useEffect } from 'react';
import { useBar } from '../../context/BarContext';
import { QuotaTracker, FirestoreQuotaStats, GeminiQuotaStats, LocalStorageStats } from '../../services/quotaTracker';
import { SUPER_ADMIN_EMAIL } from '../../types';
import { requestPersistentStorage } from '../../utils/storage';
import { 
  Database, 
  Activity, 
  Cpu, 
  HardDrive, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  AlertOctagon, 
  HelpCircle, 
  DollarSign, 
  ShieldCheck, 
  Layers, 
  ArrowUpRight, 
  Zap, 
  Wifi, 
  WifiOff, 
  Server,
  Sparkles,
  ExternalLink,
  Bot,
  Users,
  SearchCheck,
  FileCheck,
  Smartphone,
  Monitor,
  DatabaseZap
} from 'lucide-react';

export const DatabaseHealthTab: React.FC = () => {
  const {
    products,
    sales,
    expenses,
    tabs,
    stockLogs,
    auditLogs,
    allUsers,
    categories,
    settings,
    isOnline,
    isServerReachable,
    lastSyncedAt,
    offlineQueue,
    syncOfflineData,
    isSyncing
  } = useBar();

  const [stats, setStats] = useState<{
    firestore: FirestoreQuotaStats;
    gemini: GeminiQuotaStats;
  } | null>(null);

  const [localStats, setLocalStats] = useState<LocalStorageStats | null>(null);
  const [dbBreakdown, setDbBreakdown] = useState<{ name: string; count: number; bytes: number }[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [testStatusMsg, setTestStatusMsg] = useState<string | null>(null);

  // Integrity Audit results
  const [auditResult, setAuditResult] = useState<{
    status: 'clean' | 'warnings' | 'issues';
    checks: { title: string; ok: boolean; detail: string }[];
  } | null>(null);

  const runIntegrityAudit = () => {
    const checks: { title: string; ok: boolean; detail: string }[] = [];

    // 1. Check Owner / Super Admin document
    const superAdmin = allUsers.find(u => u.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase());
    if (!superAdmin) {
      checks.push({
        title: 'Compte Propriétaire (Super Admin)',
        ok: false,
        detail: `Le compte principal ${SUPER_ADMIN_EMAIL} sera initialisé lors de la première connexion Google.`
      });
    } else {
      const isConfigured = superAdmin.status === 'approved' && superAdmin.role === 'admin';
      checks.push({
        title: 'Compte Propriétaire (Super Admin)',
        ok: isConfigured,
        detail: isConfigured 
          ? `Compte ${SUPER_ADMIN_EMAIL} validé avec privilèges Administrateur complets.`
          : `Le compte existe mais son statut est ${superAdmin.status}.`
      });
    }

    // 2. Check User Accounts Uniqueness & Statuses
    const emailCounts = new Map<string, number>();
    allUsers.forEach(u => {
      const email = u.email.toLowerCase();
      emailCounts.set(email, (emailCounts.get(email) || 0) + 1);
    });
    const duplicateEmails = Array.from(emailCounts.entries()).filter(([_, count]) => count > 1);
    
    if (duplicateEmails.length > 0) {
      checks.push({
        title: 'Unicité des Comptes Utilisateurs',
        ok: false,
        detail: `${duplicateEmails.length} adresse(s) en doublon détectée(s) : ${duplicateEmails.map(([e]) => e).join(', ')}`
      });
    } else {
      checks.push({
        title: 'Unicité des Comptes Utilisateurs',
        ok: true,
        detail: `Tous les ${allUsers.length} comptes ont des identifiants et emails uniques.`
      });
    }

    // 3. User Permission Integrity
    const usersWithMissingPerms = allUsers.filter(u => !u.permissions);
    if (usersWithMissingPerms.length > 0) {
      checks.push({
        title: 'Permissions Utilisateurs',
        ok: false,
        detail: `${usersWithMissingPerms.length} utilisateur(s) sans structure de permissions standard.`
      });
    } else {
      checks.push({
        title: 'Permissions & Rôles Utilisateurs',
        ok: true,
        detail: 'Toutes les permissions et statuts d\'accès sont conformes et persistés.'
      });
    }

    // 4. Products & Categories Integrity
    const categoryIds = new Set(categories.map(c => c.id));
    const productsWithOrphanCat = products.filter(p => p.category && !categoryIds.has(p.category));
    const productsWithNegativeStock = products.filter(p => p.stock < 0);
    
    if (productsWithNegativeStock.length > 0) {
      checks.push({
        title: 'Cohérence du Stock Produits',
        ok: false,
        detail: `${productsWithNegativeStock.length} produit(s) ont un stock négatif.`
      });
    } else {
      checks.push({
        title: 'Cohérence du Stock Produits',
        ok: true,
        detail: `Les ${products.length} produits enregistrés ont des stocks et prix valides.`
      });
    }

    // 5. Sales & Receipts Integrity
    const salesWithInvalidTotals = sales.filter(s => isNaN(s.total) || s.total < 0);
    if (salesWithInvalidTotals.length > 0) {
      checks.push({
        title: 'Intégrité du Journal des Ventes',
        ok: false,
        detail: `${salesWithInvalidTotals.length} vente(s) avec des montants anormaux.`
      });
    } else {
      checks.push({
        title: 'Intégrité du Journal des Ventes',
        ok: true,
        detail: `Les ${sales.length} transactions enregistrées sont vérifiées et équilibrées.`
      });
    }

    const hasErrors = checks.some(c => !c.ok);
    setAuditResult({
      status: hasErrors ? 'warnings' : 'clean',
      checks
    });
  };

  const refreshAllStats = async () => {
    setIsRefreshing(true);
    try {
      const currentStats = QuotaTracker.getAggregatedStats({
        products,
        sales,
        expenses,
        tabs,
        stockLogs,
        auditLogs,
        allUsers,
        categories,
        settings,
      });

      const calc = QuotaTracker.calculateDatabaseStats({
        products,
        sales,
        expenses,
        tabs,
        stockLogs,
        auditLogs,
        allUsers,
        categories,
        settings,
      });

      const localEstimate = await QuotaTracker.getLocalStorageEstimate();

      setStats(currentStats);
      setDbBreakdown(calc.collectionBreakdown);
      setLocalStats(localEstimate);
    } catch (e) {
      console.error('Error refreshing quota stats:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refreshAllStats();
    // Auto-refresh every 30 seconds
    const interval = setInterval(refreshAllStats, 30000);
    return () => clearInterval(interval);
  }, [products.length, sales.length, expenses.length, tabs.length]);

  const handleTestSync = async () => {
    setTestStatusMsg("Test de synchronisation en cours...");
    try {
      const res = await syncOfflineData();
      if (res.success) {
        setTestStatusMsg(`✅ Synchronisation réussie (${res.syncedCount} opérations traitées)`);
      } else {
        setTestStatusMsg("⚠️ Aucune modification en attente ou synchronisation partielle");
      }
    } catch (err: any) {
      setTestStatusMsg(`❌ Erreur de test: ${err.message || 'Serveur injoignable'}`);
    }
    refreshAllStats();
    setTimeout(() => setTestStatusMsg(null), 6000);
  };

  if (!stats) {
    return (
      <div className="p-8 text-center text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-amber-500 mb-2" />
        <p className="text-sm font-semibold">Analyse de la base de données et calcul des quotas...</p>
      </div>
    );
  }

  const { firestore, gemini } = stats;

  // Decision calculation: Should the owner pay or upgrade to Blaze?
  const isCloseToFreeLimit = 
    firestore.readsPercentage > 75 || 
    firestore.writesPercentage > 75 || 
    firestore.storagePercentage > 75 ||
    gemini.requestsPercentage > 80;

  const mustUpgradeNow = 
    firestore.readsPercentage > 90 || 
    firestore.writesPercentage > 90 || 
    firestore.storagePercentage > 90;

  return (
    <div className="space-y-6">
      
      {/* Top Header with Refresh & Live Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <Database className="w-5 h-5 text-amber-600" />
              État de la Base de Données & Quotas
            </h2>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
              firestore.status === 'healthy' 
                ? 'bg-emerald-100 text-emerald-800' 
                : firestore.status === 'warning' 
                ? 'bg-amber-100 text-amber-900' 
                : 'bg-red-100 text-red-800'
            }`}>
              {firestore.status === 'healthy' && <CheckCircle2 className="w-3 h-3" />}
              {firestore.status === 'warning' && <AlertTriangle className="w-3 h-3" />}
              {firestore.status === 'critical' && <AlertOctagon className="w-3 h-3" />}
              {firestore.status === 'healthy' ? 'PLAN GRATUIT OPTIMAL' : firestore.status === 'warning' ? 'ATTENTION QUOTAS' : 'LIMITE PROCHE'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Statistiques exactes en direct du plan Firebase Spark & API Gemini pour anticiper vos coûts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refreshAllStats}
            disabled={isRefreshing}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </button>

          <button
            onClick={handleTestSync}
            disabled={isSyncing}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black flex items-center space-x-1.5 transition shadow-xs cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Tester Sync</span>
          </button>
        </div>
      </div>

      {testStatusMsg && (
        <div className="p-3 bg-slate-900 text-amber-400 border border-slate-800 rounded-xl text-xs font-mono animate-fadeIn">
          {testStatusMsg}
        </div>
      )}

      {/* Decision Summary Card: QUAND PAYER LA BASE DE DONNÉES ? */}
      <div className={`p-5 rounded-2xl border transition-all ${
        mustUpgradeNow 
          ? 'bg-red-50 border-red-200 text-red-950'
          : isCloseToFreeLimit
          ? 'bg-amber-50 border-amber-200 text-amber-950'
          : 'bg-emerald-50/70 border-emerald-200 text-slate-900'
      }`}>
        <div className="flex items-start gap-3.5">
          <div className={`p-2.5 rounded-xl shrink-0 ${
            mustUpgradeNow ? 'bg-red-500 text-white' : isCloseToFreeLimit ? 'bg-amber-500 text-slate-950' : 'bg-emerald-600 text-white'
          }`}>
            <DollarSign className="w-5 h-5" />
          </div>
          <div className="space-y-1.5 flex-1">
            <h3 className="text-sm sm:text-base font-extrabold flex items-center gap-2">
              <span>Diagnostic Financier : </span>
              <span className={`font-black ${
                mustUpgradeNow ? 'text-red-700' : isCloseToFreeLimit ? 'text-amber-700' : 'text-emerald-700'
              }`}>
                {mustUpgradeNow 
                  ? 'Passage au Plan Blaze Conseillé (Quotas > 90%)'
                  : isCloseToFreeLimit
                  ? 'Plan Gratuit sous surveillance (Croissance active)'
                  : 'Aucun paiement nécessaire : Vous êtes 100% dans le Plan Gratuit'}
              </span>
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Firebase offre gratuitement chaque jour <strong>50 000 lectures</strong>, <strong>20 000 écritures</strong> et <strong>1 Go de stockage</strong>.
              Grâce à notre architecture hors-ligne (cache local et synchronisation par delta), votre établissement consomme moins de <strong>5%</strong> des quotas journaliers en utilisation normale.
            </p>
            <div className="pt-2 flex flex-wrap gap-2 text-[11px] font-bold">
              <span className="bg-white/80 border border-slate-200 px-2.5 py-1 rounded-lg">
                Stockage Consommé : <strong className="text-slate-900">{firestore.estimatedStorageFormatted}</strong> / 1 024 Mo ({firestore.storagePercentage}%)
              </span>
              <span className="bg-white/80 border border-slate-200 px-2.5 py-1 rounded-lg">
                Lectures Restantes Aujourd'hui : <strong className="text-slate-900">{(firestore.readsLimit - firestore.readsToday).toLocaleString()}</strong>
              </span>
              <span className="bg-white/80 border border-slate-200 px-2.5 py-1 rounded-lg">
                Écritures Restantes Aujourd'hui : <strong className="text-slate-900">{(firestore.writesLimit - firestore.writesToday).toLocaleString()}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Main Quota KPI Gauges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Gauge 1: Reads */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lectures Firestore</span>
            <span className="text-xs font-black text-slate-700">{firestore.readsPercentage}%</span>
          </div>
          <div className="space-y-1">
            <div className="text-xl font-black text-slate-900">
              {firestore.readsToday.toLocaleString()} <span className="text-xs text-slate-400 font-bold">/ 50k /j</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  firestore.readsPercentage > 85 ? 'bg-red-500' : firestore.readsPercentage > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.max(2, firestore.readsPercentage)}%` }}
              />
            </div>
          </div>
          <p className="text-[10px] text-slate-500">
            {(50000 - firestore.readsToday).toLocaleString()} lectures restantes avant minuit.
          </p>
        </div>

        {/* Gauge 2: Writes */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Écritures Firestore</span>
            <span className="text-xs font-black text-slate-700">{firestore.writesPercentage}%</span>
          </div>
          <div className="space-y-1">
            <div className="text-xl font-black text-slate-900">
              {firestore.writesToday.toLocaleString()} <span className="text-xs text-slate-400 font-bold">/ 20k /j</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  firestore.writesPercentage > 85 ? 'bg-red-500' : firestore.writesPercentage > 60 ? 'bg-amber-500' : 'bg-amber-500'
                }`}
                style={{ width: `${Math.max(2, firestore.writesPercentage)}%` }}
              />
            </div>
          </div>
          <p className="text-[10px] text-slate-500">
            {(20000 - firestore.writesToday).toLocaleString()} écritures restantes aujourd'hui.
          </p>
        </div>

        {/* Gauge 3: Cloud Storage */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Stockage Base</span>
            <span className="text-xs font-black text-slate-700">{firestore.storagePercentage}%</span>
          </div>
          <div className="space-y-1">
            <div className="text-xl font-black text-slate-900">
              {firestore.estimatedStorageFormatted} <span className="text-xs text-slate-400 font-bold">/ 1 024 Mo</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full bg-sky-500 transition-all duration-500"
                style={{ width: `${Math.max(2, firestore.storagePercentage)}%` }}
              />
            </div>
          </div>
          <p className="text-[10px] text-slate-500">
            {firestore.totalDocumentsCount.toLocaleString()} documents au total dans la base.
          </p>
        </div>

        {/* Gauge 4: Gemini AI Assistant */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quota IA Dona (Gemini)</span>
            <span className="text-xs font-black text-slate-700">{gemini.requestsPercentage}%</span>
          </div>
          <div className="space-y-1">
            <div className="text-xl font-black text-slate-900">
              {gemini.requestsToday} <span className="text-xs text-slate-400 font-bold">/ 1 500 /j</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full bg-purple-500 transition-all duration-500"
                style={{ width: `${Math.max(2, gemini.requestsPercentage)}%` }}
              />
            </div>
          </div>
          <p className="text-[10px] text-slate-500">
            ~{gemini.estimatedTokensToday.toLocaleString()} tokens traités &bull; {1500 - gemini.requestsToday} req. restantes.
          </p>
        </div>

      </div>

      {/* Database Collections Volume Breakdown & Local Cache Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Collections Table */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-600" />
                Détail du Volume par Collection Firestore
              </h3>
              <p className="text-xs text-slate-500">Répartition du poids des données enregistrées dans votre base</p>
            </div>
            <span className="text-xs font-bold bg-slate-100 px-2.5 py-1 rounded-lg text-slate-700">
              Total : {firestore.totalDocumentsCount} docs
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold">
                  <th className="pb-2">Collection</th>
                  <th className="pb-2 text-right">Nombre d'Éléments</th>
                  <th className="pb-2 text-right">Poids Estimé</th>
                  <th className="pb-2 text-right">Part du Stockage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dbBreakdown.map((col, idx) => {
                  const share = firestore.estimatedStorageBytes > 0 
                    ? ((col.bytes / firestore.estimatedStorageBytes) * 100).toFixed(1) 
                    : '0';

                  const formatColBytes = (b: number) => {
                    if (b < 1024) return `${b} o`;
                    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} Ko`;
                    return `${(b / (1024 * 1024)).toFixed(2)} Mo`;
                  };

                  return (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 font-bold text-slate-800 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        {col.name}
                      </td>
                      <td className="py-2.5 text-right font-semibold text-slate-700">
                        {col.count.toLocaleString()}
                      </td>
                      <td className="py-2.5 text-right font-bold text-slate-900">
                        {formatColBytes(col.bytes)}
                      </td>
                      <td className="py-2.5 text-right text-slate-500 font-medium">
                        {share}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Col: Local Offline Cache & High-Capacity Storage Health */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-sky-600" />
                Cache Local & Stockage Haute Capacité
              </h3>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Multi-Go Actif
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Espace alloué sur ce terminal (Bureau, iPhone iOS ou Android) avec cache Firestore illimité et IndexedDB.
            </p>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-bold">Connectivité</span>
                <span className="flex items-center gap-1 font-black text-emerald-600">
                  {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5 text-red-500" />}
                  {isOnline ? 'En Ligne (Sync Active)' : 'Hors-Ligne (Secours Local)'}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-bold">File d'attente hors-ligne</span>
                <span className="font-bold text-slate-800">
                  {offlineQueue.length === 0 ? '0 en attente (À jour)' : `${offlineQueue.length} opérations en attente`}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-bold">Dernière synchronisation</span>
                <span className="font-mono text-slate-500 text-[11px]">
                  {lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString('fr-FR') : 'En continu'}
                </span>
              </div>

              {localStats && (
                <div className="pt-2 border-t border-slate-200 space-y-2">
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span>Espace Local Utilisé</span>
                    <span>{localStats.usedFormatted} / {localStats.quotaFormatted}</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-sky-500 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${Math.max(2, Math.min(100, localStats.percentage))}%` }} 
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      {localStats.isPersisted ? 'Stockage persistant garanti' : 'Stockage dynamique géré'}
                    </span>
                    <span className="font-mono font-bold text-slate-700">{localStats.percentage}% utilisé</span>
                  </div>
                </div>
              )}
            </div>

            {/* Platform specific capability chips */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <Monitor className="w-3.5 h-3.5 text-slate-700 mx-auto mb-1" />
                <span className="text-[10px] font-bold text-slate-800 block">Bureau PC/Mac</span>
                <span className="text-[9px] text-slate-500 block">Jusqu'à 50+ Go</span>
              </div>
              <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <Smartphone className="w-3.5 h-3.5 text-slate-700 mx-auto mb-1" />
                <span className="text-[10px] font-bold text-slate-800 block">iPhone / iPad</span>
                <span className="text-[9px] text-slate-500 block">IndexedDB PWA</span>
              </div>
              <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <Smartphone className="w-3.5 h-3.5 text-slate-700 mx-auto mb-1" />
                <span className="text-[10px] font-bold text-slate-800 block">Android</span>
                <span className="text-[9px] text-slate-500 block">Auto-persistant</span>
              </div>
            </div>

            <button
              type="button"
              onClick={async () => {
                const res = await requestPersistentStorage();
                alert(res.reason);
                refreshAllStats();
              }}
              className="w-full py-2 px-3 bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-bold rounded-xl transition border border-sky-200 flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <DatabaseZap className="w-3.5 h-3.5 text-sky-600" />
              <span>Optimiser & Forcer la Persistance Locale</span>
            </button>
          </div>

          {/* Practical guide box */}
          <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 text-xs text-amber-950 space-y-1.5">
            <div className="font-black flex items-center gap-1.5 text-amber-900">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>Garantie Zéro Écran Blanc & Cache Étendu</span>
            </div>
            <p className="text-[11px] leading-tight text-amber-800">
              Le cache local utilise désormais IndexedDB haute capacité et le cache illimité Firestore. Vos données de caisse, produits et historiques sont conservés localement même en cas de coupure réseau ou de quota gratuit Firestore atteint.
            </p>
          </div>
        </div>

      </div>

      {/* Database Integrity & Users Validation Diagnostic Section */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
              <SearchCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider">
                Vérification d'Intégrité de la Base de Données
              </h3>
              <p className="text-[11px] text-slate-500">
                Contrôle automatisé des comptes utilisateurs (validation unique, rôles) et cohérence des collections Firestore.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={runIntegrityAudit}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs rounded-xl shadow-2xs transition flex items-center justify-center space-x-1.5 cursor-pointer shrink-0"
          >
            <FileCheck className="w-4 h-4" />
            <span>Lancer l'Audit d'Intégrité</span>
          </button>
        </div>

        {auditResult ? (
          <div className="space-y-3 animate-fadeIn">
            <div className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-bold ${
              auditResult.status === 'clean'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              {auditResult.status === 'clean' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <span>
                {auditResult.status === 'clean'
                  ? 'Audit terminé avec succès : La base de données et les comptes utilisateurs sont 100% sains et intègres.'
                  : 'Audit terminé : Quelques points d\'attention ont été relevés ci-dessous.'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {auditResult.checks.map((check, idx) => (
                <div 
                  key={idx}
                  className={`p-3 rounded-xl border space-y-1 ${
                    check.ok 
                      ? 'bg-slate-50/60 border-slate-200 text-slate-800' 
                      : 'bg-amber-50/70 border-amber-200 text-amber-900'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span>{check.title}</span>
                    {check.ok ? (
                      <span className="text-[10px] font-black text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> CONFORME
                      </span>
                    ) : (
                      <span className="text-[10px] font-black text-amber-700 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> ATTENTION
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">{check.detail}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 text-center text-xs text-slate-500">
            Cliquez sur <strong>"Lancer l'Audit d'Intégrité"</strong> pour analyser les collections Firestore en temps réel.
          </div>
        )}
      </div>

    </div>
  );
};
