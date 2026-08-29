// PWA Installation & Service Worker Lifecycle Manager
// Handles desktop & mobile install prompts, standalone detection, and offline SW registration

export interface PwaInstallState {
  isInstalled: boolean;
  canInstall: boolean;
  isIOS: boolean;
  isStandalone: boolean;
  swActive: boolean;
}

type PwaListener = (state: PwaInstallState) => void;

let deferredPrompt: any = null;
const listeners = new Set<PwaListener>();

function detectIsIOS(): boolean {
  if (typeof window === 'undefined') return false;
  const userAgent = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function detectIsStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

export function getPwaState(): PwaInstallState {
  const isStandalone = detectIsStandalone();
  const isIOS = detectIsIOS();
  return {
    isInstalled: isStandalone,
    canInstall: Boolean(deferredPrompt) && !isStandalone,
    isIOS,
    isStandalone,
    swActive: typeof navigator !== 'undefined' && 'serviceWorker' in navigator && Boolean(navigator.serviceWorker.controller),
  };
}

function notifyListeners() {
  const state = getPwaState();
  listeners.forEach((listener) => {
    try {
      listener(state);
    } catch {}
  });
}

export function subscribePwaState(listener: PwaListener): () => void {
  listeners.add(listener);
  listener(getPwaState());
  return () => {
    listeners.delete(listener);
  };
}

// Prompt native browser installation dialog
export async function promptPwaInstall(): Promise<{ outcome: 'accepted' | 'dismissed' | 'unsupported' }> {
  if (!deferredPrompt) {
    if (detectIsIOS()) {
      return { outcome: 'unsupported' };
    }
    return { outcome: 'unsupported' };
  }

  try {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    notifyListeners();
    return { outcome: outcome === 'accepted' ? 'accepted' : 'dismissed' };
  } catch (err) {
    console.warn('[PWA] Prompt error:', err);
    deferredPrompt = null;
    notifyListeners();
    return { outcome: 'unsupported' };
  }
}

// Initialize Service Worker & PWA Event Handlers
export function initPwaManager() {
  if (typeof window === 'undefined') return;

  // Capture install prompt event for Desktop / Android Chrome / Edge
  window.addEventListener('beforeinstallprompt', (e: any) => {
    e.preventDefault();
    deferredPrompt = e;
    notifyListeners();
    console.log('[PWA] beforeinstallprompt captured and ready.');
  });

  // Listen for successful installation
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notifyListeners();
    console.log('[PWA] BarExp application installed successfully.');
  });

  // Register Service Worker in production and standard runtime
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          console.log('[PWA] Service Worker registered with scope:', reg.scope);
          notifyListeners();

          // Check for worker updates
          reg.onupdatefound = () => {
            const installingWorker = reg.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[PWA] New version ready for offline use.');
                }
              };
            }
          };
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker registration failed (expected in sandboxed iframes):', err);
        });
    });
  }
}
