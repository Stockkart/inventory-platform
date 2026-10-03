import { describe, expect, it } from 'vitest';
import {
  computeStickerLines,
  isBlank,
  renderBarcodeLabelsHtml,
  resolveStickerSize,
} from './renderBarcodeLabelsHtml';
import {
  STICKER_SIZES,
  type EffectiveLabelLayout,
  type LabelData,
  type StickerSize,
} from '../model/labelLayout.types';

function layoutWith(overrides: Partial<EffectiveLabelLayout> = {}): EffectiveLabelLayout {
  return {
    enabledFields: [
      { fieldKey: 'productName', label: 'Product name', valueType: 'text' },
      { fieldKey: 'companyName', label: 'Company', valueType: 'text' },
      { fieldKey: 'mrp', label: 'MRP', valueType: 'currency' },
    ],
    stickerSize: '100x50',
    showBarcodeText: true,
    showFieldLabels: false,
    blankValueBehavior: 'PRINT_BLANK',
    printMedia: 'ROLL',
    ...overrides,
  };
}

const baseLabel: LabelData = {
  code: 'ABC123',
  values: { productName: 'Paracetamol', companyName: 'Acme', mrp: '₹12.50' },
};

describe('renderBarcodeLabelsHtml edge cases', () => {
  // Requirement 7.13
  it('returns ok:false with "No labels to print" for an empty list', () => {
    expect(renderBarcodeLabelsHtml([], layoutWith())).toEqual({
      ok: false,
      error: 'No labels to print',
    });
  });

  // Requirement 7.6
  it('emits CSS that truncates long lines with nowrap + ellipsis', () => {
    const result = renderBarcodeLabelsHtml([baseLabel], layoutWith());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.html).toContain('white-space:nowrap');
    expect(result.html).toContain('text-overflow:ellipsis');
  });
});

describe('computeStickerLines edge cases', () => {
  // Requirement 7.14
  it('omits an enabled field whose label is empty', () => {
    const layout = layoutWith({
      enabledFields: [
        { fieldKey: 'productName', label: '', valueType: 'text' },
        { fieldKey: 'companyName', label: 'Company', valueType: 'text' },
      ],
      showBarcodeText: false,
    });
    const lines = computeStickerLines(baseLabel, layout);
    expect(lines).toEqual([{ kind: 'field', fieldKey: 'companyName', text: 'Acme' }]);
  });

  describe('legacy fallback', () => {
    const legacyLayout = layoutWith({
      enabledFields: [{ fieldKey: 'mrp', label: 'MRP', valueType: 'currency' }],
      showBarcodeText: false,
    });

    it('resolves mrp from legacy price when no values key is present', () => {
      const label: LabelData = { code: 'X', name: 'Old', price: 99.5 };
      expect(computeStickerLines(label, legacyLayout)).toEqual([
        { kind: 'field', fieldKey: 'mrp', text: `₹${(99.5).toFixed(2)}` },
      ]);
    });

    it('does not fall back to legacy price when values is present but empty', () => {
      const label: LabelData = { code: 'X', name: 'Old', price: 99.5, values: {} };
      expect(computeStickerLines(label, legacyLayout)).toEqual([
        { kind: 'field', fieldKey: 'mrp', text: '' },
      ]);
    });
  });
});

describe('resolveStickerSize', () => {
  it('returns stickerSizeSpec when present', () => {
    const spec = { size: '38x25' as const, widthMm: 1, heightMm: 2, maxLines: 9 };
    expect(resolveStickerSize(layoutWith({ stickerSize: '38x25', stickerSizeSpec: spec }))).toBe(
      spec,
    );
  });

  it('falls back to the STICKER_SIZES lookup when stickerSizeSpec is absent', () => {
    const layout = layoutWith({ stickerSize: '38x25' });
    expect(layout.stickerSizeSpec).toBeUndefined();
    expect(resolveStickerSize(layout)).toBe(STICKER_SIZES.find((s) => s.size === '38x25'));
  });

  it('falls back to the first preset for an unknown size', () => {
    const layout = layoutWith({ stickerSize: '1x1' as unknown as StickerSize });
    expect(resolveStickerSize(layout)).toBe(STICKER_SIZES[0]);
  });
});

describe('isBlank', () => {
  it.each([
    [null, true],
    [undefined, true],
    ['', true],
    ['  ', true],
    ['x', false],
  ] as const)('isBlank(%j) === %s', (input, expected) => {
    expect(isBlank(input)).toBe(expected);
  });
});
