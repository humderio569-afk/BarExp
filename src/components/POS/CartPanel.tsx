import React, { useState, useEffect } from 'react';
import { useBar } from '../../context/BarContext';
import { PaymentModal } from './PaymentModal';
import { ReceiptModal } from './ReceiptModal';
import { QuickQuantityModal } from './QuickQuantityModal';
import { CustomPriceModal } from './CustomPriceModal';
import { registerShortcutHandlers } from '../../hooks/useGlobalKeyboardShortcuts';
import { Sale, Product, CartItem } from '../../types';
import { 
  ShoppingBag, 
  Trash2, 
  Plus, 
  Minus, 
  Tag, 
  CreditCard, 
  Clock, 
  User, 
  UtensilsCrossed, 
  ChevronUp, 
  X,
  AlertTriangle,
  AlertCircle,
  Calculator,
  Gavel,
  Coins,
  Edit2,
  Keyboard
} from 'lucide-react';

export const CartPanel: React.FC = () => {
  const {
    cart,
    updateCartItemQuantity,
    updateCartItemUnitPrice,
    applyCartItemDiscount,
    removeFromCart,
    clearCart,
    cartSubtotal,
    cartDiscountTotal,
    cartTotal,
    activeTable,
    setActiveTable,
    saveTabToTable,
    settings,
  } = useBar();

  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const [editingDiscountId, setEditingDiscountId] = useState<string | null>(null);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [editingQuantityItem, setEditingQuantityItem] = useState<{
    product: Product;
    quantity: number;
    selectedFlavor?: string;
  } | null>(null);
  const [editingPriceItem, setEditingPriceItem] = useState<CartItem | null>(null);

  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  const tablesList = ['Comptoir', 'Table 1', 'Table 2', 'Table 3', 'Table 4', 'VIP 1', 'VIP 2', 'Terrasse'];

  const handleSaleSuccess = (completedSale: Sale) => {
    setLastSale(completedSale);
    setIsPaymentOpen(false);
    setIsReceiptOpen(true);
  };

  const handleHoldTab = () => {
    if (cart.length === 0) return;
    saveTabToTable(activeTable);
    alert(`Fiche sauvegardée pour ${activeTable}`);
  };

  // Connect Keyboard Shortcuts (F1, F2, F8, Escape) to Cart Actions
  useEffect(() => {
    const unregister = registerShortcutHandlers({
      onOpenPayment: () => {
        if (cart.length > 0) {
          setIsPaymentOpen(true);
        }
      },
      onConfirmCancelCart: () => {
        if (cart.length > 0) {
          setIsCancelConfirmOpen(true);
        }
      },
      onHoldTab: () => {
        if (cart.length > 0) {
          handleHoldTab();
        }
      },
      onCloseActiveModal: () => {
        if (isCancelConfirmOpen) setIsCancelConfirmOpen(false);
        else if (isPaymentOpen) setIsPaymentOpen(false);
        else if (isReceiptOpen) setIsReceiptOpen(false);
        else if (editingQuantityItem) setEditingQuantityItem(null);
        else if (editingPriceItem) setEditingPriceItem(null);
      }
    });

    const handleShortcutPaymentEvent = () => {
      if (cart.length > 0) setIsPaymentOpen(true);
    };
    const handleShortcutCancelEvent = () => {
      if (cart.length > 0) setIsCancelConfirmOpen(true);
    };
    const handleShortcutHoldTabEvent = () => {
      if (cart.length > 0) handleHoldTab();
    };

    window.addEventListener('barexp:shortcut:payment', handleShortcutPaymentEvent);
    window.addEventListener('barexp:shortcut:cancel_cart', handleShortcutCancelEvent);
    window.addEventListener('barexp:shortcut:hold_tab', handleShortcutHoldTabEvent);

    return () => {
      unregister();
      window.removeEventListener('barexp:shortcut:payment', handleShortcutPaymentEvent);
      window.removeEventListener('barexp:shortcut:cancel_cart', handleShortcutCancelEvent);
      window.removeEventListener('barexp:shortcut:hold_tab', handleShortcutHoldTabEvent);
    };
  }, [cart, isCancelConfirmOpen, isPaymentOpen, isReceiptOpen, editingQuantityItem, editingPriceItem, activeTable]);

  return (
    <>
      {/* Container - Responsive Sidebar on Desktop, Drawer/Sheet on Mobile */}
      <div className={`fixed inset-x-0 bottom-16 z-30 md:static md:bottom-0 md:inset-x-auto md:w-96 lg:w-[400px] bg-white border-t md:border-t-0 md:border-l border-slate-200 flex flex-col h-[75vh] md:h-full transition-transform duration-300 shadow-2xl ${
        isMobileExpanded ? 'translate-y-0' : 'translate-y-[calc(100%-4rem)] md:translate-y-0'
      }`}>
        
        {/* Mobile Header Toggle Bar */}
        <div 
          onClick={() => setIsMobileExpanded(!isMobileExpanded)}
          className="md:hidden h-16 bg-white border-b border-slate-200 px-4 flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center space-x-3">
            <div className="relative">
              <ShoppingBag className="w-6 h-6 text-amber-600" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-amber-500 text-slate-950 text-xs font-black w-5 h-5 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider">
                Commande en cours ({activeTable})
              </p>
              <p className="text-base font-black text-amber-600">
                {cartTotal.toLocaleString()} {settings.currency}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (cart.length > 0) setIsPaymentOpen(true);
              }}
              disabled={cart.length === 0}
              className="bg-amber-500 disabled:opacity-50 text-slate-950 font-black px-4 py-2 rounded-xl text-xs flex items-center space-x-1"
            >
              <span>PAYER</span>
            </button>
            <ChevronUp className={`w-5 h-5 text-slate-500 transition-transform ${isMobileExpanded ? 'rotate-180' : ''}`} />
          </div>
        </div>

        {/* Header (Desktop & Mobile expanded) */}
        <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShoppingBag className="w-5 h-5 text-amber-600" />
            <h2 className="font-bold text-slate-900 text-base">Commande Actuelle</h2>
            <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
              {cartCount} art.
            </span>
          </div>

          {cart.length > 0 && (
            <button
              onClick={() => setIsCancelConfirmOpen(true)}
              className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center space-x-1.5 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg transition border border-red-200 cursor-pointer"
              title="Annuler le ticket (Raccourci: F2)"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Vider</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.2 bg-red-100 text-red-800 border border-red-300 rounded font-mono text-[10px] font-black">
                F2
              </kbd>
            </button>
          )}
        </div>

        {/* Table / Tab Selector Bar */}
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center space-x-2 overflow-x-auto scrollbar-none">
          <UtensilsCrossed className="w-4 h-4 text-slate-500 shrink-0" />
          <span className="text-xs font-semibold text-slate-500 shrink-0">Emplacement:</span>
          {tablesList.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTable(tab)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                activeTable === tab
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <ShoppingBag className="w-12 h-12 mb-2 text-slate-300 stroke-1" />
              <p className="text-sm font-semibold text-slate-600">Votre panier est vide</p>
              <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
                Touchez les boissons ou plats sur le menu tactile pour ajouter à la commande.
              </p>
            </div>
          ) : (
            cart.map(item => {
              const unitPrice = item.customUnitPrice !== undefined ? item.customUnitPrice : item.product.price;
              const isCustomPrice = item.customUnitPrice !== undefined;
              const isAuction = item.priceType === 'auction';
              const isNegotiated = item.priceType === 'negotiated';
              
              const itemSubtotal = unitPrice * item.quantity;
              const itemDiscountTotal = item.discount * item.quantity;
              const itemFinalPrice = Math.max(0, itemSubtotal - itemDiscountTotal);

              return (
                <div
                  key={`${item.product.id}-${item.selectedFlavor || 'default'}`}
                  className={`border rounded-xl p-3 shadow-2xs transition ${
                    isAuction
                      ? 'bg-purple-50/70 border-purple-200 hover:border-purple-300'
                      : isNegotiated
                      ? 'bg-amber-50/70 border-amber-200 hover:border-amber-300'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    {/* Checkbox to uncheck / remove from cart */}
                    <button
                      onClick={() => removeFromCart(item.product.id, item.selectedFlavor)}
                      className="mt-0.5 w-5 h-5 rounded border border-amber-500 bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 hover:bg-red-500 hover:border-red-500 hover:text-white transition shadow-2xs"
                      title="Décocher pour retirer de la commande"
                    >
                      <X className="w-3.5 h-3.5 stroke-[3]" />
                    </button>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-900 text-sm leading-snug truncate">
                        {item.product.name}
                      </h4>

                      {/* Selected Flavor / Variety Badge */}
                      {(item.selectedVariety || item.selectedFlavor) && (
                        <div className="mt-0.5 inline-flex items-center space-x-1 px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-md text-[11px] font-black">
                          <span>{item.product.varietyLabel || 'Variante'} :</span>
                          <span className="underline">{item.selectedVariety || item.selectedFlavor}</span>
                        </div>
                      )}

                      {/* Price display with clickable custom price trigger */}
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 mt-1">
                        <button
                          type="button"
                          onClick={() => setEditingPriceItem(item)}
                          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md font-bold transition cursor-pointer ${
                            isAuction
                              ? 'bg-purple-100 text-purple-900 border border-purple-300 hover:bg-purple-200'
                              : isNegotiated
                              ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                              : 'bg-white text-slate-700 border border-slate-200 hover:border-amber-400 hover:bg-amber-50'
                          }`}
                          title="Cliquez pour modifier le prix (Prix incité, négocié ou enchères)"
                        >
                          {isAuction ? <Gavel className="w-3 h-3 text-purple-700" /> : <Tag className="w-3 h-3 text-amber-600" />}
                          <span>{unitPrice.toLocaleString()} {settings.currency}</span>
                          <Edit2 className="w-2.5 h-2.5 opacity-60 ml-0.5" />
                        </button>
                        <span className="text-[11px] text-slate-400">/{item.product.unit}</span>

                        {isCustomPrice && (
                          <span className={`text-[10px] font-black px-1.5 py-0.2 rounded uppercase ${
                            isAuction ? 'bg-purple-200 text-purple-950' : 'bg-amber-200 text-amber-950'
                          }`}>
                            {isAuction ? 'Enchère' : 'Négocié'}
                          </span>
                        )}

                        {item.discount > 0 && (
                          <span className="text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded text-[11px]">
                            -{item.discount} {settings.currency}/u
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end justify-between shrink-0">
                      <button
                        onClick={() => removeFromCart(item.product.id, item.selectedFlavor)}
                        className="text-slate-400 hover:text-red-500 p-1 rounded-lg transition"
                        title="Supprimer du panier"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <span className="font-black text-amber-600 text-sm">
                        {itemFinalPrice.toLocaleString()} {settings.currency}
                      </span>
                    </div>
                  </div>

                  {/* Quantity & Actions Bar */}
                  <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between">
                    
                    <div className="flex items-center space-x-1.5">
                      {/* Price Modifier Trigger */}
                      <button
                        onClick={() => setEditingPriceItem(item)}
                        className={`text-xs px-2 py-1 rounded-md flex items-center space-x-1 transition cursor-pointer ${
                          isCustomPrice
                            ? isAuction
                              ? 'bg-purple-100 text-purple-900 border border-purple-300 font-bold'
                              : 'bg-amber-100 text-amber-900 border border-amber-300 font-bold'
                            : 'bg-slate-200/80 text-slate-600 hover:text-slate-900'
                        }`}
                        title="Ajuster le prix de vente unitaire (Négocié / Enchères)"
                      >
                        {isAuction ? <Gavel className="w-3 h-3 text-purple-700" /> : <Tag className="w-3 h-3 text-amber-600" />}
                        <span>{isAuction ? 'Enchère' : isNegotiated ? 'Négocié' : 'Prix Libre'}</span>
                      </button>

                      {/* Discount Modifier Toggle */}
                      <button
                        onClick={() => setEditingDiscountId(editingDiscountId === item.product.id ? null : item.product.id)}
                        className={`text-xs px-2 py-1 rounded-md flex items-center space-x-1 transition ${
                          item.discount > 0
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                            : 'bg-slate-200/80 text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <span>{item.discount > 0 ? `-${item.discount}${settings.currency}` : 'Remise'}</span>
                      </button>
                    </div>

                    {/* Quantity Controls with Direct Typing and Numpad Selector */}
                    <div className="flex items-center space-x-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                      {/* Decrement */}
                      <button
                        onClick={() => updateCartItemQuantity(item.product.id, item.quantity - 1, item.selectedFlavor)}
                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm transition active:scale-90 cursor-pointer"
                        title="Diminuer de 1"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      {/* Direct Numeric Input */}
                      <input
                        type="number"
                        min="1"
                        max="9999"
                        value={item.quantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val) && val >= 1) {
                            updateCartItemQuantity(item.product.id, val, item.selectedFlavor);
                          }
                        }}
                        onFocus={(e) => e.target.select()}
                        className="w-11 h-7 text-center font-black text-slate-900 text-sm bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        title="Cliquez pour saisir directement la quantité"
                      />

                      {/* Increment */}
                      <button
                        onClick={() => updateCartItemQuantity(item.product.id, item.quantity + 1, item.selectedFlavor)}
                        className="w-7 h-7 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center font-bold text-sm transition active:scale-90 cursor-pointer"
                        title="Augmenter de 1"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      </button>

                      {/* Fast Numpad / Preset Multiplier Modal Trigger */}
                      <button
                        onClick={() => setEditingQuantityItem({
                          product: item.product,
                          quantity: item.quantity,
                          selectedFlavor: item.selectedFlavor
                        })}
                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-800 flex items-center justify-center transition active:scale-90 cursor-pointer ml-0.5 border border-slate-200/80"
                        title="Ouvrir le pavé tactile / raccourcis casiers"
                      >
                        <Calculator className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>

                  {/* Discount Input Form (Inline) */}
                  {editingDiscountId === item.product.id && (
                    <div className="mt-2.5 p-2 bg-white rounded-lg border border-slate-200 flex items-center space-x-2 animate-fadeIn">
                      <span className="text-xs text-slate-500">Remise unitaire:</span>
                      <input
                        type="number"
                        min="0"
                        max={unitPrice}
                        value={item.discount || ''}
                        onChange={(e) => applyCartItemDiscount(item.product.id, Number(e.target.value))}
                        placeholder="0"
                        className="w-20 bg-slate-50 border border-slate-300 text-amber-600 font-bold px-2 py-1 rounded text-xs text-center focus:outline-none focus:border-amber-500"
                      />
                      <span className="text-xs text-slate-500">{settings.currency}</span>
                      <button
                        onClick={() => setEditingDiscountId(null)}
                        className="ml-auto text-xs text-slate-600 hover:text-slate-900 px-2 py-1 bg-slate-100 rounded"
                      >
                        OK
                      </button>
                    </div>
                  )}

                </div>
              );
            })
          )}
        </div>

        {/* Footer Totals & Checkout Actions */}
        <div className="p-4 bg-white border-t border-slate-200 space-y-3">
          
          {/* Subtotals & Discounts */}
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Sous-total:</span>
              <span className="font-semibold text-slate-800">{cartSubtotal.toLocaleString()} {settings.currency}</span>
            </div>

            {cartDiscountTotal > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Remises appliquées:</span>
                <span>-{cartDiscountTotal.toLocaleString()} {settings.currency}</span>
              </div>
            )}

            {cartTotal >= (settings.majorTransactionThreshold || 2500) && cart.length > 0 && (
              <div className="bg-amber-50 border border-amber-300 text-amber-900 text-xs px-2.5 py-1.5 rounded-xl flex items-center justify-between font-bold animate-fadeIn">
                <div className="flex items-center space-x-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Transaction Majeure (≥ {(settings.majorTransactionThreshold || 2500).toLocaleString()} {settings.currency})</span>
                </div>
                <span className="text-[10px] bg-amber-200 text-amber-950 px-1.5 py-0.5 rounded font-black uppercase tracking-wider">
                  Confirmation
                </span>
              </div>
            )}

            <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-200">
              <span>TOTAL NET:</span>
              <span className="text-amber-600 text-xl font-black">{cartTotal.toLocaleString()} {settings.currency}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={handleHoldTab}
              disabled={cart.length === 0}
              title="Garder en Fiche (Raccourci: F8)"
              className="py-3 px-3 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 flex items-center justify-center space-x-1.5 transition active:scale-95 cursor-pointer"
            >
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Garder en Fiche</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.2 bg-white text-slate-700 border border-slate-300 rounded font-mono text-[10px] font-black">
                F8
              </kbd>
            </button>

            <button
              onClick={() => setIsPaymentOpen(true)}
              disabled={cart.length === 0}
              title="Encaisser la commande (Raccourci: F1)"
              className="py-3 px-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-1.5 transition active:scale-95 cursor-pointer"
            >
              <CreditCard className="w-4 h-4 stroke-[2.5]" />
              <span>ENCAISSER</span>
              <kbd className="px-1.5 py-0.2 bg-slate-950 text-amber-400 rounded font-mono text-[11px] font-black shadow-xs">
                F1
              </kbd>
            </button>
          </div>

        </div>

      </div>

      {/* Quick Quantity / Touch Numpad Modal */}
      {editingQuantityItem && (
        <QuickQuantityModal
          product={editingQuantityItem.product}
          currentQuantity={editingQuantityItem.quantity}
          initialFlavor={editingQuantityItem.selectedFlavor}
          isEditingCartItem={true}
          currency={settings.currency}
          onClose={() => setEditingQuantityItem(null)}
          onConfirm={(newQty, newFlavor) => {
            updateCartItemQuantity(
              editingQuantityItem.product.id,
              newQty,
              newFlavor || editingQuantityItem.selectedFlavor
            );
            setEditingQuantityItem(null);
          }}
        />
      )}

      {/* Custom Price / Auction / Negotiated Price Modal */}
      {editingPriceItem && (
        <CustomPriceModal
          product={editingPriceItem.product}
          currentUnitPrice={editingPriceItem.customUnitPrice !== undefined ? editingPriceItem.customUnitPrice : editingPriceItem.product.price}
          currentPriceType={editingPriceItem.priceType || 'standard'}
          currency={settings.currency}
          onClose={() => setEditingPriceItem(null)}
          onConfirm={(newUnitPrice, priceType) => {
            updateCartItemUnitPrice(
              editingPriceItem.product.id,
              newUnitPrice,
              editingPriceItem.selectedFlavor,
              priceType
            );
            setEditingPriceItem(null);
          }}
        />
      )}

      {/* Payment Modal */}
      {isPaymentOpen && (
        <PaymentModal
          onClose={() => setIsPaymentOpen(false)}
          onSuccess={handleSaleSuccess}
        />
      )}

      {/* Receipt Modal */}
      {isReceiptOpen && lastSale && (
        <ReceiptModal
          sale={lastSale}
          onClose={() => setIsReceiptOpen(false)}
        />
      )}

      {/* Modal de Confirmation d'Annulation de Ticket */}
      {isCancelConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 text-slate-900 relative">
            <div className="flex items-start space-x-3.5">
              <div className="p-3 bg-red-100 text-red-600 rounded-2xl shrink-0">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Annuler le ticket en cours ?</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Confirmation d'annulation de la commande ({activeTable})
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>Nombre d'articles:</span>
                <span className="font-bold text-slate-900">{cartCount} article(s)</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total de la commande:</span>
                <span className="font-black text-amber-600 text-sm">{cartTotal.toLocaleString()} {settings.currency}</span>
              </div>
              <p className="text-red-600 font-semibold pt-1 border-t border-slate-200 mt-2">
                ⚠️ Attention : Tous les articles ajoutés au ticket seront définitivement effacés de la session en cours.
              </p>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                onClick={() => setIsCancelConfirmOpen(false)}
                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 transition cursor-pointer"
              >
                Conserver le ticket
              </button>
              <button
                onClick={() => {
                  clearCart();
                  setIsCancelConfirmOpen(false);
                }}
                className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md shadow-red-600/20 flex items-center justify-center space-x-1.5 transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Oui, annuler</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
