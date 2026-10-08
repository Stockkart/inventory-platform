import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  buildSampleLabelData,
  compatibleSheetPresets,
  dropFieldMaps,
  groupCatalogFields,
  moveField,
  prepareSaveRequest,
  resolveSheetSpec,
  toEffectiveLayout,
  zoneCounts,
  zoneOverflow,
  type LabelLayoutDraft,
} from './labelLayoutDraft';
import {
  STICKER_SIZES,
  ZONE_CAPS,
  type BarcodePosition,
  type BlankValueBehavior,
  type CurrencyStyle,
  type FieldCatalogResponse,
  type LabelSourceGroup,
  type LabelValueType,
  type LabelZone,
  type PrintableField,
  type PrintMedia,
  type SheetPreset,
  type ShopType,
  type StickerTemplate,
} from '../../model/labelLayout.types';

const SOURCE_GROUPS: LabelSourceGroup[] = ['product', 'lot', 'pricing', 'shop', 'vertical'];
const VALUE_TYPES: LabelValueType[] = ['text', 'number', 'currency', 'date', 'percentage'];
const SHOP_TYPES: ShopType[] = ['RETAILER', 'DISTRIBUTOR', 'WHOLESALER'];
const BLANK_BEHAVIORS: BlankValueBehavior[] = ['HIDE_LINE', 'PRINT_BLANK'];
const PRINT_MEDIA: PrintMedia[] = ['ROLL', 'SHEET'];
const TEMPLATES: StickerTemplate[] = ['STACKED', 'COMPACT'];
const BARCODE_POSITIONS: BarcodePosition[] = ['TOP', 'BOTTOM'];
const CURRENCY_STYLES: CurrencyStyle[] = ['RUPEE_SYMBOL', 'RS_PREFIX'];
const LABEL_ZONES: LabelZone[] = ['HEADER', 'LEFT', 'RIGHT'];
const STICKER_SIZE_KEYS = STICKER_SIZES.map((s) => s.size);

/** Mix of well-known keys (with curated samples) and arbitrary keys. */
const arbFieldKey: fc.Arbitrary<string> = fc.oneof(
  fc.constantFrom(
    'productName',
    'companyName',
    'mrp',
    'batchNo',
    'expiryDate',
    'shopName',
    'barcodeText',
  ),
  fc.stringMatching(/^[a-z][a-zA-Z0-9.]{0,15}$/),
);

const arbPrintableField: fc.Arbitrary<PrintableField> = fc.record({
  fieldKey: arbFieldKey,
  label: fc.string({ minLength: 1, maxLength: 20 }),
  sourceGroup: fc.constantFrom(...SOURCE_GROUPS),
  valueType: fc.constantFrom(...VALUE_TYPES),
  availableForShopTypes: fc.subarray(SHOP_TYPES),
  schemaApiKey: fc.option(fc.string({ minLength: 1, maxLength: 10 }), { nil: null }),
});

/**
 * Any Field_Catalog: 0–15 fields with unique keys. Groups are picked at random,
 * so many catalogs are missing one or more source groups entirely.
 */
const arbCatalog: fc.Arbitrary<FieldCatalogResponse> = fc.record({
  fields: fc
    .uniqueArray(arbPrintableField, { minLength: 0, maxLength: 15, selector: (f) => f.fieldKey })
    .map((fields) => fields as PrintableField[]),
  stickerSizes: fc.constant(STICKER_SIZES),
  shopType: fc.constantFrom(...SHOP_TYPES),
  verticalSchemaLoaded: fc.boolean(),
});

