import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  computeStickerLines,
  escapeHtml,
  isBlank,
  renderBarcodeLabelsHtml,
  resolveStickerSize,
} from './renderBarcodeLabelsHtml';
import {
  DEFAULT_LAYOUT,
  STICKER_SIZES,
  type BlankValueBehavior,
  type EffectiveLabelLayout,
  type EnabledField,
  type LabelData,
  type LabelValueType,
} from '../model/labelLayout.types';

const FIELD_KEYS = [
  'productName',
  'companyName',
  'mrp',
  'batchNo',
  'expiry',
  'gst',
  'hsn',
  'weight',
] as const;
const VALUE_TYPES: LabelValueType[] = ['text', 'number', 'currency', 'date', 'percentage'];
const BLANK_BEHAVIORS: BlankValueBehavior[] = ['HIDE_LINE', 'PRINT_BLANK'];

const arbNonBlankString = fc.string({ minLength: 1, maxLength: 20 }).filter((s) => !isBlank(s));

/** Strings guaranteed to carry HTML-sensitive characters. */
const arbHtmlHostileString = fc
  .tuple(
    fc.string({ maxLength: 8 }),
    fc.constantFrom('<b>', '</div>', '&', '"', '<', '>', '&amp;', '"onload="x'),
    fc.string({ maxLength: 8 }),
  )
  .map(([a, mid, b]) => `${a}${mid}${b}`);

function arbEnabledFieldWith(label: fc.Arbitrary<string>): fc.Arbitrary<EnabledField> {
  return fc.record({
    fieldKey: fc.constantFrom(...FIELD_KEYS),
    label,
    valueType: fc.constantFrom(...VALUE_TYPES),
  });
}

function arbLayoutWith(
  fieldArb: fc.Arbitrary<EnabledField>,
  maxFields: number,
): fc.Arbitrary<EffectiveLabelLayout> {
  return fc.record({
    enabledFields: fc
      .uniqueArray(fieldArb, { minLength: 0, maxLength: maxFields, selector: (f) => f.fieldKey })
      .map((fields) => fields as EnabledField[]),
    stickerSize: fc.constantFrom(...STICKER_SIZES.map((s) => s.size)),
    showBarcodeText: fc.boolean(),
    showFieldLabels: fc.boolean(),
    blankValueBehavior: fc.constantFrom(...BLANK_BEHAVIORS),
    printMedia: fc.constant('ROLL' as const),
  });
}

/** Up to 8 fields, which exceeds `maxLines` for every preset (3, 2, 6). */
const arbLayout = arbLayoutWith(arbEnabledFieldWith(arbNonBlankString), 8);

/** Values may be blank, whitespace-only, or non-blank. */
const arbValue = fc.oneof(
  fc.constant(''),
  fc.constantFrom(' ', '  ', '\t', '\n '),
  fc.string({ minLength: 1, maxLength: 20 }),
);

function arbLabelFor(
  layout: EffectiveLabelLayout,
  valueArb: fc.Arbitrary<string> = arbValue,
): fc.Arbitrary<LabelData> {
  const valueArbs = Object.fromEntries(layout.enabledFields.map((f) => [f.fieldKey, valueArb]));
  return fc.record({
    code: fc.string({ minLength: 1, maxLength: 16 }),
    values: fc.record(valueArbs),
  });
}

const arbLabelsAndLayout = arbLayout.chain((layout) =>
  fc
    .array(arbLabelFor(layout), { minLength: 1, maxLength: 5 })
    .map((labels) => ({ labels, layout })),
);

function fieldLineCount(label: LabelData, layout: EffectiveLabelLayout): number {
  return computeStickerLines(label, layout).filter((l) => l.kind === 'field').length;
}

/** Inverse of `escapeHtml` for the four entities it emits. */
function unescapeHtml(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}

function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

