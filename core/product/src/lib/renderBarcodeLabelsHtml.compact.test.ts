import { describe, expect, it } from 'vitest';
import {
  computeCompactZones,
  escapeHtml,
  renderBarcodeLabelsHtml,
} from './renderBarcodeLabelsHtml';
import type {
  EffectiveLabelLayout,
  EnabledField,
  LabelData,
  SheetSpec,
  StickerSizeSpec,
} from '../model/labelLayout.types';

/**
 * Example tests for the `COMPACT` sticker template (Requirement 11): zone
 * assignment, the default `showLabel` rules, per-zone caps, header/body/barcode
 * ordering, HTML-escaping, the SHEET wrapper, and the guarantee that the STACKED
 * path is unaffected by the new optional layout fields.
 */

function compactLayout(overrides: Partial<EffectiveLabelLayout> = {}): EffectiveLabelLayout {
  return {
    enabledFields: [],
    stickerSize: '50x25',
    showBarcodeText: true,
    showFieldLabels: false,
    blankValueBehavior: 'PRINT_BLANK',
    printMedia: 'ROLL',
    template: 'COMPACT',
    ...overrides,
  };
}

function field(
  fieldKey: string,
  label: string,
  valueType: EnabledField['valueType'],
  extra: Partial<EnabledField> = {},
): EnabledField {
  return { fieldKey, label, valueType, ...extra };
}

function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

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
  perSheet: 4,
};

describe('computeCompactZones zone assignment and default showLabel', () => {
  it('places fields in their explicit zone and prints values only by default', () => {
    const layout = compactLayout({
      enabledFields: [
        field('productName', 'Product', 'text', { zone: 'HEADER' }),
        field('mrp', 'MRP', 'currency', { zone: 'RIGHT' }),
        field('gst', 'GST', 'percentage', { zone: 'RIGHT' }),
        field('batchNo', 'Batch', 'text', { zone: 'LEFT' }),
        field('hsn', 'HSN', 'text'), // no zone -> LEFT
      ],
    });
    const label: LabelData = {
      code: 'C1',
      values: { productName: 'Paracetamol', mrp: '₹12.00', gst: '12%', batchNo: 'B1', hsn: '3004' },
    };

    const zones = computeCompactZones(label, layout);

    // No field name in any zone unless asked for; the un-zoned field defaults to LEFT.
    expect(zones.header).toEqual([{ kind: 'field', fieldKey: 'productName', text: 'Paracetamol' }]);
    expect(zones.right).toEqual([
      { kind: 'field', fieldKey: 'mrp', text: '₹12.00' },
      { kind: 'field', fieldKey: 'gst', text: '12%' },
    ]);
    expect(zones.left).toEqual([
      { kind: 'field', fieldKey: 'batchNo', text: 'B1' },
      { kind: 'field', fieldKey: 'hsn', text: '3004' },
    ]);
  });

  it('falls back to layout.fieldZones, then LEFT, when a field omits its zone', () => {
    const layout = compactLayout({
      enabledFields: [
        field('productName', 'Product', 'text'),
        field('mrp', 'MRP', 'currency'),
        field('batchNo', 'Batch', 'text'),
      ],
      fieldZones: { productName: 'HEADER', mrp: 'RIGHT' },
    });
    const label: LabelData = {
      code: 'C1',
      values: { productName: 'Paracetamol', mrp: '₹12.00', batchNo: 'B1' },
    };

    const zones = computeCompactZones(label, layout);
    expect(zones.header.map((l) => l.fieldKey)).toEqual(['productName']);
    expect(zones.right.map((l) => l.fieldKey)).toEqual(['mrp']);
    expect(zones.left.map((l) => l.fieldKey)).toEqual(['batchNo']);
  });

  it('prefers field.showLabel over the default, then layout.fieldLabelOverrides', () => {
    const layout = compactLayout({
      enabledFields: [
        // HEADER default is false; explicit true forces the label on.
        field('productName', 'Product', 'text', { zone: 'HEADER', showLabel: true }),
        // The override map also wins (here it keeps the LEFT default of off).
        field('batchNo', 'Batch', 'text', { zone: 'LEFT' }),
        // RIGHT currency default is false; explicit true forces the label on.
        field('mrp', 'MRP', 'currency', { zone: 'RIGHT', showLabel: true }),
      ],
      fieldLabelOverrides: { batchNo: false },
    });
    const label: LabelData = {
      code: 'C1',
      values: { productName: 'Paracetamol', batchNo: 'B1', mrp: '₹12.00' },
    };

    const zones = computeCompactZones(label, layout);
    expect(zones.header[0].text).toBe('PRODUCT: Paracetamol');
    expect(zones.left[0].text).toBe('B1');
    expect(zones.right[0].text).toBe('MRP: ₹12.00');
  });

  it('honours blankValueBehavior per zone, matching the stacked rules', () => {
    const hide = compactLayout({
      blankValueBehavior: 'HIDE_LINE',
      enabledFields: [field('batchNo', 'Batch', 'text', { zone: 'LEFT' })],
    });
    expect(computeCompactZones({ code: 'C', values: { batchNo: '' } }, hide).left).toEqual([]);

    const printBlank = compactLayout({
      blankValueBehavior: 'PRINT_BLANK',
      enabledFields: [
        field('batchNo', 'Batch', 'text', { zone: 'LEFT' }),
        field('mrp', 'MRP', 'currency', { zone: 'RIGHT' }),
      ],
    });
    const zones = computeCompactZones({ code: 'C', values: { batchNo: '', mrp: '' } }, printBlank);
    // Values only by default, so a blank value prints an empty line in every zone.
    expect(zones.left).toEqual([{ kind: 'field', fieldKey: 'batchNo', text: '' }]);
    expect(zones.right).toEqual([{ kind: 'field', fieldKey: 'mrp', text: '' }]);
  });
});

