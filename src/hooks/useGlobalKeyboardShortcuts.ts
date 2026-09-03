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
  onConfirmActiveModal?: () => void;
}

// Global registry for currently active handlers
let currentHandlers: ShortcutHandlers = {};

export function registerShortcutHandlers(handlers: ShortcutHandlers) {
  const previous = { ...currentHandlers };
  currentHandlers = { ...currentHandlers, ...handlers };
  return () => {
    // Only remove the keys that were registered by this caller, restoring previous if any
    Object.keys(handlers).forEach((k) => {
      const key = k as keyof ShortcutHandlers;
      if (currentHandlers[key] === handlers[key]) {
        if (previous[key]) {
          currentHandlers[key] = previous[key];
        } else {
          delete currentHandlers[key];
        }
      }
    });
  };
}

export function useGlobalKeyboardShortcuts() {
  const { 
    activeTab, 
    setActiveTab, 
    cart, 
    clearCart,
    isSuperAdmin,
    currentUser,
    activeCompany,
  } = useBar();

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInputField = Boolean(target && (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.tagName === 'SELECT' || 
        target.isContentEditable
      ));
      const isButton = Boolean(target && target.tagName === 'BUTTON');

      const isCtrl = e.ctrlKey || e.metaKey;
      const keyLower = e.key.toLowerCase();
      const code = e.code || '';
      const isEnter = e.key === 'Enter' || code === 'Enter' || code === 'NumpadEnter';
      const isEscape = e.key === 'Escape' || code === 'Escape';
      const isF1 = e.key === 'F1' || code === 'F1';
      const isF2 = e.key === 'F2' || code === 'F2';
      const isF3 = e.key === 'F3' || code === 'F3';
      const isF4 = e.key === 'F4' || code === 'F4';
      const isF8 = e.key === 'F8' || code === 'F8';
      const isF9 = e.key === 'F9' || code === 'F9';

      // 1. ESCAPE: Close active modal or cancel current operation
      if (isEscape) {
        if (currentHandlers.onCloseActiveModal) {
          e.preventDefault();
          currentHandlers.onCloseActiveModal();
          return;
        }
      }

      // 2. ENCAISSER / VALIDER (Payment / Checkout / Confirm)
      // Works via:
      // - F1
      // - Ctrl + Enter / Cmd + Enter (even while typing in inputs)
      // - Alt + Enter
      // - Ctrl + P / Cmd + P (standard POS payment shortcut; overrides browser print)
      const isPayShortcut = isF1 || 
        (isCtrl && (isEnter || keyLower === 'p' || code === 'KeyP')) ||
        (e.altKey && isEnter);

      if (isPayShortcut) {
        e.preventDefault();
        if (currentHandlers.onConfirmActiveModal) {
          currentHandlers.onConfirmActiveModal();
          return;
        }
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

      // Plain Enter (when NOT typing in a form input/textarea and NOT focused on a button)
      if (isEnter && !isInputField && !isButton && !isCtrl && !e.altKey) {
        if (currentHandlers.onConfirmActiveModal) {
          e.preventDefault();
          currentHandlers.onConfirmActiveModal();
          return;
        }
        if (activeTab === 'pos' && cart.length > 0) {
          e.preventDefault();
          if (currentHandlers.onOpenPayment) {
            currentHandlers.onOpenPayment();
          } else {
            window.dispatchEvent(new CustomEvent('barexp:shortcut:payment'));
          }
          return;
        }
      }

      // 3. ANNULER LE TICKET / VIDER LE PANIER
      // Works via:
      // - F2
      // - Ctrl + D / Cmd + D (overrides browser bookmark)
      // - Alt + D
      // - Ctrl + Backspace / Ctrl + Delete (when not editing an input)
      const isCancelCartShortcut = isF2 || 
        (isCtrl && (keyLower === 'd' || code === 'KeyD')) || 
        (e.altKey && (keyLower === 'd' || code === 'KeyD')) ||
        (isCtrl && !isInputField && (e.key === 'Backspace' || e.key === 'Delete' || code === 'Backspace' || code === 'Delete'));

      if (isCancelCartShortcut) {
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

      // 4. RECHERCHER UN PRODUIT
      // Works via:
      // - F3
      // - Ctrl + F / Cmd + F (overrides browser in-page search to open POS product search)
      // - Ctrl + K / Cmd + K
      // - Alt + F
      const isSearchShortcut = isF3 || 
        (isCtrl && (keyLower === 'f' || code === 'KeyF' || keyLower === 'k' || code === 'KeyK')) ||
        (e.altKey && (keyLower === 'f' || code === 'KeyF'));

      if (isSearchShortcut) {
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

      // 5. SCANNER CODE-BARRES
      // Works via:
      // - F4
      // - Ctrl + B / Cmd + B
      // - Alt + B
      const isScannerShortcut = isF4 || 
        (isCtrl && (keyLower === 'b' || code === 'KeyB')) || 
        (e.altKey && (keyLower === 'b' || code === 'KeyB'));

      if (isScannerShortcut) {
        e.preventDefault();
        const isCompanyScannerEnabled = activeCompany?.allowCameraScanner === true;
        if (!isCompanyScannerEnabled) {
          showToast({
            type: 'info',
            title: 'Scanner désactivé',
            message: 'Le scanner de codes-barres est désactivé pour cet établissement par le Super Admin.'
          });
          return;
        }
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

      // 6. GARDER EN FICHE (Hold Tab)
      // Works via:
      // - F8
      // - Ctrl + S / Cmd + S (overrides browser save webpage dialog)
      // - Alt + S
      const isHoldTabShortcut = isF8 || 
        (isCtrl && (keyLower === 's' || code === 'KeyS')) ||
        (e.altKey && (keyLower === 's' || code === 'KeyS'));

      if (isHoldTabShortcut) {
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

      // 7. INSTALLER APPLICATION (PWA)
      // Works via:
      // - F9
      // - Alt + I
      // - Ctrl + I
      if (isF9 || ((e.altKey || isCtrl) && (keyLower === 'i' || code === 'KeyI'))) {
        e.preventDefault();
        if (currentHandlers.onOpenPwaInstall) {
          currentHandlers.onOpenPwaInstall();
        } else {
          window.dispatchEvent(new CustomEvent('barexp:shortcut:pwa_install'));
        }
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

      // 8. AIDE RACCOURCIS CLAVIER
      // Works via:
      // - Question mark (?) when not typing in input
      // - Ctrl + H / Cmd + H
      // - Ctrl + / or Cmd + /
      // - Alt + H
      const isHelpShortcut = (!isInputField && e.key === '?') || 
        (isCtrl && (keyLower === 'h' || code === 'KeyH' || e.key === '/' || e.key === '?')) ||
        (e.altKey && (keyLower === 'h' || code === 'KeyH'));

      if (isHelpShortcut) {
        e.preventDefault();
        if (currentHandlers.onOpenShortcutsHelp) {
          currentHandlers.onOpenShortcutsHelp();
        } else {
          window.dispatchEvent(new CustomEvent('barexp:shortcut:shortcuts_modal'));
        }
        return;
      }

      // 9. NAVIGATION RAPIDE ENTRE ONGLETS (Ctrl + 1..6 ou Alt + 1..6)
      // Supports QWERTY and AZERTY layout keys (&, é, ", ', (, -)
      if ((isCtrl || e.altKey) && !e.shiftKey) {
        const tabKey = e.key;
        if (tabKey === '1' || tabKey === '&' || code === 'Digit1' || code === 'Numpad1') { 
          e.preventDefault(); 
          setActiveTab('pos'); 
          return; 
        }
        if (tabKey === '2' || tabKey === 'é' || code === 'Digit2' || code === 'Numpad2') { 
          e.preventDefault(); 
          setActiveTab('stock'); 
          return; 
        }
        if (tabKey === '3' || tabKey === '"' || code === 'Digit3' || code === 'Numpad3') { 
          e.preventDefault(); 
          setActiveTab('expenses'); 
          return; 
        }
        if (tabKey === '4' || tabKey === "'" || code === 'Digit4' || code === 'Numpad4') { 
          e.preventDefault(); 
          setActiveTab('reports'); 
          return; 
        }
        if (tabKey === '5' || tabKey === '(' || code === 'Digit5' || code === 'Numpad5') { 
          e.preventDefault(); 
          setActiveTab('chat'); 
          return; 
        }
        if (tabKey === '6' || tabKey === '-' || code === 'Digit6' || code === 'Numpad6') { 
          e.preventDefault(); 
          setActiveTab('admin'); 
          return; 
        }
      }
    };

    // Use capture: true so browser built-in shortcuts (F1 Help, Ctrl+P Print, Ctrl+S Save, Ctrl+F Find)
    // are intercepted cleanly and reliably on all computers
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [activeTab, setActiveTab, cart, clearCart, isSuperAdmin, currentUser, activeCompany]);
}
