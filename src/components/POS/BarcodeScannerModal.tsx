import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Html5Qrcode, Html5QrcodeCameraScanConfig, CameraDevice } from 'html5-qrcode';
import { Product, Company } from '../../types';
import { useBar } from '../../context/BarContext';
import { playGentleChime } from '../../utils/notificationService';
import {
  Camera,
  ScanBarcode,
  X,
  CheckCircle2,
  AlertTriangle,
  Zap,
  ZapOff,
  SwitchCamera,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Search,
  Lock,
  Sparkles,
  Info,
  HelpCircle,
  Package,
  Layers,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ScannedHistoryItem {
  id: string;
  product: Product;
  scannedCode: string;
  timestamp: string;
  quantity: number;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({ isOpen, onClose }) => {
  const {
    products,
    cart,
    addToCart,
    removeFromCart,
    activeCompany,
    isSuperAdmin,
    settings,
    currentUser
  } = useBar();

  // Super Admin security check: Is camera scanner feature enabled for this enterprise?
  const isFeatureAllowed = useMemo(() => {
    if (isSuperAdmin) return true;
    if (activeCompany?.allowCameraScanner === true) return true;
    if (settings.allowCameraScanner === true) return true;
    return false;
  }, [isSuperAdmin, activeCompany, settings]);

  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [hasTorch, setHasTorch] = useState<boolean>(false);

  const [manualCodeInput, setManualCodeInput] = useState<string>('');
  const [lastScannedResult, setLastScannedResult] = useState<{
    code: string;
    product?: Product;
    status: 'success' | 'stockout' | 'not_found';
    message: string;
    timestamp: number;
  } | null>(null);

  const [sessionScans, setSessionScans] = useState<ScannedHistoryItem[]>([]);
  const [showHowItWorksModal, setShowHowItWorksModal] = useState<boolean>(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef<boolean>(false);
  const lastScannedCodeRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });

  // Clear states when modal opens
  useEffect(() => {
    if (!isOpen) {
      stopCameraScanner();
      setLastScannedResult(null);
    }
  }, [isOpen]);

  // Retrieve cameras and start scanning when modal is open and feature is authorized
  useEffect(() => {
    if (isOpen && isFeatureAllowed) {
      initCameras();
    }
    return () => {
      stopCameraScanner();
    };
  }, [isOpen, isFeatureAllowed]);

  const initCameras = async () => {
    try {
      setCameraError(null);
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        setCameras(devices);
        setHasCameraPermission(true);
        // Prefer back camera ("environment") if available
        const backCamera = devices.find(d => 
          d.label.toLowerCase().includes('back') || 
          d.label.toLowerCase().includes('arrière') ||
          d.label.toLowerCase().includes('environment') ||
          d.label.toLowerCase().includes('rear')
        );
        const chosenId = backCamera ? backCamera.id : devices[0].id;
        setSelectedCameraId(chosenId);
        startCameraScanner(chosenId);
      } else {
        setHasCameraPermission(false);
        setCameraError("Aucune caméra détectée sur cet appareil.");
      }
    } catch (err: any) {
      console.warn("Camera init warning:", err);
      setHasCameraPermission(false);
      setCameraError("Accès à la caméra refusé ou bloqué. Autorisez la caméra dans votre navigateur.");
    }
  };

  const startCameraScanner = async (cameraId: string) => {
    try {
      await stopCameraScanner();
      
      const readerElement = document.getElementById('barexp-barcode-reader');
      if (!readerElement) return;

      const html5QrCode = new Html5Qrcode('barexp-barcode-reader', {
        verbose: false,
        formatsToSupport: undefined // all formats supported (EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39, QR Code...)
      });
      html5QrCodeRef.current = html5QrCode;

      const config: Html5QrcodeCameraScanConfig = {
        fps: 15,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          // Optimized rectangle for 1D barcodes and 2D codes
          const minDim = Math.min(viewfinderWidth, viewfinderHeight);
          const width = Math.floor(viewfinderWidth * 0.85);
          const height = Math.floor(Math.min(viewfinderHeight * 0.55, 240));
          return { width: Math.max(width, 240), height: Math.max(height, 160) };
        },
        aspectRatio: 1.333,
      };

      await html5QrCode.start(
        cameraId,
        config,
        (decodedText) => {
          handleDecodedBarcode(decodedText);
        },
        () => {
          // Silent scan failure per frame (expected while scanning)
        }
      );

      setIsScanning(true);
      setCameraError(null);

      // Check for torch capability
      try {
        const capabilities = html5QrCode.getRunningTrackCapabilities();
        if (capabilities && (capabilities as any).torch) {
          setHasTorch(true);
        } else {
          setHasTorch(false);
        }
      } catch {
        setHasTorch(false);
      }

    } catch (err: any) {
      console.error("Camera start error:", err);
      setIsScanning(false);
      setCameraError("Impossible d'activer le flux vidéo de la caméra. Vérifiez les permissions de l'appareil.");
    }
  };

  const stopCameraScanner = async () => {
    if (html5QrCodeRef.current && isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (e) {
        console.warn("Error stopping scanner:", e);
      }
    }
    setIsScanning(false);
    setTorchOn(false);
  };

  const toggleTorch = async () => {
    if (!html5QrCodeRef.current || !isScanning) return;
    try {
      const nextTorch = !torchOn;
      await html5QrCodeRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorch } as any]
      });
      setTorchOn(nextTorch);
    } catch (e) {
      console.warn("Torch error:", e);
    }
  };

  const handleSwitchCamera = () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex(c => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCamera = cameras[nextIndex];
    setSelectedCameraId(nextCamera.id);
    startCameraScanner(nextCamera.id);
  };

  const handleDecodedBarcode = (code: string) => {
    const cleanCode = code.trim();
    if (!cleanCode) return;

    // Cooldown check (prevent repeated firing of the exact same barcode within 1.5 seconds)
    const now = Date.now();
    if (
      lastScannedCodeRef.current.code === cleanCode &&
      now - lastScannedCodeRef.current.time < 1500
    ) {
      return;
    }

    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    lastScannedCodeRef.current = { code: cleanCode, time: now };

    processBarcodeLookup(cleanCode);

    setTimeout(() => {
      isProcessingRef.current = false;
    }, 600);
  };

  const processBarcodeLookup = (code: string) => {
    // Lookup product by exact barcode, stripped barcode, or product ID
    const clean = code.trim().toLowerCase();
    const matchedProduct = products.find(p => {
      if (!p.active) return false;
      const pBarcode = (p.barcode || '').trim().toLowerCase();
      const pId = p.id.trim().toLowerCase();
      return pBarcode === clean || pId === clean || (pBarcode && clean.endsWith(pBarcode));
    });

    if (matchedProduct) {
      if (matchedProduct.stock <= 0 && !matchedProduct.isService) {
        // Stockout warning
        playGentleChime('warning');
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([100, 50, 100]);
        }
        setLastScannedResult({
          code,
          product: matchedProduct,
          status: 'stockout',
          message: `Rupture de stock : "${matchedProduct.name}" n'a plus d'exemplaire disponible.`,
          timestamp: Date.now()
        });
      } else {
        // Successful match & added to cart!
        addToCart(matchedProduct);
        playGentleChime('success');
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(80);
        }

        // Add to session scan history
        setSessionScans(prev => {
          const existing = prev.find(item => item.product.id === matchedProduct.id);
          if (existing) {
            return prev.map(item =>
              item.product.id === matchedProduct.id
                ? { ...item, quantity: item.quantity + 1, timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }
                : item
            );
          } else {
            return [
              {
                id: `scan-${Date.now()}`,
                product: matchedProduct,
                scannedCode: code,
                timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                quantity: 1,
              },
              ...prev,
            ];
          }
        });

        setLastScannedResult({
          code,
          product: matchedProduct,
          status: 'success',
          message: `"${matchedProduct.name}" ajouté au panier avec succès (${matchedProduct.price.toLocaleString('fr-FR')} ${settings.currency}).`,
          timestamp: Date.now()
        });
      }
    } else {
      // Product not found
      playGentleChime('warning');
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(150);
      }
      setLastScannedResult({
        code,
        status: 'not_found',
        message: `Aucun article enregistré avec le code "${code}".`,
        timestamp: Date.now()
      });
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCodeInput.trim()) return;
    handleDecodedBarcode(manualCodeInput.trim());
    setManualCodeInput('');
  };

  // Cart total calculations
  const totalCartCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity, 0);
  }, [cart]);

  const totalCartAmount = useMemo(() => {
    return cart.reduce((acc, item) => acc + (item.product.price * item.quantity - (item.discount || 0)), 0);
  }, [cart]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[94vh] animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 p-4 sm:p-5 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20 shrink-0">
              <ScanBarcode className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Scanner Code-Barres Caméra
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950 shadow-xs">
                  POS Direct
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Pointez la caméra vers le code-barres pour l'ajouter automatiquement au panier
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHowItWorksModal(true)}
              className="p-2 text-amber-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-xl transition cursor-pointer flex items-center gap-1 text-xs font-bold"
              title="Comment ça marche en supermarché & magasins ?"
            >
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Guide</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-xl transition cursor-pointer"
              title="Fermer le scanner"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Security Gate Check */}
        {!isFeatureAllowed ? (
          <div className="p-6 sm:p-8 text-center space-y-4 flex-1 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto shadow-inner border border-amber-200">
              <Lock className="w-8 h-8 text-amber-700" />
            </div>

            <div className="max-w-md space-y-2">
              <h4 className="text-lg font-black text-slate-900">
                Fonctionnalité Verrouillée par le Super Administrateur
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Le scanner de code-barres par caméra est un module d'encaissement avancé. 
                Seul le <strong>Super Administrateur de BarExp</strong> a l'autorisation d'activer ou désactiver l'accès caméra pour les entreprises.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-700 max-w-md text-left space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span>Comment débloquer cet accès ?</span>
              </div>
              <p>
                Si vous êtes gérant ou administrateur de cet établissement ({activeCompany?.name || 'Votre Bar'}), demandez au Super Admin d'activer l'option <strong>« Scanner Caméra »</strong> dans la fiche de votre entreprise sur le tableau de bord Super Admin.
              </p>
            </div>

            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-black rounded-xl text-xs shadow-md transition cursor-pointer"
            >
              Fermer et retourner à la caisse
            </button>
          </div>
        ) : (
          /* Normal Scanner Body */
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            
            {/* Live Camera Viewport Box */}
            <div className="relative bg-slate-950 rounded-2xl overflow-hidden shadow-inner border border-slate-800 flex flex-col items-center justify-center min-h-[260px] sm:min-h-[300px]">
              
              {/* HTML5 QR / Barcode element target */}
              <div id="barexp-barcode-reader" className="w-full h-full min-h-[260px] sm:min-h-[300px]" />

              {/* Scanning Overlay Reticle */}
              {isScanning && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                  {/* Laser Beam Animation */}
                  <div className="w-[82%] sm:w-[75%] h-[140px] sm:h-[160px] border-2 border-amber-400/80 rounded-2xl relative shadow-[0_0_20px_rgba(245,158,11,0.25)] overflow-hidden">
                    {/* Laser line moving vertically */}
                    <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_12px_#f59e0b] animate-bounce duration-1000 top-1/2 -translate-y-1/2" />
                    
                    {/* Corner Reticles */}
                    <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-amber-400" />
                    <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-amber-400" />
                    <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-amber-400" />
                    <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-amber-400" />
                  </div>

                  <p className="mt-3 text-[11px] font-bold text-white/90 bg-black/60 px-3 py-1 rounded-full backdrop-blur-xs">
                    Placez le code-barres ou QR code dans le cadre
                  </p>
                </div>
              )}

              {/* Camera Error or Permission Request Box */}
              {cameraError && (
                <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center text-white space-y-3 z-10">
                  <Camera className="w-10 h-10 text-amber-500 animate-pulse" />
                  <div className="space-y-1 max-w-sm">
                    <p className="text-sm font-bold text-white">{cameraError}</p>
                    <p className="text-xs text-slate-400">
                      Vous pouvez également saisir le code manuellement ou utiliser une douchette laser USB/Bluetooth.
                    </p>
                  </div>
                  <button
                    onClick={() => initCameras()}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition cursor-pointer"
                  >
                    Réessayer la caméra
                  </button>
                </div>
              )}

              {/* Floating Camera Controls Top Right */}
              {isScanning && (
                <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
                  {/* Torch Toggle Button if supported */}
                  {hasTorch && (
                    <button
                      onClick={toggleTorch}
                      className={`p-2 rounded-xl text-xs font-bold transition shadow-md backdrop-blur-md cursor-pointer ${
                        torchOn
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-black/60 text-white hover:bg-black/80'
                      }`}
                      title={torchOn ? "Éteindre la lampe torche" : "Allumer la lampe torche"}
                    >
                      {torchOn ? <Zap className="w-4 h-4 fill-current" /> : <ZapOff className="w-4 h-4" />}
                    </button>
                  )}

                  {/* Switch Camera Button if multiple exist */}
                  {cameras.length > 1 && (
                    <button
                      onClick={handleSwitchCamera}
                      className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-xl text-xs font-bold transition shadow-md backdrop-blur-md cursor-pointer"
                      title="Changer de caméra (Arrière / Avant)"
                    >
                      <SwitchCamera className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Live Scan Feedback HUD Banner */}
            {lastScannedResult && (
              <div
                className={`p-3.5 rounded-2xl border transition-all animate-in fade-in slide-in-from-top-2 duration-200 flex items-center justify-between gap-3 ${
                  lastScannedResult.status === 'success'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    : lastScannedResult.status === 'stockout'
                    ? 'bg-amber-50 border-amber-300 text-amber-950'
                    : 'bg-red-50 border-red-300 text-red-950'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {lastScannedResult.status === 'success' ? (
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  ) : lastScannedResult.status === 'stockout' ? (
                    <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="text-xs font-black truncate">
                      {lastScannedResult.product ? lastScannedResult.product.name : `Code : ${lastScannedResult.code}`}
                    </p>
                    <p className="text-[11px] opacity-90 truncate">
                      {lastScannedResult.message}
                    </p>
                  </div>
                </div>

                {lastScannedResult.product && (
                  <div className="shrink-0 text-right">
                    <span className="text-xs font-black text-emerald-800">
                      {lastScannedResult.product.price.toLocaleString('fr-FR')} {settings.currency}
                    </span>
                    <p className="text-[10px] text-slate-500 font-semibold">
                      En panier : {cart.find(c => c.product.id === lastScannedResult.product?.id)?.quantity || 1}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Manual Barcode Input & USB Laser Gun Input Form */}
            <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
              <div className="relative flex-1">
                <ScanBarcode className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={manualCodeInput}
                  onChange={(e) => setManualCodeInput(e.target.value)}
                  placeholder="Saisir ou scanner avec une douchette USB (ex: 7891000311299)..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <button
                type="submit"
                disabled={!manualCodeInput.trim()}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs shadow-xs transition cursor-pointer shrink-0"
              >
                Ajouter
              </button>
            </form>

            {/* Scanned Items in Current Session */}
            {sessionScans.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <ShoppingCart className="w-3.5 h-3.5 text-amber-600" />
                    <span>Articles Scannés ({sessionScans.length})</span>
                  </h4>
                  <span className="text-[11px] font-bold text-slate-500">
                    Total : <strong className="text-slate-900">{totalCartAmount.toLocaleString('fr-FR')} {settings.currency}</strong> ({totalCartCount} pcs)
                  </span>
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {sessionScans.map((item) => {
                    const cartItem = cart.find(c => c.product.id === item.product.id);
                    const qtyInCart = cartItem ? cartItem.quantity : 0;

                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="font-bold text-slate-900 truncate">{item.product.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            Code: {item.scannedCode} &bull; {item.product.price.toLocaleString('fr-FR')} {settings.currency}
                          </p>
                        </div>

                        {/* Quantity Controls in Scanner */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
                            <button
                              type="button"
                              onClick={() => removeFromCart(item.product.id)}
                              className="p-1 text-slate-500 hover:text-red-600 rounded cursor-pointer"
                              title="Diminuer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>

                            <span className="px-2 font-black text-slate-900 text-xs min-w-[20px] text-center">
                              {qtyInCart}
                            </span>

                            <button
                              type="button"
                              onClick={() => addToCart(item.product)}
                              className="p-1 text-slate-500 hover:text-emerald-600 rounded cursor-pointer"
                              title="Augmenter"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        )}

        {/* Footer Summary & Close / Finish Button */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs">
            <span className="text-slate-500">Panier en cours : </span>
            <strong className="text-slate-900 font-black">
              {totalCartCount} article{totalCartCount > 1 ? 's' : ''} ({totalCartAmount.toLocaleString('fr-FR')} {settings.currency})
            </strong>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-black rounded-xl text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
          >
            <span>Valider & Revenir à la caisse</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* Educational Modal: "Comment fonctionne le scan en supermarché ?" */}
      {showHowItWorksModal && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 space-y-4 animate-in fade-in zoom-in duration-200">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Comment marche le scan en supermarché ?
                  </h3>
                  <p className="text-xs text-slate-500">
                    Comprendre l'assignation des codes et les technologies invisibles
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowHowItWorksModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-700 max-h-[65vh] overflow-y-auto pr-1 leading-relaxed">
              
              {/* Point 1 */}
              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-1">
                <p className="font-black text-amber-900 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-amber-600 shrink-0" />
                  1. Comment un produit est assigné à un code-barres ?
                </p>
                <p className="text-slate-600">
                  Chaque article industriel possède un code universel (souvent <strong>EAN-13</strong> à 13 chiffres ou <strong>UPC-A</strong> à 12 chiffres) imprimé par le fabricant. Lors de la création de l'article dans le logiciel de stock, le commerçant scanne ce code ou le saisit une seule fois dans la case <em>Code-Barres</em>. Le système relie alors instantanément ce code au nom, prix et stock du produit.
                </p>
              </div>

              {/* Point 2 */}
              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-2xl space-y-1">
                <p className="font-black text-blue-900 flex items-center gap-1.5">
                  <ScanBarcode className="w-4 h-4 text-blue-600 shrink-0" />
                  2. Pourquoi parfois on ne voit aucun code-barres mais le scanner détecte quand même ?
                </p>
                <p className="text-slate-600 mb-1.5">
                  Dans les supermarchés modernes, plusieurs technologies avancées sont utilisées :
                </p>
                <ul className="list-disc pl-4 space-y-1 text-slate-600">
                  <li>
                    <strong>Le code Digimarc (filigrane invisible) :</strong> Le code est répété des centaines de fois de manière invisible sur l'ensemble de l'emballage. Le caissier n'a même pas besoin de chercher le code-barres : le lecteur le capte sous n'importe quel angle !
                  </li>
                  <li>
                    <strong>Codes DataMatrix ou QR microscopiques :</strong> Imprimés discrètement sous la tranche, le bouchon ou la pliure du produit.
                  </li>
                  <li>
                    <strong>Puces RFID / NFC antivol intégrées :</strong> Dissimulées sous l'étiquette carton ou dans les vêtements, détectées par ondes radioélectriques sans contact visuel.
                  </li>
                  <li>
                    <strong>Reconnaissance visuelle par caméra IA :</strong> Pour les fruits, légumes et pains sans emballage, la balance ou la caisse identifie visuellement l'article par sa couleur et sa forme.
                  </li>
                </ul>
              </div>

              {/* Point 3 */}
              <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-1">
                <p className="font-black text-emerald-900 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-emerald-600 shrink-0" />
                  3. Et pour les produits sans code (plats cuisinés, boissons locales, services) ?
                </p>
                <p className="text-slate-600">
                  BarExp permet de générer un code-barres interne ou d'imprimer des étiquettes autocollantes avec un code personnalisé. En caisse, ces articles restent également sélectionnables directement sur la grille tactile tactile en 1 clic.
                </p>
              </div>

            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHowItWorksModal(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Compris
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
