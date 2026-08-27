import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Smartphone, ShieldCheck, Database, Play } from 'lucide-react';
import { safeRemoveItem } from '../../utils/storage';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Global Error Boundary caught an unhandled error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleContinue = () => {
    // Attempt in-place recovery without hard page reload
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleReload = () => {
    try {
      // Clear non-critical caches that might cause quota or parse crashes
      safeRemoveItem('barexpress_active_tab');
      safeRemoveItem('barexpress_quota_daily_stats');
      safeRemoveItem('barexpress_gemini_daily_stats');
    } catch (e) {
      console.warn(e);
    }
    window.location.reload();
  };

  private handleResetLocalState = () => {
    try {
      safeRemoveItem('barexpress_active_tab');
      safeRemoveItem('barexpress_cart');
      safeRemoveItem('barexpress_quota_daily_stats');
      safeRemoveItem('barexpress_gemini_daily_stats');
      safeRemoveItem('dona_chat_sessions_v1');
    } catch (e) {
      console.warn(e);
    }
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      const isQuotaError = 
        this.state.error?.message?.toLowerCase().includes('quota') ||
        this.state.error?.message?.toLowerCase().includes('resource-exhausted');

      return (
        <div className="min-h-screen w-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 text-center select-none font-sans">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
            
            {/* Header Icon */}
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-lg">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {isQuotaError ? "Mémoire Locale Remplie" : "Mode Récupération Active"}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                {isQuotaError
                  ? "L'espace de stockage de votre navigateur (Safari / iPhone) est saturé. Cliquez sur le bouton ci-dessous pour libérer l'espace et lancer immédiatement l'application."
                  : "Une interruption d'affichage est survenue. Cliquez sur continuer pour débloquer l'écran sans perdre vos données."}
              </p>
            </div>

            {/* Error snippet if available */}
            {this.state.error && (
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-left overflow-x-auto max-h-24 text-[11px] text-amber-300 font-mono">
                {this.state.error.message || 'Erreur inattendue'}
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-2.5 pt-2">
              <button
                onClick={this.handleResetLocalState}
                className="w-full py-3.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-sm flex items-center justify-center space-x-2 transition shadow-lg shadow-amber-500/20 active:scale-98 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current stroke-[2.5]" />
                <span>Libérer la mémoire & Démarrer l'App</span>
              </button>

              <button
                onClick={this.handleContinue}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center space-x-2 transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Forcer l'affichage direct</span>
              </button>
            </div>

            <div className="pt-2 text-[10px] text-slate-500 flex items-center justify-center space-x-1.5 border-t border-slate-800/80">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Lamadone Express &bull; Moteur Caisse Sécurisé &bull; Offline-First</span>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

