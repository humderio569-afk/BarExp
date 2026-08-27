import { Sale, BarSettings } from '../types';

/**
 * Print receipt using an isolated hidden iframe for 100% reliability in browsers, PWAs, and iframes.
 */
export function printReceiptIframe(sale: Sale, settings: BarSettings): void {
  const itemsHtml = sale.items.map(item => {
    const itemTotal = (item.product.price - item.discount) * item.quantity;
    return `
      <div style="margin-bottom: 6px; font-size: 11px;">
        <div style="display: flex; justify-content: space-between; font-weight: bold;">
          <span>${item.product.name}</span>
          <span>${itemTotal.toLocaleString()} ${settings.currency || 'FCFA'}</span>
        </div>
        ${item.selectedFlavor ? `<div style="font-size: 10px; color: #b45309; font-weight: 600; padding-left: 4px;">Parfum: ${item.selectedFlavor}</div>` : ''}
        <div style="font-size: 10px; color: #475569; padding-left: 4px;">
          ${item.quantity} x ${item.product.price.toLocaleString()} ${settings.currency || 'FCFA'}
          ${item.discount > 0 ? ` (-${item.discount.toLocaleString()} rem)` : ''}
        </div>
      </div>
    `;
  }).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <title>Ticket N° ${sale.receiptNumber} - ${settings.barName}</title>
      <style>
        @page {
          size: 80mm auto;
          margin: 0;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: 'Courier New', Courier, monospace, -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 11px;
          color: #0f172a;
          background: #ffffff;
          width: 76mm;
          max-width: 80mm;
          margin: 0 auto;
          padding: 8px 6px;
          line-height: 1.35;
        }
        .header {
          text-align: center;
          padding-bottom: 6px;
          border-bottom: 1px dashed #64748b;
          margin-bottom: 6px;
        }
        .bar-name {
          font-size: 14px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .tagline {
          font-size: 9.5px;
          color: #475569;
          margin-top: 2px;
        }
        .contact {
          font-size: 9px;
          color: #64748b;
          margin-top: 2px;
        }
        .meta-row {
          display: flex;
          justify-content: space-between;
          font-size: 10.5px;
          margin-bottom: 2px;
        }
        .dashed {
          border-bottom: 1px dashed #64748b;
          margin: 6px 0;
        }
        .bold {
          font-weight: bold;
        }
        .table-header {
          display: flex;
          justify-content: space-between;
          font-weight: bold;
          font-size: 10px;
          border-bottom: 1px solid #cbd5e1;
          padding-bottom: 3px;
          margin-bottom: 5px;
        }
        .totals-row {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          margin-bottom: 3px;
        }
        .grand-total {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          font-weight: 900;
          border-top: 1px solid #0f172a;
          padding-top: 4px;
          margin-top: 4px;
        }
        .footer {
          text-align: center;
          font-size: 9.5px;
          color: #64748b;
          font-style: italic;
          margin-top: 6px;
          padding-top: 6px;
          border-top: 1px dashed #64748b;
        }
        .barcode {
          text-align: center;
          margin-top: 8px;
          letter-spacing: 3px;
          font-size: 14px;
        }
        @media print {
          body {
            width: 100%;
            padding: 4px;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="bar-name">${settings.barName || 'Lamadone Express'}</div>
        ${settings.tagline ? `<div class="tagline">${settings.tagline}</div>` : ''}
        ${settings.address ? `<div class="contact">${settings.address}</div>` : ''}
        ${settings.phone ? `<div class="contact">Tél: ${settings.phone}</div>` : ''}
      </div>

      <div>
        <div class="meta-row">
          <span>Ticket N°:</span>
          <span class="bold">${sale.receiptNumber}</span>
        </div>
        <div class="meta-row">
          <span>Date:</span>
          <span>${new Date(sale.timestamp).toLocaleString('fr-FR')}</span>
        </div>
        <div class="meta-row">
          <span class="bold">Caissier(e):</span>
          <span class="bold">${sale.cashierName || 'Caisse'}</span>
        </div>
        <div class="meta-row">
          <span>Emplacement:</span>
          <span class="bold">${sale.tableName || 'Comptoir'}</span>
        </div>
      </div>

      <div class="dashed"></div>

      <div class="table-header">
        <span>ARTICLE x QTE</span>
        <span>TOTAL</span>
      </div>

      <div>
        ${itemsHtml}
      </div>

      <div class="dashed"></div>

      <div>
        <div class="totals-row">
          <span>Sous-total:</span>
          <span>${sale.subtotal.toLocaleString()} ${settings.currency || 'FCFA'}</span>
        </div>

        ${sale.discountTotal > 0 ? `
          <div class="totals-row" style="color: #166534;">
            <span>Remise:</span>
            <span>-${sale.discountTotal.toLocaleString()} ${settings.currency || 'FCFA'}</span>
          </div>
        ` : ''}

        <div class="grand-total">
          <span>TOTAL PAYÉ:</span>
          <span>${sale.total.toLocaleString()} ${settings.currency || 'FCFA'}</span>
        </div>

        <div class="totals-row" style="margin-top: 4px; font-size: 10px; color: #475569;">
          <span>Mode de Paiement:</span>
          <span class="bold" style="text-transform: uppercase;">${sale.paymentMethod}</span>
        </div>

        ${sale.paymentMethod === 'Espèces' ? `
          <div class="totals-row" style="font-size: 10px; color: #475569;">
            <span>Montant Reçu:</span>
            <span>${sale.amountPaid.toLocaleString()} ${settings.currency || 'FCFA'}</span>
          </div>
          <div class="totals-row" style="font-size: 10px; color: #475569;">
            <span>Monnaie Rendue:</span>
            <span class="bold">${sale.changeGiven.toLocaleString()} ${settings.currency || 'FCFA'}</span>
          </div>
        ` : ''}
      </div>

      <div class="footer">
        Merci de votre visite et à très bientôt !
      </div>

      <div class="barcode">
        ||| | |||| | || ||| || |||
      </div>
    </body>
    </html>
  `;

  printHtmlInIframe(htmlContent, `Ticket-${sale.receiptNumber}`);
}

/**
 * Print any HTML content in an isolated invisible iframe.
 */
export function printHtmlInIframe(htmlContent: string, documentTitle: string = 'Document'): void {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.title = documentTitle;
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    // Fallback to window.print() if iframe document is not accessible
    window.print();
    return;
  }

  doc.open();
  doc.write(htmlContent);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.warn('Iframe print failed, falling back to window.print:', err);
      window.print();
    } finally {
      // Remove iframe after sufficient timeout for printing dialog
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 60000);
    }
  }, 250);
}

/**
 * Print element from DOM by its ID using an isolated iframe.
 */
export function printElementById(elementId: string, title: string = 'Rapport'): void {
  const el = document.getElementById(elementId);
  if (!el) {
    window.print();
    return;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        @page {
          size: A4 portrait;
          margin: 10mm;
        }
        body {
          background: #ffffff !important;
          color: #0f172a !important;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 10px;
        }
        .no-print {
          display: none !important;
        }
        .print-break-inside-avoid {
          break-inside: avoid !important;
          page-break-inside: avoid !important;
        }
        @media print {
          body {
            padding: 0;
          }
        }
      </style>
    </head>
    <body class="bg-white text-slate-900 font-sans">
      <div class="max-w-4xl mx-auto">
        ${el.innerHTML}
      </div>
    </body>
    </html>
  `;

  printHtmlInIframe(htmlContent, title);
}

/**
 * Download ticket receipt image in high resolution.
 */
export async function downloadReceiptImage(sale: Sale, settings: BarSettings): Promise<void> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    downloadReceiptHtml(sale, settings);
    return;
  }

  const width = 420;
  const padding = 20;
  const baseHeight = 380;
  const itemHeight = 32;
  const totalHeight = baseHeight + (sale.items.length * itemHeight);

  const scale = 2;
  canvas.width = width * scale;
  canvas.height = totalHeight * scale;

  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = '#fffdfa'; // Warm receipt paper
  ctx.fillRect(0, 0, width, totalHeight);

  // Border
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.strokeRect(6, 6, width - 12, totalHeight - 12);

  let currentY = 28;

  // Header Text
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 16px Courier, monospace';
  ctx.textAlign = 'center';
  ctx.fillText((settings.barName || 'LAMADONE EXPRESS').toUpperCase(), width / 2, currentY);
  currentY += 18;

  if (settings.tagline) {
    ctx.font = '11px Courier, monospace';
    ctx.fillStyle = '#475569';
    ctx.fillText(settings.tagline, width / 2, currentY);
    currentY += 15;
  }

  if (settings.address) {
    ctx.font = '10px Courier, monospace';
    ctx.fillStyle = '#64748b';
    ctx.fillText(settings.address, width / 2, currentY);
    currentY += 14;
  }

  if (settings.phone) {
    ctx.font = '10px Courier, monospace';
    ctx.fillStyle = '#64748b';
    ctx.fillText(`Tél: ${settings.phone}`, width / 2, currentY);
    currentY += 14;
  }

  // Dashed Line
  currentY += 4;
  drawDashedLine(ctx, padding, currentY, width - padding, currentY);
  currentY += 16;

  // Metadata
  ctx.textAlign = 'left';
  ctx.font = '11px Courier, monospace';
  ctx.fillStyle = '#334155';

  ctx.fillText(`Ticket N°:`, padding, currentY);
  ctx.font = 'bold 11px Courier, monospace';
  ctx.fillText(`${sale.receiptNumber}`, padding + 100, currentY);
  currentY += 16;

  ctx.font = '11px Courier, monospace';
  ctx.fillText(`Date:`, padding, currentY);
  const dateStr = new Date(sale.timestamp).toLocaleString('fr-FR');
  ctx.fillText(dateStr, padding + 100, currentY);
  currentY += 16;

  ctx.fillText(`Caissier(e):`, padding, currentY);
  ctx.font = 'bold 11px Courier, monospace';
  ctx.fillText(`${sale.cashierName || 'Caisse'}`, padding + 100, currentY);
  currentY += 16;

  ctx.font = '11px Courier, monospace';
  ctx.fillText(`Emplacement:`, padding, currentY);
  ctx.font = 'bold 11px Courier, monospace';
  ctx.fillText(`${sale.tableName || 'Comptoir'}`, padding + 100, currentY);
  currentY += 16;

  drawDashedLine(ctx, padding, currentY, width - padding, currentY);
  currentY += 16;

  // Table Header
  ctx.font = 'bold 11px Courier, monospace';
  ctx.fillStyle = '#0f172a';
  ctx.fillText('ARTICLE x QTE', padding, currentY);
  ctx.textAlign = 'right';
  ctx.fillText(`TOTAL (${settings.currency || 'FCFA'})`, width - padding, currentY);
  currentY += 16;

  // Items
  sale.items.forEach(item => {
    const itemTotal = (item.product.price - item.discount) * item.quantity;
    
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 11px Courier, monospace';
    ctx.fillText(item.product.name.slice(0, 24), padding, currentY);

    ctx.textAlign = 'right';
    ctx.fillText(`${itemTotal.toLocaleString()}`, width - padding, currentY);
    currentY += 14;

    if (item.selectedFlavor) {
      ctx.textAlign = 'left';
      ctx.font = 'bold 10px Courier, monospace';
      ctx.fillStyle = '#b45309';
      ctx.fillText(` Parf: ${item.selectedFlavor}`, padding + 6, currentY);
      currentY += 13;
    }

    ctx.textAlign = 'left';
    ctx.font = '10px Courier, monospace';
    ctx.fillStyle = '#64748b';
    let detailText = `${item.quantity} x ${item.product.price.toLocaleString()} ${settings.currency || 'FCFA'}`;
    if (item.discount > 0) {
      detailText += ` (-${item.discount.toLocaleString()} rem)`;
    }
    ctx.fillText(detailText, padding + 6, currentY);
    currentY += 16;
  });

  drawDashedLine(ctx, padding, currentY, width - padding, currentY);
  currentY += 16;

  // Subtotal & Totals
  ctx.textAlign = 'left';
  ctx.font = '11px Courier, monospace';
  ctx.fillStyle = '#334155';
  ctx.fillText('Sous-total:', padding, currentY);
  ctx.textAlign = 'right';
  ctx.fillText(`${sale.subtotal.toLocaleString()} ${settings.currency || 'FCFA'}`, width - padding, currentY);
  currentY += 16;

  if (sale.discountTotal > 0) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#166534';
    ctx.fillText('Remise globale:', padding, currentY);
    ctx.textAlign = 'right';
    ctx.fillText(`-${sale.discountTotal.toLocaleString()} ${settings.currency || 'FCFA'}`, width - padding, currentY);
    currentY += 16;
  }

  // Grand Total
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 14px Courier, monospace';
  ctx.textAlign = 'left';
  ctx.fillText('TOTAL PAYÉ:', padding, currentY);
  ctx.textAlign = 'right';
  ctx.fillText(`${sale.total.toLocaleString()} ${settings.currency || 'FCFA'}`, width - padding, currentY);
  currentY += 18;

  // Payment details
  ctx.font = '10px Courier, monospace';
  ctx.fillStyle = '#475569';
  ctx.textAlign = 'left';
  ctx.fillText('Mode Paiement:', padding, currentY);
  ctx.textAlign = 'right';
  ctx.fillText(sale.paymentMethod.toUpperCase(), width - padding, currentY);
  currentY += 14;

  if (sale.paymentMethod === 'Espèces') {
    ctx.textAlign = 'left';
    ctx.fillText('Reçu:', padding, currentY);
    ctx.textAlign = 'right';
    ctx.fillText(`${sale.amountPaid.toLocaleString()} ${settings.currency || 'FCFA'}`, width - padding, currentY);
    currentY += 14;

    ctx.textAlign = 'left';
    ctx.fillText('Monnaie rendue:', padding, currentY);
    ctx.textAlign = 'right';
    ctx.font = 'bold 10px Courier, monospace';
    ctx.fillText(`${sale.changeGiven.toLocaleString()} ${settings.currency || 'FCFA'}`, width - padding, currentY);
    currentY += 16;
  }

  drawDashedLine(ctx, padding, currentY, width - padding, currentY);
  currentY += 16;

  // Footer Message
  ctx.textAlign = 'center';
  ctx.font = 'italic 10px sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('Merci de votre visite et à très bientôt !', width / 2, currentY);
  currentY += 16;

  // Barcode
  drawBarcode(ctx, width / 2 - 60, currentY, 120, 20);

  // Trigger Download
  try {
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `recu-${sale.receiptNumber}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error('Erreur canvas toDataURL, fallback to HTML receipt:', err);
    downloadReceiptHtml(sale, settings);
  }
}

/**
 * Download Standalone HTML/PDF-ready Receipt Document.
 */
export function downloadReceiptHtml(sale: Sale, settings: BarSettings): void {
  const itemsHtml = sale.items.map(item => {
    const itemTotal = (item.product.price - item.discount) * item.quantity;
    return `
      <tr>
        <td style="padding: 4px 0; border-bottom: 1px dashed #e2e8f0;">
          <div style="font-weight: bold;">${item.product.name}</div>
          ${item.selectedFlavor ? `<div style="font-size: 10px; color: #b45309;">Parfum: ${item.selectedFlavor}</div>` : ''}
          <div style="font-size: 10px; color: #64748b;">${item.quantity} x ${item.product.price.toLocaleString()} ${settings.currency || 'FCFA'}${item.discount > 0 ? ` (-${item.discount.toLocaleString()})` : ''}</div>
        </td>
        <td style="padding: 4px 0; text-align: right; font-weight: bold; border-bottom: 1px dashed #e2e8f0; vertical-align: top;">
          ${itemTotal.toLocaleString()} ${settings.currency || 'FCFA'}
        </td>
      </tr>
    `;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <title>Ticket N° ${sale.receiptNumber} - ${settings.barName}</title>
      <style>
        body { font-family: monospace, sans-serif; background: #f8fafc; padding: 20px; color: #0f172a; }
        .ticket { max-width: 380px; margin: 0 auto; background: #ffffff; padding: 20px; border: 1px solid #cbd5e1; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .center { text-align: center; }
        .dashed { border-bottom: 1px dashed #94a3b8; margin: 12px 0; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .total-row { font-size: 14px; font-weight: 900; }
        @media print { body { background: #fff; padding: 0; } .ticket { box-shadow: none; border: none; } }
      </style>
    </head>
    <body>
      <div class="ticket">
        <div class="center">
          <h2 style="margin: 0; font-size: 18px; text-transform: uppercase;">${settings.barName}</h2>
          ${settings.tagline ? `<p style="font-size: 11px; color: #64748b; margin: 4px 0;">${settings.tagline}</p>` : ''}
          ${settings.address ? `<p style="font-size: 10px; color: #64748b; margin: 2px 0;">${settings.address}</p>` : ''}
          ${settings.phone ? `<p style="font-size: 10px; color: #64748b; margin: 2px 0;">Tél: ${settings.phone}</p>` : ''}
        </div>
        <div class="dashed"></div>
        <div style="font-size: 11px; line-height: 1.5;">
          <div><strong>Ticket N°:</strong> ${sale.receiptNumber}</div>
          <div><strong>Date:</strong> ${new Date(sale.timestamp).toLocaleString('fr-FR')}</div>
          <div><strong>Caissier(e):</strong> ${sale.cashierName || 'Caisse'}</div>
          <div><strong>Emplacement:</strong> ${sale.tableName || 'Comptoir'}</div>
        </div>
        <div class="dashed"></div>
        <table>
          <thead>
            <tr style="border-bottom: 1px solid #0f172a; text-align: left; font-size: 11px;">
              <th>ARTICLE x QTE</th>
              <th style="text-align: right;">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        <div class="dashed"></div>
        <div style="font-size: 12px; line-height: 1.6;">
          <div style="display: flex; justify-content: space-between;"><span>Sous-total:</span><span>${sale.subtotal.toLocaleString()} ${settings.currency || 'FCFA'}</span></div>
          ${sale.discountTotal > 0 ? `<div style="display: flex; justify-content: space-between; color: #166534;"><span>Remise:</span><span>-${sale.discountTotal.toLocaleString()} ${settings.currency || 'FCFA'}</span></div>` : ''}
          <div class="dashed" style="margin: 6px 0;"></div>
          <div class="total-row" style="display: flex; justify-content: space-between;"><span>TOTAL PAYÉ:</span><span>${sale.total.toLocaleString()} ${settings.currency || 'FCFA'}</span></div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-top: 6px;"><span>Paiement:</span><strong>${sale.paymentMethod.toUpperCase()}</strong></div>
          ${sale.paymentMethod === 'Espèces' ? `
            <div style="display: flex; justify-content: space-between; font-size: 11px;"><span>Reçu:</span><span>${sale.amountPaid.toLocaleString()} ${settings.currency || 'FCFA'}</span></div>
            <div style="display: flex; justify-content: space-between; font-size: 11px;"><span>Monnaie Rendue:</span><strong>${sale.changeGiven.toLocaleString()} ${settings.currency || 'FCFA'}</strong></div>
          ` : ''}
        </div>
        <div class="dashed"></div>
        <div class="center" style="font-size: 11px; color: #64748b; font-style: italic; margin-top: 10px;">
          Merci de votre visite et à très bientôt !
        </div>
      </div>
      <script>
        window.onload = function() { window.print(); }
      </script>
    </body>
    </html>
  `;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `recu-${sale.receiptNumber}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function drawDashedLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  ctx.save();
  ctx.beginPath();
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1;
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function drawBarcode(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = '#0f172a';
  let curX = x;
  const barWidths = [2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 3];
  barWidths.forEach((bw, i) => {
    if (i % 2 === 0) {
      ctx.fillRect(curX, y, bw, h);
    }
    curX += bw + 1;
  });
}
