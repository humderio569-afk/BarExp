import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Html5Qrcode, Html5QrcodeCameraScanConfig, CameraDevice } from 'html5-qrcode';
import { Product, Company } from '../../types';
import { useBar } from '../../context/BarContext';
import { playGentleChime } from '../../utils/notificationService';
import { BarcodeLabelModal } from '../Stock/BarcodeLabelModal';
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
  Info,
  HelpCircle,
  Package,
  Layers,
  ArrowRight,
  ShieldCheck,
  Link,
  PlusCircle,
  Printer,
  Upload,
  RefreshCw,
  Tag
} from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAddProductWithBarcode?: (barcode: string) => void;
}

interface ScannedHistoryItem {
  id: string;
  product: Product;
  scannedCode: string;
  timestamp: string;
  quantity: number;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onOpenAddProductWithBarcode,
}) => {
  const {
    products,
    cart,
    addToCart,
    removeFromCart,
    updateProduct,
    addProduct,
    activeCompany,
    isSuperAdmin,
    settings,
    categories,
    currentUser,
  } = useBar();

  // Active company setting verification:
  // By default, scanner is strictly disabled for all companies.
  // It can ONLY be activated by the Super Admin for this active company.
  const isCompanyScannerEnabled = useMemo(() => {
    return activeCompany?.allowCameraScanner === true;
  }, [activeCompany?.allowCameraScanner]);

  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(false);

  // Barcode Lookup & Unknown Product Handling States
  const [manualCodeInput, setManualCodeInput] = useState<string>('');
  const [unknownBarcode, setUnknownBarcode] = useState<string | null>(null);
  const [linkSearchQuery, setLinkSearchQuery] = useState<string>('');
  const [showLinkProductPicker, setShowLinkProductPicker] = useState<boolean>(false);
  const [showQuickCreateProduct, setShowQuickCreateProduct] = useState<boolean>(false);
  const [showBarcodeLabelModal, setShowBarcodeLabelModal] = useState<boolean>(false);

  // Quick Create New Product State
  const [newProductName, setNewProductName] = useState('');
  const [newProductCategory, setNewProductCategory] = useState(categories[0]?.name || 'Divers');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductCostPrice, setNewProductCostPrice] = useState('');
  const [newProductStock, setNewProductStock] = useState('10');
  const [newProductUnit, setNewProductUnit] = useState('Pièce');

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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-close if company scanner gets deactivated
  useEffect(() => {
    if (isOpen && !isCompanyScannerEnabled) {
      onClose();
    }
  }, [isOpen, isCompanyScannerEnabled, onClose]);

  // Clear states when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      stopCameraScanner();
      setLastScannedResult(null);
      setUnknownBarcode(null);
      setShowLinkProductPicker(false);
      setShowQuickCreateProduct(false);
    }
  }, [isOpen]);

  // Retrieve cameras and start scanning when modal is open and feature is authorized by Super Admin
  useEffect(() => {
    if (isOpen && isCompanyScannerEnabled) {
      // Delay initialization slightly to ensure DOM element is mounted
      const timer = setTimeout(() => {
        initCamerasAndStart();
      }, 200);
      return () => clearTimeout(timer);
    } else {
      stopCameraScanner();
    }
    return () => {
      stopCameraScanner();
    };
  }, [isOpen, isCompanyScannerEnabled]);

  // Global Hardware Barcode Gun listener (catches fast serial keypresses ending in Enter)
  // Strictly verifies active company settings before attaching listener
  useEffect(() => {
    if (!isOpen || !isCompanyScannerEnabled) return;

    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing inside input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return;
      }

      const now = Date.now();
      if (now - lastKeyTime > 150) {
        buffer = ''; // Reset buffer if typed too slowly (human typing)
      }
      lastKeyTime = now;

      if (e.key === 'Enter') {
        if (buffer.length >= 3) {
          e.preventDefault();
          handleDecodedBarcode(buffer);
          buffer = '';
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isCompanyScannerEnabled, products]);

  const initCamerasAndStart = async () => {
    // Hardware scanner security verification: verify active company settings before initializing
    if (!isCompanyScannerEnabled) {
      setIsInitializing(false);
      return;
    }

    setIsInitializing(true);
    setCameraError(null);

    try {
      // Ensure element exists in DOM
      const readerElement = document.getElementById('barexp-barcode-reader');
      if (!readerElement) {
        setIsInitializing(false);
        return;
      }

      // Stop any existing instance
      await stopCameraScanner();

      const html5QrCode = new Html5Qrcode('barexp-barcode-reader', {
        verbose: false,
        formatsToSupport: undefined, // Supports all formats (EAN-13, EAN-8, UPC, Code 128, Code 39, QR Code, DataMatrix, ITF)
      });
      html5QrCodeRef.current = html5QrCode;

      const config: Html5QrcodeCameraScanConfig = {
        fps: 15,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const width = Math.floor(viewfinderWidth * 0.88);
          const height = Math.floor(Math.min(viewfinderHeight * 0.6, 260));
          return { width: Math.max(width, 220), height: Math.max(height, 140) };
        },
        aspectRatio: 1.333,
      };

      // Strategy 1: Attempt direct rear camera facing mode
      try {
        await html5QrCode.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => handleDecodedBarcode(decodedText),
          () => {}
        );
        setIsScanning(true);
        setHasCameraPermission(true);
        setCameraError(null);
        checkTorchCapabilities(html5QrCode);
        setIsInitializing(false);
        return;
      } catch (errFacing) {
        console.warn('Facing mode direct start failed, falling back to camera enumeration:', errFacing);
      }

      // Strategy 2: Fallback to device list enumeration
      try {
        // Request permission explicitly if needed
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach((track) => track.stop());
          } catch (permErr) {
            console.warn('Explicit getUserMedia failed:', permErr);
          }
        }

        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setCameras(devices);
          setHasCameraPermission(true);

          const backCamera = devices.find(
            (d) =>
              d.label.toLowerCase().includes('back') ||
              d.label.toLowerCase().includes('arrière') ||
              d.label.toLowerCase().includes('environment') ||
              d.label.toLowerCase().includes('rear')
          );
          const chosenId = backCamera ? backCamera.id : devices[0].id;
          setSelectedCameraId(chosenId);

          await html5QrCode.start(
            chosenId,
            config,
            (decodedText) => handleDecodedBarcode(decodedText),
            () => {}
          );

          setIsScanning(true);
          setCameraError(null);
          checkTorchCapabilities(html5QrCode);
        } else {
          setHasCameraPermission(false);
          setCameraError('Aucune caméra détectée ou permission non accordée.');
        }
      } catch (enumErr: any) {
        console.warn('Camera enumeration error:', enumErr);
        setHasCameraPermission(false);
        setCameraError(
          enumErr?.message || 'Accès à la caméra refusé. Veuillez autoriser la caméra dans votre navigateur.'
        );
      }
    } catch (err: any) {
      console.error('Camera init critical error:', err);
      setHasCameraPermission(false);
      setCameraError("Impossible d'activer le flux vidéo de la caméra.");
    } finally {
      setIsInitializing(false);
    }
  };

  const checkTorchCapabilities = (scannerInstance: Html5Qrcode) => {
    try {
      const capabilities = scannerInstance.getRunningTrackCapabilities();
      if (capabilities && (capabilities as any).torch) {
        setHasTorch(true);
      } else {
        setHasTorch(false);
      }
    } catch {
      setHasTorch(false);
    }
  };

  const stopCameraScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (isScanning || html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (e) {
        console.warn('Error stopping scanner:', e);
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
        advanced: [{ torch: nextTorch } as any],
      });
      setTorchOn(nextTorch);
    } catch (e) {
      console.warn('Torch error:', e);
    }
  };

  const handleSwitchCamera = async () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex((c) => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCamera = cameras[nextIndex];
    setSelectedCameraId(nextCamera.id);

    try {
      await stopCameraScanner();
      const html5QrCode = new Html5Qrcode('barexp-barcode-reader', { verbose: false });
      html5QrCodeRef.current = html5QrCode;

      const config: Html5QrcodeCameraScanConfig = {
        fps: 15,
        qrbox: (w, h) => ({ width: Math.floor(w * 0.88), height: Math.floor(Math.min(h * 0.6, 260)) }),
        aspectRatio: 1.333,
      };

      await html5QrCode.start(
        nextCamera.id,
        config,
        (decodedText) => handleDecodedBarcode(decodedText),
        () => {}
      );
      setIsScanning(true);
      checkTorchCapabilities(html5QrCode);
    } catch (e) {
      console.warn('Switch camera error:', e);
    }
  };

  // Image / Photo file upload scan fallback
  const handleScanFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await stopCameraScanner();
      const html5QrCode = new Html5Qrcode('barexp-barcode-reader', { verbose: false });
      html5QrCodeRef.current = html5QrCode;

      const result = await html5QrCode.scanFile(file, true);
      if (result) {
        handleDecodedBarcode(result);
      }
    } catch (err: any) {
      console.warn('Scan file error:', err);
      alert("Aucun code-barres lisible détecté sur cette photo. Essayez d'améliorer la netteté et la lumière.");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
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
    const clean = code.trim().toLowerCase();
    const matchedProduct = products.find((p) => {
      if (!p.active) return false;
      const pBarcode = (p.barcode || '').trim().toLowerCase();
      const pId = p.id.trim().toLowerCase();
      return pBarcode === clean || pId === clean || (pBarcode && clean.endsWith(pBarcode));
    });

    if (matchedProduct) {
      setUnknownBarcode(null);
      setShowLinkProductPicker(false);
      setShowQuickCreateProduct(false);

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
          message: `Rupture de stock : "${matchedProduct.name}" n'a plus d'exemplaire en rayon.`,
          timestamp: Date.now(),
        });
      } else {
        // Successful match & added to cart!
        addToCart(matchedProduct);
        playGentleChime('success');
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(80);
        }

        // Add to session scan history
        setSessionScans((prev) => {
          const existing = prev.find((item) => item.product.id === matchedProduct.id);
          if (existing) {
            return prev.map((item) =>
              item.product.id === matchedProduct.id
                ? {
                    ...item,
                    quantity: item.quantity + 1,
                    timestamp: new Date().toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    }),
                  }
                : item
            );
          } else {
            return [
              {
                id: `scan-${Date.now()}`,
                product: matchedProduct,
                scannedCode: code,
                timestamp: new Date().toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                }),
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
          message: `"${matchedProduct.name}" ajouté au panier (${matchedProduct.price.toLocaleString('fr-FR')} ${settings.currency}).`,
          timestamp: Date.now(),
        });
      }
    } else {
      // Product NOT found: Trigger Unknown Barcode Workflow
      playGentleChime('warning');
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(150);
      }

      setUnknownBarcode(code);
      setLastScannedResult({
        code,
        status: 'not_found',
        message: `Code "${code}" non enregistré. Choisissez une option ci-dessous pour l'intégrer au système.`,
        timestamp: Date.now(),
      });
    }
  };

  // Workflow A: Link scanned barcode to an existing product in stock
  const handleLinkToExistingProduct = (product: Product) => {
    if (!unknownBarcode) return;
    const barcodeToAssign = unknownBarcode;

    // Update product with this new barcode
    updateProduct(product.id, { barcode: barcodeToAssign });

    // Add to cart directly
    addToCart(product);
    playGentleChime('success');

    // Update session scan history
    setSessionScans((prev) => [
      {
        id: `scan-${Date.now()}`,
        product: { ...product, barcode: barcodeToAssign },
        scannedCode: barcodeToAssign,
        timestamp: new Date().toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        quantity: 1,
      },
      ...prev,
    ]);

    setLastScannedResult({
      code: barcodeToAssign,
      product: { ...product, barcode: barcodeToAssign },
      status: 'success',
      message: `Code "${barcodeToAssign}" lié à "${product.name}" avec succès et ajouté au panier !`,
      timestamp: Date.now(),
    });

    setUnknownBarcode(null);
    setShowLinkProductPicker(false);
    setLinkSearchQuery('');
  };

  // Workflow B: Quick Create New Product with this barcode
  const handleQuickCreateProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim() || !unknownBarcode) return;

    const numPrice = parseFloat(newProductPrice) || 0;
    const numCost = parseFloat(newProductCostPrice) || 0;
    const numStock = parseInt(newProductStock, 10) || 0;

    if (numPrice <= 0) {
      alert('Veuillez renseigner un prix de vente valide.');
      return;
    }

    const created = addProduct({
      name: newProductName.trim(),
      category: newProductCategory,
      price: numPrice,
      costPrice: numCost,
      stock: numStock,
      minStockAlert: 5,
      unit: newProductUnit || 'Pièce',
      barcode: unknownBarcode,
      active: true,
    });

    // Add to cart directly
    addToCart(created);
    playGentleChime('success');

    // Update session scans
    setSessionScans((prev) => [
      {
        id: `scan-${Date.now()}`,
        product: created,
        scannedCode: unknownBarcode,
        timestamp: new Date().toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        quantity: 1,
      },
      ...prev,
    ]);

    setLastScannedResult({
      code: unknownBarcode,
      product: created,
      status: 'success',
      message: `Nouveau produit "${created.name}" créé avec succès et ajouté au panier !`,
      timestamp: Date.now(),
    });

    // Reset create state
    setUnknownBarcode(null);
    setShowQuickCreateProduct(false);
    setNewProductName('');
    setNewProductPrice('');
    setNewProductCostPrice('');
    setNewProductStock('10');
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCodeInput.trim()) return;
    handleDecodedBarcode(manualCodeInput.trim());
    setManualCodeInput('');
  };

  // Filtered products for linking
  const filteredLinkProducts = useMemo(() => {
    if (!linkSearchQuery.trim()) return products.slice(0, 15);
    const q = linkSearchQuery.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
  }, [products, linkSearchQuery]);

  // Cart total calculations
  const totalCartCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity, 0);
  }, [cart]);

  const totalCartAmount = useMemo(() => {
    return cart.reduce(
      (acc, item) => acc + (item.product.price * item.quantity - (item.discount || 0)),
      0
    );
  }, [cart]);

  if (!isOpen || !isCompanyScannerEnabled) return null;

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
                  Scanner Code-Barres Multi-Support
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950 shadow-xs">
                  Direct POS
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Caméra en direct, douchette USB ou photo pour ajouter au panier
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Generate & Print Barcodes button */}
            <button
              onClick={() => setShowBarcodeLabelModal(true)}
              className="p-2 text-amber-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-xl transition cursor-pointer flex items-center gap-1 text-xs font-bold"
              title="Générer ou imprimer des étiquettes code-barres pour vos produits"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Étiquettes</span>
            </button>

            <button
              onClick={() => setShowHowItWorksModal(true)}
              className="p-2 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-xl transition cursor-pointer flex items-center gap-1 text-xs font-bold"
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

        {/* Scanner Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            
            {/* Live Camera Viewport Box */}
            <div className="relative bg-slate-950 rounded-2xl overflow-hidden shadow-inner border border-slate-800 flex flex-col items-center justify-center min-h-[250px] sm:min-h-[290px]">
              
              {/* HTML5 QR / Barcode element target */}
              <div id="barexp-barcode-reader" className="w-full h-full min-h-[250px] sm:min-h-[290px]" />

              {/* Scanning Overlay Reticle */}
              {isScanning && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                  {/* Laser Beam Animation */}
                  <div className="w-[85%] sm:w-[78%] h-[130px] sm:h-[150px] border-2 border-amber-400/80 rounded-2xl relative shadow-[0_0_20px_rgba(245,158,11,0.25)] overflow-hidden">
                    {/* Laser line moving vertically */}
                    <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_12px_#f59e0b] animate-bounce duration-1000 top-1/2 -translate-y-1/2" />
                    
                    {/* Corner Reticles */}
                    <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-amber-400" />
                    <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-amber-400" />
                    <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-amber-400" />
                    <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-amber-400" />
                  </div>

                  <p className="mt-3 text-[11px] font-bold text-white/90 bg-black/60 px-3 py-1 rounded-full backdrop-blur-xs">
                    Cadrez le code-barres (EAN-13, Code-128, QR Code)
                  </p>
                </div>
              )}

              {/* Loading indicator */}
              {isInitializing && !isScanning && !cameraError && (
                <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center text-white space-y-3 z-10">
                  <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
                  <p className="text-xs font-bold text-slate-300">Initialisation du flux caméra HD...</p>
                </div>
              )}

              {/* Camera Error / Manual / Photo Fallback */}
              {cameraError && (
                <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center text-white space-y-3 z-10">
                  <Camera className="w-9 h-9 text-amber-500 animate-pulse" />
                  <div className="space-y-1 max-w-sm">
                    <p className="text-xs sm:text-sm font-bold text-white">{cameraError}</p>
                    <p className="text-[11px] text-slate-400">
                      Vous pouvez réessayer la caméra, prendre une photo du code, ou taper le code manuellement.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    <button
                      onClick={() => initCamerasAndStart()}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Réessayer la caméra</span>
                    </button>

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5 text-amber-400" />
                      <span>Scanner une photo</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Hidden file input for picture scan */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleScanFile}
              />

              {/* Floating Camera Controls Top Right */}
              {isScanning && (
                <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
                  {/* Photo upload fallback button */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-xl text-xs font-bold transition shadow-md backdrop-blur-md cursor-pointer"
                    title="Prendre une photo ou importer une image"
                  >
                    <Camera className="w-4 h-4 text-amber-400" />
                  </button>

                  {/* Torch Toggle Button if supported */}
                  {hasTorch && (
                    <button
                      onClick={toggleTorch}
                      className={`p-2 rounded-xl text-xs font-bold transition shadow-md backdrop-blur-md cursor-pointer ${
                        torchOn
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-black/60 text-white hover:bg-black/80'
                      }`}
                      title={torchOn ? 'Éteindre la lampe torche' : 'Allumer la lampe torche'}
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
            {lastScannedResult && !unknownBarcode && (
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
                      En panier : {cart.find((c) => c.product.id === lastScannedResult.product?.id)?.quantity || 1}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* UNRECOGNIZED BARCODE ACTION PANEL (Integration into System) */}
            {unknownBarcode && (
              <div className="p-4 bg-amber-50 border-2 border-amber-400/80 rounded-2xl space-y-3.5 shadow-md animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-xs">
                      <ScanBarcode className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-amber-950 uppercase tracking-wide">
                          Nouveau Code Détecté
                        </span>
                        <span className="font-mono text-xs font-black bg-amber-200 text-amber-900 px-2 py-0.5 rounded-md border border-amber-300">
                          {unknownBarcode}
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-800">
                        Cet article n'est pas encore dans votre base. Que souhaitez-vous faire ?
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setUnknownBarcode(null);
                      setShowLinkProductPicker(false);
                      setShowQuickCreateProduct(false);
                    }}
                    className="p-1 text-amber-700 hover:text-amber-950 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Primary Choice Buttons */}
                {!showLinkProductPicker && !showQuickCreateProduct && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowLinkProductPicker(true)}
                      className="p-3 bg-white hover:bg-slate-50 border border-amber-300 hover:border-amber-400 rounded-xl text-left transition shadow-xs flex items-center gap-3 cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                        <Link className="w-4 h-4 text-amber-700" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black text-slate-900">Lier à un produit existant</p>
                        <p className="text-[10px] text-slate-500 truncate">
                          Associer ce code à une bouteille ou article déjà en stock
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowQuickCreateProduct(true)}
                      className="p-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-left transition shadow-xs flex items-center gap-3 cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                        <PlusCircle className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black text-amber-300">Créer un nouveau produit</p>
                        <p className="text-[10px] text-slate-300 truncate">
                          Ajouter un nouvel article en renseignant nom & prix
                        </p>
                      </div>
                    </button>
                  </div>
                )}

                {/* Option 1: Link to Existing Product Selector */}
                {showLinkProductPicker && (
                  <div className="bg-white p-3.5 rounded-xl border border-amber-300 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                        <Link className="w-3.5 h-3.5 text-amber-600" />
                        <span>Sélectionner l'article à lier au code {unknownBarcode} :</span>
                      </span>
                      <button
                        onClick={() => setShowLinkProductPicker(false)}
                        className="text-[11px] font-bold text-slate-500 hover:text-slate-900"
                      >
                        Retour
                      </button>
                    </div>

                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={linkSearchQuery}
                        onChange={(e) => setLinkSearchQuery(e.target.value)}
                        placeholder="Rechercher par nom de produit ou catégorie..."
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>

                    <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
                      {filteredLinkProducts.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleLinkToExistingProduct(p)}
                          className="w-full p-2 hover:bg-amber-50 border border-slate-100 hover:border-amber-300 rounded-lg text-left text-xs flex items-center justify-between gap-2 transition cursor-pointer group"
                        >
                          <div className="min-w-0">
                            <p className="font-black text-slate-900 group-hover:text-amber-950 truncate">
                              {p.name}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              {p.category} &bull; Stock : {p.stock} {p.unit}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xs font-black text-emerald-700">
                              {p.price.toLocaleString('fr-FR')} {settings.currency}
                            </span>
                            <span className="block text-[9px] font-bold text-amber-700 uppercase">
                              Lier ce code &rarr;
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Option 2: Quick Create Product Form */}
                {showQuickCreateProduct && (
                  <form onSubmit={handleQuickCreateProductSubmit} className="bg-white p-3.5 rounded-xl border border-amber-300 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <PlusCircle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Création Rapide de l'Article (Code : {unknownBarcode})</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowQuickCreateProduct(false)}
                        className="text-[11px] font-bold text-slate-500 hover:text-slate-900"
                      >
                        Retour
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                          Nom du produit *
                        </label>
                        <input
                          type="text"
                          required
                          value={newProductName}
                          onChange={(e) => setNewProductName(e.target.value)}
                          placeholder="Ex: Coca-Cola 50cl"
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                          Catégorie
                        </label>
                        <select
                          value={newProductCategory}
                          onChange={(e) => setNewProductCategory(e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                        >
                          {categories.map((c) => (
                            <option key={c.id} value={c.name}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                          Prix de Vente ({settings.currency}) *
                        </label>
                        <input
                          type="number"
                          required
                          min="0"
                          step="any"
                          value={newProductPrice}
                          onChange={(e) => setNewProductPrice(e.target.value)}
                          placeholder="Ex: 150"
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                          Coût d'Achat ({settings.currency})
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={newProductCostPrice}
                          onChange={(e) => setNewProductCostPrice(e.target.value)}
                          placeholder="Ex: 100"
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                          Stock Initial
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={newProductStock}
                          onChange={(e) => setNewProductStock(e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                          Unité
                        </label>
                        <select
                          value={newProductUnit}
                          onChange={(e) => setNewProductUnit(e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                        >
                          <option value="Bouteille">Bouteille</option>
                          <option value="Cannette">Cannette</option>
                          <option value="Verre">Verre</option>
                          <option value="Portion">Portion</option>
                          <option value="Pièce">Pièce</option>
                          <option value="Boîte">Boîte</option>
                          <option value="Kg">Kg</option>
                          <option value="Litre">Litre</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowQuickCreateProduct(false)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs"
                      >
                        Annuler
                      </button>

                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs shadow-xs"
                      >
                        Enregistrer & Ajouter au panier
                      </button>
                    </div>
                  </form>
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
                  placeholder="Saisir ou scanner avec une douchette USB (ex: 2008491029188)..."
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
                    const cartItem = cart.find((c) => c.product.id === item.product.id);
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

      {/* Barcode Label Printing Modal */}
      {showBarcodeLabelModal && (
        <BarcodeLabelModal onClose={() => setShowBarcodeLabelModal(false)} />
      )}

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
              
              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-1">
                <p className="font-black text-amber-900 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-amber-600 shrink-0" />
                  1. Comment un produit est assigné à un code-barres ?
                </p>
                <p className="text-slate-600">
                  Chaque article industriel possède un code universel (souvent <strong>EAN-13</strong> à 13 chiffres ou <strong>UPC-A</strong> à 12 chiffres) imprimé par le fabricant. Lors de la création de l'article dans BarExp, le commerçant scanne ce code ou le saisit une seule fois dans la case <em>Code-Barres</em>. Le système relie alors instantanément ce code au nom, prix et stock du produit.
                </p>
              </div>

              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-2xl space-y-1">
                <p className="font-black text-blue-900 flex items-center gap-1.5">
                  <ScanBarcode className="w-4 h-4 text-blue-600 shrink-0" />
                  2. Pourquoi parfois on ne voit aucun code-barres mais le scanner détecte quand même ?
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
                </ul>
              </div>

              <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-1">
                <p className="font-black text-emerald-900 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-emerald-600 shrink-0" />
                  3. Et pour les produits sans code (plats cuisinés, boissons locales, services) ?
                </p>
                <p className="text-slate-600">
                  BarExp intègre un <strong>Générateur d'Étiquettes & Code-Barres</strong> permettant de créer des codes EAN-13 propres à votre commerce et de les imprimer sur étiquettes autocollantes pour les coller directement sur vos bouteilles ou articles.
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
