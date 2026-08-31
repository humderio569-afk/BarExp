import React, { useState, useEffect } from 'react';
import { useBar } from '../../context/BarContext';
import { AppUser, UserRole, UserPermissions, SUPER_ADMIN_EMAIL } from '../../types';
import { ResetDataModal } from './ResetDataModal';
import { DatabaseHealthTab } from './DatabaseHealthTab';
import { CompanyManagementTab } from './CompanyManagementTab';
import { PreRegistrationTab } from './PreRegistrationTab';
import { SettingsModal } from '../Settings/SettingsModal';
import {
  ShieldCheck,
  UserCheck,
  UserX,
  UserPlus,
  UserCog,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Mail,
  ShieldAlert,
  Sliders,
  Check,
  Trash2,
  FileText,
  TrendingUp,
  FileDown,
  History,
  Settings as SettingsIcon,
  Archive,
  BarChart3,
  DollarSign,
  Download,
  Building2,
  Calendar,
  Search,
  Filter,
  ArrowRight,
  AlertCircle,
  Save,
  Upload,
  Image as ImageIcon,
  CheckCheck,
  Receipt,
  Phone,
  MapPin,
  HelpCircle,
  Bot,
  KeyRound,
  Eye,
  EyeOff,
  Radio,
  LogOut,
  Globe,
  Mic,
  MessageSquare,
  RefreshCw,
  Cpu,
  Lock,
  Unlock,
  Database,
  Laptop,
  Monitor,
  Briefcase
} from 'lucide-react';

type AdminTab = 'establishment' | 'staff_prereg' | 'users' | 'ai_config' | 'database_health' | 'audit' | 'data';

