// Non-Aggressive Smart Notification System
// Handles browser web notifications, in-app toast feedback, and polite audio chimes

export interface NotificationPreferences {
  enabled: boolean;
  soundEnabled: boolean;
  stockAlerts: boolean;
  syncAlerts: boolean;
  paymentAlerts: boolean;
  quietMode: boolean; // Gentle throttling
}

export interface InAppToast {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  duration?: number;
}

const PREFS_STORAGE_KEY = 'barexp_notification_prefs';
const DEFAULT_PREFS: NotificationPreferences = {
  enabled: true,
  soundEnabled: true,
  stockAlerts: true,
  syncAlerts: true,
  paymentAlerts: true,
  quietMode: false,
};

// Cooldown dictionary to prevent aggressive duplicate alerts
const notificationCooldowns: Record<string, number> = {};
const MIN_COOLDOWN_MS = 60 * 1000; // 1 minute per alert topic

type ToastListener = (toast: InAppToast) => void;
const toastListeners = new Set<ToastListener>();

export function getNotificationPrefs(): NotificationPreferences {
  if (typeof localStorage === 'undefined') return DEFAULT_PREFS;
  try {
    const saved = localStorage.getItem(PREFS_STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_PREFS, ...JSON.parse(saved) };
    }
  } catch {}
  return DEFAULT_PREFS;
}

export function saveNotificationPrefs(prefs: Partial<NotificationPreferences>): NotificationPreferences {
  const current = getNotificationPrefs();
  const updated = { ...current, ...prefs };
  try {
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(updated));
  } catch {}
  return updated;
}

export function getBrowserNotificationPermission(): 'granted' | 'denied' | 'default' | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<'granted' | 'denied' | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    const result = await Notification.requestPermission();
    if (result === 'granted') {
      saveNotificationPrefs({ enabled: true });
    }
    return result as 'granted' | 'denied';
  } catch {
    return 'denied';
  }
}

// Gentle, harmonic synthetic chime using Web Audio API (100% offline, pleasant & non-jarring)
export function playGentleChime(type: 'success' | 'warning' | 'info' = 'info') {
  const prefs = getNotificationPrefs();
  if (!prefs.soundEnabled) return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'success') {
      // Warm upward chord (E5 -> G#5 -> B5)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.08); // E5
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.16); // G5
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'warning') {
      // Soft gentle two-tone pulse
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now); // A4
      osc.frequency.setValueAtTime(392, now + 0.12); // G4
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    } else {
      // Subtle soft droplet chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  } catch {
    // Ignore audio context errors in quiet mode or restricted environments
  }
}

// Dispatch a gentle non-aggressive alert (System + Toast)
export function sendSmartNotification(options: {
  id: string; // Unique topic key for cooldown throttling
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  url?: string;
  force?: boolean;
}) {
  const prefs = getNotificationPrefs();
  const { id, title, message, type = 'info', url = '/', force = false } = options;

  // 1. Throttle check to avoid spamming the user
  const now = Date.now();
  const lastSent = notificationCooldowns[id] || 0;
  if (!force && now - lastSent < MIN_COOLDOWN_MS) {
    // Too soon since last alert on this specific topic
    return;
  }
  notificationCooldowns[id] = now;

  // 2. Play gentle non-aggressive sound
  playGentleChime(type === 'error' || type === 'warning' ? 'warning' : type === 'success' ? 'success' : 'info');

  // 3. Emit toast for in-app display
  const toast: InAppToast = {
    id: `${id}-${now}`,
    type,
    title,
    message,
    timestamp: new Date().toISOString(),
    duration: 4500,
  };
  toastListeners.forEach(listener => {
    try {
      listener(toast);
    } catch {}
  });

  // 4. Send OS / Browser System notification if window is backgrounded or permitted
  if (prefs.enabled && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      // Check if service worker registration is available for rich notifications
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(title, {
            body: message,
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            tag: id, // Collapses multiple alerts on the same topic into one
            data: { url },
          } as NotificationOptions);
        }).catch(() => {
          new Notification(title, {
            body: message,
            icon: '/icons/icon-192.png',
            tag: id,
          });
        });
      } else {
        new Notification(title, {
          body: message,
          icon: '/icons/icon-192.png',
          tag: id,
        });
      }
    } catch (e) {
      console.warn('[Notification] System notification dispatch skipped:', e);
    }
  }
}

export function subscribeToToasts(listener: ToastListener): () => void {
  toastListeners.add(listener);
  return () => {
    toastListeners.delete(listener);
  };
}