describe('renderBarcodeLabelsHtml limits, escaping, parity and determinism', () => {
  // Feature: barcode-label-layout, Property 23: Field lines never exceed the sticker maximum and the sticker carries its size
  // Validates: Requirements 7.6
  it('caps field lines at maxLines and stamps the sticker with its physical size', () => {
    fc.assert(
      fc.property(arbLabelsAndLayout, ({ labels, layout }) => {
        const spec = resolveStickerSize(layout);
        for (const label of labels) {
          expect(fieldLineCount(label, layout)).toBeLessThanOrEqual(spec.maxLines);
        }

        const result = renderBarcodeLabelsHtml(labels, layout);
        expect(result.ok).toBe(true);
        if (!result.ok) return;

        const sizeStyle = `style="width:${spec.widthMm}mm;height:${spec.heightMm}mm"`;
        expect(countOccurrences(result.html, sizeStyle)).toBe(labels.length);
        expect(result.html).toContain('white-space:nowrap');
        expect(result.html).toContain('text-overflow:ellipsis');
      }),
      { numRuns: 100 },
    );
  });

  // Feature: barcode-label-layout, Property 24: All printed text is HTML-escaped
  // Validates: Requirements 7.7
  it('escapes every printed code, label and value so no raw markup characters survive', () => {
    const arbHostile = arbLayoutWith(arbEnabledFieldWith(arbHtmlHostileString), 6)
      .map((layout) => ({
        ...layout,
        showFieldLabels: true,
        blankValueBehavior: 'PRINT_BLANK' as const,
      }))
      .chain((layout) =>
        fc
          .record({
            code: arbHtmlHostileString,
            values: fc.record(
              Object.fromEntries(
                layout.enabledFields.map((f) => [f.fieldKey, arbHtmlHostileString]),
              ),
            ),
          })
          .map((label) => ({ label: label as LabelData, layout })),
      );

    fc.assert(
      fc.property(arbHostile, ({ label, layout }) => {
        const result = renderBarcodeLabelsHtml([label], layout);
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        const { html } = result;

        // Every text node is the escaped form of the computed line text.
        for (const line of computeStickerLines(label, layout)) {
          const escaped = escapeHtml(line.text);
          expect(html).toContain(`>${escaped}</div>`);
          // escapeHtml output has no raw markup characters, and '&' only as an entity.
          expect(escaped).not.toMatch(/[<>"]/);
          expect(escaped.replace(/&(amp|lt|gt|quot);/g, '')).not.toContain('&');
        }

        // The attribute carrying the code is escaped as well.
        expect(html).toContain(`data-code="${escapeHtml(label.code)}"`);

        // No raw hostile markup leaks into the document: every text node inside the
        // sheet is free of markup characters and decodes back to its original string.
        expect(html).not.toContain('<b>');
        expect(html).not.toContain('</div>"');
        const sheet = html.slice(html.indexOf('<div class="sheet">'), html.lastIndexOf('</div>'));
        const textNodes = sheet.split(/<[^<>]*>/).filter((t) => t.length > 0);
        const expectedTexts = computeStickerLines(label, layout).map((l) => l.text);
        for (const node of textNodes) {
          expect(node).not.toMatch(/[<>"]/);
          expect(expectedTexts).toContain(unescapeHtml(node));
        }
      }),
      { numRuns: 100 },
    );
  });

  // Feature: barcode-label-layout, Property 25: Default_Layout reproduces the legacy sticker
  // Validates: Requirements 7.11, 9.1
  it('with DEFAULT_LAYOUT yields [code, name?, companyName?] exactly as the legacy sticker did', () => {
    const arbOptionalText = fc.oneof(
      fc.constant(null),
      fc.constant(undefined),
      fc.constant(''),
      fc.constantFrom(' ', '\t', '\n '),
      fc.string({ minLength: 1, maxLength: 20 }),
    );
    const arbLegacyLabel = fc.record({
      code: fc.string({ minLength: 1, maxLength: 16 }),
      name: arbOptionalText,
      companyName: arbOptionalText,
      price: fc.oneof(fc.constant(null), fc.double({ noNaN: true, min: 0, max: 100000 })),
      useValuesMap: fc.boolean(),
    });

    fc.assert(
      fc.property(arbLegacyLabel, ({ code, name, companyName, price, useValuesMap }) => {
        // Legacy shape (no `values` key) and the new shape carrying the same strings in `values`.
        const label: LabelData = useValuesMap
          ? { code, price, values: { productName: name ?? '', companyName: companyName ?? '' } }
          : { code, name, companyName, price };

        // Reference copy of the pre-feature line logic: `(x ?? '').trim() || ''` falsy → omitted.
        const expected: Array<{ kind: 'code' | 'field'; fieldKey?: string; text: string }> = [
          { kind: 'code', text: code },
        ];
        if ((name ?? '').trim())
          expected.push({ kind: 'field', fieldKey: 'productName', text: name as string });
        if ((companyName ?? '').trim()) {
          expected.push({ kind: 'field', fieldKey: 'companyName', text: companyName as string });
        }

        expect(computeStickerLines(label, DEFAULT_LAYOUT)).toEqual(expected);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: barcode-label-layout, Property 26: The renderer is deterministic and DOM-free
  // Validates: Requirements 7.12
  it('returns identical HTML for structurally equal inputs with no window/document available', () => {
    const g = globalThis as Record<string, unknown>;
    const savedDocument = g['document'];
    const savedWindow = g['window'];
    g['document'] = undefined;
    g['window'] = undefined;
    try {
      fc.assert(
        fc.property(arbLabelsAndLayout, ({ labels, layout }) => {
          const first = renderBarcodeLabelsHtml(labels, layout);
          const second = renderBarcodeLabelsHtml(
            JSON.parse(JSON.stringify(labels)) as LabelData[],
            JSON.parse(JSON.stringify(layout)) as EffectiveLabelLayout,
          );
          expect(first.ok).toBe(true);
          expect(second).toEqual(first);
          if (first.ok && second.ok) expect(second.html).toBe(first.html);
        }),
        { numRuns: 100 },
      );
    } finally {
      g['document'] = savedDocument;
      g['window'] = savedWindow;
    }
  });
});
