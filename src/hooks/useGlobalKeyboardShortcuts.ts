import { useEffect } from 'react';
import { useBar } from '../context/BarContext';
import { promptPwaInstall } from '../utils/pwaManager';
import { showToast } from '../utils/notificationService';

export interface ShortcutHandlers {
  onOpenPayment?: () => void;
  onConfirmCancelCart?: () => void;
  onToggleSearch?: () => void;
  onOpenBarcodeScanner?: () => void;
  onHoldTab?: () => void;
  onOpenShortcutsHelp?: () => void;
  onOpenPwaInstall?: () => void;
  onCloseActiveModal?: () => void;
}

// Global registry for currently active handlers
let currentHandlers: ShortcutHandlers = {};

export function registerShortcutHandlers(handlers: ShortcutHandlers) {
  currentHandlers = { ...currentHandlers, ...handlers };
  return () => {
    // Unregister by keeping only other handlers
    currentHandlers = {};
  };
}

export function useGlobalKeyboardShortcuts() {
  const { 
    activeTab, 
    setActiveTab, 
    cart, 
    clearCart,
    isSuperAdmin,
    currentUser
  } = useBar();

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // If user is currently typing in an input, textarea or select, allow standard keys,
      // except function keys (F1, F2, F3, F4, F8, F9) and Escape.
      const target = e.target as HTMLElement | null;
      const isInput = target && (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.tagName === 'SELECT' || 
        target.isContentEditable
      );

      // 1. ESCAPE: Close active modal or clear search
      if (e.key === 'Escape') {
        if (currentHandlers.onCloseActiveModal) {
          e.preventDefault();
          currentHandlers.onCloseActiveModal();
          return;
        }
      }

      // 2. F1: Valider & Encaisser (POS)
      if (e.key === 'F1') {
        e.preventDefault();
        if (activeTab !== 'pos') {
          setActiveTab('pos');
        }
        if (currentHandlers.onOpenPayment) {
          currentHandlers.onOpenPayment();
        } else {
          window.dispatchEvent(new CustomEvent('barexp:shortcut:payment'));
        }
        return;
      }

      // 3. F2: Annuler le ticket / Vider le panier
      if (e.key === 'F2') {
        e.preventDefault();
        if (activeTab === 'pos') {
          if (currentHandlers.onConfirmCancelCart) {
            currentHandlers.onConfirmCancelCart();
          } else {
            window.dispatchEvent(new CustomEvent('barexp:shortcut:cancel_cart'));
          }
        }
        return;
      }

      // 4. F3 or Ctrl+K / Cmd+K: Focus Search
      if (e.key === 'F3' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        if (activeTab !== 'pos') {
          setActiveTab('pos');
        }
        if (currentHandlers.onToggleSearch) {
          currentHandlers.onToggleSearch();
        } else {
          window.dispatchEvent(new CustomEvent('barexp:shortcut:search'));
        }
        return;
      }

      // 5. F4 or (Alt + B): Scanner Code-Barres
      if (e.key === 'F4' || (e.altKey && e.key.toLowerCase() === 'b')) {
        e.preventDefault();
        if (activeTab !== 'pos') {
          setActiveTab('pos');
        }
        if (currentHandlers.onOpenBarcodeScanner) {
          currentHandlers.onOpenBarcodeScanner();
        } else {
          window.dispatchEvent(new CustomEvent('barexp:shortcut:scanner'));
        }
        return;
      }

      // 6. F8: Garder en Fiche (Hold Tab)
      if (e.key === 'F8') {
        e.preventDefault();
        if (activeTab === 'pos') {
          if (currentHandlers.onHoldTab) {
            currentHandlers.onHoldTab();
          } else {
            window.dispatchEvent(new CustomEvent('barexp:shortcut:hold_tab'));
          }
        }
        return;
      }

      // 7. F9 or (Alt + I): Installer l'application en 1-Clic (PWA Desktop / Mobile)
      if (e.key === 'F9' || (e.altKey && e.key.toLowerCase() === 'i')) {
        e.preventDefault();
        if (currentHandlers.onOpenPwaInstall) {
          currentHandlers.onOpenPwaInstall();
        } else {
          window.dispatchEvent(new CustomEvent('barexp:shortcut:pwa_install'));
        }
        // Direct attempt to trigger browser prompt
        promptPwaInstall().then((res) => {
          if (res.outcome === 'accepted') {
            showToast({
              title: 'Application Installée',
              message: 'BarExp est maintenant installée comme application autonome !',
              type: 'success'
            });
          }
        }).catch(() => {});
        return;
      }

      // 8. Question mark (?) or (F12 / Alt + H): Show Keyboard Shortcuts Modal
      if (!isInput && (e.key === '?' || (e.altKey && e.key.toLowerCase() === 'h'))) {
        e.preventDefault();
        if (currentHandlers.onOpenShortcutsHelp) {
          currentHandlers.onOpenShortcutsHelp();
        } else {
          window.dispatchEvent(new CustomEvent('barexp:shortcut:shortcuts_modal'));
        }
        return;
      }

      // 9. Alt + 1..6: Quick Tab Switching
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        if (e.key === '1') { e.preventDefault(); setActiveTab('pos'); return; }
        if (e.key === '2') { e.preventDefault(); setActiveTab('stock'); return; }
        if (e.key === '3') { e.preventDefault(); setActiveTab('expenses'); return; }
        if (e.key === '4') { e.preventDefault(); setActiveTab('reports'); return; }
        if (e.key === '5') { e.preventDefault(); setActiveTab('chat'); return; }
        if (e.key === '6') { e.preventDefault(); setActiveTab('admin'); return; }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeTab, setActiveTab, cart, clearCart, isSuperAdmin, currentUser]);
}