/** A draft whose enabled keys mix catalog keys with keys the catalog does not know. */
function arbDraft(catalog: FieldCatalogResponse): fc.Arbitrary<LabelLayoutDraft> {
  const catalogKeys = catalog.fields.map((f) => f.fieldKey);
  const arbKnownKey =
    catalogKeys.length > 0 ? fc.constantFrom(...catalogKeys) : fc.constant<string | null>(null);
  const arbUnknownKey = fc.stringMatching(/^unknown_[a-z0-9]{1,8}$/);
  const arbAnyKey = fc.oneof(
    catalogKeys.length > 0 ? fc.constantFrom(...catalogKeys) : arbUnknownKey,
    arbUnknownKey,
  );
  const arbZoneMap = fc
    .array(fc.tuple(arbAnyKey, fc.constantFrom(...LABEL_ZONES)), { maxLength: 10 })
    .map((pairs) => Object.fromEntries(pairs) as Record<string, LabelZone>);
  const arbLabelOverrides = fc
    .array(fc.tuple(arbAnyKey, fc.boolean()), { maxLength: 10 })
    .map((pairs) => Object.fromEntries(pairs) as Record<string, boolean>);
  return fc.record({
    enabledFieldKeys: fc
      .array(fc.oneof(arbKnownKey, arbUnknownKey), { minLength: 0, maxLength: 20 })
      .map((keys) => keys.filter((k): k is string => k !== null)),
    stickerSize: fc.constantFrom(...STICKER_SIZE_KEYS),
    showBarcodeText: fc.boolean(),
    showFieldLabels: fc.boolean(),
    blankValueBehavior: fc.constantFrom(...BLANK_BEHAVIORS),
    printMedia: fc.constantFrom(...PRINT_MEDIA),
    sheetPreset: fc.option(fc.stringMatching(/^[A-Z0-9_]{1,10}$/), { nil: null }),
    rollLabelsAcross: fc.integer({ min: 1, max: 4 }),
    rollColumnGapMm: fc.integer({ min: 0, max: 20 }),
    template: fc.constantFrom(...TEMPLATES),
    barcodePosition: fc.constantFrom(...BARCODE_POSITIONS),
    currencyStyle: fc.constantFrom(...CURRENCY_STYLES),
    fieldZones: arbZoneMap,
    fieldLabelOverrides: arbLabelOverrides,
  });
}

const arbCatalogAndDraft = arbCatalog.chain((catalog) =>
  fc.tuple(fc.constant(catalog), arbDraft(catalog)),
);

const isNonBlank = (v: unknown): boolean => typeof v === 'string' && v.trim().length > 0;

