import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { renderBarcodeLabelsHtml } from './renderBarcodeLabelsHtml';
import type { EffectiveLabelLayout, LabelData, SheetSpec } from '../model/labelLayout.types';

/**
 * Example and property tests for the `SHEET` print medium (Requirement 10.7, 10.9)
 * and the `ROLL` parity guarantee (Requirement 10.8), added with task 15.3.
 */

const PER_SHEET = 4;

const SHEET_SPEC: SheetSpec = {
  presetId: 'TEST_4UP',
  pageWidthMm: 100,
  pageHeightMm: 120,
  marginTopMm: 5,
  marginLeftMm: 6,
  pitchXMm: 48,
  pitchYMm: 58,
  columns: 2,
  rows: 2,
  perSheet: PER_SHEET,
};

function sheetLayout(overrides: Partial<EffectiveLabelLayout> = {}): EffectiveLabelLayout {
  return {
    enabledFields: [{ fieldKey: 'productName', label: 'Product', valueType: 'text' }],
    stickerSize: '50x25',
    showBarcodeText: true,
    showFieldLabels: false,
    blankValueBehavior: 'HIDE_LINE',
    printMedia: 'SHEET',
    sheetPreset: 'TEST_4UP',
    sheetSpec: SHEET_SPEC,
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

/** Direct-child `<div>` count (= cells, placeholders + stickers) for each `.page`. */
function pageCellCounts(html: string): number[] {
  const counts: number[] = [];
  let start = html.indexOf('<div class="page"');
  while (start >= 0) {
    let j = html.indexOf('>', start) + 1;
    let depth = 1;
    let children = 0;
    while (depth > 0) {
      const nextOpen = html.indexOf('<div', j);
      const nextClose = html.indexOf('</div>', j);
      if (nextClose < 0) break;
      if (nextOpen >= 0 && nextOpen < nextClose) {
        if (depth === 1) children += 1;
        depth += 1;
        j = nextOpen + 4;
      } else {
        depth -= 1;
        j = nextClose + 6;
      }
    }
    counts.push(children);
    start = html.indexOf('<div class="page"', j);
  }
  return counts;
}

describe('renderBarcodeLabelsHtml SHEET mode (Req 10.7, 10.9)', () => {
  it('emits the sheet grid, @page box and sticker chrome with no dashed border', () => {
    const result = renderBarcodeLabelsHtml(makeLabels(3), sheetLayout());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { html } = result;

    expect(html).toContain('@page { size: 100mm 120mm; margin: 0 }');
    expect(html).toContain('grid-template-columns: repeat(2, 48mm)');
    expect(html).toContain('grid-auto-rows: 58mm');
    expect(html).toContain('padding: 5mm 0 0 6mm');
    expect(html).toContain('.sticker{box-sizing:border-box');
    expect(html).toContain('border:none');
    // No roll-mode artefacts.
    expect(html).not.toContain('dashed');
    expect(html).not.toContain('class="sheet"');
    expect(html).not.toContain('@page { margin: 8mm; }');
  });

  // Example of Property 32: ceil((n + start - 1) / perSheet) pages, n stickers, start-1 placeholders.
  it('with n=5 and startPosition=2 emits 2 pages, 5 stickers and 1 leading placeholder', () => {
    const result = renderBarcodeLabelsHtml(makeLabels(5), sheetLayout(), { startPosition: 2 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { html } = result;

    expect(countOccurrences(html, 'class="page"')).toBe(2);
    expect(countOccurrences(html, 'class="sticker"')).toBe(5);
    expect(countOccurrences(html, 'class="cell"')).toBe(1);
    // The placeholder precedes the first sticker.
    expect(html.indexOf('class="cell"')).toBeLessThan(html.indexOf('class="sticker"'));
    // No page carries more than perSheet cells, and all cells are accounted for.
    const perPage = pageCellCounts(html);
    expect(perPage).toEqual([4, 2]);
    expect(Math.max(...perPage)).toBeLessThanOrEqual(PER_SHEET);
  });

  it('marks every page except the last with break-after: page', () => {
    const result = renderBarcodeLabelsHtml(makeLabels(9), sheetLayout(), { startPosition: 1 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const pages = countOccurrences(result.html, 'class="page"');
    expect(pages).toBe(3); // ceil(9 / 4)
    expect(countOccurrences(result.html, 'break-after:page')).toBe(pages - 1);
  });

  it('keeps data-idx equal to the label index so JsBarcode draws the right code', () => {
    const result = renderBarcodeLabelsHtml(makeLabels(5), sheetLayout(), { startPosition: 3 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (let i = 0; i < 5; i += 1) {
      expect(result.html).toContain(`data-idx="${i}"`);
    }
    // Placeholders carry no svg/barcode.
    expect(countOccurrences(result.html, 'class="cell"')).toBe(2);
  });

  it.each([
    [1, 1, 1],
    [4, 1, 1],
    [5, 1, 2],
    [4, 2, 2],
    [1, 4, 1],
    [8, 3, 3],
  ])('n=%i start=%i -> ceil pages=%i', (n, start, expectedPages) => {
    const result = renderBarcodeLabelsHtml(makeLabels(n), sheetLayout(), { startPosition: start });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(countOccurrences(result.html, 'class="page"')).toBe(expectedPages);
    expect(countOccurrences(result.html, 'class="sticker"')).toBe(n);
    expect(countOccurrences(result.html, 'class="cell"')).toBe(start - 1);
  });

  it('clamps startPosition into [1, perSheet]', () => {
    // 0 and negatives clamp to 1 (no placeholders).
    const low = renderBarcodeLabelsHtml(makeLabels(1), sheetLayout(), { startPosition: 0 });
    expect(low.ok).toBe(true);
    if (low.ok) expect(countOccurrences(low.html, 'class="cell"')).toBe(0);

    // Values beyond perSheet clamp to perSheet (perSheet-1 placeholders).
    const high = renderBarcodeLabelsHtml(makeLabels(1), sheetLayout(), { startPosition: 99 });
    expect(high.ok).toBe(true);
    if (high.ok) expect(countOccurrences(high.html, 'class="cell"')).toBe(PER_SHEET - 1);
  });

  // Property 32 (example-driven, 100 runs): page/sticker/placeholder counts hold for any n and start.
  it('page, sticker and placeholder counts match the formula for any n and start', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        fc.integer({ min: 1, max: PER_SHEET }),
        (n, start) => {
          const result = renderBarcodeLabelsHtml(makeLabels(n), sheetLayout(), { startPosition: start });
          expect(result.ok).toBe(true);
          if (!result.ok) return;
          const { html } = result;

          const expectedPages = Math.ceil((n + start - 1) / PER_SHEET);
          expect(countOccurrences(html, 'class="page"')).toBe(expectedPages);
          expect(countOccurrences(html, 'class="sticker"')).toBe(n);
          expect(countOccurrences(html, 'class="cell"')).toBe(start - 1);

          const perPage = pageCellCounts(html);
          expect(perPage).toHaveLength(expectedPages);
          expect(Math.max(...perPage)).toBeLessThanOrEqual(PER_SHEET);
          expect(perPage.reduce((a, b) => a + b, 0)).toBe(n + start - 1);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('renderBarcodeLabelsHtml ROLL parity (Req 10.8)', () => {
  const rollLayout: EffectiveLabelLayout = {
    enabledFields: [
      { fieldKey: 'productName', label: 'Product', valueType: 'text' },
      { fieldKey: 'mrp', label: 'MRP', valueType: 'currency' },
    ],
    stickerSize: '50x25',
    showBarcodeText: true,
    showFieldLabels: false,
    blankValueBehavior: 'HIDE_LINE',
    printMedia: 'ROLL',
  };

  const labels = makeLabels(3);

  it('is unaffected by startPosition or any opts argument', () => {
    const base = renderBarcodeLabelsHtml(labels, rollLayout);
    expect(base.ok).toBe(true);
    if (!base.ok) return;

    expect(renderBarcodeLabelsHtml(labels, rollLayout, {})).toEqual(base);
    expect(renderBarcodeLabelsHtml(labels, rollLayout, { startPosition: 3 })).toEqual(base);
    expect(renderBarcodeLabelsHtml(labels, rollLayout, { startPosition: 99 })).toEqual(base);
  });

  it('ignores sheetSpec/sheetPreset while printMedia is ROLL', () => {
    const base = renderBarcodeLabelsHtml(labels, rollLayout);
    const withSheetFields = renderBarcodeLabelsHtml(labels, {
      ...rollLayout,
      sheetPreset: 'TEST_4UP',
      sheetSpec: SHEET_SPEC,
    });
    expect(withSheetFields).toEqual(base);
  });

  it('produces identical output whether or not printMedia is present', () => {
    const withMedia = renderBarcodeLabelsHtml(labels, rollLayout);
    const withoutMedia = renderBarcodeLabelsHtml(labels, {
      enabledFields: rollLayout.enabledFields,
      stickerSize: rollLayout.stickerSize,
      showBarcodeText: rollLayout.showBarcodeText,
      showFieldLabels: rollLayout.showFieldLabels,
      blankValueBehavior: rollLayout.blankValueBehavior,
    });
    expect(withoutMedia).toEqual(withMedia);
  });

  it('falls back to ROLL output when a SHEET layout has perSheet < 1', () => {
    const base = renderBarcodeLabelsHtml(labels, rollLayout);
    const degenerate = renderBarcodeLabelsHtml(labels, {
      ...rollLayout,
      printMedia: 'SHEET',
      sheetPreset: 'EMPTY',
      sheetSpec: { ...SHEET_SPEC, columns: 0, rows: 0, perSheet: 0 },
    });
    expect(degenerate).toEqual(base);
  });

  it('keeps the roll @page and dashed-border chrome', () => {
    const result = renderBarcodeLabelsHtml(labels, rollLayout);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.html).toContain('@page { margin: 8mm; }');
    expect(result.html).toContain('border:1px dashed #bbb');
    expect(result.html).toContain('<div class="sheet">');
  });
});
