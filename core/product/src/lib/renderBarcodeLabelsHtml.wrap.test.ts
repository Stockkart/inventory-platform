import { describe, expect, it } from 'vitest';
import {
  estimateTextWidthMm,
  fitStackedSticker,
  MIN_WRAP_LINE_PT,
  planStackedSticker,
  renderBarcodeLabelsHtml,
} from './renderBarcodeLabelsHtml';
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
const LONG_NAME = 'LEGGINGS ELASTANO N (S)';

function specOf(size: StickerSize) {
  const spec = STICKER_SIZES.find((s) => s.size === size);
  if (!spec) throw new Error(`no spec ${size}`);
  return spec;
}

/** Height the planned bars and text take: wrapped lines count twice. */
function usedMm(plan: ReturnType<typeof planStackedSticker>, fieldCount: number, hasCode: boolean) {
  const lines = fieldCount + plan.wrap.filter(Boolean).length + (hasCode ? 1 : 0);
  if (!plan.fit) return null;
  return PADDING_MM + plan.fit.barsMm + lines * plan.fit.linePt * PT_TO_MM * 1.15;
}

/** The Sports King 2-up 38x38 sticker: shop, name, variant, MRP, brand, size, bars at the bottom. */
const sportsKingKeys = [
  'shopName',
  'productName',
  'vertical.variant',
  'mrp',
  'vertical.brand',
  'vertical.size',
];
const sportsKingLabel: LabelData = {
  code: 'SK3667H0RWNVPE',
  values: {
    shopName: 'SPORTS KING',
    productName: LONG_NAME,
    'vertical.variant': 'ELASTANO',
    mrp: '₹462.00',
    'vertical.brand': 'FORVO',
    'vertical.size': 'S',
  },
};

function layoutOf(size: StickerSize, keys: string[]): EffectiveLabelLayout {
  const enabledFields: EnabledField[] = keys.map((fieldKey) => ({
    fieldKey,
    label: fieldKey,
    valueType: 'text',
  }));
  return {
    ...DEFAULT_LAYOUT,
    enabledFields,
    stickerSize: size,
    stickerSizeSpec: specOf(size),
    barcodePosition: 'BOTTOM',
  };
}

describe('estimateTextWidthMm', () => {
  it('judges the product name too wide for one row of a 38 mm sticker and the shop name not', () => {
    expect(estimateTextWidthMm(LONG_NAME, 9)).toBeGreaterThan(38 - PADDING_MM);
    expect(estimateTextWidthMm('SPORTS KING', 9)).toBeLessThan(38 - PADDING_MM);
  });

  it('counts capitals wider than lowercase and spaces narrowest', () => {
    expect(estimateTextWidthMm('AAAA', 9)).toBeGreaterThan(estimateTextWidthMm('aaaa', 9));
    expect(estimateTextWidthMm('a a', 9)).toBeLessThan(estimateTextWidthMm('aaa', 9));
  });
});

describe('planStackedSticker', () => {
  it('wraps the long product name on the Sports King 38x38 sticker and nothing else', () => {
    const texts = sportsKingKeys.map((k) => sportsKingLabel.values?.[k] ?? '');
    const plan = planStackedSticker(38, 38, texts, true);

    expect(plan.wrap).toEqual([false, true, false, false, false, false]);
    expect(plan.fit).not.toBeNull();
    if (!plan.fit) return;
    expect(plan.fit.barsMm).toBeGreaterThanOrEqual(7);
    expect(plan.fit.linePt).toBeGreaterThanOrEqual(MIN_WRAP_LINE_PT);
    expect(usedMm(plan, texts.length, true)).toBeLessThanOrEqual(38);
  });

  it('keeps the "…" when the sticker has no room for a second line', () => {
    // 25 mm tall with 4 lines + code already sits at the 7 mm bar floor and below 9 pt.
    const texts = [LONG_NAME, 'SPORTS KING', '₹462.00', 'FORVO'];
    const plan = planStackedSticker(38, 25, texts, true);

    expect(plan.wrap).toEqual([false, false, false, false]);
    expect(plan.fit).toEqual(fitStackedSticker(25, 4, true));
  });

  it('changes nothing when every line fits on one row', () => {
    const texts = ['SPORTS KING', 'ANKLET', '₹120.00'];
    const plan = planStackedSticker(38, 38, texts, true);

    expect(plan.wrap).toEqual([false, false, false]);
    expect(plan.fit).toEqual(fitStackedSticker(38, 3, true));
  });

  it('gives the second line to the earliest long lines while the height allows', () => {
    const long = 'CRICKET BALLS SG BOUNCE PLUS (LITE)';
    const texts = [long, long, long, long, long, long];
    const plan = planStackedSticker(38, 38, texts, true);

    const wrapped = plan.wrap.filter(Boolean).length;
    expect(wrapped).toBeGreaterThan(0);
    expect(wrapped).toBeLessThan(texts.length);
    // Wrapped lines come first: once one keeps its "…", every later one does too.
    expect(plan.wrap.slice(0, wrapped).every(Boolean)).toBe(true);
    expect(plan.wrap.slice(wrapped).some(Boolean)).toBe(false);
    if (plan.fit) {
      expect(plan.fit.barsMm).toBeGreaterThanOrEqual(7);
      expect(plan.fit.linePt).toBeGreaterThanOrEqual(MIN_WRAP_LINE_PT);
    }
  });

  it('never plans past the sticker height on any preset, at any line count', () => {
    const long = 'LEGGINGS ELASTANO N (XL) EXTRA';
    for (const spec of STICKER_SIZES) {
      for (let n = 1; n <= spec.maxLines; n += 1) {
        for (const hasCode of [true, false]) {
          const texts = Array.from({ length: n }, () => long);
          const plan = planStackedSticker(spec.widthMm, spec.heightMm, texts, hasCode);
          const used = usedMm(plan, n, hasCode);
          if (used !== null) expect(used).toBeLessThanOrEqual(spec.heightMm);
          if (plan.wrap.some(Boolean) && plan.fit) {
            expect(plan.fit.barsMm).toBeGreaterThanOrEqual(7);
            expect(plan.fit.linePt).toBeGreaterThanOrEqual(MIN_WRAP_LINE_PT);
          }
        }
      }
    }
  });
});

describe('stacked sticker html with a wrapped line', () => {
  it('marks only the product name as wrapping and ships the wrap rule', () => {
    const result = renderBarcodeLabelsHtml([sportsKingLabel], layoutOf('38x38', sportsKingKeys));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.html.split('class="line wrap"').length - 1).toBe(1);
    expect(result.html).toMatch(/<div class="line wrap"[^>]*>LEGGINGS ELASTANO N \(S\)<\/div>/);
    expect(result.html.split('class="line"').length - 1).toBe(5);
    expect(result.html).toContain('.line.wrap{white-space:normal;');
    expect(result.html).toContain('-webkit-line-clamp:2');
    // Without it the sticker's column flexbox squeezes the second row under the next line.
    expect(result.html).toContain('flex-shrink:0}');
  });

  it('prints a short name exactly as before', () => {
    const label: LabelData = {
      ...sportsKingLabel,
      values: { ...sportsKingLabel.values, productName: 'ANKLET' },
    };
    const result = renderBarcodeLabelsHtml([label], layoutOf('38x38', sportsKingKeys));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.html).not.toContain('class="line wrap"');
  });
});
