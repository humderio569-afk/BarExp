import React, { useState, useEffect } from 'react';
import { InAppToast, subscribeToToasts } from '../../utils/notificationService';
import { CheckCircle, AlertTriangle, AlertOctagon, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<InAppToast[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToToasts((toast) => {
      setToasts((prev) => [...prev.slice(-3), toast]); // Keep at most 4 active non-aggressive toasts

      // Auto dismiss
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, toast.duration || 4500);
    });

    return () => unsubscribe();
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-3 sm:px-0">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isWarning = toast.type === 'warning';
        const isError = toast.type === 'error';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-3.5 rounded-2xl shadow-xl border flex items-start gap-3 backdrop-blur-md transition-all duration-300 animate-slideUp ${
              isSuccess
                ? 'bg-slate-900/95 text-white border-emerald-500/40 shadow-emerald-950/20'
                : isWarning
                ? 'bg-slate-900/95 text-white border-amber-500/40 shadow-amber-950/20'
                : isError
                ? 'bg-slate-900/95 text-white border-red-500/40 shadow-red-950/20'
                : 'bg-slate-900/95 text-white border-slate-700 shadow-slate-950/20'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {isSuccess && <CheckCircle className="w-4 h-4 text-emerald-400" />}
              {isWarning && <AlertTriangle className="w-4 h-4 text-amber-400" />}
              {isError && <AlertOctagon className="w-4 h-4 text-red-400" />}
              {!isSuccess && !isWarning && !isError && <Info className="w-4 h-4 text-blue-400" />}
            </div>

            <div className="flex-1 space-y-0.5">
              <h5 className="text-xs font-black tracking-wide">{toast.title}</h5>
              <p className="text-[11px] text-slate-300 leading-snug">{toast.message}</p>
            </div>

            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="text-slate-400 hover:text-white p-1 rounded-md transition"
              aria-label="Fermer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
