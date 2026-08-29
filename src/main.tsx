import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initPwaManager } from './utils/pwaManager';

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

  // Initialize PWA Service Worker & Install Event Handlers
  initPwaManager();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
