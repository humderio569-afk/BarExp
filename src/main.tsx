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

// Register PWA Service Worker for Offline Caching & All-Device PWA Support
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then((reg) => {
          console.log('[PWA] Service Worker registered with scope:', reg.scope);

          // Check for service worker updates on tab focus
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
              reg.update().catch(() => {});
            }
          });
        })
        .catch((err) => {
          console.warn('[PWA] SW registration notice:', err);
        });
    });
  } else {
    // In development / preview mode, ensure active service workers don't intercept Vite dev assets
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
