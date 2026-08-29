import React, { useState } from 'react';
import { Sale } from '../../types';
import { useBar } from '../../context/BarContext';
import { Printer, CheckCircle, Download, FileText, Sparkles } from 'lucide-react';
import { downloadReceiptImage, downloadReceiptHtml, printReceiptIframe } from '../../utils/receiptGenerator';

interface ReceiptModalProps {
  sale: Sale;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ sale, onClose }) => {
  const { settings } = useBar();
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const handlePrint = () => {
    printReceiptIframe(sale, settings);
  };

  const handleDownloadImage = async () => {
    setDownloading(true);
    setDownloadSuccess(null);
    try {
      await downloadReceiptImage(sale, settings);
      setDownloadSuccess('Reçu image (PNG) téléchargé !');
      setTimeout(() => setDownloadSuccess(null), 3000);
    } catch (err) {
      console.error("Erreur téléchargement reçu:", err);
      // Fallback to HTML receipt
      downloadReceiptHtml(sale, settings);
      setDownloadSuccess('Reçu généré avec succès !');
      setTimeout(() => setDownloadSuccess(null), 3000);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadPdfHtml = () => {
    downloadReceiptHtml(sale, settings);
    setDownloadSuccess('Document reçu PDF/HTML prêt !');
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn overflow-y-auto overscroll-contain">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-4 sm:p-5 shadow-2xl space-y-4 text-slate-900 relative max-h-[92dvh] flex flex-col my-auto overflow-hidden">
        
        {/* Scrollable Receipt Body */}
        <div className="flex-1 overflow-y-auto space-y-4 overscroll-contain pr-1">
          {/* Success Banner */}
          <div className="text-center space-y-1">
            <CheckCircle className="w-9 h-9 text-emerald-600 mx-auto animate-bounce" />
            <h3 className="text-base sm:text-lg font-black text-slate-900">Vente Réussie !</h3>
            <p className="text-xs text-slate-500">Stock mis à jour automatiquement en temps réel.</p>
          </div>

          {/* Receipt Paper Simulation */}
          <div id="receipt-print-area" className="bg-amber-50 text-slate-900 p-4 rounded-2xl font-mono text-xs shadow-inner space-y-3 border border-amber-200 select-none">
          
          {/* Header */}
          <div className="text-center space-y-0.5 border-b border-dashed border-slate-400 pb-3">
            {settings.logo && (
              <img
                src={settings.logo}
                alt="Logo Bar"
                className="w-12 h-12 object-contain mx-auto mb-1.5 rounded bg-white p-0.5 border border-slate-300 shadow-2xs"
              />
            )}
            <h2 className="font-black text-base uppercase tracking-tight">{settings.barName}</h2>
            {settings.tagline && <p className="text-[10px] text-slate-600">{settings.tagline}</p>}
            {settings.address && <p className="text-[10px] text-slate-600">{settings.address}</p>}
            {settings.phone && <p className="text-[10px] text-slate-600">Tél: {settings.phone}</p>}
          </div>

          {/* Metadata */}
          <div className="space-y-1 text-[11px] text-slate-700 border-b border-dashed border-slate-400 pb-2">
            <div className="flex justify-between">
              <span>Ticket N°:</span>
              <span className="font-bold">{sale.receiptNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>Date:</span>
              <span>{new Date(sale.timestamp).toLocaleString('fr-FR')}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-amber-900">Caissier(e):</span>
              <span className="font-bold text-slate-900">{sale.cashierName || 'Caisse'}</span>
            </div>
            <div className="flex justify-between">
              <span>Emplacement:</span>
              <span className="font-bold">{sale.tableName}</span>
            </div>
          </div>

          {/* Items List Table */}
          <div className="space-y-1.5 border-b border-dashed border-slate-400 pb-3">
            <div className="flex justify-between font-bold text-slate-800 border-b border-slate-300 pb-1 text-[10px]">
              <span>ARTICLE x QTE</span>
              <span>TOTAL</span>
            </div>

            {sale.items.map((item, idx) => {
              const itemTotal = (item.product.price - item.discount) * item.quantity;
              return (
                <div key={idx} className="flex justify-between items-start text-[11px]">
                  <div>
                    <span className="font-bold">{item.product.name}</span>
                    {(item.selectedVariety || item.selectedFlavor) && (
                      <div className="text-[10px] font-bold text-amber-900 bg-amber-100/80 px-1 py-0.2 rounded mt-0.5">
                        {item.product.varietyLabel || 'Variante'}: {item.selectedVariety || item.selectedFlavor}
                      </div>
                    )}
                    <div className="text-[10px] text-slate-600">
                      {item.quantity} x {item.product.price.toLocaleString()} {settings.currency}
                      {item.discount > 0 && ` (-${item.discount} rem)`}
                    </div>
                  </div>
                  <span className="font-bold">{itemTotal.toLocaleString()} {settings.currency}</span>
                </div>
              );
            })}
          </div>

          {/* Totals Breakdown */}
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span>Sous-total:</span>
              <span>{sale.subtotal.toLocaleString()} {settings.currency}</span>
            </div>

            {sale.discountTotal > 0 && (
              <div className="flex justify-between text-emerald-800">
                <span>Remise:</span>
                <span>-{sale.discountTotal.toLocaleString()} {settings.currency}</span>
              </div>
            )}

            <div className="flex justify-between font-black text-sm pt-1 border-t border-slate-400 text-slate-950">
              <span>TOTAL PAYÉ:</span>
              <span>{sale.total.toLocaleString()} {settings.currency}</span>
            </div>

            <div className="flex justify-between text-slate-600 text-[10px]">
              <span>Mode de Paiement:</span>
              <span className="font-bold uppercase">{sale.paymentMethod}</span>
            </div>

            {sale.paymentMethod === 'Espèces' && (
              <>
                <div className="flex justify-between text-slate-600 text-[10px]">
                  <span>Reçu:</span>
                  <span>{sale.amountPaid.toLocaleString()} {settings.currency}</span>
                </div>
                <div className="flex justify-between text-slate-600 text-[10px]">
                  <span>Monnaie rendue:</span>
                  <span className="font-bold">{sale.changeGiven.toLocaleString()} {settings.currency}</span>
                </div>
              </>
            )}
          </div>

          {/* Footer Note */}
          <div className="text-center pt-2 border-t border-dashed border-slate-400 text-[10px] text-slate-600 font-sans italic">
            Merci de votre visite et à très bientôt !
          </div>

        </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1 shrink-0">
          {downloadSuccess && (
            <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-bold text-center flex items-center justify-center space-x-1.5 animate-fadeIn">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>{downloadSuccess}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleDownloadImage}
              disabled={downloading}
              className="py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-extrabold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition cursor-pointer shadow-sm disabled:opacity-50"
              title="Télécharger l'image haute définition du reçu (PNG)"
            >
              <Download className="w-4 h-4" />
              <span>{downloading ? 'Génération...' : 'Télécharger'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition cursor-pointer shadow-sm"
              title="Imprimer directement le ticket thermique ou enregistrer en PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer Ticket</span>
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleDownloadPdfHtml}
              className="flex-1 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs rounded-xl transition cursor-pointer border border-amber-200 flex items-center justify-center space-x-1"
              title="Ouvrir le reçu dans un format imprimable A4/80mm"
            >
              <FileText className="w-3.5 h-3.5 text-amber-700" />
              <span>Format PDF / Web</span>
            </button>

            <button
              onClick={onClose}
              className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