describe('computeCompactZones per-zone caps', () => {
  it('caps each zone independently using ZONE_CAPS for the sticker size', () => {
    // 38x25 caps: header 1, left 3, right 1.
    const layout = compactLayout({
      stickerSize: '38x25',
      enabledFields: [
        field('h1', 'H1', 'text', { zone: 'HEADER' }),
        field('h2', 'H2', 'text', { zone: 'HEADER' }),
        field('l1', 'L1', 'text', { zone: 'LEFT' }),
        field('l2', 'L2', 'text', { zone: 'LEFT' }),
        field('l3', 'L3', 'text', { zone: 'LEFT' }),
        field('l4', 'L4', 'text', { zone: 'LEFT' }),
        field('r1', 'R1', 'text', { zone: 'RIGHT' }),
        field('r2', 'R2', 'text', { zone: 'RIGHT' }),
      ],
    });
    const values: Record<string, string> = {
      h1: 'a',
      h2: 'b',
      l1: 'c',
      l2: 'd',
      l3: 'e',
      l4: 'f',
      r1: 'g',
      r2: 'h',
    };

    const zones = computeCompactZones({ code: 'C', values }, layout);
    expect(zones.header).toHaveLength(1);
    expect(zones.left).toHaveLength(3);
    expect(zones.right).toHaveLength(1);
    // The cap keeps the first fields in enabled order.
    expect(zones.left.map((l) => l.fieldKey)).toEqual(['l1', 'l2', 'l3']);
  });

  it('prefers stickerSizeSpec.zoneCaps over ZONE_CAPS when present', () => {
    const spec: StickerSizeSpec = {
      size: '50x25',
      widthMm: 50,
      heightMm: 25,
      maxLines: 3,
      zoneCaps: { header: 0, left: 1, right: 0 },
    };
    const layout = compactLayout({
      stickerSizeSpec: spec,
      enabledFields: [
        field('h1', 'H1', 'text', { zone: 'HEADER' }),
        field('l1', 'L1', 'text', { zone: 'LEFT' }),
        field('l2', 'L2', 'text', { zone: 'LEFT' }),
        field('r1', 'R1', 'text', { zone: 'RIGHT' }),
      ],
    });
    const zones = computeCompactZones(
      { code: 'C', values: { h1: 'a', l1: 'b', l2: 'c', r1: 'd' } },
      layout,
    );
    expect(zones.header).toHaveLength(0);
    expect(zones.left).toHaveLength(1);
    expect(zones.right).toHaveLength(0);
  });
});

