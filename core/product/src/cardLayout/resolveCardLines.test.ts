// Feature: configurable-product-card, Property 9: Renderer line algebra
// Feature: configurable-product-card, Property 13: Variant selection
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import type { ResolvedCardField } from '../model/cardLayout.types';
import { allowAll, composePolicies, hideSensitivePolicy, shopAccessPolicy } from './fieldVisibility';
import { resolveRawValue } from './fieldResolvers';
import { formatCardValue, isBlankValue } from './formatCardValue';
import { BLANK_DASH, SEGMENT_SEPARATOR, lineText, resolveCardLines } from './resolveCardLines';
import { variantFor } from './useSurfaceCardLayout';
import { inventoryItemArb, resolvedLayoutArb } from './testing/arbitraries';

describe('resolveCardLines — Property 9: line algebra (Req 7.1, 7.4, 7.5, 7.8)', () => {
  it('every segment is a visible, non-blank (or dashed) field, in layout order', () => {
    fc.assert(
      fc.property(inventoryItemArb, resolvedLayoutArb, fc.boolean(), (item, layout, hide) => {
        const policy = hide ? hideSensitivePolicy() : allowAll;
        const sections = resolveCardLines(item, layout, policy);

        // Expected: walk the layout, apply policy, resolve + format, apply blank behaviour.
        const expected: string[] = [];
        for (const s of layout.sections) {
          for (const r of s.rows) {
            for (const f of r.fields) {
              if (!policy(f)) continue;
              const value = formatCardValue(resolveRawValue(item, f), f.valueType);
              if (isBlankValue(value) && layout.options.blankValueBehavior === 'HIDE_LINE') continue;
              expected.push(f.fieldKey);
            }
          }
        }
        const actual = sections.flatMap((s) => s.lines.flatMap((l) => l.segments.map((seg) => seg.fieldKey)));
        expect(actual).toEqual(expected);
      }),
    );
  });

  it('under HIDE_LINE no line and no section is empty', () => {
    fc.assert(
      fc.property(inventoryItemArb, resolvedLayoutArb, (item, layout) => {
        const sections = resolveCardLines(item, { ...layout, options: { ...layout.options, blankValueBehavior: 'HIDE_LINE' } });
        for (const s of sections) {
          expect(s.lines.length).toBeGreaterThan(0);
          for (const l of s.lines) {
            expect(l.segments.length).toBeGreaterThan(0);
            for (const seg of l.segments) expect(seg.value).not.toBe('');
          }
        }
      }),
    );
  });

  it('under SHOW_DASH the line count equals the visible row count and blanks are dashes', () => {
    fc.assert(
      fc.property(inventoryItemArb, resolvedLayoutArb, (item, layout) => {
        const dashed = { ...layout, options: { ...layout.options, blankValueBehavior: 'SHOW_DASH' as const } };
        const sections = resolveCardLines(item, dashed);
        const expectedLines = layout.sections.reduce((n, s) => n + s.rows.length, 0);
        const actualLines = sections.reduce((n, s) => n + s.lines.length, 0);
        expect(actualLines).toBe(expectedLines);
        for (const s of sections) {
          for (const l of s.lines) {
            for (const seg of l.segments) {
              const field = findField(layout, seg.fieldKey);
              const value = formatCardValue(resolveRawValue(item, field), field.valueType);
              expect(seg.value).toBe(isBlankValue(value) ? BLANK_DASH : value);
            }
          }
        }
      }),
    );
  });

  it('multi-field lines are joined with " | " and labels print as "label: value"', () => {
    fc.assert(
      fc.property(inventoryItemArb, resolvedLayoutArb, (item, layout) => {
        const dashed = { ...layout, options: { ...layout.options, blankValueBehavior: 'SHOW_DASH' as const } };
        for (const s of resolveCardLines(item, dashed)) {
          for (const l of s.lines) {
            const text = lineText(l);
            const parts = l.segments.map((seg) => (seg.label ? `${seg.label}: ${seg.value}` : seg.value));
            expect(text).toBe(parts.join(SEGMENT_SEPARATOR));
          }
        }
      }),
    );
  });

  it('hideSensitivePolicy removes every SHOP_INTERNAL field and nothing else', () => {
    fc.assert(
      fc.property(inventoryItemArb, resolvedLayoutArb, (item, layout) => {
        const dashed = { ...layout, options: { ...layout.options, blankValueBehavior: 'SHOW_DASH' as const } };
        const keys = resolveCardLines(item, dashed, hideSensitivePolicy()).flatMap((s) =>
          s.lines.flatMap((l) => l.segments.map((seg) => seg.fieldKey)),
        );
        const expected = layout.sections
          .flatMap((s) => s.rows.flatMap((r) => r.fields))
          .filter((f) => f.sensitivity !== 'SHOP_INTERNAL')
          .map((f) => f.fieldKey);
        expect(keys).toEqual(expected);
      }),
    );
  });

  it('shopAccessPolicy hides everything when canView is false and nothing otherwise', () => {
    const field = { fieldKey: 'mrp', sensitivity: 'PUBLIC' } as ResolvedCardField;
    expect(shopAccessPolicy(null)(field)).toBe(true);
    expect(shopAccessPolicy(access(true))(field)).toBe(true);
    expect(shopAccessPolicy(access(false))(field)).toBe(false);
    expect(composePolicies(allowAll, shopAccessPolicy(access(false)))(field)).toBe(false);
    expect(composePolicies()(field)).toBe(true);
  });
});

describe('variantFor — Property 13: variant selection (Req 7.12)', () => {
  it('BASIC iff billingMode === BASIC', () => {
    fc.assert(
      fc.property(inventoryItemArb, (item) => {
        expect(variantFor(item)).toBe(item.billingMode === 'BASIC' ? 'BASIC' : 'REGULAR');
      }),
    );
  });
});

function findField(layout: { sections: { rows: { fields: ResolvedCardField[] }[] }[] }, key: string): ResolvedCardField {
  for (const s of layout.sections) for (const r of s.rows) for (const f of r.fields) if (f.fieldKey === key) return f;
  throw new Error(`field ${key} not in layout`);
}

function access(canView: boolean) {
  return { canView, canEdit: false, editMode: 'FULL_EDIT' as const, canEditAll: false, editableFields: [] };
}
