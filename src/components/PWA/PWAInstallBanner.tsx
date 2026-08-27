import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Monitor, X, Share, PlusSquare, CheckCircle2, FileText, Sparkles, Check, Laptop, ShieldCheck, RefreshCw } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isDesktop, setIsDesktop] = useState<boolean>(true);
  const [installedSuccessMessage, setInstalledSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    // Check if running in standalone mode (already installed as PWA)
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      setIsInstalled(true);
    }

    // Detect Device Type
    const userAgent = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    setIsDesktop(!isMobile);

    // Detect iOS Safari
    const ios = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    // Listen to browser PWA install prompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      (window as any).deferredPwaPrompt = e;
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowModal(false);
      (window as any).deferredPwaPrompt = null;
      setInstalledSuccessMessage("L'application Lamadone Express a été installée avec succès sur votre ordinateur/appareil !");
      setTimeout(() => setInstalledSuccessMessage(null), 5000);
    };

    const handleOpenModal = async () => {
      // Direct trigger logic: if native prompt is available, launch it directly!
      const promptToUse = (window as any).deferredPwaPrompt as BeforeInstallPromptEvent;
      if (promptToUse) {
        try {
          promptToUse.prompt();
          const choice = await promptToUse.userChoice;
          if (choice.outcome === 'accepted') {
            setIsInstalled(true);
            (window as any).deferredPwaPrompt = null;
            setInstalledSuccessMessage("Installation de Lamadone Express validée avec succès !");
            setTimeout(() => setInstalledSuccessMessage(null), 5000);
            return;
          }
        } catch (err) {
          console.warn('Error launching native install prompt', err);
        }
      }

      setShowModal(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('open-pwa-modal', handleOpenModal);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('open-pwa-modal', handleOpenModal);
    };
  }, []);

  const handleInstallClick = async () => {
    const promptToUse = deferredPrompt || (window as any).deferredPwaPrompt;
    if (promptToUse) {
      try {
        promptToUse.prompt();
        const choiceResult = await promptToUse.userChoice;
        if (choiceResult.outcome === 'accepted') {
          setIsInstalled(true);
          setShowModal(false);
          setDeferredPrompt(null);
          (window as any).deferredPwaPrompt = null;
          setInstalledSuccessMessage("Installation de Lamadone Express terminée !");
          setTimeout(() => setInstalledSuccessMessage(null), 5000);
          return;
        }
      } catch (err) {
        console.warn('Direct prompt failed:', err);
      }
    }

    // Fallback if browser doesn't expose native prompt: download web shortcut
    downloadAppLauncher();
  };

  const downloadAppLauncher = () => {
    const appUrl = window.location.href;
    const shortcutContent = `[InternetShortcut]\nURL=${appUrl}\nIconIndex=0\nIconFile=${window.location.origin}/icons/icon.svg\n`;
    const blob = new Blob([shortcutContent], { type: 'application/x-mswinurl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Lamadone_Express.url';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setInstalledSuccessMessage("Raccourci d'application bureau téléchargé ! Double-cliquez dessus pour lancer Lamadone Express.");
    setTimeout(() => setInstalledSuccessMessage(null), 5000);
  };

  return (
    <>
      {/* Toast alert on success */}
      {installedSuccessMessage && (
        <div className="fixed top-14 right-4 sm:right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-emerald-500/50 flex items-center space-x-3 animate-fadeIn">
          <Check className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-xs font-bold text-emerald-100">{installedSuccessMessage}</p>
        </div>
      )}

      {/* Full Installation Guide Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 relative overflow-hidden text-slate-900">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-slate-950 p-1 flex items-center justify-center border border-amber-500/50 shadow-sm shrink-0">
                  <img 
                    src="/icons/icon.svg" 
                    alt="Lamadone Express Logo" 
                    className="w-full h-full object-contain" 
                  />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base flex items-center gap-1.5 leading-tight">
                    <span>Lamadone Express</span>
                    <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                      PWA Bureau & Tactile
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">Installation directe sur votre Ordinateur ou Tablette</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="py-4 space-y-3.5">
              
              {/* Primary Direct Download / Install Action Button */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center text-white shadow-lg">
                <p className="text-xs text-amber-400 font-bold mb-2.5 flex items-center justify-center gap-1.5">
                  <Laptop className="w-4 h-4 text-amber-400" />
                  <span>Installation Ordinateur (Windows, Mac, Linux, ChromeOS)</span>
                </p>
                <button
                  onClick={handleInstallClick}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3 px-4 rounded-xl shadow-md text-sm flex items-center justify-center space-x-2 transition cursor-pointer transform active:scale-98"
                >
                  <Download className="w-5 h-5 stroke-[2.5]" />
                  <span>INSTALLER SUR CET ORDINATEUR</span>
                </button>
                <p className="text-[11px] text-slate-400 mt-2">
                  Fonctionne comme une application native autonome (plein écran, sans barre d'adresse, 100% hors-ligne).
                </p>
              </div>

              {/* Desktop Browser Native Install Instructions */}
              <div className="bg-amber-50/70 border border-amber-200/90 p-3.5 rounded-xl text-xs text-slate-800 space-y-2">
                <div className="font-bold text-amber-950 flex items-center gap-1.5">
                  <Monitor className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Astuce pour Google Chrome & Microsoft Edge sur Ordinateur :</span>
                </div>
                <p className="text-[11.5px] leading-relaxed text-slate-700">
                  Vous pouvez également cliquer sur l'icône <strong>"Installer"</strong> <Download className="w-3.5 h-3.5 inline text-amber-700" /> située directement à l'extrémité droite de la <strong>barre d'adresse (URL)</strong> de votre navigateur Chrome ou Edge.
                </p>
              </div>

              {/* iOS or Manual Instructions if Mobile Safari */}
              {isIOS ? (
                <div className="space-y-2 bg-slate-50 border border-slate-200 p-3 rounded-xl">
                  <div className="text-slate-900 text-xs font-bold flex items-center space-x-2">
                    <Smartphone className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Installation sur iPhone / iPad (Safari) :</span>
                  </div>
                  <ol className="text-xs text-slate-600 space-y-1.5 pl-1">
                    <li className="flex items-start space-x-2">
                      <span className="bg-amber-200 text-amber-900 font-bold w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px]">1</span>
                      <span>Appuyez sur le bouton <strong>Partager</strong> <Share className="w-3 h-3 inline text-amber-600" /> dans Safari.</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="bg-amber-200 text-amber-900 font-bold w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px]">2</span>
                      <span>Sélectionnez <strong>Sur l'écran d'accueil</strong> <PlusSquare className="w-3 h-3 inline text-amber-600" />.</span>
                    </li>
                  </ol>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-slate-600" />
                    <span className="text-xs font-medium text-slate-700">Télécharger le raccourci direct (.URL) :</span>
                  </div>
                  <button
                    onClick={downloadAppLauncher}
                    className="text-xs font-bold text-amber-700 hover:text-amber-800 underline flex items-center gap-1 cursor-pointer bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Télécharger</span>
                  </button>
                </div>
              )}

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-[11px] text-emerald-900 flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Mode Hors-Ligne & Cache Prêt</strong> : Une fois installée, l'application fonctionne même sans connexion Internet avec synchronisation automatique.
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4 py-2 rounded-xl text-xs cursor-pointer transition"
              >
                Fermer
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
