import { describe, expect, it } from 'vitest';
import { fitStackedSticker, renderBarcodeLabelsHtml } from './renderBarcodeLabelsHtml';
import {
  DEFAULT_LAYOUT,
  STICKER_SIZES,
  type EffectiveLabelLayout,
  type EnabledField,
  type LabelData,
  type StickerSize,
} from '../model/labelLayout.types';

const PT_TO_MM = 25.4 / 72;
const PADDING_MM = 4;

function specOf(size: StickerSize) {
  const spec = STICKER_SIZES.find((s) => s.size === size);
  if (!spec) throw new Error(`no spec ${size}`);
  return spec;
}

/** Height the fitted bars, code line and field lines take inside the sticker. */
function usedMm(fit: { barsMm: number; linePt: number }, textLines: number): number {
  return PADDING_MM + fit.barsMm + textLines * fit.linePt * PT_TO_MM * 1.15;
}

describe('fitStackedSticker', () => {
  it('leaves a layout that already fits untouched (38x38, 4 lines + code)', () => {
    expect(fitStackedSticker(38, 4, true)).toBeNull();
  });

  it('fits 6 lines on 38x38 by shrinking the bars and keeping 9 pt text', () => {
    const fit = fitStackedSticker(38, 6, true);
    expect(fit).not.toBeNull();
    if (!fit) return;
    expect(fit.linePt).toBe(9);
    expect(fit.barsMm).toBeGreaterThanOrEqual(7);
    expect(usedMm(fit, 7)).toBeLessThanOrEqual(38);
  });

  it('fits 4 lines on a 25 mm sticker with bars at the 7 mm floor and smaller text', () => {
    const fit = fitStackedSticker(25, 4, true);
    expect(fit).not.toBeNull();
    if (!fit) return;
    expect(fit.barsMm).toBe(7);
    expect(fit.linePt).toBeLessThan(9);
    expect(fit.linePt).toBeGreaterThanOrEqual(6.5);
    expect(usedMm(fit, 5)).toBeLessThanOrEqual(25);
  });

  it('fits every preset at its maxLines, with and without the code line', () => {
    for (const spec of STICKER_SIZES) {
      for (const hasCode of [true, false]) {
        const fit = fitStackedSticker(spec.heightMm, spec.maxLines, hasCode);
        const textLines = spec.maxLines + (hasCode ? 1 : 0);
        if (fit) {
          expect(usedMm(fit, textLines)).toBeLessThanOrEqual(spec.heightMm);
          expect(fit.barsMm).toBeGreaterThanOrEqual(7);
        }
      }
    }
  });
});

describe('stacked sticker with many lines', () => {
  const keys = ['shopName', 'productName', 'companyName', 'mrp', 'vertical.model', 'vertical.size'];
  const fields: EnabledField[] = keys.map((fieldKey) => ({
    fieldKey,
    label: fieldKey,
    valueType: 'text',
  }));
  const label: LabelData = {
    code: 'SK366709NU179W',
    values: Object.fromEntries(keys.map((k) => [k, `value ${k}`])),
  };

  it('prints all 6 lines on 38x38 with shorter bars', () => {
    const layout: EffectiveLabelLayout = {
      ...DEFAULT_LAYOUT,
      enabledFields: fields,
      stickerSize: '38x38',
      stickerSizeSpec: specOf('38x38'),
    };
    const result = renderBarcodeLabelsHtml([label], layout);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.html.split('class="line"').length - 1).toBe(6);
    expect(result.html).toMatch(/<svg class="bars" style="height:[\d.]+mm" data-idx="0"/);
    expect(result.html).toContain('<div class="line" style="font-size:9pt;line-height:1.15">');
  });

  it('keeps the default markup when the lines already fit', () => {
    const layout: EffectiveLabelLayout = {
      ...DEFAULT_LAYOUT,
      enabledFields: fields.slice(0, 3),
      stickerSize: '38x38',
      stickerSizeSpec: specOf('38x38'),
    };
    const result = renderBarcodeLabelsHtml([label], layout);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.html).toContain('<svg class="bars" data-idx="0"');
    expect(result.html).toContain('<div class="line">');
  });
});
