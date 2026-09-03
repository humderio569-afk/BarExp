import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useBar } from '../../context/BarContext';
import { Category, Product } from '../../types';
import { renderCategoryIcon } from '../Stock/CategoryManagerModal';
import { FlavorSelectionModal } from './FlavorSelectionModal';
import { QuickQuantityModal } from './QuickQuantityModal';
import { AddProductModal } from '../Stock/AddProductModal';
import { 
  POSDisplaySettingsModal, 
  POSDisplayPreferences, 
  DEFAULT_DISPLAY_PREFERENCES 
} from './POSDisplaySettingsModal';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { CashierNamePromptModal } from './CashierNamePromptModal';
import { 
  Search, 
  Package, 
  Plus, 
  Minus,
  Check, 
  AlertCircle, 
  Image as ImageIcon, 
  X,
  SlidersHorizontal,
  Calculator,
  ScanBarcode,
  Lock
} from 'lucide-react';
import { safeGetItem, safeSetItem } from '../../utils/storage';
import { showToast } from '../../utils/notificationService';

const DISPLAY_PREFS_STORAGE_KEY = 'barexpress_pos_display_prefs_v1';

export const POSGrid: React.FC = () => {
  const {
    products,
    categories,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    addToCart,
    removeFromCart,
    cart,
    settings,
    activeCompany,
    isSuperAdmin,
    currentUser,
  } = useBar();

  // Active Company settings verification:
  // By default, scanner is strictly disabled for all companies.
  // It can ONLY be activated by the Super Admin for this company.
  const isCompanyScannerEnabled = useMemo(() => {
    return activeCompany?.allowCameraScanner === true;
  }, [activeCompany?.allowCameraScanner]);

  // First-time or incomplete name cashier verification
  const isNameIncomplete = useMemo(() => {
    if (!currentUser) return false;
    const name = (currentUser.displayName || '').trim();
    if (name.length < 3) return true;
    if (name.includes('@')) return true;
    if (currentUser.email && name.toLowerCase() === currentUser.email.split('@')[0].toLowerCase()) return true;
    return false;
  }, [currentUser]);

  const [isCashierNameModalOpen, setIsCashierNameModalOpen] = useState(false);

  useEffect(() => {
    if (isNameIncomplete) {
      setIsCashierNameModalOpen(true);
    }
  }, [isNameIncomplete]);

  const [flavorProductModal, setFlavorProductModal] = useState<Product | null>(null);
  const [quickQuantityProductModal, setQuickQuantityProductModal] = useState<Product | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDisplaySettingsOpen, setIsDisplaySettingsOpen] = useState(false);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load / Save Display Preferences
  const [displayPrefs, setDisplayPrefs] = useState<POSDisplayPreferences>(() => {
    try {
      const saved = safeGetItem(DISPLAY_PREFS_STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_DISPLAY_PREFERENCES, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Error reading POS display preferences:', e);
    }
    return DEFAULT_DISPLAY_PREFERENCES;
  });

  const handleUpdateDisplayPrefs = (updated: POSDisplayPreferences) => {
    setDisplayPrefs(updated);
    safeSetItem(DISPLAY_PREFS_STORAGE_KEY, JSON.stringify(updated));
  };

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  // Keyboard Shortcuts (F3/Ctrl+K for Search, F4/B for Scanner, Escape to close)
  useEffect(() => {
    const handleSearchShortcut = () => {
      setIsSearchOpen(true);
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.select();
        }
      }, 50);
    };

    const handleScannerShortcut = () => {
      if (!isCompanyScannerEnabled) {
        showToast({
          type: 'info',
          title: 'Scanner désactivé',
          message: 'Le scanner de codes-barres est désactivé pour cet établissement. Seul le Super Administrateur peut l\'activer.'
        });
        return;
      }
      setIsBarcodeScannerOpen(true);
    };

    window.addEventListener('barexp:shortcut:search', handleSearchShortcut);
    window.addEventListener('barexp:shortcut:scanner', handleScannerShortcut);

    return () => {
      window.removeEventListener('barexp:shortcut:search', handleSearchShortcut);
      window.removeEventListener('barexp:shortcut:scanner', handleScannerShortcut);
    };
  }, [isCompanyScannerEnabled]);

  // Hardware barcode scanner integration:
  // Strictly verifies active company settings before attaching listener.
  // If deactivated by Super Admin, listener is never initialized.
  useEffect(() => {
    if (!isCompanyScannerEnabled) return;

    let buffer = '';
    let lastKeyTime = Date.now();

    const handleHardwareScan = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // Skip if user is typing in form inputs or if modals are open
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable ||
        isBarcodeScannerOpen ||
        flavorProductModal ||
        quickQuantityProductModal ||
        isAddProductModalOpen
      ) {
        return;
      }

      const now = Date.now();
      // Hardware scanners transmit characters very rapidly (< 100ms apart)
      if (now - lastKeyTime > 120) {
        buffer = '';
      }
      lastKeyTime = now;

      if (e.key === 'Enter') {
        const cleaned = buffer.trim();
        if (cleaned.length >= 3) {
          e.preventDefault();
          buffer = '';

          const found = products.find(
            p => (p.barcode && p.barcode.toLowerCase() === cleaned.toLowerCase()) ||
                 p.id.toLowerCase() === cleaned.toLowerCase()
          );

          if (found) {
            if (found.stock <= 0) {
              showToast({
                type: 'warning',
                title: 'Rupture de stock',
                message: `"${found.name}" est en rupture de stock.`
              });
            } else if (found.flavors && found.flavors.length > 0) {
              setFlavorProductModal(found);
            } else {
              addToCart(found);
              showToast({
                type: 'success',
                title: 'Produit scanné',
                message: `"${found.name}" ajouté au panier.`
              });
              try {
                const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(1800, ctx.currentTime);
                gain.gain.setValueAtTime(0.12, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.1);
              } catch (_) {}
            }
          } else {
            showToast({
              type: 'info',
              title: 'Code inconnu',
              message: `Aucun produit correspondant au code "${cleaned}".`
            });
          }
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleHardwareScan);
    return () => {
      window.removeEventListener('keydown', handleHardwareScan);
    };
  }, [
    isCompanyScannerEnabled,
    products,
    addToCart,
    isBarcodeScannerOpen,
    flavorProductModal,
    quickQuantityProductModal,
    isAddProductModalOpen,
  ]);

  const handleProductClick = (product: Product) => {
    if (product.stock <= 0) return;
    if (product.flavors && product.flavors.length > 0) {
      setFlavorProductModal(product);
    } else {
      addToCart(product);
    }
  };

  // Filter products by active category & search query
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesCategory = selectedCategory === 'Tous' || product.category === selectedCategory;
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (product.barcode && product.barcode.includes(searchQuery));
      return matchesCategory && matchesSearch && product.active;
    });
  }, [products, selectedCategory, searchQuery]);

  // Get quantity of a product currently in the cart
  const getCartQuantity = (productId: string) => {
    const item = cart.find(i => i.product.id === productId);
    return item ? item.quantity : 0;
  };

  // Compute Grid Columns CSS class dynamically
  const gridColumnsClass = useMemo(() => {
    const { viewMode, columns } = displayPrefs;
    if (viewMode === 'list') return 'flex flex-col space-y-2';

    if (viewMode === 'simple_icon') {
      switch (columns) {
        case '2': return 'grid grid-cols-2 gap-2 sm:gap-2.5';
        case '3': return 'grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5';
        case '4': return 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-2.5';
        case '5': return 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-2.5';
        case '6': return 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-2.5';
        case '8': return 'grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 sm:gap-2.5';
        case 'auto':
        default:
          return 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-2 sm:gap-2.5';
      }
    }

    // Default 'cards' view mode
    switch (columns) {
      case '2': return 'grid grid-cols-2 gap-3 sm:gap-3.5';
      case '3': return 'grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-3.5';
      case '4': return 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-3.5';
      case '5': return 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-3.5';
      case '6': return 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-3.5';
      case '8': return 'grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-3.5';
      case 'auto':
      default:
        return 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-3.5';
    }
  }, [displayPrefs]);

  // Card photo container dimensions based on card size preference
  const cardPhotoClass = useMemo(() => {
    switch (displayPrefs.cardSize) {
      case 'small':
        return 'aspect-[1/1] sm:aspect-[4/4] min-h-[120px] sm:min-h-[140px]';
      case 'large':
        return 'aspect-[3/4] min-h-[220px] sm:min-h-[270px]';
      case 'medium':
      default:
        return 'aspect-[4/5] min-h-[185px] sm:min-h-[225px]';
    }
  }, [displayPrefs.cardSize]);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      
      {/* Top Single-Line Header: Loupe + Horizontal Category Chips + Display Modes Toolbar */}
      <div className="px-2 sm:px-3 py-2 bg-white border-b border-slate-200 flex items-center gap-1.5 sm:gap-2 shrink-0 shadow-2xs">
        
        {/* Loupe / Search Toggle Button & Inline Expandable Search */}
        {isSearchOpen ? (
          <div className="flex items-center bg-slate-100 border border-amber-500 rounded-xl px-2 py-1 w-40 sm:w-56 shrink-0 shadow-inner">
            <Search className="w-3.5 h-3.5 text-amber-600 shrink-0 mr-1.5" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher (F3)..."
              className="w-full bg-transparent text-slate-900 placeholder-slate-400 text-xs font-semibold focus:outline-none"
            />
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                title="Effacer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={() => setIsSearchOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                title="Fermer la recherche"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={() => setIsSearchOpen(true)}
            className={`p-2 rounded-xl text-xs font-bold transition shrink-0 flex items-center justify-center cursor-pointer border ${
              searchQuery
                ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
            title="Rechercher un produit (Raccourci: F3 ou Ctrl+K)"
          >
            <Search className="w-4 h-4" />
            {searchQuery ? (
              <span className="ml-1 text-[10px] max-w-[60px] truncate hidden sm:inline">
                {searchQuery}
              </span>
            ) : (
              <kbd className="ml-1 hidden xl:inline-block px-1 py-0.2 bg-white text-slate-600 border border-slate-300 rounded font-mono text-[9px] font-black">
                F3
              </kbd>
            )}
          </button>
        )}

        {/* Single Line Horizontal Scrollable Category Chips */}
        <div className="flex-1 flex items-center gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none py-0.5 scroll-smooth">
          <button
            onClick={() => setSelectedCategory('Tous')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-xs cursor-pointer shrink-0 ${
              selectedCategory === 'Tous'
                ? 'bg-amber-500 text-slate-950 shadow-amber-500/20'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Tous ({products.length})</span>
          </button>

          {categories.map(cat => {
            const count = products.filter(p => p.category === cat.name).length;
            const isSelected = selectedCategory === cat.name;

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.name)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-xs border cursor-pointer shrink-0 ${
                  isSelected
                    ? `${cat.color || 'bg-amber-600'} text-white border-transparent shadow-md ring-2 ring-amber-400/50`
                    : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                }`}
              >
                {renderCategoryIcon(cat.icon, "w-3.5 h-3.5")}
                <span>{cat.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isSelected ? 'bg-black/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Actions Toolbar: Scanner (if enabled by Super Admin) + Display Settings */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isCompanyScannerEnabled && (
            <button
              onClick={() => setIsBarcodeScannerOpen(true)}
              className="p-2 sm:px-3 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-xs active:scale-95 border bg-slate-900 hover:bg-slate-800 text-amber-400 border-slate-800"
              title="Scanner des codes-barres avec la caméra (Raccourci: F4)"
            >
              <ScanBarcode className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-black hidden sm:inline">
                Scanner
              </span>
              <kbd className="hidden lg:inline-block px-1 py-0.2 bg-slate-800 text-amber-300 rounded font-mono text-[9px] font-black">
                F4
              </kbd>
            </button>
          )}

          <button
            onClick={() => setIsDisplaySettingsOpen(true)}
            className="p-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition flex items-center space-x-1.5 cursor-pointer shadow-2xs hover:text-slate-900 active:scale-95"
            title="Personnaliser l'affichage des produits (modes, tailles, colonnes)"
          >
            <SlidersHorizontal className="w-4 h-4 text-slate-600" />
            <span className="text-xs font-bold hidden md:inline">Affichage</span>
          </button>
        </div>

      </div>

      {/* Main Products Container */}
      <div className="flex-1 overflow-y-auto p-2.5 sm:p-4 pb-36 sm:pb-40 md:pb-12">
        {filteredProducts.length === 0 ? (
          <div className="h-72 flex flex-col items-center justify-center text-center p-6 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-white space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
              <Package className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">
                {products.length === 0 ? "La caisse est vide (aucun produit)" : "Aucun produit trouvé"}
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                {products.length === 0
                  ? "Votre catalogue est actuellement vide pour cet établissement. Ajoutez votre premier produit pour commencer vos encaissements."
                  : "Aucun produit ne correspond à vos filtres ou à votre recherche actuelle."}
              </p>
            </div>
            {products.length === 0 ? (
              <button
                type="button"
                onClick={() => setIsAddProductModalOpen(true)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-2xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Ajouter un Produit</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('Tous');
                  setSearchQuery('');
                }}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition cursor-pointer"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        ) : displayPrefs.viewMode === 'cards' ? (
          /* ================= MODE 1: CARTES PHOTOS ================= */
          <div className={gridColumnsClass}>
            {filteredProducts.map(product => {
              const inCartQty = getCartQuantity(product.id);
              const isOutOfStock = product.stock <= 0;
              const isLowStock = product.stock > 0 && product.stock <= product.minStockAlert;

              return (
                <button
                  key={product.id}
                  disabled={isOutOfStock}
                  onClick={() => handleProductClick(product)}
                  className={`group relative text-left rounded-2xl transition-all duration-200 border flex flex-col justify-between shadow-2xs hover:shadow-md hover:-translate-y-0.5 active:scale-95 touch-manipulation select-none overflow-hidden ${
                    isOutOfStock
                      ? 'bg-slate-50 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed'
                      : inCartQty > 0
                        ? 'bg-white border-amber-500 ring-2 ring-amber-500/50 text-slate-900 shadow-md'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-900'
                  }`}
                >
                  {/* Interactive Checkbox / Toggle Badge (Top Left of Photo) */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isOutOfStock) return;
                      if (inCartQty > 0) {
                        removeFromCart(product.id);
                      } else {
                        handleProductClick(product);
                      }
                    }}
                    className={`absolute top-2 left-2 z-20 px-2 py-1 rounded-lg shadow-md border text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer select-none ${
                      inCartQty > 0
                        ? 'bg-amber-500 text-slate-950 border-amber-400 hover:bg-red-500 hover:text-white hover:border-red-400'
                        : 'bg-white/95 text-slate-600 border-slate-300 hover:bg-slate-100 hover:text-slate-900 backdrop-blur-xs'
                    }`}
                    title={inCartQty > 0 ? "Décocher (retirer du panier)" : "Cocher (ajouter au panier)"}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition ${
                      inCartQty > 0 ? 'bg-slate-950 text-amber-400 border-slate-950' : 'bg-white border-slate-400'
                    }`}>
                      {inCartQty > 0 && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span>{inCartQty > 0 ? `${inCartQty}` : 'Cocher'}</span>
                  </div>

                  {/* Quick Large Quantity Trigger (Top Right of Card) */}
                  {!isOutOfStock && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setQuickQuantityProductModal(product);
                      }}
                      className="absolute top-2 right-2 z-20 px-2 py-1 rounded-lg shadow-md border text-xs font-black bg-slate-900/90 text-amber-400 border-slate-700 hover:bg-amber-500 hover:text-slate-950 hover:border-amber-400 transition-all flex items-center space-x-1 cursor-pointer select-none backdrop-blur-xs"
                      title="Saisie directe d'une grande quantité (ex: 24, 48, 100...)"
                    >
                      <Calculator className="w-3 h-3" />
                      <span>Qté</span>
                    </div>
                  )}

                  {/* Photo Container */}
                  {displayPrefs.showImages && (
                    <div className={`relative w-full ${cardPhotoClass} overflow-hidden bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center`}>
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-300">
                          <ImageIcon className="w-10 h-10 opacity-30" />
                        </div>
                      )}

                      {/* Discreet Unit & Flavor Badges */}
                      <div className="absolute bottom-1.5 right-1.5 z-10 flex items-center space-x-1">
                        {product.flavors && product.flavors.length > 0 && (
                          <span className="text-[9px] font-black text-amber-950 bg-amber-400/95 backdrop-blur-xs px-1.5 py-0.5 rounded-full border border-amber-300 shadow-2xs">
                            {product.flavors.length} Parfums
                          </span>
                        )}
                        <span className="text-[9px] font-bold text-slate-700 bg-white/95 backdrop-blur-xs px-1.5 py-0.5 rounded-full border border-slate-200 shadow-2xs pointer-events-auto">
                          {product.unit}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Details Container */}
                  <div className="p-2 sm:p-2.5 bg-white flex flex-col justify-between gap-1 border-t border-slate-100 flex-1">
                    <h3 className="font-extrabold text-xs sm:text-[13px] leading-tight text-slate-900 group-hover:text-amber-600 transition-colors line-clamp-1 sm:line-clamp-2">
                      {product.name}
                    </h3>

                    {/* Bottom Row: Price & Stock Status */}
                    <div className="flex flex-wrap items-baseline justify-between gap-1 pt-1 border-t border-slate-100 mt-auto">
                      <div className="font-black text-xs sm:text-sm text-amber-600 tracking-tight shrink-0 whitespace-nowrap">
                        {product.price.toLocaleString()} <span className="text-[9px] font-bold text-slate-500">{settings.currency}</span>
                      </div>

                      {/* Stock Status Badge */}
                      {displayPrefs.showStockBadges && (
                        <div className="shrink-0">
                          {isOutOfStock ? (
                            <span className="text-[8px] sm:text-[9px] font-black text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-md flex items-center space-x-0.5 whitespace-nowrap">
                              <AlertCircle className="w-2.5 h-2.5" />
                              <span>Rupture</span>
                            </span>
                          ) : isLowStock ? (
                            <span className="text-[8px] sm:text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                              Reste: {product.stock}
                            </span>
                          ) : (
                            <span className="text-[8px] sm:text-[9px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                              Reste: {product.stock}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                </button>
              );
            })}
          </div>
        ) : displayPrefs.viewMode === 'simple_icon' ? (
          /* ================= MODE 2: ICÔNE SIMPLE / TACTILE RAPIDE ================= */
          <div className={gridColumnsClass}>
            {filteredProducts.map(product => {
              const inCartQty = getCartQuantity(product.id);
              const isOutOfStock = product.stock <= 0;
              const isLowStock = product.stock > 0 && product.stock <= product.minStockAlert;

              return (
                <button
                  key={product.id}
                  disabled={isOutOfStock}
                  onClick={() => handleProductClick(product)}
                  className={`group relative text-left p-2.5 sm:p-3 rounded-2xl transition-all duration-150 border flex flex-col justify-between shadow-2xs hover:shadow-md active:scale-95 touch-manipulation select-none ${
                    isOutOfStock
                      ? 'bg-slate-100/70 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed'
                      : inCartQty > 0
                        ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/40 text-slate-900 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-amber-400 text-slate-900'
                  }`}
                >
                  {/* Top Bar: Mini Icon / Thumbnail + Cart Qty Badge */}
                  <div className="flex items-center justify-between w-full mb-1.5">
                    {/* Category Icon or Mini Thumbnail */}
                    <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                      {product.image && displayPrefs.showImages ? (
                        <img 
                          src={product.image} 
                          alt={product.name} 
                          className="w-full h-full object-cover" 
                          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                        />
                      ) : (
                        <Package className="w-4 h-4 text-slate-600" />
                      )}
                    </div>

                    {/* Cart Quantity Badge or Quick Add Icon */}
                    <div className="flex items-center space-x-1">
                      {!isOutOfStock && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setQuickQuantityProductModal(product);
                          }}
                          className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-900 hover:text-amber-400 text-slate-600 flex items-center justify-center transition cursor-pointer"
                          title="Saisie directe grande quantité"
                        >
                          <Calculator className="w-3 h-3" />
                        </div>
                      )}

                      {inCartQty > 0 ? (
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFromCart(product.id);
                          }}
                          className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[11px] font-black shadow-xs flex items-center space-x-1 hover:bg-red-500 hover:text-white transition cursor-pointer"
                          title="Retirer une unité"
                        >
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>{inCartQty}</span>
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-lg bg-slate-100 group-hover:bg-amber-500 group-hover:text-slate-950 text-slate-500 flex items-center justify-center transition">
                          <Plus className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Product Title */}
                  <h4 className="font-extrabold text-xs sm:text-[13px] leading-tight text-slate-900 line-clamp-2 mb-1 group-hover:text-amber-700">
                    {product.name}
                  </h4>

                  {/* Bottom: Price & Stock Tag (Never overlapping) */}
                  <div className="flex flex-wrap items-baseline justify-between gap-1 pt-1 border-t border-slate-100/80 mt-auto w-full">
                    <div className="font-black text-xs sm:text-sm text-amber-600 whitespace-nowrap shrink-0">
                      {product.price.toLocaleString()} <span className="text-[9px] font-bold text-slate-400">{settings.currency}</span>
                    </div>

                    {displayPrefs.showStockBadges && (
                      <span className={`text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 whitespace-nowrap ${
                        isOutOfStock 
                          ? 'bg-red-100 text-red-700' 
                          : isLowStock 
                            ? 'bg-amber-100 text-amber-800' 
                            : 'bg-slate-100 text-slate-500'
                      }`}>
                        {isOutOfStock ? '0' : product.stock}
                      </span>
                    )}
                  </div>

                  {/* Flavors indicator */}
                  {product.flavors && product.flavors.length > 0 && (
                    <div className="mt-1 text-[8px] font-black text-amber-800 bg-amber-100/80 rounded px-1 text-center truncate w-full">
                      {product.flavors.length} parfums au choix
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          /* ================= MODE 3: LISTE COMPACTE / LIGNES DÉTAILLÉES ================= */
          <div className="space-y-1.5">
            {filteredProducts.map(product => {
              const inCartQty = getCartQuantity(product.id);
              const isOutOfStock = product.stock <= 0;
              const isLowStock = product.stock > 0 && product.stock <= product.minStockAlert;

              return (
                <div
                  key={product.id}
                  className={`p-2.5 sm:p-3 rounded-2xl border transition-all flex items-center justify-between gap-2.5 sm:gap-3 shadow-2xs ${
                    isOutOfStock
                      ? 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                      : inCartQty > 0
                        ? 'bg-amber-50/50 border-amber-400 ring-1 ring-amber-400 text-slate-900 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-900'
                  }`}
                >
                  {/* Left: Thumbnail & Info */}
                  <div 
                    onClick={() => handleProductClick(product)}
                    className="flex items-center space-x-2.5 sm:space-x-3 flex-1 min-w-0 cursor-pointer"
                  >
                    {/* Thumbnail */}
                    {displayPrefs.showImages && (
                      <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                        {product.image ? (
                          <img 
                            src={product.image} 
                            alt={product.name} 
                            className="w-full h-full object-cover" 
                            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                          />
                        ) : (
                          <Package className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                        )}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">
                          {product.name}
                        </h4>
                        {product.flavors && product.flavors.length > 0 && (
                          <span className="text-[9px] font-black text-amber-900 bg-amber-100 px-1.5 py-0.2 rounded-full shrink-0">
                            {product.flavors.length} parfums
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 text-[11px] text-slate-500 flex-wrap">
                        <span className="bg-slate-100 px-1.5 py-0.2 rounded text-[10px] font-medium text-slate-600">
                          {product.category}
                        </span>
                        <span>•</span>
                        <span>{product.unit}</span>
                        {displayPrefs.showStockBadges && (
                          <>
                            <span>•</span>
                            <span className={`whitespace-nowrap ${isOutOfStock ? 'text-red-600 font-bold' : isLowStock ? 'text-amber-700 font-bold' : 'text-slate-600'}`}>
                              Stock: {product.stock}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Price & Fast Cart Controls */}
                  <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
                    <div className="text-right whitespace-nowrap">
                      <div className="font-black text-xs sm:text-base text-amber-600">
                        {product.price.toLocaleString()} <span className="text-[10px] font-bold text-slate-400">{settings.currency}</span>
                      </div>
                    </div>

                    {/* Stepper / Action Button */}
                    {isOutOfStock ? (
                      <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-xl border border-red-200 whitespace-nowrap">
                        Rupture
                      </span>
                    ) : inCartQty > 0 ? (
                      <div className="flex items-center space-x-1 sm:space-x-1.5">
                        <div className="flex items-center space-x-1 bg-amber-100 border border-amber-300 rounded-xl p-0.5">
                          <button
                            onClick={() => removeFromCart(product.id)}
                            className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white text-slate-900 hover:bg-red-500 hover:text-white flex items-center justify-center shadow-xs transition cursor-pointer"
                            title="Diminuer"
                          >
                            <Minus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          </button>
                          <span className="w-5 sm:w-6 text-center font-black text-xs text-amber-950">
                            {inCartQty}
                          </span>
                          <button
                            onClick={() => handleProductClick(product)}
                            className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-600 flex items-center justify-center shadow-xs transition cursor-pointer"
                            title="Ajouter"
                          >
                            <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setQuickQuantityProductModal(product)}
                          className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-slate-100 hover:bg-slate-900 hover:text-amber-400 text-slate-700 font-bold border border-slate-200 flex items-center justify-center transition cursor-pointer"
                          title="Saisie directe grande quantité"
                        >
                          <Calculator className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1 sm:space-x-1.5">
                        <button
                          onClick={() => handleProductClick(product)}
                          className="py-1 sm:py-1.5 px-2 sm:px-3 rounded-xl bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-amber-400 font-bold text-xs shadow-xs transition flex items-center space-x-1 cursor-pointer whitespace-nowrap"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Ajouter</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuickQuantityProductModal(product)}
                          className="p-1 sm:p-1.5 rounded-xl bg-slate-100 hover:bg-slate-900 hover:text-amber-400 text-slate-700 font-bold border border-slate-200 shadow-2xs transition flex items-center space-x-1 cursor-pointer"
                          title="Saisie directe grande quantité"
                        >
                          <Calculator className="w-3.5 h-3.5 text-amber-600" />
                          <span className="hidden sm:inline text-[11px]">Qté</span>
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Flavor Selection Modal */}
      {flavorProductModal && (
        <FlavorSelectionModal
          product={flavorProductModal}
          currency={settings.currency}
          onClose={() => setFlavorProductModal(null)}
          onSelectFlavor={(flavor, qty = 1) => {
            addToCart(flavorProductModal, qty, flavor);
            setFlavorProductModal(null);
          }}
        />
      )}

      {/* Quick Quantity / Touch Numpad Modal for adding products in bulk */}
      {quickQuantityProductModal && (
        <QuickQuantityModal
          product={quickQuantityProductModal}
          currentQuantity={getCartQuantity(quickQuantityProductModal.id)}
          initialFlavor={quickQuantityProductModal.flavors && quickQuantityProductModal.flavors.length > 0 ? quickQuantityProductModal.flavors[0] : undefined}
          isEditingCartItem={false}
          currency={settings.currency}
          onClose={() => setQuickQuantityProductModal(null)}
          onConfirm={(qty, flavor) => {
            addToCart(quickQuantityProductModal, qty, flavor);
            setQuickQuantityProductModal(null);
          }}
        />
      )}

      {/* Display Customization Modal */}
      {isDisplaySettingsOpen && (
        <POSDisplaySettingsModal
          preferences={displayPrefs}
          onChange={handleUpdateDisplayPrefs}
          onClose={() => setIsDisplaySettingsOpen(false)}
        />
      )}

      {/* Barcode Camera Scanner Modal - strictly mounted only if enabled by Super Admin for active company */}
      {isCompanyScannerEnabled && (
        <BarcodeScannerModal
          isOpen={isBarcodeScannerOpen}
          onClose={() => setIsBarcodeScannerOpen(false)}
        />
      )}

      {/* Add Product Modal (accessible directly from empty cash register) */}
      {isAddProductModalOpen && (
        <AddProductModal
          onClose={() => setIsAddProductModalOpen(false)}
        />
      )}

      {/* Mandatory Cashier Full Name Prompt Modal */}
      <CashierNamePromptModal
        isOpen={isCashierNameModalOpen}
        onClose={() => setIsCashierNameModalOpen(false)}
      />

    </div>
  );
};
