import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  computeStickerLines,
  isBlank,
  renderBarcodeLabelsHtml,
  resolveStickerSize,
} from './renderBarcodeLabelsHtml';
import {
  STICKER_SIZES,
  type BlankValueBehavior,
  type EffectiveLabelLayout,
  type EnabledField,
  type LabelData,
  type LabelValueType,
} from '../model/labelLayout.types';

const FIELD_KEYS = ['productName', 'companyName', 'mrp', 'batchNo', 'expiry', 'gst', 'hsn', 'weight'] as const;
const VALUE_TYPES: LabelValueType[] = ['text', 'number', 'currency', 'date', 'percentage'];
const BLANK_BEHAVIORS: BlankValueBehavior[] = ['HIDE_LINE', 'PRINT_BLANK'];

const arbNonBlankString = fc.string({ minLength: 1, maxLength: 20 }).filter((s) => !isBlank(s));

const arbEnabledField: fc.Arbitrary<EnabledField> = fc.record({
  fieldKey: fc.constantFrom(...FIELD_KEYS),
  label: arbNonBlankString,
  valueType: fc.constantFrom(...VALUE_TYPES),
});

/** Any layout; enabled count may exceed the sticker's `maxLines`. */
const arbLayout: fc.Arbitrary<EffectiveLabelLayout> = fc.record({
  enabledFields: fc
    .uniqueArray(arbEnabledField, { minLength: 0, maxLength: 6, selector: (f) => f.fieldKey })
    .map((fields) => fields as EnabledField[]),
  stickerSize: fc.constantFrom(...STICKER_SIZES.map((s) => s.size)),
  showBarcodeText: fc.boolean(),
  showFieldLabels: fc.boolean(),
  blankValueBehavior: fc.constantFrom(...BLANK_BEHAVIORS),
  printMedia: fc.constant('ROLL' as const),
});

/** Layout whose enabled count never exceeds the chosen size's `maxLines`. */
const arbLayoutWithinCap: fc.Arbitrary<EffectiveLabelLayout> = fc
  .constantFrom(...STICKER_SIZES)
  .chain((spec) =>
    fc.record({
      enabledFields: fc
        .uniqueArray(arbEnabledField, { minLength: 0, maxLength: spec.maxLines, selector: (f) => f.fieldKey })
        .map((fields) => fields as EnabledField[]),
      stickerSize: fc.constant(spec.size),
      showBarcodeText: fc.boolean(),
      showFieldLabels: fc.boolean(),
      blankValueBehavior: fc.constantFrom(...BLANK_BEHAVIORS),
      printMedia: fc.constant('ROLL' as const),
    }),
  );

/** Values may be blank, whitespace-only, or non-blank. */
const arbValue = fc.oneof(
  fc.constant(''),
  fc.constantFrom(' ', '  ', '\t', '\n '),
  fc.string({ minLength: 1, maxLength: 20 }),
);

function arbLabelFor(layout: EffectiveLabelLayout): fc.Arbitrary<LabelData> {
  const valueArbs = Object.fromEntries(layout.enabledFields.map((f) => [f.fieldKey, arbValue]));
  return fc.record({
    code: fc.string({ minLength: 1, maxLength: 16 }),
    values: fc.record(valueArbs),
  });
}

function arbLabelsFor(layout: EffectiveLabelLayout, min: number, max: number): fc.Arbitrary<LabelData[]> {
  return fc.array(arbLabelFor(layout), { minLength: min, maxLength: max });
}

function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

describe('renderBarcodeLabelsHtml line property tests', () => {
  // Feature: barcode-label-layout, Property 20: One sticker per label, lines in configured order, values verbatim
  // Validates: Requirements 7.1
  it('renders one sticker per label with field lines in enabled order carrying verbatim values', () => {
    const arb = arbLayoutWithinCap
      .map((layout) => ({ ...layout, blankValueBehavior: 'PRINT_BLANK' as const, showFieldLabels: false }))
      .chain((layout) => arbLabelsFor(layout, 1, 5).map((labels) => ({ labels, layout })));

    fc.assert(
      fc.property(arb, ({ labels, layout }) => {
        const result = renderBarcodeLabelsHtml(labels, layout);
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(countOccurrences(result.html, 'class="sticker"')).toBe(labels.length);

        for (const label of labels) {
          const fieldLines = computeStickerLines(label, layout).filter((l) => l.kind === 'field');
          const producedKeys = fieldLines.map((l) => l.fieldKey);
          const expectedKeys = layout.enabledFields
            .map((f) => f.fieldKey)
            .filter((key) => producedKeys.includes(key));
          expect(producedKeys).toEqual(expectedKeys);

          for (const line of fieldLines) {
            const value = label.values?.[line.fieldKey as string];
            if (isBlank(value)) continue;
            expect(line.text).toBe(value);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  // Feature: barcode-label-layout, Property 21: HIDE_LINE omits blank values
  // Validates: Requirements 7.4
  it('with HIDE_LINE emits exactly the non-blank enabled values, in enabled order, with no blank text', () => {
    const arb = arbLayout
      .map((layout) => ({ ...layout, blankValueBehavior: 'HIDE_LINE' as const }))
      .chain((layout) => arbLabelFor(layout).map((label) => ({ label, layout })));

    fc.assert(
      fc.property(arb, ({ label, layout }) => {
        const { maxLines } = resolveStickerSize(layout);
        const fieldLines = computeStickerLines(label, layout).filter((l) => l.kind === 'field');

        for (const line of fieldLines) {
          expect(isBlank(line.text)).toBe(false);
        }

        const expectedKeys = layout.enabledFields
          .filter((f) => !isBlank(label.values?.[f.fieldKey]))
          .map((f) => f.fieldKey)
          .slice(0, maxLines);
        expect(fieldLines.map((l) => l.fieldKey)).toEqual(expectedKeys);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: barcode-label-layout, Property 22: PRINT_BLANK yields uniform line positions
  // Validates: Requirements 7.5
  it('with PRINT_BLANK every sticker has the same line structure and blanks render as "label:" or ""', () => {
    const arb = arbLayoutWithinCap
      .map((layout) => ({ ...layout, blankValueBehavior: 'PRINT_BLANK' as const }))
      .chain((layout) => arbLabelsFor(layout, 2, 5).map((labels) => ({ labels, layout })));

    fc.assert(
      fc.property(arb, ({ labels, layout }) => {
        const structures = labels.map((label) =>
          computeStickerLines(label, layout).map((l) => [l.kind, l.fieldKey ?? null] as const),
        );
        for (const structure of structures) {
          expect(structure).toEqual(structures[0]);
        }

        for (const label of labels) {
          const lines = computeStickerLines(label, layout);
          const fieldLines = lines.filter((l) => l.kind === 'field');
          expect(fieldLines).toHaveLength(layout.enabledFields.length);

          layout.enabledFields.forEach((field, i) => {
            const line = fieldLines[i];
            expect(line.fieldKey).toBe(field.fieldKey);
            const value = label.values?.[field.fieldKey];
            if (isBlank(value)) {
              expect(line.text).toBe(layout.showFieldLabels ? `${field.label}:` : '');
            }
          });
        }
      }),
      { numRuns: 100 },
    );
  });
});
