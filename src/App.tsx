import React from 'react';
import { BarProvider, useBar } from './context/BarContext';
import { GlobalErrorBoundary } from './components/Common/ErrorBoundary';
import { Navbar } from './components/Navbar';
import { MobileNav } from './components/MobileNav';
import { POSGrid } from './components/POS/POSGrid';
import { CartPanel } from './components/POS/CartPanel';
import { StockList } from './components/Stock/StockList';
import { ExpenseTracker } from './components/Expenses/ExpenseTracker';
import { SalesReports } from './components/Reports/SalesReports';
import { SettingsModal } from './components/Settings/SettingsModal';
import { AdminPanel } from './components/Admin/AdminPanel';
import { DonaChat } from './components/Chat/DonaChat';
import { GoogleLoginModal } from './components/Auth/GoogleLoginModal';
import { PendingApprovalScreen } from './components/Auth/PendingApprovalScreen';
import { UnassociatedUserScreen } from './components/Auth/UnassociatedUserScreen';
import { TrialExpiredScreen } from './components/Billing/TrialExpiredScreen';
import { SuperAdminLayout } from './components/SuperAdmin/SuperAdminLayout';
import { ToastContainer } from './components/Common/ToastContainer';
import { useGlobalKeyboardShortcuts } from './hooks/useGlobalKeyboardShortcuts';

const MainContent: React.FC = () => {
  const { activeTab, isAdmin } = useBar();

  return (
    <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
      {activeTab === 'pos' && (
        <>
          <POSGrid />
          <CartPanel />
        </>
      )}

      {activeTab === 'stock' && (
        <div className="flex-1 overflow-y-auto">
          <StockList />
        </div>
      )}

      {activeTab === 'expenses' && (
        <div className="flex-1 overflow-y-auto">
          <ExpenseTracker />
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="flex-1 overflow-y-auto">
          <SalesReports />
        </div>
      )}

      {activeTab === 'chat' && (
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
          <DonaChat />
        </div>
      )}

      {(activeTab === 'admin' || activeTab === 'settings') && (
        <div className="flex-1 overflow-y-auto bg-slate-50">
          <AdminPanel />
        </div>
      )}
    </main>
  );
};

const AppShell: React.FC = () => {
  useGlobalKeyboardShortcuts();

  const { 
    currentUser, 
    authLoading, 
    activeTab, 
    isSuperAdmin, 
    isImpersonating,
    isUnassociatedUser,
    activeCompanyTrialInfo,
  } = useBar();

  if (authLoading) {
    return (
      <div className="min-h-screen w-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-bold tracking-wide text-amber-400">Initialisation de la session BarExp...</p>
        <p className="text-xs text-slate-400 mt-1">Connexion à Firebase Firestore & Google Auth</p>
      </div>
    );
  }

  // Not logged in -> Clean simplified Google Sign-in & Company Code modal
  if (!currentUser) {
    return <GoogleLoginModal />;
  }

  // Brand new Google user not attached to any company yet -> Onboarding / Choice screen
  if (isUnassociatedUser) {
    return <UnassociatedUserScreen />;
  }

  // Account pending approval by company admin or super admin
  if (currentUser.status === 'pending' || currentUser.status === 'rejected' || currentUser.status === 'suspended') {
    return <PendingApprovalScreen />;
  }

  // Super Administrator Platform Interface
  if (isSuperAdmin && !isImpersonating) {
    return <SuperAdminLayout />;
  }

  // Active Company Trial / Payment Verification gate
  if (!activeCompanyTrialInfo.isOperationalAccessAllowed) {
    return <TrialExpiredScreen />;
  }

  // Bar Enterprise Operational Interface
  const isChatActive = activeTab === 'chat';

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-50 font-sans text-slate-900 overflow-hidden select-none">
      {!isChatActive && <Navbar />}
      <MainContent />
      {!isChatActive && <MobileNav />}
    </div>
  );
};

export default function App() {
  return (
    <GlobalErrorBoundary>
      <BarProvider>
        <AppShell />
        <ToastContainer />
      </BarProvider>
    </GlobalErrorBoundary>
  );
}
