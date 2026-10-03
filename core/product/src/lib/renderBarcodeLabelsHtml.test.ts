import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { computeStickerLines, isBlank } from './renderBarcodeLabelsHtml';
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

const arbLabelAndLayout = arbLayout.chain((layout) =>
  arbLabelFor(layout).map((label) => ({ label, layout })),
);

describe('computeStickerLines property tests', () => {
  // Feature: barcode-label-layout, Property 18: Code line present iff showBarcodeText, always first and unlabelled
  // Validates: Requirements 3.2, 7.2
  it('emits a code line iff showBarcodeText, at index 0, equal to the code with no label prefix', () => {
    fc.assert(
      fc.property(arbLabelAndLayout, ({ label, layout }) => {
        const lines = computeStickerLines(label, layout);
        const codeLines = lines.filter((l) => l.kind === 'code');

        if (layout.showBarcodeText) {
          expect(codeLines).toHaveLength(1);
          expect(lines[0]).toEqual({ kind: 'code', text: label.code });
          for (const field of layout.enabledFields) {
            expect(lines[0].text.startsWith(`${field.label}:`)).toBe(false);
          }
        } else {
          expect(codeLines).toHaveLength(0);
        }
      }),
      { numRuns: 100 },
    );
  });

  // Feature: barcode-label-layout, Property 19: Field label prefix
  // Validates: Requirements 3.3, 7.3
  it('prefixes non-blank field values with "label: " iff showFieldLabels', () => {
    fc.assert(
      fc.property(arbLabelAndLayout, ({ label, layout }) => {
        const lines = computeStickerLines(label, layout);
        const fieldByKey = new Map(layout.enabledFields.map((f) => [f.fieldKey, f]));

        for (const line of lines) {
          if (line.kind !== 'field') continue;
          const field = fieldByKey.get(line.fieldKey as string);
          expect(field).toBeDefined();
          const value = label.values?.[field!.fieldKey];
          if (isBlank(value)) continue;

          const expected = layout.showFieldLabels ? `${field!.label}: ${value}` : value;
          expect(line.text).toBe(expected);
        }
      }),
      { numRuns: 100 },
    );
  });
});
