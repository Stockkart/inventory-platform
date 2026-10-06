import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { renderBarcodeLabelsHtml } from './renderBarcodeLabelsHtml';
import type { EffectiveLabelLayout, LabelData, RollSpec } from '../model/labelLayout.types';

/**
 * Multi-across label rolls: when the layout carries a `rollSpec` the renderer
 * prints one roll row per page (an explicit `@page` box, no browser margin) with
 * `labelsAcross` stickers side by side, so a 2-up 38x38 roll gets both columns
 * filled in one feed. Without a `rollSpec` the legacy ROLL output is unchanged.
 */

const TWO_UP: RollSpec = { labelsAcross: 2, columnGapMm: 3, pageWidthMm: 79, pageHeightMm: 38 };

function rollLayout(overrides: Partial<EffectiveLabelLayout> = {}): EffectiveLabelLayout {
  return {
    enabledFields: [{ fieldKey: 'productName', label: 'Product', valueType: 'text' }],
    stickerSize: '38x38',
    stickerSizeSpec: { size: '38x38', widthMm: 38, heightMm: 38, maxLines: 4 },
    showBarcodeText: true,
    showFieldLabels: false,
    blankValueBehavior: 'HIDE_LINE',
    printMedia: 'ROLL',
    rollSpec: TWO_UP,
    ...overrides,
  };
}

function makeLabels(n: number): LabelData[] {
  return Array.from({ length: n }, (_, i) => ({
    code: `CODE${i}`,
    values: { productName: `P${i}` },
  }));
}

function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

describe('renderBarcodeLabelsHtml ROLL with a rollSpec', () => {
  it('emits one @page box per roll row sized to the full web, no margin, no dashed border', () => {
    const result = renderBarcodeLabelsHtml(makeLabels(2), rollLayout());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { html } = result;

    expect(html).toContain('@page { size: 79mm 38mm; margin: 0 }');
    expect(html).toContain('grid-template-columns: repeat(2, 38mm)');
    expect(html).toContain('column-gap: 3mm');
    expect(html).toContain('width: 79mm; height: 38mm');
    expect(html).toContain('border:none');
    expect(html).not.toContain('dashed');
    expect(html).not.toContain('class="sheet"');
    expect(html).not.toContain('@page { margin: 8mm; }');
  });

  it('fills both columns of a 2-up roll before feeding the next row', () => {
    const result = renderBarcodeLabelsHtml(makeLabels(3), rollLayout());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { html } = result;

    // Two rows: CODE0 + CODE1 on the first page, CODE2 alone on the second.
    expect(countOccurrences(html, 'class="page"')).toBe(2);
    expect(countOccurrences(html, 'class="sticker"')).toBe(3);
    expect(countOccurrences(html, 'break-after:page')).toBe(1);
    const firstPageEnd = html.indexOf('</div>', html.indexOf('data-idx="1"'));
    expect(html.indexOf('data-idx="0"')).toBeLessThan(html.indexOf('data-idx="1"'));
    expect(html.indexOf('data-idx="2"')).toBeGreaterThan(firstPageEnd);
  });

  it('keeps data-idx equal to the label index so JsBarcode draws the right code', () => {
    const result = renderBarcodeLabelsHtml(makeLabels(5), rollLayout());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (let i = 0; i < 5; i += 1) {
      expect(result.html).toContain(`data-idx="${i}" data-code="CODE${i}"`);
    }
  });

  it('single-across rollSpec prints one sticker per page sized to the sticker', () => {
    const oneUp: RollSpec = { labelsAcross: 1, columnGapMm: 0, pageWidthMm: 50, pageHeightMm: 25 };
    const result = renderBarcodeLabelsHtml(
      makeLabels(2),
      rollLayout({ stickerSize: '50x25', stickerSizeSpec: undefined, rollSpec: oneUp }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.html).toContain('@page { size: 50mm 25mm; margin: 0 }');
    expect(result.html).toContain('grid-template-columns: repeat(1, 50mm)');
    expect(countOccurrences(result.html, 'class="page"')).toBe(2);
  });

  it('renders COMPACT stickers inside the roll grid', () => {
    const result = renderBarcodeLabelsHtml(makeLabels(1), rollLayout({ template: 'COMPACT' }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.html).toContain('class="sticker compact"');
    expect(result.html).toContain('@page { size: 79mm 38mm; margin: 0 }');
  });

  it('ignores startPosition (a roll has no fixed first cell)', () => {
    const base = renderBarcodeLabelsHtml(makeLabels(3), rollLayout());
    expect(renderBarcodeLabelsHtml(makeLabels(3), rollLayout(), { startPosition: 2 })).toEqual(
      base,
    );
  });

  it('ignores a rollSpec while printMedia is SHEET with a usable sheetSpec', () => {
    const result = renderBarcodeLabelsHtml(
      makeLabels(1),
      rollLayout({
        printMedia: 'SHEET',
        sheetPreset: 'TEST',
        sheetSpec: {
          presetId: 'TEST',
          pageWidthMm: 100,
          pageHeightMm: 120,
          marginTopMm: 5,
          marginLeftMm: 6,
          pitchXMm: 48,
          pitchYMm: 58,
          columns: 2,
          rows: 2,
          perSheet: 4,
        },
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.html).toContain('@page { size: 100mm 120mm; margin: 0 }');
    expect(result.html).not.toContain('column-gap');
  });

  it('falls back to the legacy roll output when rollSpec is null or has no columns', () => {
    const legacy = renderBarcodeLabelsHtml(makeLabels(2), rollLayout({ rollSpec: undefined }));
    expect(renderBarcodeLabelsHtml(makeLabels(2), rollLayout({ rollSpec: null }))).toEqual(legacy);
    expect(
      renderBarcodeLabelsHtml(
        makeLabels(2),
        rollLayout({ rollSpec: { ...TWO_UP, labelsAcross: 0 } }),
      ),
    ).toEqual(legacy);
    expect(legacy.ok).toBe(true);
    if (legacy.ok) expect(legacy.html).toContain('@page { margin: 8mm; }');
  });

  it('page count is ceil(n / labelsAcross) and every sticker is placed, for any n and across', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 25 }), fc.integer({ min: 1, max: 4 }), (n, across) => {
        const spec: RollSpec = {
          labelsAcross: across,
          columnGapMm: 3,
          pageWidthMm: across * 38 + (across - 1) * 3,
          pageHeightMm: 38,
        };
        const result = renderBarcodeLabelsHtml(makeLabels(n), rollLayout({ rollSpec: spec }));
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        const pages = Math.ceil(n / across);
        expect(countOccurrences(result.html, 'class="page"')).toBe(pages);
        expect(countOccurrences(result.html, 'class="sticker"')).toBe(n);
        expect(countOccurrences(result.html, 'break-after:page')).toBe(pages - 1);
      }),
      { numRuns: 100 },
    );
  });
});
