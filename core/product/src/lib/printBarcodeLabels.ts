import JsBarcode from 'jsbarcode';
import { labelLayoutSession } from './labelLayoutSession';
import { renderBarcodeLabelsHtml, type RenderOptions } from './renderBarcodeLabelsHtml';
import { DEFAULT_LAYOUT, type EffectiveLabelLayout, type LabelData } from '../model/labelLayout.types';

/**
 * Opens a printable sticker sheet rendered by the pure `renderBarcodeLabelsHtml`
 * and draws Code128 bars into each `svg.bars[data-idx]`.
 *
 * Layout resolution (Req 7.8, 7.9, 7.10): explicit `layout` (from the labels
 * response) → session-cached layout → `DEFAULT_LAYOUT`.
 * Rendering errors (e.g. an empty list, Req 7.13) are thrown before any window opens.
 *
 * `opts.startPosition` (Req 10.9) is forwarded to the renderer; it only affects
 * `SHEET` layouts and is ignored for `ROLL`.
 */
export function openBarcodeLabelPrintWindow(
  labels: LabelData[],
  layout?: EffectiveLabelLayout | null,
  opts?: RenderOptions,
): void {
  const effective: EffectiveLabelLayout = layout ?? labelLayoutSession.get() ?? DEFAULT_LAYOUT;
  const result = renderBarcodeLabelsHtml(labels, effective, opts);
  if (!result.ok) {
    throw new Error(result.error);
  }

  const win = window.open('', '_blank');
  if (!win) {
    throw new Error('Pop-up blocked. Allow pop-ups to print labels.');
  }
  win.document.open();
  win.document.write(result.html);
  win.document.close();

  const draw = () => {
    try {
      const nodes = win.document.querySelectorAll<SVGSVGElement>('svg.bars[data-idx]');
      nodes.forEach((node) => {
        const idx = Number(node.getAttribute('data-idx'));
        const code = node.dataset.code || labels[idx]?.code;
        if (!code) return;
        JsBarcode(node, code, {
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

/**
 * Print stickers for one or more raw codes with optional local text (no API).
 * Uses the session-cached layout when one exists, else `DEFAULT_LAYOUT` (Req 7.9, 7.10).
 */
export function openLocalBarcodeLabelPrint(
  items: Array<{
    code: string;
    name?: string | null;
    companyName?: string | null;
    price?: number | null;
  }>,
): void {
  const labels: LabelData[] = items.map((item) => ({
    code: item.code,
    name: item.name,
    companyName: item.companyName,
    price: item.price,
    values: {
      productName: item.name ?? '',
      companyName: item.companyName ?? '',
      ...(item.price != null ? { mrp: `₹${item.price.toFixed(2)}` } : {}),
    },
  }));
  openBarcodeLabelPrintWindow(labels);
}
