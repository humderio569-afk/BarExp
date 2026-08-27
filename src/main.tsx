import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Gracefully intercept benign browser/iframe lifecycle notifications (e.g. tab visibility changes or iframe unloads)
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason?.message || String(event.reason || '');
    if (
      reason.toLowerCase().includes('closing') ||
      reason.toLowerCase().includes('hidden') ||
      reason.toLowerCase().includes('database is closing') ||
      reason.toLowerCase().includes('failed to connect to websocket')
    ) {
      event.preventDefault();
    }
  });

  window.addEventListener('error', (event) => {
    const msg = event.message || '';
    if (
      msg.toLowerCase().includes('closing') ||
      msg.toLowerCase().includes('hidden') ||
      msg.toLowerCase().includes('database is closing')
    ) {
      event.preventDefault();
    }
  });
}

// Register PWA Service Worker in production for Offline Caching & Chrome Omnibox Install
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then((reg) => {
          console.log('[PWA] Service Worker registered with scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA] SW registration note:', err);
        });
    });

    try {
      registerSW({
        immediate: true,
        onNeedRefresh() {
          console.log('[PWA] New content available.');
        },
        onOfflineReady() {
          console.log('[PWA] App ready to work offline.');
        },
      });
    } catch (e) {
      console.warn('[PWA] Virtual SW registration note:', e);
    }
  } else {
    // In development / preview mode, ensure active service workers don't intercept Vite HMR / dev assets
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().catch(() => {});
      }
    }).catch(() => {});
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