describe('labelLayoutDraft property tests', () => {
  // Feature: barcode-label-layout, Property 27: Sample label data is non-blank for every catalog field
  it('Property 27: buildSampleLabelData yields a non-blank value for every catalog field', () => {
    // **Validates: Requirements 5.4**
    fc.assert(
      fc.property(arbCatalog, (catalog) => {
        const sample = buildSampleLabelData(catalog);
        expect(isNonBlank(sample.code)).toBe(true);
        expect(sample.values).toBeTruthy();
        for (const field of catalog.fields) {
          expect(isNonBlank(sample.values?.[field.fieldKey])).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });

  // Feature: barcode-label-layout, Property 28: Moving a field is an adjacent swap within bounds
  it('Property 28: moveField is an adjacent swap within bounds and an identity copy otherwise', () => {
    // **Validates: Requirements 5.5**
    const arbList = fc.uniqueArray(fc.string({ minLength: 1, maxLength: 8 }), {
      minLength: 0,
      maxLength: 12,
    });
    fc.assert(
      fc.property(
        arbList,
        fc.integer({ min: -2, max: 14 }),
        fc.constantFrom<'up' | 'down'>('up', 'down'),
        (list, index, dir) => {
          const result = moveField(list, index, dir);

          // Always a new array that is a permutation of the input.
          expect(result).not.toBe(list);
          expect(result.length).toBe(list.length);
          expect([...result].sort()).toEqual([...list].sort());

          const target = dir === 'up' ? index - 1 : index + 1;
          const inBounds = index >= 0 && index < list.length && target >= 0 && target < list.length;

          if (inBounds) {
            expect(result[index]).toBe(list[target]);
            expect(result[target]).toBe(list[index]);
            for (let i = 0; i < list.length; i++) {
              if (i !== index && i !== target) expect(result[i]).toBe(list[i]);
            }
          } else {
            expect(result).toEqual(list);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: barcode-label-layout, Property 29: Save requests never carry unknown keys
  it('Property 29: prepareSaveRequest keeps only catalog keys in draft order and carries options unchanged', () => {
    // **Validates: Requirements 9.7**
    fc.assert(
      fc.property(arbCatalogAndDraft, ([catalog, draft]) => {
        const catalogKeys = new Set(catalog.fields.map((f) => f.fieldKey));
        const request = prepareSaveRequest(draft, catalog);

        for (const key of request.enabledFieldKeys) {
          expect(catalogKeys.has(key)).toBe(true);
        }
        expect(request.enabledFieldKeys).toEqual(
          draft.enabledFieldKeys.filter((k) => catalogKeys.has(k)),
        );

        expect(request.stickerSize).toBe(draft.stickerSize);
        expect(request.showBarcodeText).toBe(draft.showBarcodeText);
        expect(request.showFieldLabels).toBe(draft.showFieldLabels);
        expect(request.blankValueBehavior).toBe(draft.blankValueBehavior);
        expect(request.printMedia).toBe(draft.printMedia);
        // `sheetPreset` only rides along for SHEET media; ROLL always clears it.
        expect(request.sheetPreset).toBe(draft.printMedia === 'SHEET' ? draft.sheetPreset : null);

        // Sticker template options (Req 11) ride along unchanged.
        expect(request.template).toBe(draft.template);
        expect(request.barcodePosition).toBe(draft.barcodePosition);
        expect(request.currencyStyle).toBe(draft.currencyStyle);

        // `fieldZones`/`fieldLabelOverrides` carry only enabled keys (Req 11.5).
        const enabled = new Set(request.enabledFieldKeys);
        for (const key of Object.keys(request.fieldZones ?? {}))
          expect(enabled.has(key)).toBe(true);
        for (const key of Object.keys(request.fieldLabelOverrides ?? {}))
          expect(enabled.has(key)).toBe(true);
        for (const [key, zone] of Object.entries(request.fieldZones ?? {})) {
          if (enabled.has(key)) expect(zone).toBe(draft.fieldZones[key]);
        }
      }),
      { numRuns: 100 },
    );
  });

  // Feature: barcode-label-layout, Property 36: Zone counts/overflow follow the compact resolution rule
  it('Property 36: zoneCounts sums enabled catalog keys per resolved zone and zoneOverflow flags over-cap zones', () => {
    // **Validates: Requirements 11.4, 11.10**
    fc.assert(
      fc.property(arbCatalogAndDraft, ([catalog, draft]) => {
        const catalogKeys = new Set(catalog.fields.map((f) => f.fieldKey));
        const counts = zoneCounts(draft, catalog);

        // Total counted equals the number of enabled keys known to the catalog.
        const enabledKnown = draft.enabledFieldKeys.filter((k) => catalogKeys.has(k));
        expect(counts.HEADER + counts.LEFT + counts.RIGHT).toBe(enabledKnown.length);

        // Each key lands in `fieldZones[key] ?? 'LEFT'`.
        const expected: Record<LabelZone, number> = { HEADER: 0, LEFT: 0, RIGHT: 0 };
        for (const key of enabledKnown) expected[draft.fieldZones[key] ?? 'LEFT'] += 1;
        expect(counts).toEqual(expected);

        const caps = ZONE_CAPS[draft.stickerSize];
        const over = zoneOverflow(draft, catalog, caps);
        expect(over.includes('HEADER')).toBe(counts.HEADER > caps.header);
        expect(over.includes('LEFT')).toBe(counts.LEFT > caps.left);
        expect(over.includes('RIGHT')).toBe(counts.RIGHT > caps.right);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: barcode-label-layout, Property 37: Effective layout resolves zone/showLabel per field
  it('Property 37: toEffectiveLayout resolves zone and showLabel matching the renderer rule', () => {
    // **Validates: Requirements 11.2**
    fc.assert(
      fc.property(arbCatalogAndDraft, ([catalog, draft]) => {
        const index = new Map(catalog.fields.map((f) => [f.fieldKey, f] as const));
        const effective = toEffectiveLayout(draft, catalog);
        const compact = draft.template === 'COMPACT';

        for (const field of effective.enabledFields) {
          const source = index.get(field.fieldKey);
          expect(source).toBeDefined();
          const zone = draft.fieldZones[field.fieldKey] ?? 'LEFT';
          expect(field.zone).toBe(zone);

          const override = draft.fieldLabelOverrides[field.fieldKey];
          let expectedShowLabel: boolean;
          if (override !== undefined) expectedShowLabel = override;
          else if (!compact) expectedShowLabel = draft.showFieldLabels;
          else if (zone === 'HEADER') expectedShowLabel = false;
          else if (zone === 'RIGHT') expectedShowLabel = source!.valueType !== 'currency';
          else expectedShowLabel = true;
          expect(field.showLabel).toBe(expectedShowLabel);
        }

        expect(effective.template).toBe(draft.template);
        expect(effective.barcodePosition).toBe(draft.barcodePosition);
        expect(effective.currencyStyle).toBe(draft.currencyStyle);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: barcode-label-layout, Property 30: Toggle grouping has no empty groups and follows catalog order
  it('Property 30: groupCatalogFields omits empty groups, follows fixed group order, and preserves catalog order', () => {
    // **Validates: Requirements 5.2**
    fc.assert(
      fc.property(arbCatalog, (catalog) => {
        const groups = groupCatalogFields(catalog);

        // No empty groups.
        for (const g of groups) expect(g.fields.length).toBeGreaterThan(0);

        // Group order is a strictly increasing subsequence of SOURCE_GROUPS (no duplicates).
        const positions = groups.map((g) => SOURCE_GROUPS.indexOf(g.group));
        for (const p of positions) expect(p).toBeGreaterThanOrEqual(0);
        for (let i = 1; i < positions.length; i++)
          expect(positions[i]).toBeGreaterThan(positions[i - 1]);

        // Within a group, fields equal the catalog fields of that group in catalog order.
        for (const g of groups) {
          expect(g.fields).toEqual(catalog.fields.filter((f) => f.sourceGroup === g.group));
        }

        // Union of all groups equals the catalog field set.
        const union = groups.flatMap((g) => g.fields);
        expect(union.length).toBe(catalog.fields.length);
        expect([...union].sort((a, b) => a.fieldKey.localeCompare(b.fieldKey))).toEqual(
          [...catalog.fields].sort((a, b) => a.fieldKey.localeCompare(b.fieldKey)),
        );
      }),
      { numRuns: 100 },
    );
  });
});

/** A small, fixed catalog carrying two die-cut presets plus one plain preset. */
const A4_65UP: SheetPreset = {
  id: 'A4_65UP',
  label: 'A4 65-up',
  pageWidthMm: 210,
  pageHeightMm: 297,
  marginTopMm: 10.7,
  marginLeftMm: 4.75,
  plain: false,
  compatibleStickerSizes: ['38x25'],
  perStickerSize: {
    '38x25': { columns: 5, rows: 13, perSheet: 65, pitchXMm: 38.1, pitchYMm: 21.2 },
  } as SheetPreset['perStickerSize'],
};

const A4_40UP: SheetPreset = {
  id: 'A4_40UP',
  label: 'A4 40-up',
  pageWidthMm: 210,
  pageHeightMm: 297,
  marginTopMm: 0,
  marginLeftMm: 0,
  plain: false,
  compatibleStickerSizes: ['50x25'],
  perStickerSize: {
    '50x25': { columns: 4, rows: 10, perSheet: 40, pitchXMm: 52.5, pitchYMm: 29.7 },
  } as SheetPreset['perStickerSize'],
};

const A4_PLAIN: SheetPreset = {
  id: 'A4_PLAIN',
  label: 'A4 plain',
  pageWidthMm: 210,
  pageHeightMm: 297,
  marginTopMm: 8,
  marginLeftMm: 8,
  plain: true,
  compatibleStickerSizes: ['50x25', '38x25', '100x50'],
  perStickerSize: {
    '50x25': { columns: 3, rows: 10, perSheet: 30, pitchXMm: 52, pitchYMm: 27 },
    '38x25': { columns: 5, rows: 10, perSheet: 50, pitchXMm: 40, pitchYMm: 27 },
    '38x38': { columns: 5, rows: 7, perSheet: 35, pitchXMm: 40, pitchYMm: 40 },
    '100x50': { columns: 1, rows: 5, perSheet: 5, pitchXMm: 102, pitchYMm: 52 },
  },
};

const SHEET_CATALOG: FieldCatalogResponse = {
  fields: [],
  stickerSizes: STICKER_SIZES,
  shopType: 'RETAILER',
  verticalSchemaLoaded: true,
  sheetPresets: [A4_PLAIN, A4_65UP, A4_40UP],
};

describe('compatibleSheetPresets', () => {
  it('returns the plain preset plus only the die-cut presets that fit the size', () => {
    expect(compatibleSheetPresets(SHEET_CATALOG, '38x25').map((p) => p.id)).toEqual([
      'A4_PLAIN',
      'A4_65UP',
    ]);
    expect(compatibleSheetPresets(SHEET_CATALOG, '50x25').map((p) => p.id)).toEqual([
      'A4_PLAIN',
      'A4_40UP',
    ]);
    expect(compatibleSheetPresets(SHEET_CATALOG, '100x50').map((p) => p.id)).toEqual(['A4_PLAIN']);
  });

  it('is empty when the catalog carries no sheet presets', () => {
    expect(compatibleSheetPresets({ ...SHEET_CATALOG, sheetPresets: undefined }, '50x25')).toEqual(
      [],
    );
  });
});

describe('resolveSheetSpec', () => {
  it('builds the full geometry from the preset page and the size grid', () => {
    expect(resolveSheetSpec(SHEET_CATALOG, 'A4_65UP', '38x25')).toEqual({
      presetId: 'A4_65UP',
      pageWidthMm: 210,
      pageHeightMm: 297,
      marginTopMm: 10.7,
      marginLeftMm: 4.75,
      pitchXMm: 38.1,
      pitchYMm: 21.2,
      columns: 5,
      rows: 13,
      perSheet: 65,
    });
  });

  it('returns undefined for a missing id, an incompatible size, or no preset', () => {
    expect(resolveSheetSpec(SHEET_CATALOG, 'A4_65UP', '50x25')).toBeUndefined();
    expect(resolveSheetSpec(SHEET_CATALOG, 'NOPE', '50x25')).toBeUndefined();
    expect(resolveSheetSpec(SHEET_CATALOG, null, '50x25')).toBeUndefined();
  });
});

/** A small catalog of five fields across zones for the compact helper examples. */
const COMPACT_CATALOG: FieldCatalogResponse = {
  fields: [
    {
      fieldKey: 'shopName',
      label: 'Shop name',
      sourceGroup: 'shop',
      valueType: 'text',
      availableForShopTypes: ['RETAILER', 'DISTRIBUTOR', 'WHOLESALER'],
    },
    {
      fieldKey: 'productName',
      label: 'Product name',
      sourceGroup: 'product',
      valueType: 'text',
      availableForShopTypes: ['RETAILER', 'DISTRIBUTOR', 'WHOLESALER'],
    },
    {
      fieldKey: 'companyName',
      label: 'Company',
      sourceGroup: 'product',
      valueType: 'text',
      availableForShopTypes: ['RETAILER', 'DISTRIBUTOR', 'WHOLESALER'],
    },
    {
      fieldKey: 'packSize',
      label: 'Pack size',
      sourceGroup: 'product',
      valueType: 'text',
      availableForShopTypes: ['RETAILER', 'DISTRIBUTOR', 'WHOLESALER'],
    },
    {
      fieldKey: 'mrp',
      label: 'MRP',
      sourceGroup: 'pricing',
      valueType: 'currency',
      availableForShopTypes: ['RETAILER', 'DISTRIBUTOR', 'WHOLESALER'],
    },
  ],
  stickerSizes: STICKER_SIZES,
  shopType: 'RETAILER',
  verticalSchemaLoaded: true,
};

function compactDraft(overrides: Partial<LabelLayoutDraft> = {}): LabelLayoutDraft {
  return {
    enabledFieldKeys: ['shopName', 'productName', 'companyName', 'packSize', 'mrp'],
    stickerSize: '50x25',
    showBarcodeText: true,
    showFieldLabels: false,
    blankValueBehavior: 'HIDE_LINE',
    printMedia: 'ROLL',
    sheetPreset: null,
    rollLabelsAcross: 1,
    rollColumnGapMm: 0,
    template: 'COMPACT',
    barcodePosition: 'TOP',
    currencyStyle: 'RUPEE_SYMBOL',
    fieldZones: {
      shopName: 'HEADER',
      productName: 'LEFT',
      companyName: 'LEFT',
      packSize: 'LEFT',
      mrp: 'RIGHT',
    },
    fieldLabelOverrides: {},
    ...overrides,
  };
}

describe('zoneCounts / zoneOverflow', () => {
  it('counts enabled catalog keys per resolved zone (absent key defaults to LEFT)', () => {
    const draft = compactDraft({ fieldZones: { shopName: 'HEADER', mrp: 'RIGHT' } });
    // productName/companyName/packSize have no zone entry → default LEFT.
    expect(zoneCounts(draft, COMPACT_CATALOG)).toEqual({ HEADER: 1, LEFT: 3, RIGHT: 1 });
  });

  it('ignores enabled keys the catalog does not know', () => {
    const draft = compactDraft({ enabledFieldKeys: ['shopName', 'mrp', 'unknown_x'] });
    expect(zoneCounts(draft, COMPACT_CATALOG)).toEqual({ HEADER: 1, LEFT: 0, RIGHT: 1 });
  });

  it('flags no overflow at the 50x25 caps (header 1, left 4, right 2)', () => {
    expect(zoneOverflow(compactDraft(), COMPACT_CATALOG, ZONE_CAPS['50x25'])).toEqual([]);
  });

  it('flags LEFT and RIGHT overflow against the tighter 38x25 caps (header 1, left 3, right 1)', () => {
    // 38x25 allows header 1 / left 3 / right 1. Put 2 in LEFT (ok) and 2 in RIGHT (over).
    const draft = compactDraft({
      stickerSize: '38x25',
      fieldZones: {
        shopName: 'HEADER',
        productName: 'LEFT',
        companyName: 'LEFT',
        packSize: 'RIGHT',
        mrp: 'RIGHT',
      },
    });
    expect(zoneCounts(draft, COMPACT_CATALOG)).toEqual({ HEADER: 1, LEFT: 2, RIGHT: 2 });
    expect(zoneOverflow(draft, COMPACT_CATALOG, ZONE_CAPS['38x25'])).toEqual(['RIGHT']);
  });
});

describe('dropFieldMaps', () => {
  it('removes a field’s zone and label-override entries', () => {
    const draft = compactDraft({
      fieldZones: { shopName: 'HEADER', mrp: 'RIGHT' },
      fieldLabelOverrides: { mrp: true },
    });
    const next = dropFieldMaps(draft, 'mrp');
    expect(next.fieldZones).toEqual({ shopName: 'HEADER' });
    expect(next.fieldLabelOverrides).toEqual({});
  });

  it('returns the same reference when the field has no map entries', () => {
    const draft = compactDraft({ fieldZones: { shopName: 'HEADER' }, fieldLabelOverrides: {} });
    expect(dropFieldMaps(draft, 'productName')).toBe(draft);
  });
});

describe('toEffectiveLayout (compact resolution)', () => {
  it('resolves per-zone showLabel defaults and currency RIGHT label-off', () => {
    const effective = toEffectiveLayout(compactDraft(), COMPACT_CATALOG);
    const byKey = new Map(effective.enabledFields.map((f) => [f.fieldKey, f] as const));
    expect(byKey.get('shopName')).toMatchObject({ zone: 'HEADER', showLabel: false });
    expect(byKey.get('productName')).toMatchObject({ zone: 'LEFT', showLabel: true });
    // mrp is RIGHT + currency → label off by default.
    expect(byKey.get('mrp')).toMatchObject({ zone: 'RIGHT', showLabel: false });
    expect(effective.template).toBe('COMPACT');
    expect(effective.currencyStyle).toBe('RUPEE_SYMBOL');
  });

  it('honours an explicit label override over the per-zone default', () => {
    const effective = toEffectiveLayout(
      compactDraft({ fieldLabelOverrides: { mrp: true, shopName: true } }),
      COMPACT_CATALOG,
    );
    const byKey = new Map(effective.enabledFields.map((f) => [f.fieldKey, f] as const));
    expect(byKey.get('mrp')?.showLabel).toBe(true);
    expect(byKey.get('shopName')?.showLabel).toBe(true);
  });
});