describe('renderBarcodeLabelsHtml COMPACT template', () => {
  const layout = compactLayout({
    enabledFields: [
      field('productName', 'Product', 'text', { zone: 'HEADER' }),
      field('mrp', 'MRP', 'currency', { zone: 'RIGHT' }),
      field('batchNo', 'Batch', 'text', { zone: 'LEFT' }),
    ],
  });
  const label: LabelData = {
    code: 'ABC123',
    values: { productName: 'Paracetamol', mrp: '₹12.00', batchNo: 'B1' },
  };

  it('emits a compact sticker with exactly one header, one body and the compact CSS', () => {
    const result = renderBarcodeLabelsHtml([label], layout);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { html } = result;

    expect(countOccurrences(html, 'class="sticker compact"')).toBe(1);
    expect(countOccurrences(html, 'class="hdr"')).toBe(1);
    expect(countOccurrences(html, 'class="body"')).toBe(1);
    expect(countOccurrences(html, 'class="col left"')).toBe(1);
    expect(countOccurrences(html, 'class="col right"')).toBe(1);
    // Shared compact CSS is present in the ROLL style block.
    expect(html).toContain('.compact .body{display:flex;gap:1.5mm;flex:1;min-height:0}');
    expect(html).toContain('.compact .left{flex:3}');
    expect(html).toContain('.compact .right{flex:2;text-align:right}');
    expect(html).toContain('text-transform:uppercase');
  });

  it('orders header, barcode and body with barcodePosition TOP (the default)', () => {
    const result = renderBarcodeLabelsHtml([label], layout); // barcodePosition absent -> TOP
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { html } = result;

    const hdr = html.indexOf('class="hdr"');
    const bars = html.indexOf('class="bars"');
    const body = html.indexOf('class="body"');
    expect(hdr).toBeGreaterThanOrEqual(0);
    expect(hdr).toBeLessThan(bars);
    expect(bars).toBeLessThan(body);
  });

  it('orders the barcode after the body with barcodePosition BOTTOM', () => {
    const result = renderBarcodeLabelsHtml(
      [label],
      compactLayout({
        ...layout,
        barcodePosition: 'BOTTOM',
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { html } = result;

    const body = html.indexOf('class="body"');
    const bars = html.indexOf('class="bars"');
    expect(body).toBeGreaterThanOrEqual(0);
    expect(body).toBeLessThan(bars);
  });

  it('includes the code text under the bars only when showBarcodeText', () => {
    const withText = renderBarcodeLabelsHtml([label], layout);
    const withoutText = renderBarcodeLabelsHtml(
      [label],
      compactLayout({
        ...layout,
        showBarcodeText: false,
      }),
    );
    expect(withText.ok && withoutText.ok).toBe(true);
    if (!withText.ok || !withoutText.ok) return;

    expect(withText.html).toContain('<div class="code">ABC123</div>');
    expect(withText.html).toContain('<svg class="bars" data-idx="0" data-code="ABC123">');
    // The barcode svg stays, only the human-readable line disappears.
    expect(withoutText.html).toContain('<svg class="bars" data-idx="0" data-code="ABC123">');
    expect(withoutText.html).not.toContain('<div class="code">');
  });

  it('escapes the code attribute and every rendered value and label', () => {
    const hostile = compactLayout({
      enabledFields: [
        field('productName', '<b>Name</b>', 'text', { zone: 'HEADER', showLabel: true }),
        field('mrp', 'M&R', 'currency', { zone: 'RIGHT', showLabel: true }),
      ],
    });
    const hostileLabel: LabelData = {
      code: '<x>&"',
      values: { productName: 'P<b>', mrp: '₹1&2' },
    };

    const result = renderBarcodeLabelsHtml([hostileLabel], hostile);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { html } = result;

    const body = html.slice(html.indexOf('<div class="sheet">'), html.lastIndexOf('</div>'));
    expect(body).not.toContain('<b>');
    expect(html).toContain(`data-code="${escapeHtml('<x>&"')}"`);
    expect(html).toContain(`<div class="code">${escapeHtml('<x>&"')}</div>`);
    expect(html).toContain(escapeHtml('<B>NAME</B>: P<b>'));
    expect(html).toContain(escapeHtml('M&R: ₹1&2'));
  });

  it('renders compact stickers inside the SHEET wrapper', () => {
    const sheet = compactLayout({
      ...layout,
      printMedia: 'SHEET',
      sheetPreset: 'TEST_4UP',
      sheetSpec: SHEET_SPEC,
    });
    const labels: LabelData[] = [label, { ...label, code: 'DEF456' }];

    const result = renderBarcodeLabelsHtml(labels, sheet, { startPosition: 1 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { html } = result;

    expect(html).toContain('@page { size: 100mm 120mm; margin: 0 }');
    expect(html).toContain('class="page"');
    expect(countOccurrences(html, 'class="sticker compact"')).toBe(2);
    expect(countOccurrences(html, 'class="hdr"')).toBe(2);
    // Compact CSS is shared into the SHEET style block too.
    expect(html).toContain('.compact .body{display:flex;gap:1.5mm;flex:1;min-height:0}');
    expect(html).not.toContain('class="sheet"');
  });
});

describe('STACKED template is unaffected by the Requirement 11 optional fields', () => {
  const stacked: EffectiveLabelLayout = {
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
  const labels: LabelData[] = [
    { code: 'C1', values: { productName: 'Paracetamol', mrp: '₹12.00' } },
    { code: 'C2', values: { productName: 'Aspirin', mrp: '₹8.00' } },
  ];

  it('produces identical output whether or not template is set to STACKED', () => {
    const base = renderBarcodeLabelsHtml(labels, stacked);
    const withTemplate = renderBarcodeLabelsHtml(labels, { ...stacked, template: 'STACKED' });
    expect(withTemplate).toEqual(base);
  });

  it('ignores barcodePosition, currencyStyle, fieldZones and fieldLabelOverrides for STACKED', () => {
    const base = renderBarcodeLabelsHtml(labels, stacked);
    const withExtras = renderBarcodeLabelsHtml(labels, {
      ...stacked,
      template: 'STACKED',
      barcodePosition: 'BOTTOM',
      currencyStyle: 'RS_PREFIX',
      fieldZones: { productName: 'HEADER', mrp: 'RIGHT' },
      fieldLabelOverrides: { productName: true, mrp: true },
    });
    expect(withExtras).toEqual(base);
    // The stacked sticker never carries the compact marker class.
    if (withExtras.ok) {
      expect(withExtras.html).toContain('<div class="sticker" style=');
      expect(withExtras.html).not.toContain('class="sticker compact"');
    }
  });
});
