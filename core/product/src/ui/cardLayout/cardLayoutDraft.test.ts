// Feature: configurable-product-card, Property 11: Draft helper invariants
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import type {
  CardFieldCatalogResponse,
  CardLayoutSpec,
  ResolvedCardLayout,
  SurfaceLayoutResponse,
} from '../../model/cardLayout.types';
import { FALLBACK_CARD_LAYOUTS } from '../../cardLayout/cardLayoutDefaults';
import {
  DEFAULT_LIMITS,
  EMPTY_SPEC,
  addSection,
  countFields,
  draftFromResponse,
  enabledKeys,
  joinRowWithPrevious,
  moveFieldToSection,
  moveRow,
  moveRowToSection,
  moveSection,
  removeSection,
  resolveDraftLocally,
  specFromResolved,
  specsEqual,
  splitRow,
  toggleField,
  updateField,
} from './cardLayoutDraft';

const CATALOG: CardFieldCatalogResponse = {
  fields: [
    f('companyName', 'Company', 'product', 'text', 'companyName'),
    f('barcodeText', 'Barcode', 'product', 'text', 'barcode'),
    f('description', 'Description', 'product', 'text', 'description'),
    f('mrp', 'MRP', 'pricing', 'currency', 'maximumRetailPrice'),
    f('sellingPrice', 'Selling price', 'pricing', 'currency', 'sellingPrice'),
    f('costPrice', 'Cost price', 'pricing', 'currency', 'costPrice', 'SHOP_INTERNAL'),
    f(
      'saleAdditionalDiscount',
      'Additional discount',
      'pricing',
      'percentage',
      'saleAdditionalDiscount',
    ),
    f('batchNo', 'Batch no.', 'lot', 'text', 'batchNo'),
    f('expiryDate', 'Expiry', 'lot', 'date', 'expiryDate'),
    f('location', 'Location', 'lot', 'text', 'location'),
    f('availableCount', 'Available', 'lot', 'number', 'availableCount'),
    f('currentCount', 'Current stock', 'lot', 'number', 'currentCount'),
    f('receivedCount', 'Received', 'lot', 'number', 'receivedCount'),
    f('soldCount', 'Sold', 'lot', 'number', 'soldCount'),
    f('thresholdCount', 'Low-stock threshold', 'lot', 'number', 'thresholdCount'),
    f('purchaseDate', 'Purchased on', 'lot', 'date', 'purchaseDate'),
    f('vertical.brand', 'Brand', 'vertical', 'text', 'verticalFields.brand'),
    f('vertical.sport', 'Sport', 'vertical', 'text', 'verticalFields.sport'),
    f('hsn', 'HSN', 'product', 'text', 'hsn'),
    f('baseUnit', 'Unit', 'product', 'text', 'baseUnit'),
    f('itemType', 'Item type', 'product', 'text', 'itemType'),
    f('ptr', 'PTR', 'pricing', 'currency', 'priceToRetail'),
  ],
  surfaces: [
    {
      surfaceId: 'product-search',
      label: 'Product search',
      billingModeAware: true,
      excludedFieldKeys: [],
    },
    {
      surfaceId: 'scan-sell',
      label: 'Scan & Sell',
      billingModeAware: true,
      excludedFieldKeys: ['description'],
    },
  ],
  limits: DEFAULT_LIMITS,
  verticalSchemaLoaded: true,
};
const KEYS = CATALOG.fields.map((x) => x.fieldKey);

type Edit =
  | { kind: 'toggleOn'; key: string; section: number }
  | { kind: 'toggleOff'; key: string }
  | { kind: 'addSection' }
  | { kind: 'removeSection'; section: number }
  | { kind: 'moveSection'; section: number; dir: 'up' | 'down' }
  | { kind: 'moveRow'; section: number; row: number; dir: 'up' | 'down' }
  | { kind: 'join'; section: number; row: number }
  | { kind: 'split'; section: number; row: number }
  | { kind: 'moveRowTo'; section: number; row: number; to: number }
  | { kind: 'moveFieldTo'; key: string; to: number }
  | {
      kind: 'updateField';
      key: string;
      label: string | null;
      emphasis: 'NORMAL' | 'STRONG' | 'MUTED';
      showLabel: boolean;
    };

