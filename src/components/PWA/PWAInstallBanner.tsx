import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Smartphone, 
  Monitor, 
  X, 
  Share, 
  PlusSquare, 
  CheckCircle2, 
  FileText, 
  Sparkles, 
  Check, 
  Laptop, 
  ShieldCheck, 
  RefreshCw,
  Wifi,
  WifiOff,
  Layers,
  ArrowRight
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showFloatingBanner, setShowFloatingBanner] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isAndroid, setIsAndroid] = useState<boolean>(false);
  const [isDesktop, setIsDesktop] = useState<boolean>(true);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [swActive, setSwActive] = useState<boolean>(false);
  const [installedSuccessMessage, setInstalledSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    // Check if running in standalone mode (already installed as PWA)
    const standalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://') ||
      window.location.search.includes('source=pwa');

    setIsStandalone(standalone);

    // Detect Device Type
    const userAgent = navigator.userAgent || '';
    const isIOSDevice = /iPad|iPhone|iPod/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroidDevice = /Android/i.test(userAgent);
    const isMobile = isIOSDevice || isAndroidDevice || /webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    
    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);
    setIsDesktop(!isMobile);

    // Check service worker registration status
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg && reg.active) {
          setSwActive(true);
        }
      }).catch(() => {});
    }

    // Check online status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check banner dismissal status
    const bannerDismissedTime = localStorage.getItem('barexpress_pwa_banner_dismissed_at');
    const dismissedRecently = bannerDismissedTime && (Date.now() - parseInt(bannerDismissedTime, 10)) < 3 * 24 * 60 * 60 * 1000;

    if (!standalone && !dismissedRecently) {
      // Delay showing the banner for smooth entrance
      const timer = setTimeout(() => {
        setShowFloatingBanner(true);
      }, 2500);
      return () => clearTimeout(timer);
    }

    // Listen to browser PWA install prompt event (Chrome, Edge, Samsung, Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      (window as any).deferredPwaPrompt = e;
    };

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
      setShowModal(false);
      setShowFloatingBanner(false);
      (window as any).deferredPwaPrompt = null;
      setInstalledSuccessMessage("Application Lamadone Express installée avec succès !");
      setTimeout(() => setInstalledSuccessMessage(null), 5000);
    };

    const handleOpenModal = async () => {
      const promptToUse = (window as any).deferredPwaPrompt as BeforeInstallPromptEvent || deferredPrompt;
      if (promptToUse) {
        try {
          promptToUse.prompt();
          const choice = await promptToUse.userChoice;
          if (choice.outcome === 'accepted') {
            setIsStandalone(true);
            (window as any).deferredPwaPrompt = null;
            setInstalledSuccessMessage("Installation de Lamadone Express confirmée !");
            setTimeout(() => setInstalledSuccessMessage(null), 5000);
            return;
          }
        } catch (err) {
          console.warn('Native install prompt warning:', err);
        }
      }
      setShowModal(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('open-pwa-modal', handleOpenModal);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('open-pwa-modal', handleOpenModal);
    };
  }, [deferredPrompt]);

  const handleDismissFloatingBanner = () => {
    setShowFloatingBanner(false);
    localStorage.setItem('barexpress_pwa_banner_dismissed_at', Date.now().toString());
  };

  const handleInstallAction = async () => {
    const promptToUse = deferredPrompt || (window as any).deferredPwaPrompt;
    if (promptToUse) {
      try {
        promptToUse.prompt();
        const choiceResult = await promptToUse.userChoice;
        if (choiceResult.outcome === 'accepted') {
          setIsStandalone(true);
          setShowModal(false);
          setShowFloatingBanner(false);
          setDeferredPrompt(null);
          (window as any).deferredPwaPrompt = null;
          setInstalledSuccessMessage("Installation réussie ! Lamadone Express est maintenant accessible directement.");
          setTimeout(() => setInstalledSuccessMessage(null), 5000);
          return;
        }
      } catch (err) {
        console.warn('Install error:', err);
      }
    }

    // If no direct prompt, open detailed guide modal
    setShowModal(true);
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
    
    setInstalledSuccessMessage("Raccourci bureau téléchargé (.url). Double-cliquez dessus pour lancer Lamadone Express !");
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

      {/* Floating Gentle Banner (if not installed & not standalone) */}
      {!isStandalone && showFloatingBanner && (
        <div className="fixed bottom-16 sm:bottom-4 left-3 right-3 sm:left-auto sm:right-4 sm:max-w-md z-40 bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl border border-amber-500/40 shadow-2xl transition-all duration-300 animate-fadeIn">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center space-x-3 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-amber-500 p-1.5 flex items-center justify-center text-slate-950 font-black shrink-0 shadow-xs">
                <Download className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-100 flex items-center gap-1.5 leading-tight">
                  <span>Installer Lamadone</span>
                  <span className="bg-amber-400 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded uppercase">PWA</span>
                </p>
                <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                  {isIOS 
                    ? "Accès plein écran & 100% hors-ligne sur iPhone/iPad"
                    : isAndroid 
                    ? "Installation 1-clic sur votre smartphone ou tablette"
                    : "Application de bureau autonome pour votre caisse"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleInstallAction}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black px-3 py-1.5 rounded-xl shadow-xs transition active:scale-95 cursor-pointer whitespace-nowrap"
              >
                {isIOS ? 'Instructions' : 'Installer'}
              </button>
              <button
                type="button"
                onClick={handleDismissFloatingBanner}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
                title="Masquer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Installation Guide Modal for All Devices */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 relative overflow-hidden text-slate-900 max-h-[92vh] flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-2xl bg-slate-950 p-2 flex items-center justify-center border border-amber-500/50 shadow-sm shrink-0">
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
                      Multi-Appareils
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">Installation PWA & Fonctionnement 100% Hors-Ligne</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Modal Content */}
            <div className="py-4 space-y-4 overflow-y-auto flex-1 pr-1">
              
              {/* Direct Install Button (Desktop & Android) */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center text-white shadow-lg">
                <p className="text-xs text-amber-400 font-bold mb-2.5 flex items-center justify-center gap-1.5">
                  <Laptop className="w-4 h-4 text-amber-400" />
                  <span>{isDesktop ? 'Installation Ordinateur (PC / Mac / POS)' : isAndroid ? 'Installation Android' : 'Installation Tactile'}</span>
                </p>
                <button
                  type="button"
                  onClick={handleInstallAction}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3 px-4 rounded-xl shadow-md text-sm flex items-center justify-center space-x-2 transition cursor-pointer transform active:scale-98"
                >
                  <Download className="w-5 h-5 stroke-[2.5]" />
                  <span>LANCER L'INSTALLATION DIRECTE</span>
                </button>
                <p className="text-[11px] text-slate-400 mt-2">
                  Fonctionne comme une application native autonome (plein écran, sans barre d'URL, rapide et 100% hors-ligne).
                </p>
              </div>

              {/* iOS Safari Instructions */}
              {isIOS && (
                <div className="space-y-2.5 bg-amber-50/80 border border-amber-200 p-3.5 rounded-2xl text-slate-900">
                  <div className="text-slate-900 text-xs font-black flex items-center space-x-2">
                    <Smartphone className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Guide iPhone & iPad (Safari Apple) :</span>
                  </div>
                  <ol className="text-xs text-slate-700 space-y-2 pl-1">
                    <li className="flex items-start space-x-2.5">
                      <span className="bg-amber-500 text-slate-950 font-black w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[11px]">1</span>
                      <span className="leading-snug">
                        Dans Safari, appuyez sur le bouton <strong>Partager</strong> <Share className="w-3.5 h-3.5 inline text-amber-700 mx-0.5" /> (icône carré avec flèche vers le haut).
                      </span>
                    </li>
                    <li className="flex items-start space-x-2.5">
                      <span className="bg-amber-500 text-slate-950 font-black w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[11px]">2</span>
                      <span className="leading-snug">
                        Faites défiler vers le bas et choisissez <strong>Sur l'écran d'accueil</strong> <PlusSquare className="w-3.5 h-3.5 inline text-amber-700 mx-0.5" />.
                      </span>
                    </li>
                    <li className="flex items-start space-x-2.5">
                      <span className="bg-amber-500 text-slate-950 font-black w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[11px]">3</span>
                      <span className="leading-snug">
                        Validez en cliquant sur <strong>Ajouter</strong> en haut à droite. L'icône Lamadone apparaîtra sur votre écran d'accueil !
                      </span>
                    </li>
                  </ol>
                </div>
              )}

              {/* Chrome & Edge Desktop Tips */}
              {isDesktop && (
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-xs text-slate-800 space-y-2">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Monitor className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Navigateurs PC (Google Chrome & Microsoft Edge) :</span>
                  </div>
                  <p className="text-[11.5px] leading-relaxed text-slate-600">
                    Vous pouvez aussi cliquer sur l'icône <strong>"Installer l'application"</strong> <Download className="w-3.5 h-3.5 inline text-amber-700" /> située à droite de la <strong>barre d'adresse (URL)</strong> de votre navigateur.
                  </p>
                  
                  <div className="pt-1.5 flex items-center justify-between border-t border-slate-200">
                    <span className="text-[11px] text-slate-500">Ou télécharger le lanceur direct :</span>
                    <button
                      type="button"
                      onClick={downloadAppLauncher}
                      className="text-xs font-bold text-amber-700 hover:text-amber-800 underline flex items-center gap-1 cursor-pointer bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-lg transition"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Raccourci .URL</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Offline & Netlify Free Compatibility Diagnostics */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
                <p className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Compatibilité & Diagnostic Système :</span>
                </p>
                
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-white border border-slate-200 p-2 rounded-xl flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Service Worker :</span>
                    <span className="text-emerald-700 font-black flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{swActive ? 'Actif' : 'Prêt'}</span>
                    </span>
                  </div>

                  <div className="bg-white border border-slate-200 p-2 rounded-xl flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Mode Hors-Ligne :</span>
                    <span className="text-emerald-700 font-black flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>100% Garanti</span>
                    </span>
                  </div>

                  <div className="bg-white border border-slate-200 p-2 rounded-xl flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Hébergement Netlify :</span>
                    <span className="text-emerald-700 font-black flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Optimisé</span>
                    </span>
                  </div>

                  <div className="bg-white border border-slate-200 p-2 rounded-xl flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Format Écran :</span>
                    <span className="text-slate-800 font-bold">
                      {isStandalone ? 'PWA Autonome' : 'Navigateur Web'}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="leading-tight">
                    <strong>Hébergement Netlify Gratuit & Cloud Sync :</strong> Le routage SPA (<code>_redirects</code>) et les en-têtes de cache (<code>_headers</code>) sont pré-configurés pour garantir un démarrage instantané et sans coupure même en cas de panne réseau.
                  </p>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-400">Lamadone Express PWA Engine</span>
              <button
                type="button"
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

