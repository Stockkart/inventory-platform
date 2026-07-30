import JsBarcode from 'jsbarcode';
import type { BarcodeLabelDto } from '../model/types';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Opens a printable sticker sheet: Code128 bars + name / company under each code.
 */
export function openBarcodeLabelPrintWindow(labels: BarcodeLabelDto[]): void {
  if (!labels.length) {
    throw new Error('No labels to print');
  }

  const stickerHtml = labels
    .map((label, index) => {
      const name = label.name?.trim() || '';
      const company = label.companyName?.trim() || '';
      return `
        <div class="sticker">
          <svg class="bars" data-idx="${index}"></svg>
          <div class="code">${escapeHtml(label.code)}</div>
          ${name ? `<div class="name">${escapeHtml(name)}</div>` : ''}
          ${company ? `<div class="company">${escapeHtml(company)}</div>` : ''}
        </div>`;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Barcode labels</title>
  <style>
    @page { margin: 8mm; }
    body { font-family: system-ui, sans-serif; margin: 0; color: #111; }
    .sheet {
      display: flex;
      flex-wrap: wrap;
      gap: 8mm;
      padding: 4mm;
      align-content: flex-start;
    }
    .sticker {
      width: 54mm;
      min-height: 28mm;
      border: 1px dashed #ccc;
      padding: 3mm;
      box-sizing: border-box;
      text-align: center;
      page-break-inside: avoid;
    }
    .bars { width: 100%; height: 14mm; }
    .code { font-size: 10px; letter-spacing: 0.04em; margin-top: 1mm; }
    .name { font-size: 12px; font-weight: 600; margin-top: 1mm; line-height: 1.2; }
    .company { font-size: 10px; color: #333; margin-top: 0.5mm; }
    @media print {
      .sticker { border-color: transparent; }
    }
  </style>
</head>
<body>
  <div class="sheet">${stickerHtml}</div>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) {
    throw new Error('Pop-up blocked. Allow pop-ups to print labels.');
  }
  win.document.open();
  win.document.write(html);
  win.document.close();

  const draw = () => {
    try {
      const nodes = win.document.querySelectorAll('svg.bars[data-idx]');
      nodes.forEach((node) => {
        const idx = Number(node.getAttribute('data-idx'));
        const code = labels[idx]?.code;
        if (!code) return;
        JsBarcode(node as SVGSVGElement, code, {
          format: 'CODE128',
          displayValue: false,
          margin: 0,
          height: 48,
          width: 1.4,
        });
      });
      win.focus();
      win.print();
    } catch (err) {
      win.close();
      throw err instanceof Error ? err : new Error('Failed to render barcodes');
    }
  };

  setTimeout(draw, 50);
}

/** Print stickers for one or more raw codes with optional local text (no API). */
export function openLocalBarcodeLabelPrint(
  items: Array<{
    code: string;
    name?: string | null;
    companyName?: string | null;
  }>,
): void {
  openBarcodeLabelPrintWindow(
    items.map((item) => ({
      code: item.code,
      name: item.name,
      companyName: item.companyName,
    })),
  );
}
