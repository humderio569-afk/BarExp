import React, { useState, useMemo } from 'react';
import { Product } from '../../types';
import { useBar } from '../../context/BarContext';
import { generateEAN13Barcode, generateBarcodeSvgPath } from '../../utils/barcodeGenerator';
import {
  X,
  Printer,
  ScanBarcode,
  RefreshCw,
  Check,
  Tag,
  Copy,
  Layers,
  Sparkles,
  Info,
  CheckCircle2
} from 'lucide-react';

interface BarcodeLabelModalProps {
  initialProduct?: Product | null;
  onClose: () => void;
}

export const BarcodeLabelModal: React.FC<BarcodeLabelModalProps> = ({ initialProduct, onClose }) => {
  const { products, updateProduct, settings, activeCompany } = useBar();

  const [selectedProductId, setSelectedProductId] = useState<string>(
    initialProduct ? initialProduct.id : (products[0]?.id || '')
  );

  const selectedProduct = useMemo(() => {
    return products.find(p => p.id === selectedProductId) || initialProduct || products[0];
  }, [products, selectedProductId, initialProduct]);

  const [currentBarcode, setCurrentBarcode] = useState<string>(() => {
    return selectedProduct?.barcode || generateEAN13Barcode();
  });

  const [labelQuantity, setLabelQuantity] = useState<number>(4);
  const [printLayout, setPrintLayout] = useState<'thermal_single' | 'sheet_grid'>('thermal_single');
  const [includePrice, setIncludePrice] = useState<boolean>(true);
  const [includeCompanyName, setIncludeCompanyName] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // When selected product changes, load its barcode or generate one
  const handleProductChange = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = products.find(p => p.id === prodId);
    if (prod) {
      setCurrentBarcode(prod.barcode || generateEAN13Barcode());
    }
  };

  const handleGenerateNewCode = () => {
    const newCode = generateEAN13Barcode();
    setCurrentBarcode(newCode);
  };

  const handleSaveToProduct = () => {
    if (!selectedProduct) return;
    updateProduct(selectedProduct.id, { barcode: currentBarcode });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentBarcode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    // Save to product if not already saved
    if (selectedProduct && selectedProduct.barcode !== currentBarcode) {
      updateProduct(selectedProduct.id, { barcode: currentBarcode });
    }
    window.print();
  };

  const svgData = useMemo(() => {
    return generateBarcodeSvgPath(currentBarcode);
  }, [currentBarcode]);

  const companyDisplayName = activeCompany?.name || settings.barName || 'BarExp';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      
      {/* Printable Area - Only visible during print */}
      <div className="hidden print:block fixed inset-0 bg-white p-4 z-[9999]">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body * {
              visibility: hidden;
            }
            .print\\:block, .print\\:block * {
              visibility: visible;
            }
            @page {
              margin: 4mm;
              size: auto;
            }
          }
        `}} />

        <div className={`grid ${printLayout === 'thermal_single' ? 'grid-cols-1 gap-4 max-w-[60mm] mx-auto' : 'grid-cols-3 gap-3 max-w-2xl mx-auto'}`}>
          {Array.from({ length: labelQuantity }).map((_, idx) => (
            <div
              key={idx}
              className="border border-black rounded-lg p-2.5 bg-white text-center flex flex-col items-center justify-between min-h-[38mm] max-h-[50mm] page-break-inside-avoid"
            >
              {includeCompanyName && (
                <p className="text-[10px] font-black text-black uppercase tracking-tight truncate w-full border-b border-black/30 pb-0.5 mb-1">
                  {companyDisplayName}
                </p>
              )}

              <p className="text-xs font-black text-black leading-tight truncate w-full">
                {selectedProduct?.name || 'Produit'}
              </p>

              {selectedProduct?.varietyOptions && selectedProduct.varietyOptions.length > 0 && (
                <p className="text-[9px] font-bold text-gray-700">
                  {selectedProduct.varietyOptions[0]}
                </p>
              )}

              <div className="my-1 flex items-center justify-center w-full">
                <svg
                  viewBox={`0 0 ${svgData.width} ${svgData.height}`}
                  className="w-full max-h-10 object-contain"
                  dangerouslySetInnerHTML={{ __html: svgData.paths }}
                />
              </div>

              <p className="font-mono text-[10px] font-bold tracking-widest text-black mb-0.5">
                {currentBarcode}
              </p>

              {includePrice && selectedProduct && (
                <div className="text-[11px] font-black text-black bg-gray-100 border border-black/40 px-2 py-0.5 rounded w-full flex items-center justify-between">
                  <span className="text-[9px] uppercase font-bold">Prix</span>
                  <span>{selectedProduct.price.toLocaleString('fr-FR')} {settings.currency}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Screen Modal Container */}
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 duration-150 print:hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 p-4 sm:p-5 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20 shrink-0">
              <ScanBarcode className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                Générateur d'Étiquettes & Code-Barres
              </h3>
              <p className="text-xs text-slate-300">
                Générez des codes universels et imprimez des étiquettes adhésives pour vos produits
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Step 1: Select Product */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-amber-600" />
              <span>1. Choisir l'article du stock</span>
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => handleProductChange(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.price.toLocaleString('fr-FR')} {settings.currency} {p.barcode ? `(Code: ${p.barcode})` : '(Sans code-barres)'}
                </option>
              ))}
            </select>
          </div>

          {/* Step 2: Barcode Visual Preview & Generation */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                2. Code-Barres Assigné
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGenerateNewCode}
                  className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold rounded-lg text-[11px] flex items-center gap-1 transition cursor-pointer"
                  title="Générer un nouveau code EAN-13 valide"
                >
                  <RefreshCw className="w-3 h-3 text-amber-700" />
                  <span>Générer un code aléatoire</span>
                </button>
              </div>
            </div>

            {/* Visual Barcode Card Preview */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col items-center justify-center text-center space-y-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {companyDisplayName}
              </p>
              <h4 className="text-sm font-black text-slate-900">
                {selectedProduct?.name || 'Produit Sélectionné'}
              </h4>

              {/* Barcode Vector Graphic */}
              <div className="w-full max-w-xs py-2 px-3 bg-white border border-slate-100 rounded-lg flex items-center justify-center">
                <svg
                  viewBox={`0 0 ${svgData.width} ${svgData.height}`}
                  className="w-full h-12 object-contain"
                  dangerouslySetInnerHTML={{ __html: svgData.paths }}
                />
              </div>

              {/* Number and Copy */}
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-black tracking-widest text-slate-800 bg-slate-100 px-3 py-1 rounded-lg">
                  {currentBarcode}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
                  title="Copier le code"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Action to persist barcode to product */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleSaveToProduct}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                {saveSuccess ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Code enregistré sur la fiche produit !</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Associer ce code à "{selectedProduct?.name}"</span>
                  </>
                )}
              </button>

              <span className="text-[11px] text-slate-500">
                {selectedProduct?.barcode === currentBarcode ? 'Déjà associé en base' : 'Non sauvegardé sur le produit'}
              </span>
            </div>
          </div>

          {/* Step 3: Print Options & Sticker Quantity */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">
              3. Options d'Impression des Étiquettes
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Quantity selector */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Nombre d'étiquettes à imprimer :
                </label>
                <div className="flex items-center gap-1.5">
                  {[1, 4, 8, 12, 24].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setLabelQuantity(qty)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-black border transition cursor-pointer ${
                        labelQuantity === qty
                          ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {qty}
                    </button>
                  ))}
                </div>
              </div>

              {/* Layout format */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Format de papier / Imprimante :
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPrintLayout('thermal_single')}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold border transition cursor-pointer truncate ${
                      printLayout === 'thermal_single'
                        ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-xs font-black'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Rouleau Thermique (58/80mm)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintLayout('sheet_grid')}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold border transition cursor-pointer truncate ${
                      printLayout === 'sheet_grid'
                        ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-xs font-black'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Planche A4 Autocollante
                  </button>
                </div>
              </div>
            </div>

            {/* Checkboxes */}
            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs font-bold text-slate-700">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includePrice}
                  onChange={(e) => setIncludePrice(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-amber-400"
                />
                <span>Afficher le prix de vente ({selectedProduct?.price.toLocaleString('fr-FR')} {settings.currency})</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeCompanyName}
                  onChange={(e) => setIncludeCompanyName(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-amber-400"
                />
                <span>Afficher le nom de l'établissement</span>
              </label>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs border border-slate-200 transition cursor-pointer"
          >
            Fermer
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black rounded-xl text-xs shadow-md transition flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer {labelQuantity} Étiquette{labelQuantity > 1 ? 's' : ''}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