const editArb: fc.Arbitrary<Edit> = fc.oneof(
  fc.record({
    kind: fc.constant('toggleOn' as const),
    key: fc.constantFrom(...KEYS),
    section: fc.nat(6),
  }),
  fc.record({ kind: fc.constant('toggleOff' as const), key: fc.constantFrom(...KEYS) }),
  fc.record({ kind: fc.constant('addSection' as const) }),
  fc.record({ kind: fc.constant('removeSection' as const), section: fc.nat(6) }),
  fc.record({
    kind: fc.constant('moveSection' as const),
    section: fc.nat(6),
    dir: fc.constantFrom<'up' | 'down'>('up', 'down'),
  }),
  fc.record({
    kind: fc.constant('moveRow' as const),
    section: fc.nat(6),
    row: fc.nat(8),
    dir: fc.constantFrom<'up' | 'down'>('up', 'down'),
  }),
  fc.record({ kind: fc.constant('join' as const), section: fc.nat(6), row: fc.nat(8) }),
  fc.record({ kind: fc.constant('split' as const), section: fc.nat(6), row: fc.nat(8) }),
  fc.record({
    kind: fc.constant('moveRowTo' as const),
    section: fc.nat(6),
    row: fc.nat(8),
    to: fc.nat(6),
  }),
  fc.record({
    kind: fc.constant('moveFieldTo' as const),
    key: fc.constantFrom(...KEYS),
    to: fc.nat(6),
  }),
  fc.record({
    kind: fc.constant('updateField' as const),
    key: fc.constantFrom(...KEYS),
    label: fc.option(fc.string({ maxLength: 60 }), { nil: null }),
    emphasis: fc.constantFrom<'NORMAL' | 'STRONG' | 'MUTED'>('NORMAL', 'STRONG', 'MUTED'),
    showLabel: fc.boolean(),
  }),
);

function apply(spec: CardLayoutSpec, e: Edit): CardLayoutSpec {
  const sid = (i: number) => spec.sections[i % Math.max(1, spec.sections.length)]?.id ?? null;
  switch (e.kind) {
    case 'toggleOn':
      return toggleField(spec, e.key, true, sid(e.section));
    case 'toggleOff':
      return toggleField(spec, e.key, false, null);
    case 'addSection':
      return addSection(spec);
    case 'removeSection':
      return sid(e.section) ? removeSection(spec, sid(e.section) as string) : spec;
    case 'moveSection':
      return moveSection(spec, e.section % Math.max(1, spec.sections.length), e.dir);
    case 'moveRow':
      return sid(e.section) ? moveRow(spec, sid(e.section) as string, e.row, e.dir) : spec;
    case 'join':
      return sid(e.section) ? joinRowWithPrevious(spec, sid(e.section) as string, e.row) : spec;
    case 'split':
      return sid(e.section) ? splitRow(spec, sid(e.section) as string, e.row) : spec;
    case 'moveRowTo':
      return sid(e.section) && sid(e.to)
        ? moveRowToSection(spec, sid(e.section) as string, e.row, sid(e.to) as string)
        : spec;
    case 'moveFieldTo':
      return sid(e.to) ? moveFieldToSection(spec, e.key, sid(e.to) as string) : spec;
    case 'updateField':
      return updateField(spec, e.key, {
        labelOverride: e.label,
        emphasis: e.emphasis,
        showLabel: e.showLabel,
      });
  }
}

function assertInvariants(spec: CardLayoutSpec) {
  expect(spec.sections.length).toBeLessThanOrEqual(DEFAULT_LIMITS.maxSections);
  expect(countFields(spec)).toBeLessThanOrEqual(DEFAULT_LIMITS.maxFieldsTotal);
  const keys = enabledKeys(spec);
  expect(new Set(keys).size).toBe(keys.length);
  const ids = spec.sections.map((s) => s.id);
  expect(new Set(ids).size).toBe(ids.length);
  for (const s of spec.sections) {
    expect(s.rows.length).toBeLessThanOrEqual(DEFAULT_LIMITS.maxRowsPerSection);
    for (const r of s.rows) {
      expect(r.fields.length).toBeGreaterThan(0);
      expect(r.fields.length).toBeLessThanOrEqual(DEFAULT_LIMITS.maxFieldsPerRow);
      for (const fld of r.fields) {
        if (fld.labelOverride != null)
          expect(fld.labelOverride.length).toBeLessThanOrEqual(DEFAULT_LIMITS.maxTextLength);
      }
    }
  }
}