export const AdminPanel: React.FC = () => {
  const {
    currentUser,
    allUsers,
    approveUser,
    rejectUser,
    suspendUser,
    reactivateUser,
    addUserByEmail,
    updateUserPermissions,
    deleteUserAccount,
    isSuperAdmin,
    auditLogs,
    sales,
    expenses,
    products,
    settings,
    updateSettings,
    closePeriod,
    deleteSale,
    isAdmin,
    logout,
    activeCompany,
  } = useBar();

  const [activeTab, setActiveTab] = useState<AdminTab>('establishment');

  // --- Establishment Settings State ---
  const [barName, setBarName] = useState(settings.barName);
  const [tagline, setTagline] = useState(settings.tagline);
  const [address, setAddress] = useState(settings.address);
  const [phone, setPhone] = useState(settings.phone);
  const [currency, setCurrency] = useState(settings.currency);
  const [taxRate, setTaxRate] = useState(settings.taxRate || 0);
  const [nifCif, setNifCif] = useState(settings.nifCif || '');
  const [cashierName, setCashierName] = useState(settings.cashierName);
  const [logo, setLogo] = useState<string>(settings.logo || '');
  const [majorTransactionThreshold, setMajorTransactionThreshold] = useState<number>(settings.majorTransactionThreshold || 2500);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // --- AI Dona & API Settings State ---
  const [customGeminiApiKey, setCustomGeminiApiKey] = useState(settings.customGeminiApiKey || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [donaCustomInstructions, setDonaCustomInstructions] = useState(settings.donaCustomInstructions || '');
  const [enableDonaChat, setEnableDonaChat] = useState(settings.enableDonaChat !== false);
  const [enableDonaWebSearch, setEnableDonaWebSearch] = useState(settings.enableDonaWebSearch !== false);
  const [enableDonaVoice, setEnableDonaVoice] = useState(settings.enableDonaVoice !== false);
  const [donaAccessMode, setDonaAccessMode] = useState<'all' | 'admins_only' | 'custom'>(settings.donaAccessMode || 'all');
  const [aiSettingsSaved, setAiSettingsSaved] = useState(false);

  // AI Connection Test state
  const [aiTestStatus, setAiTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [aiTestResult, setAiTestResult] = useState<{
    model?: string;
    latencyMs?: number;
    reply?: string;
    error?: string;
    isCustomKey?: boolean;
  } | null>(null);

  // Sync state if settings change from another session
  useEffect(() => {
    setBarName(settings.barName);
    setTagline(settings.tagline);
    setAddress(settings.address);
    setPhone(settings.phone);
    setCurrency(settings.currency);
    setTaxRate(settings.taxRate || 0);
    setNifCif(settings.nifCif || '');
    setCashierName(settings.cashierName);
    setLogo(settings.logo || '');
    setMajorTransactionThreshold(settings.majorTransactionThreshold || 2500);
    setCustomGeminiApiKey(settings.customGeminiApiKey || '');
    setDonaCustomInstructions(settings.donaCustomInstructions || '');
    setEnableDonaChat(settings.enableDonaChat !== false);
    setEnableDonaWebSearch(settings.enableDonaWebSearch !== false);
    setEnableDonaVoice(settings.enableDonaVoice !== false);
    setDonaAccessMode(settings.donaAccessMode || 'all');
  }, [settings]);

  const handleSaveEstablishment = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      barName: barName.trim(),
      tagline: tagline.trim(),
      address: address.trim(),
      phone: phone.trim(),
      currency: currency.trim(),
      taxRate: Number(taxRate) || 0,
      nifCif: nifCif.trim(),
      cashierName: cashierName.trim(),
      logo,
      majorTransactionThreshold: Number(majorTransactionThreshold) || 2500,
    });
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2500);
  };

  const handleSaveAiConfig = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      customGeminiApiKey: customGeminiApiKey.trim(),
      donaCustomInstructions: donaCustomInstructions.trim(),
      enableDonaChat,
      enableDonaWebSearch,
      enableDonaVoice,
      donaAccessMode
    });
    setAiSettingsSaved(true);
    setTimeout(() => setAiSettingsSaved(false), 2500);
  };

  const handleTestAiConnection = async () => {
    setAiTestStatus('testing');
    setAiTestResult(null);
    try {
      const res = await fetch('/api/chat/test-api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customApiKey: customGeminiApiKey.trim() })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Échec de communication avec le modèle IA Gemini.');
      }
      setAiTestStatus('success');
      setAiTestResult(data);
    } catch (err: any) {
      setAiTestStatus('error');
      setAiTestResult({ error: err.message || 'Impossible de joindre le service IA.' });
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("L'image sélectionnée est trop volumineuse. Veuillez choisir un fichier de moins de 2 Mo.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const base64 = event.target.result as string;
        setLogo(base64);
        updateSettings({ logo: base64 });
      }
    };
    reader.readAsDataURL(file);
  };

  // --- Users Management State ---
  const [userSubTab, setUserSubTab] = useState<'members' | 'pending' | 'suspended' | 'add'>('members');
  const [newEmail, setNewEmail] = useState('');
  const [newEmailRole, setNewEmailRole] = useState<UserRole>('employee');
  const [addingEmailLoading, setAddingEmailLoading] = useState(false);
  const [emailSuccessMsg, setEmailSuccessMsg] = useState<string | null>(null);

  // Edit Permissions Modal state
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editCustomRoleTitle, setEditCustomRoleTitle] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('employee');
  const [editPerms, setEditPerms] = useState<UserPermissions>({
    canAccessPOS: true,
    canAccessStock: true,
    canManageStock: false,
    canViewCostPrices: false,
    canAccessExpenses: false,
    canAccessReports: false,
    canAccessSettings: false,
    canAccessChat: true,
    canManageUsers: false,
  });

  const pendingUsers = allUsers.filter(u => u.status === 'pending');
  const approvedUsers = allUsers.filter(u => u.status === 'approved');
  const suspendedUsers = allUsers.filter(u => u.status === 'suspended');

  const handleApproveEmployee = async (uid: string) => {
    await approveUser(uid, 'employee', {
      canAccessPOS: true,
      canAccessStock: true,
      canManageStock: false,
      canViewCostPrices: false,
      canAccessExpenses: false,
      canAccessReports: false,
      canAccessSettings: false,
      canAccessChat: true,
      canManageUsers: false,
    });
  };

  const handleApproveAdmin = async (uid: string) => {
    await approveUser(uid, 'admin', {
      canAccessPOS: true,
      canAccessStock: true,
      canManageStock: true,
      canViewCostPrices: true,
      canAccessExpenses: true,
      canAccessReports: true,
      canAccessSettings: true,
      canAccessChat: true,
      canManageUsers: true,
    });
  };

  const handleReject = async (uid: string) => {
    if (confirm("Êtes-vous sûr de vouloir refuser cette demande d'accès ?")) {
      await rejectUser(uid);
    }
  };

  const handleSuspend = async (user: AppUser) => {
    if (user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
      alert("Le compte propriétaire ne peut pas être suspendu.");
      return;
    }
    if (confirm(`Voulez-vous vraiment suspendre temporairement l'accès de ${user.displayName} (${user.email}) ?`)) {
      await suspendUser(user.uid);
    }
  };

  const handleReactivate = async (user: AppUser) => {
    await reactivateUser(user.uid);
  };

  const handleAddByEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    setAddingEmailLoading(true);
    setEmailSuccessMsg(null);

    const defaultPerms: UserPermissions = newEmailRole === 'admin' ? {
      canAccessPOS: true,
      canAccessStock: true,
      canManageStock: true,
      canViewCostPrices: true,
      canAccessExpenses: true,
      canAccessReports: true,
      canAccessSettings: true,
      canAccessChat: true,
      canManageUsers: true,
    } : {
      canAccessPOS: true,
      canAccessStock: true,
      canManageStock: false,
      canViewCostPrices: false,
      canAccessExpenses: false,
      canAccessReports: false,
      canAccessSettings: false,
      canAccessChat: true,
      canManageUsers: false,
    };

    try {
      await addUserByEmail(newEmail.trim(), newEmailRole, defaultPerms);
      setEmailSuccessMsg(`L'utilisateur ${newEmail} a été pré-approuvé avec succès en tant que ${newEmailRole === 'admin' ? 'Administrateur' : 'Employé'}.`);
      setNewEmail('');
      setUserSubTab('members');
      setTimeout(() => setEmailSuccessMsg(null), 5000);
    } catch (err: any) {
      alert("Erreur lors de l'ajout de l'utilisateur : " + err.message);
    } finally {
      setAddingEmailLoading(false);
    }
  };

  const handleOpenEditUser = (user: AppUser) => {
    setEditingUser(user);
    setEditDisplayName(user.displayName || '');
    setEditCustomRoleTitle(user.customRoleTitle || '');
    setEditRole(user.role);
    setEditPerms(user.permissions || {
      canAccessPOS: true,
      canAccessStock: true,
      canManageStock: user.role === 'admin',
      canViewCostPrices: user.role === 'admin',
      canAccessExpenses: user.role === 'admin',
      canAccessReports: user.role === 'admin',
      canAccessSettings: user.role === 'admin',
      canAccessChat: true,
      canManageUsers: user.role === 'admin',
    });
  };

  const handleSavePermissions = async () => {
    if (!editingUser) return;
    await updateUserPermissions(
      editingUser.uid,
      editPerms,
      editRole,
      editDisplayName.trim() || editingUser.displayName,
      editCustomRoleTitle.trim() || undefined
    );
    setEditingUser(null);
  };

  const handleToggleUserAiAccess = async (user: AppUser) => {
    const currentPerms = user.permissions || {
      canAccessPOS: true,
      canAccessStock: true,
      canManageStock: false,
      canViewCostPrices: false,
      canAccessExpenses: false,
      canAccessReports: false,
      canAccessSettings: false,
      canAccessChat: true,
      canManageUsers: false,
    };
    const newChatPerm = !(currentPerms.canAccessChat !== false);
    await updateUserPermissions(
      user.uid,
      { ...currentPerms, canAccessChat: newChatPerm },
      user.role,
      user.displayName
    );
  };

  const handleDeleteUser = async (uid: string, email: string) => {
    if (email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
      alert("Le compte Propriétaire (Super Admin) ne peut pas être supprimé.");
      return;
    }
    if (confirm(`Confirmez-vous la suppression du compte de ${email} ?`)) {
      await deleteUserAccount(uid);
    }
  };

  // --- Profit & Margin Logic ---
  const totalSales = sales.reduce((sum, s) => sum + s.total, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  
  const totalCOGS = sales.reduce((sum, sale) => {
    return sum + sale.items.reduce((itemSum, item) => {
      const prod = products.find(p => p.id === item.product.id);
      const cost = prod?.costPrice || item.product.costPrice || 0;
      return itemSum + (cost * item.quantity);
    }, 0);
  }, 0);

  const grossMargin = totalSales - totalCOGS;
  const netProfit = totalSales - totalExpenses;
  const marginPercentage = totalSales > 0 ? (grossMargin / totalSales) * 100 : 0;

  const productProfitability = products.map(p => {
    const unitsSold = sales.reduce((sum, s) => {
      const match = s.items.find(i => i.product.id === p.id);
      return sum + (match?.quantity || 0);
    }, 0);
    const revenue = unitsSold * p.price;
    const cost = unitsSold * (p.costPrice || 0);
    const profit = revenue - cost;
    return { ...p, unitsSold, revenue, profit };
  }).sort((a, b) => b.profit - a.profit);

  // --- Audit Filter State ---
  const [auditFilter, setAuditFilter] = useState<string>('all');
  const [auditSearch, setAuditSearch] = useState<string>('');

  const filteredAuditLogs = auditLogs.filter(log => {
    if (auditFilter !== 'all' && !log.action.toLowerCase().includes(auditFilter.toLowerCase())) {
      return false;
    }
    if (auditSearch.trim()) {
      const q = auditSearch.toLowerCase();
      return (
        log.details.toLowerCase().includes(q) ||
        log.userName.toLowerCase().includes(q) ||
        log.userEmail.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // --- CSV Export Logic ---
  const exportToCSV = (type: 'sales' | 'expenses' | 'audit') => {
    let headers: string[] = [];
    let rows: any[] = [];
    let filename = "";

    if (type === 'sales') {
      headers = ['ID', 'Date', 'Recu', 'Serveur', 'Table', 'Total', 'Methode'];
      rows = sales.map(s => [s.id, s.timestamp, s.receiptNumber, s.cashierName, s.tableName || 'N/A', s.total, s.paymentMethod]);
      filename = `Ventes_${settings.barName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    } else if (type === 'expenses') {
      headers = ['ID', 'Date', 'Categorie', 'Description', 'Montant', 'Payeur', 'Methode'];
      rows = expenses.map(e => [e.id, e.date, e.category, e.description, e.amount, e.recordedBy, e.paymentMethod]);
      filename = `Depenses_${settings.barName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    } else {
      headers = ['ID', 'Date', 'Action', 'Utilisateur', 'Email', 'Details'];
      rows = auditLogs.map(a => [a.id, a.timestamp, a.action, a.userName, a.userEmail, a.details]);
      filename = `Audit_${settings.barName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    }

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map((cell: any) => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  if (!isAdmin && currentUser?.permissions?.canAccessSettings !== true) {
    return (
      <div className="p-8 text-center text-slate-500 max-w-md mx-auto my-12">
        <ShieldAlert className="w-12 h-12 text-amber-600 mx-auto mb-3" />
        <h2 className="text-base font-bold text-slate-900 mb-1">Accès réservé à la Direction</h2>
        <p className="text-xs">Ce panneau de configuration et de contrôle est strictement réservé aux administrateurs de l'établissement.</p>
      </div>
    );
  }

  const tabs: { id: AdminTab; label: string; icon: React.ReactNode; badge?: number; show?: boolean }[] = ([
    { id: 'establishment' as AdminTab, label: 'Secteur & Paramètres', icon: <SettingsIcon className="w-4 h-4" /> },
    { id: 'staff_prereg' as AdminTab, label: 'Pré-inscriptions & PIN', icon: <UserPlus className="w-4 h-4" /> },
    { id: 'users' as AdminTab, label: 'Personnel & Droits', icon: <Users className="w-4 h-4" />, badge: pendingUsers.length },
    { id: 'ai_config' as AdminTab, label: 'IA Dona & Accès API', icon: <Bot className="w-4 h-4" /> },
    { id: 'database_health' as AdminTab, label: 'Santé Base & Quotas', icon: <Database className="w-4 h-4" /> },
    { id: 'audit' as AdminTab, label: 'Journal d\'Audit', icon: <History className="w-4 h-4" /> },
    { id: 'data' as AdminTab, label: 'Données & Clôture', icon: <Archive className="w-4 h-4" /> },
  ] as { id: AdminTab; label: string; icon: React.ReactNode; badge?: number; show?: boolean }[]).filter(t => t.show !== false);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 animate-fadeIn pb-24 md:pb-8">
      
      {/* Profile & Direction Header Banner */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5 min-w-0">
          {currentUser?.photoURL ? (
            <img
              src={currentUser.photoURL}
              alt={currentUser.displayName}
              className="w-11 h-11 rounded-xl border border-slate-200 object-cover shrink-0"
            />
          ) : (
            <div className="w-11 h-11 rounded-xl bg-slate-900 text-amber-400 font-bold text-base flex items-center justify-center shrink-0">
              {currentUser?.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'A'}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                {currentUser?.displayName || 'Direction'}
              </h1>
              {currentUser?.role === 'admin' ? (
                <span className="bg-slate-100 text-slate-800 border border-slate-200 text-[10px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1 shrink-0">
                  <ShieldCheck className="w-3 h-3 text-slate-600" /> DIRECTION / ADMIN
                </span>
              ) : (
                <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-medium px-2 py-0.5 rounded-md inline-flex items-center gap-1 shrink-0">
                  EMPLOYÉ
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 truncate mt-0.5">
              {currentUser?.email} &bull; Établissement : <strong className="text-slate-700">{settings.barName}</strong>
              {settings.companyCode ? ` • Code : ${settings.companyCode}` : ''}
            </p>
          </div>
        </div>

        {/* Action button: Logout (spaced & with confirmation) */}
        <div className="flex items-center gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
          <button
            onClick={() => {
              if (confirm('Souhaitez-vous vous déconnecter de votre session ?')) {
                logout();
              }
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-700 rounded-lg text-xs font-semibold transition cursor-pointer border border-slate-200 hover:border-red-200"
            title="Se déconnecter de l'application"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span>Déconnexion</span>
          </button>
        </div>
      </div>

      {/* Clean Navigation Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center space-x-1.5 px-2 py-2 rounded-lg text-xs font-semibold transition cursor-pointer text-center relative ${
                isActive
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-white/80'
              }`}
            >
              <span className="shrink-0">{tab.icon}</span>
              <span className="truncate">{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold shrink-0 ml-0.5 ${
                  isActive ? 'bg-slate-950 text-amber-400' : 'bg-slate-900 text-white'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ================= TAB 1: PRE-REGISTRATIONS & PIN CODES ================= */}
      {activeTab === 'staff_prereg' && (
        <PreRegistrationTab />
      )}

      {/* ================= TAB 1: SECTEUR D'ACTIVITÉ & PARAMÈTRES ================= */}
      {activeTab === 'establishment' && (
        <SettingsModal />
      )}

      {/* ================= TAB 2: USERS & PERMISSIONS ================= */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          
          {/* Top Policy Bar - Unified state styles */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-semibold uppercase text-slate-400 block tracking-wider">Politique d'Accès</span>
              <p className="text-xs text-slate-800 mt-0.5">
                {settings.registrationMode === 'whitelist_only'
                  ? 'Mode Whitelist : Seules les adresses pré-inscrites peuvent se connecter.'
                  : 'Mode Approbation : Demandes soumises à la validation de la direction.'}
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => updateSettings({ registrationMode: 'approval_required' })}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                  settings.registrationMode !== 'whitelist_only'
                    ? 'bg-slate-900 text-white font-bold border-slate-900 shadow-2xs'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                }`}
              >
                Approbation Manuelle
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ registrationMode: 'whitelist_only' })}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                  settings.registrationMode === 'whitelist_only'
                    ? 'bg-slate-900 text-white font-bold border-slate-900 shadow-2xs'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                }`}
              >
                Whitelist Stricte
              </button>
            </div>
          </div>

          {/* Sub tabs: Members / Pending / Suspended / Add by email */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setUserSubTab('members')}
              className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition cursor-pointer text-center flex items-center justify-center space-x-1.5 ${
                userSubTab === 'members'
                  ? 'bg-slate-900 text-white font-bold shadow-2xs'
                  : 'bg-transparent text-slate-600 hover:bg-white hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Équipe Active ({approvedUsers.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setUserSubTab('pending')}
              className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition cursor-pointer text-center flex items-center justify-center space-x-1.5 ${
                userSubTab === 'pending'
                  ? 'bg-slate-900 text-white font-bold shadow-2xs'
                  : 'bg-transparent text-slate-600 hover:bg-white hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>En Attente</span>
              {pendingUsers.length > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-400 text-slate-950 text-[10px] font-bold rounded-full ml-1">
                  {pendingUsers.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setUserSubTab('suspended')}
              className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition cursor-pointer text-center flex items-center justify-center space-x-1.5 ${
                userSubTab === 'suspended'
                  ? 'bg-slate-900 text-white font-bold shadow-2xs'
                  : 'bg-transparent text-slate-600 hover:bg-white hover:text-slate-900'
              }`}
            >
              <UserX className="w-3.5 h-3.5" />
              <span>Suspendus ({suspendedUsers.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setUserSubTab('add')}
              className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition cursor-pointer text-center flex items-center justify-center space-x-1.5 ${
                userSubTab === 'add'
                  ? 'bg-slate-900 text-white font-bold shadow-2xs'
                  : 'bg-transparent text-slate-600 hover:bg-white hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Pré-inscrire</span>
            </button>
          </div>

          {emailSuccessMsg && (
            <div className="p-3 bg-slate-100 border border-slate-200 text-slate-800 text-xs font-medium rounded-xl flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-slate-700 shrink-0" />
              <span>{emailSuccessMsg}</span>
            </div>
          )}

          {/* Sub-tab 1: Members Table */}
          {userSubTab === 'members' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="divide-y divide-slate-100">
                {approvedUsers.map((user) => {
                  const isSuper = user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

                  return (
                    <div key={user.uid} className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition">
                      <div className="flex items-center space-x-3 min-w-0">
                        {user.photoURL ? (
                          <img
                            src={user.photoURL}
                            alt={user.displayName}
                            className="w-9 h-9 rounded-full border border-slate-200 object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-slate-900 text-amber-400 font-bold text-xs flex items-center justify-center shrink-0">
                            {user.displayName.charAt(0)}
                          </div>
                        )}
                        <div className="truncate">
                          <div className="flex items-center flex-wrap gap-1.5">
                            <span className="font-bold text-slate-900 text-xs truncate">{user.displayName}</span>
                            {isSuper ? (
                              <span className="bg-slate-100 text-slate-800 border border-slate-200 text-[9px] font-bold px-1.5 py-0.5 rounded">
                                PROPRIÉTAIRE
                              </span>
                            ) : user.role === 'admin' ? (
                              <span className="bg-slate-100 text-slate-800 border border-slate-200 text-[9px] font-bold px-1.5 py-0.5 rounded">
                                {settings.customRoleLabels?.admin ? settings.customRoleLabels.admin.toUpperCase() : 'ADMIN'}
                              </span>
                            ) : (
                              <span className="bg-slate-100 text-slate-600 border border-slate-200 text-[9px] font-medium px-1.5 py-0.5 rounded">
                                {settings.customRoleLabels?.employee ? settings.customRoleLabels.employee.toUpperCase() : 'EMPLOYÉ'}
                              </span>
                            )}
                            {user.customRoleTitle && (
                              <span className="bg-slate-50 text-slate-700 border border-slate-200 text-[9px] font-medium px-1.5 py-0.5 rounded">
                                {user.customRoleTitle}
                              </span>
                            )}
                            {(settings.cashierUserId === user.uid || settings.cashierName === user.displayName) && (
                              <span className="bg-amber-50 text-amber-900 border border-amber-200 text-[9px] font-semibold px-1.5 py-0.5 rounded">
                                Caissier(e)
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 self-end sm:self-center">
                        <button
                          onClick={() => handleOpenEditUser(user)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition flex items-center space-x-1 cursor-pointer"
                        >
                          <UserCog className="w-3.5 h-3.5 text-slate-500" />
                          <span>Droits</span>
                        </button>
                        {!isSuper && (
                          <button
                            onClick={() => handleSuspend(user)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition flex items-center space-x-1 cursor-pointer border border-slate-200"
                            title="Suspendre temporairement l'accès"
                          >
                            <UserX className="w-3.5 h-3.5 text-slate-500" />
                            <span>Suspendre</span>
                          </button>
                        )}
                        {!isSuper && (
                          <button
                            onClick={() => handleDeleteUser(user.uid, user.email)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer ml-1"
                            title="Supprimer définitivement"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sub-tab 2: Pending Requests */}
          {userSubTab === 'pending' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {pendingUsers.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <CheckCircle2 className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-80" />
                  <p className="text-xs font-bold text-slate-600">Aucune demande en attente</p>
                  <p className="text-[11px] text-slate-400">Toutes les demandes de validation ont été traitées.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {pendingUsers.map((user) => (
                    <div key={user.uid} className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition">
                      <div className="flex items-center space-x-3 min-w-0">
                        {user.photoURL ? (
                          <img
                            src={user.photoURL}
                            alt={user.displayName}
                            className="w-9 h-9 rounded-full border border-slate-200 object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-slate-900 text-amber-400 font-bold text-xs flex items-center justify-center shrink-0">
                            {user.displayName.charAt(0)}
                          </div>
                        )}
                        <div className="truncate">
                          <h4 className="font-bold text-slate-900 text-xs truncate">{user.displayName}</h4>
                          <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 pt-2 border-t sm:border-t-0 border-slate-100">
                        <button
                          onClick={() => handleApproveEmployee(user.uid)}
                          className="py-1 px-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition cursor-pointer"
                        >
                          Valider Employé
                        </button>
                        <button
                          onClick={() => handleApproveAdmin(user.uid)}
                          className="py-1 px-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition cursor-pointer"
                        >
                          Valider Admin
                        </button>
                        <button
                          onClick={() => handleReject(user.uid)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer ml-1"
                          title="Refuser"
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sub-tab 3: Suspended Users */}
          {userSubTab === 'suspended' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {suspendedUsers.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <UserCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-600">Aucun compte suspendu</p>
                  <p className="text-[11px] text-slate-400">Tous les employés actifs ont un accès opérationnel normal.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {suspendedUsers.map((user) => (
                    <div key={user.uid} className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition">
                      <div className="flex items-center space-x-3 min-w-0">
                        {user.photoURL ? (
                          <img
                            src={user.photoURL}
                            alt={user.displayName}
                            className="w-9 h-9 rounded-full border border-slate-200 object-cover shrink-0 grayscale"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-slate-400 text-white font-bold text-xs flex items-center justify-center shrink-0">
                            {user.displayName.charAt(0)}
                          </div>
                        )}
                        <div className="truncate">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-900 text-xs truncate">{user.displayName}</span>
                            <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[9px] font-semibold px-1.5 py-0.2 rounded">
                              SUSPENDU
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 self-end sm:self-center">
                        <button
                          onClick={() => handleReactivate(user)}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition flex items-center space-x-1 cursor-pointer"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Réactiver</span>
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.uid, user.email)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer ml-1"
                          title="Supprimer définitivement"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sub-tab 4: Add member by email */}
          {userSubTab === 'add' && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 max-w-xl space-y-4">
              <div>
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Pré-autoriser un utilisateur</h3>
              </div>

              <form onSubmit={handleAddByEmail} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Adresse Email Google *</label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="nom.serveur@gmail.com"
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 text-slate-900 rounded-lg text-xs font-medium focus:ring-1 focus:ring-amber-500 focus:bg-white focus:outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Rôle Attribué</label>
                  <select
                    value={newEmailRole}
                    onChange={(e) => setNewEmailRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-slate-900 rounded-lg text-xs font-medium focus:ring-1 focus:ring-amber-500 focus:bg-white focus:outline-none transition"
                  >
                    <option value="employee">Employé (Prise de commande, Stock en rayon)</option>
                    <option value="admin">Administrateur (Gestion complète et Paramètres)</option>
                  </select>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <button
                    type="submit"
                    disabled={addingEmailLoading}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{addingEmailLoading ? 'Ajout en cours...' : 'Ajouter au répertoire'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserSubTab('members')}
                    className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium transition cursor-pointer"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      )}

      {/* ================= TAB 3: AI DONA & API CONFIGURATION ================= */}
      {activeTab === 'ai_config' && (
        <div className="space-y-4">
          
          {/* Main AI Settings Form */}
          <form onSubmit={handleSaveAiConfig} className="space-y-4">
            
            {/* Top Overview & Status Diagnostic Card */}
            <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold border border-slate-200 shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Gestion de l'IA Dona & Clé API</h3>
                    <p className="text-xs text-slate-500">
                      Moteur Gemini 3.7 Flash &bull; Multimodalité &bull; Recherche Web Grounding
                    </p>
                  </div>
                </div>

                {/* Connection Test Button */}
                <button
                  type="button"
                  onClick={handleTestAiConnection}
                  disabled={aiTestStatus === 'testing'}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 shrink-0 self-start sm:self-auto border border-slate-200"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${aiTestStatus === 'testing' ? 'animate-spin' : ''}`} />
                  <span>{aiTestStatus === 'testing' ? 'Test en cours...' : 'Tester la connexion API'}</span>
                </button>
              </div>

              {/* Diagnostic Test Feedback Box */}
              {aiTestResult && (
                <div className={`p-3.5 rounded-lg border text-xs animate-fadeIn ${
                  aiTestStatus === 'success' 
                    ? 'bg-slate-50 border-slate-200 text-slate-900' 
                    : 'bg-red-50 border-red-200 text-red-900'
                }`}>
                  <div className="flex items-start gap-2.5">
                    {aiTestStatus === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1 min-w-0">
                      <p className="font-bold">
                        {aiTestStatus === 'success' ? 'Connexion API Validée avec Succès' : 'Échec de connexion API'}
                      </p>
                      {aiTestStatus === 'success' ? (
                        <>
                          <p className="text-slate-700">
                            Réponse : <em className="font-medium">"{aiTestResult.reply}"</em>
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium pt-0.5">
                            <span>Modèle : {aiTestResult.model}</span>
                            <span>&bull;</span>
                            <span>Latence : {aiTestResult.latencyMs} ms</span>
                          </div>
                        </>
                      ) : (
                        <p className="text-red-700">{aiTestResult.error}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Grid: 2 Configuration Blocks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
                
                {/* Block 1: API Key Configuration */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 pb-1 border-b border-slate-100">
                    <KeyRound className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Clé d'API Gemini</h4>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Clé API Personnalisée (Optionnel)
                    </label>
                    <div className="relative">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        value={customGeminiApiKey}
                        onChange={(e) => setCustomGeminiApiKey(e.target.value)}
                        placeholder="AIzaSy..."
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-mono px-3 py-2 pr-10 rounded-lg text-xs focus:ring-1 focus:ring-amber-500 focus:bg-white focus:outline-none transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                        title={showApiKey ? 'Masquer la clé' : 'Afficher la clé'}
                      >
                        {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Modules & Feature Switches */}
                  <div className="space-y-1.5 pt-1">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Modules Activés</label>
                    
                    <label className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition">
                      <div className="flex items-center space-x-2">
                        <Bot className="w-4 h-4 text-slate-500 shrink-0" />
                        <div>
                          <span className="text-xs font-semibold text-slate-900 block">Assistant Dona Actif</span>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={enableDonaChat}
                        onChange={(e) => setEnableDonaChat(e.target.checked)}
                        className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition">
                      <div className="flex items-center space-x-2">
                        <Globe className="w-4 h-4 text-slate-500 shrink-0" />
                        <div>
                          <span className="text-xs font-semibold text-slate-900 block">Recherche Google en Direct</span>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={enableDonaWebSearch}
                        onChange={(e) => setEnableDonaWebSearch(e.target.checked)}
                        className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition">
                      <div className="flex items-center space-x-2">
                        <Mic className="w-4 h-4 text-slate-500 shrink-0" />
                        <div>
                          <span className="text-xs font-semibold text-slate-900 block">Transcription Vocale & Audio</span>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={enableDonaVoice}
                        onChange={(e) => setEnableDonaVoice(e.target.checked)}
                        className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                      />
                    </label>
                  </div>

                </div>

                {/* Block 2: Custom Bar Guidelines & Prompt */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 pb-1 border-b border-slate-100">
                    <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Directives de l'Établissement</h4>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Consignes Spécifiques
                    </label>
                    <textarea
                      rows={4}
                      value={donaCustomInstructions}
                      onChange={(e) => setDonaCustomInstructions(e.target.value)}
                      placeholder="Ex: Mettre en avant les cocktails signature, formule du midi..."
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-3 py-2 rounded-lg text-xs focus:ring-1 focus:ring-amber-500 focus:bg-white focus:outline-none transition"
                    />
                  </div>

                  {/* Access Policy Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Politique d'Accès à Dona
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setDonaAccessMode('all')}
                        className={`p-2 rounded-lg border text-left transition cursor-pointer ${
                          donaAccessMode === 'all'
                            ? 'bg-slate-900 text-white font-bold border-slate-900 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-xs block">Tout le monde</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDonaAccessMode('admins_only')}
                        className={`p-2 rounded-lg border text-left transition cursor-pointer ${
                          donaAccessMode === 'admins_only'
                            ? 'bg-slate-900 text-white font-bold border-slate-900 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-xs block">Direction Seule</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDonaAccessMode('custom')}
                        className={`p-2 rounded-lg border text-left transition cursor-pointer ${
                          donaAccessMode === 'custom'
                            ? 'bg-slate-900 text-white font-bold border-slate-900 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-xs block">Personnalisé</span>
                      </button>
                    </div>
                  </div>

                </div>

              </div>

            </div>

            {/* Save AI Settings Bar */}
            <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-500">
                {aiSettingsSaved && (
                  <span className="text-slate-800 font-medium flex items-center gap-1.5 animate-fadeIn">
                    <CheckCheck className="w-4 h-4 text-slate-700" /> Paramètres enregistrés
                  </span>
                )}
              </div>

              <button
                type="submit"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition flex items-center space-x-2 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Enregistrer</span>
              </button>
            </div>

          </form>

          {/* Section 2: Quick Permissions Table for AI Dona */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                <span>Accès à Dona par Membre ({approvedUsers.length})</span>
              </h3>
            </div>

            <div className="divide-y divide-slate-100">
              {approvedUsers.map((user) => {
                const isSuper = user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
                const hasChatAccess = user.role === 'admin' || user.permissions?.canAccessChat !== false;

                return (
                  <div key={user.uid} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition">
                    <div className="flex items-center space-x-3 min-w-0">
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt={user.displayName}
                          className="w-9 h-9 rounded-full border border-slate-200 object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-slate-900 text-amber-400 font-bold text-xs flex items-center justify-center shrink-0">
                          {user.displayName.charAt(0)}
                        </div>
                      )}
                      <div className="truncate">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900 text-xs truncate">{user.displayName}</span>
                          <span className="text-[9px] font-medium uppercase px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            {isSuper ? 'PROPRIÉTAIRE' : user.role === 'admin' ? 'ADMIN' : 'EMPLOYÉ'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 self-end sm:self-center">
                      <button
                        type="button"
                        disabled={isSuper}
                        onClick={() => handleToggleUserAiAccess(user)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 cursor-pointer border ${
                          hasChatAccess
                            ? 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200'
                            : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                        } ${isSuper ? 'opacity-60 cursor-not-allowed' : ''}`}
                        title={hasChatAccess ? 'Désactiver l\'accès Dona' : 'Activer l\'accès Dona'}
                      >
                        {hasChatAccess ? (
                          <>
                            <Unlock className="w-3.5 h-3.5 text-slate-600" />
                            <span>Autorisé</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5 text-slate-400" />
                            <span>Bloqué</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* ================= TAB: DATABASE HEALTH & QUOTAS ================= */}
      {activeTab === 'database_health' && (
        <DatabaseHealthTab />
      )}

      {/* ================= TAB 4: AUDIT LOGS ================= */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Rechercher dans les logs..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-amber-500 focus:bg-white focus:outline-none"
                />
              </div>

              <select
                value={auditFilter}
                onChange={(e) => setAuditFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
              >
                <option value="all">Toutes actions</option>
                <option value="user_approved">Approbations</option>
                <option value="user_rejected">Refus</option>
                <option value="permissions_updated">Permissions</option>
                <option value="sale_deleted">Ventes supprimées</option>
                <option value="period_closed">Clôtures de période</option>
                <option value="system_reset">Réinitialisations</option>
              </select>
            </div>

            <button
              onClick={() => exportToCSV('audit')}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition flex items-center space-x-1.5 self-start sm:self-auto cursor-pointer border border-slate-200"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Exporter CSV</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {filteredAuditLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Aucun événement d'audit ne correspond à vos filtres.
                </div>
              ) : (
                filteredAuditLogs.map((log) => (
                  <div key={log.id} className="p-3.5 text-xs hover:bg-slate-50/70 transition flex items-start justify-between gap-3">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900">{log.userName}</span>
                        <span className="text-[10px] text-slate-400">({log.userEmail})</span>
                        <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 text-[10px] font-medium rounded border border-slate-200">
                          {log.action}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px] break-words">{log.details}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('fr-FR')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 6: DATA EXPORTS & PERIOD CLOSE ================= */}
      {activeTab === 'data' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Export Center */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
                <FileDown className="w-4 h-4 text-slate-600 shrink-0" />
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Sauvegarde & Exports CSV</h3>
              </div>
              <p className="text-xs text-slate-500">
                Téléchargez les registres complets au format CSV pour tableur ou comptabilité.
              </p>

              <div className="space-y-2">
                <button
                  onClick={() => exportToCSV('sales')}
                  className="w-full p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-left flex items-center justify-between text-xs font-semibold text-slate-800 transition cursor-pointer"
                >
                  <div className="flex items-center space-x-2.5">
                    <Receipt className="w-4 h-4 text-slate-500" />
                    <span>Journal des Ventes ({sales.length} transactions)</span>
                  </div>
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                </button>

                <button
                  onClick={() => exportToCSV('expenses')}
                  className="w-full p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-left flex items-center justify-between text-xs font-semibold text-slate-800 transition cursor-pointer"
                >
                  <div className="flex items-center space-x-2.5">
                    <DollarSign className="w-4 h-4 text-slate-500" />
                    <span>Registre des Dépenses ({expenses.length} entrées)</span>
                  </div>
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Official Period Closure */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
                <Calendar className="w-4 h-4 text-slate-600 shrink-0" />
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Clôture Officielle de Période</h3>
              </div>
              <p className="text-xs text-slate-500">
                Verrouille les ventes et dépenses antérieures pour sceller le grand livre comptable.
              </p>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
                Dernière clôture : <strong>{settings.lastPeriodClose ? new Date(settings.lastPeriodClose).toLocaleString('fr-FR') : 'Aucune'}</strong>
              </div>

              <button
                onClick={async () => {
                  if (confirm("Confirmez-vous la clôture officielle de la période comptable ? Cette action sera consignée dans l'audit.")) {
                    await closePeriod();
                    alert("Période clôturée avec succès.");
                  }
                }}
                className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition cursor-pointer"
              >
                Clôturer la Période Aujourd'hui
              </button>
            </div>

          </div>

          {/* Dangerous Zone (separated & with clear confirmation) */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3 mt-6">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-slate-600 shrink-0" />
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Zone de Maintenance & Réinitialisation</h3>
            </div>
            <p className="text-xs text-slate-500">
              Outils d'administration pour réinitialiser les données de test ou restaurer les paramètres.
            </p>

            <button
              type="button"
              onClick={() => setIsResetModalOpen(true)}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 border border-slate-200 hover:border-red-200 font-semibold text-xs rounded-lg transition cursor-pointer"
            >
              Console de réinitialisation
            </button>
          </div>
        </div>
      )}

      {/* ================= EDIT USER PERMISSIONS MODAL ================= */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <UserCog className="w-4 h-4 text-slate-600" />
                <h3 className="font-bold text-slate-900 text-sm">Gestion des Droits</h3>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nom Complet</label>
                <input
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-3 py-1.5 rounded-lg text-xs font-medium focus:ring-1 focus:ring-amber-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Rôle Système</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-3 py-1.5 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-amber-500 focus:bg-white focus:outline-none"
                >
                  <option value="employee">
                    {settings.customRoleLabels?.employee ? `${settings.customRoleLabels.employee} (Employé)` : 'Employé de service'}
                  </option>
                  <option value="admin">
                    {settings.customRoleLabels?.admin ? `${settings.customRoleLabels.admin} (Admin)` : 'Administrateur / Gérant'}
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Intitulé du Poste (Optionnel)
                </label>
                <input
                  type="text"
                  value={editCustomRoleTitle}
                  onChange={(e) => setEditCustomRoleTitle(e.target.value)}
                  placeholder="Ex: Caissière Principale, Serveur"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-3 py-1.5 rounded-lg text-xs font-medium focus:ring-1 focus:ring-amber-500 focus:bg-white focus:outline-none"
                />
              </div>

              {/* Fast Cashier Assignment Button */}
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-slate-800">Poste de Caisse</p>
                  <p className="text-[10px] text-slate-500 truncate">
                    {settings.cashierUserId === editingUser.uid || settings.cashierName === (editDisplayName || editingUser.displayName)
                      ? 'Désigné(e) comme Caissier(e)'
                      : 'Non assigné(e)'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const cName = editDisplayName.trim() || editingUser.displayName;
                    updateSettings({ cashierName: cName, cashierUserId: editingUser.uid });
                    alert(`${cName} a été assigné(e) comme Caissier(e).`);
                  }}
                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] rounded-md transition shrink-0 cursor-pointer"
                >
                  Assigner Caisse
                </button>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-700">Permissions</label>
                
                <label className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition">
                  <span className="text-xs text-slate-800">Accès Caisse & POS</span>
                  <input
                    type="checkbox"
                    checked={editPerms.canAccessPOS}
                    onChange={(e) => setEditPerms(p => ({ ...p, canAccessPOS: e.target.checked }))}
                    className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                  />
                </label>

                <label className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition">
                  <span className="text-xs text-slate-800">Assistant IA Dona</span>
                  <input
                    type="checkbox"
                    checked={editPerms.canAccessChat !== false}
                    onChange={(e) => setEditPerms(p => ({ ...p, canAccessChat: e.target.checked }))}
                    className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                  />
                </label>

                <label className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition">
                  <span className="text-xs text-slate-800">Consultation du Stock</span>
                  <input
                    type="checkbox"
                    checked={editPerms.canAccessStock}
                    onChange={(e) => setEditPerms(p => ({ ...p, canAccessStock: e.target.checked }))}
                    className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                  />
                </label>

                <label className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition">
                  <span className="text-xs text-slate-800">Approvisionnement Stock</span>
                  <input
                    type="checkbox"
                    checked={editPerms.canManageStock}
                    onChange={(e) => setEditPerms(p => ({ ...p, canManageStock: e.target.checked }))}
                    className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                  />
                </label>

                <label className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition">
                  <span className="text-xs text-slate-800">Visibilité des Coûts & Marges</span>
                  <input
                    type="checkbox"
                    checked={editPerms.canViewCostPrices}
                    onChange={(e) => setEditPerms(p => ({ ...p, canViewCostPrices: e.target.checked }))}
                    className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                  />
                </label>

                <label className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition">
                  <span className="text-xs text-slate-800">Finances, Bilan & Z-Report</span>
                  <input
                    type="checkbox"
                    checked={editPerms.canAccessReports}
                    onChange={(e) => setEditPerms(p => ({ ...p, canAccessReports: e.target.checked }))}
                    className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                  />
                </label>

                <label className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition">
                  <span className="text-xs text-slate-800">Suivi des Dépenses</span>
                  <input
                    type="checkbox"
                    checked={editPerms.canAccessExpenses}
                    onChange={(e) => setEditPerms(p => ({ ...p, canAccessExpenses: e.target.checked }))}
                    className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                  />
                </label>

                <label className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition">
                  <span className="text-xs text-slate-800">Accès Paramètres & Direction</span>
                  <input
                    type="checkbox"
                    checked={editPerms.canAccessSettings}
                    onChange={(e) => setEditPerms(p => ({ ...p, canAccessSettings: e.target.checked }))}
                    className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                  />
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSavePermissions}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition cursor-pointer"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Data Modal */}
      {isResetModalOpen && (
        <ResetDataModal onClose={() => setIsResetModalOpen(false)} />
      )}

    </div>
  );
};