describe('cardLayoutDraft — Property 11: draft helper invariants (Req 9.4–9.6)', () => {
  it('any edit sequence keeps caps, unique keys, unique ids and non-empty rows', () => {
    fc.assert(
      fc.property(fc.array(editArb, { maxLength: 60 }), (edits) => {
        let spec = EMPTY_SPEC;
        for (const e of edits) {
          spec = apply(spec, e);
          assertInvariants(spec);
        }
      }),
      { numRuns: 200 },
    );
  });

  it('toggling a field on then off restores the previous spec (modulo empty sections)', () => {
    fc.assert(
      fc.property(fc.array(editArb, { maxLength: 20 }), fc.constantFrom(...KEYS), (edits, key) => {
        let spec = EMPTY_SPEC;
        for (const e of edits) spec = apply(spec, e);
        const without = toggleField(spec, key, false, null);
        const on = toggleField(without, key, true, without.sections[0]?.id ?? null);
        const offAgain = toggleField(on, key, false, null);
        expect(specsEqual(offAgain, without)).toBe(true);
      }),
    );
  });

  it('spec → resolve → spec is the identity for catalog-known, non-excluded keys', () => {
    fc.assert(
      fc.property(fc.array(editArb, { maxLength: 30 }), (edits) => {
        let spec = EMPTY_SPEC;
        for (const e of edits) spec = apply(spec, e);
        const resolved = resolveDraftLocally(spec, CATALOG, CATALOG.surfaces[0]);
        const back = specFromResolved(resolved, CATALOG);
        // resolution prunes empty sections the draft may still carry
        const pruned: CardLayoutSpec = {
          ...spec,
          sections: spec.sections.filter((s) => s.rows.length > 0),
        };
        expect(specsEqual(back, pruned)).toBe(true);
      }),
    );
  });

  it('local resolution drops excluded keys exactly like the server', () => {
    const spec = toggleField(toggleField(EMPTY_SPEC, 'description', true, null), 'mrp', true, null);
    const resolved = resolveDraftLocally(spec, CATALOG, CATALOG.surfaces[1]);
    expect(
      resolved.sections.flatMap((s) => s.rows.flatMap((r) => r.fields.map((x) => x.fieldKey))),
    ).toEqual(['mrp']);
  });

  it('draftFromResponse round-trips the fallback layouts', () => {
    const layout = FALLBACK_CARD_LAYOUTS['product-search'].REGULAR;
    const response: SurfaceLayoutResponse = {
      surfaceId: 'product-search',
      label: 'Product search',
      billingModeAware: true,
      isDefault: true,
      updatedAt: null,
      updatedByUserId: null,
      variants: { REGULAR: layout, BASIC: layout },
    };
    const draft = draftFromResponse(response, CATALOG);
    expect(draft.REGULAR).toBeDefined();
    expect(draft.BASIC).toBeDefined();
    const again = resolveDraftLocally(
      draft.REGULAR as CardLayoutSpec,
      CATALOG,
      CATALOG.surfaces[0],
    );
    expect(labels(again)).toEqual(labels(layout));
  });

  it('join respects the per-row cap and split is a no-op for single-field rows', () => {
    let spec = EMPTY_SPEC;
    for (const k of ['mrp', 'sellingPrice', 'costPrice', 'ptr'])
      spec = toggleField(spec, k, true, null);
    const sid = spec.sections[0].id;
    spec = joinRowWithPrevious(spec, sid, 1); // [mrp, selling] [cost] [ptr]
    spec = joinRowWithPrevious(spec, sid, 1); // [mrp, selling, cost] [ptr]
    const before = spec;
    spec = joinRowWithPrevious(spec, sid, 1); // would be 4 → rejected
    expect(spec).toBe(before);
    expect(spec.sections[0].rows[0].fields.length).toBe(3);
    expect(splitRow(spec, sid, 1)).toBe(spec);
    const split = splitRow(spec, sid, 0);
    expect(split.sections[0].rows.length).toBe(4);
  });
});

function f(
  fieldKey: string,
  label: string,
  sourceGroup: 'product' | 'pricing' | 'lot' | 'vertical',
  valueType: 'text' | 'number' | 'currency' | 'date' | 'percentage',
  itemPath: string,
  sensitivity: 'PUBLIC' | 'SHOP_INTERNAL' = 'PUBLIC',
) {
  return {
    fieldKey,
    label,
    sourceGroup,
    valueType,
    itemPath,
    schemaApiKey: null,
    sensitivity,
  } as const;
}

function labels(layout: ResolvedCardLayout): string[] {
  return layout.sections.flatMap((s) =>
    s.rows.flatMap((r) => r.fields.map((x) => `${x.fieldKey}=${x.label}`)),
  );
}
