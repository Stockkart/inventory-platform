import type {
  BarcodePosition,
  BlankValueBehavior,
  CurrencyStyle,
  EffectiveLabelLayout,
  EnabledField,
  FieldCatalogResponse,
  LabelData,
  LabelLayoutResponse,
  LabelSourceGroup,
  LabelValueType,
  LabelZone,
  PrintableField,
  PrintMedia,
  SaveLabelLayoutRequest,
  SheetPreset,
  SheetSpec,
  ShopType,
  StickerSize,
  StickerSizeSpec,
  StickerTemplate,
  ZoneCaps,
} from '../../model/labelLayout.types.js';
import { STICKER_SIZES, ZONE_CAPS } from '../../model/labelLayout.types.js';

/**
 * Pure (no React, no DOM) helpers backing the barcode label layout
 * configuration screen. The screen edits a `LabelLayoutDraft`; these helpers
 * convert between the draft, the Field_Catalog, the renderer's
 * `EffectiveLabelLayout` and the save request.
 */

export interface LabelLayoutDraft {
  enabledFieldKeys: string[];
  stickerSize: StickerSize;
  showBarcodeText: boolean;
  showFieldLabels: boolean;
  blankValueBehavior: BlankValueBehavior;
  /** Physical print medium (Req 10). `ROLL` is today's continuous-label behaviour. */
  printMedia: PrintMedia;
  /** Chosen Sheet_Preset id when `printMedia` is `SHEET`; `null` for `ROLL`. */
  sheetPreset: string | null;
  /** Sticker template (Req 11). `STACKED` is today's single-column layout. */
  template: StickerTemplate;
  /** Barcode band position for `COMPACT` (Req 11). */
  barcodePosition: BarcodePosition;
  /** Currency prefix style for formatted values (Req 11). */
  currencyStyle: CurrencyStyle;
  /** Per-field `COMPACT` zone assignments (Req 11); absent key defaults to `LEFT`. */
  fieldZones: Record<string, LabelZone>;
  /** Per-field label-visibility overrides for `COMPACT` (Req 11); absent key is `Auto`. */
  fieldLabelOverrides: Record<string, boolean>;
}

export interface CatalogFieldGroup {
  group: LabelSourceGroup;
  title: string;
  fields: PrintableField[];
}

export const SAMPLE_BARCODE_CODE = 'SKA79BMEZWB04Y';

const GROUP_ORDER: ReadonlyArray<{ group: LabelSourceGroup; title: string }> = [
  { group: 'product', title: 'Product' },
  { group: 'lot', title: 'Lot / batch' },
  { group: 'pricing', title: 'Pricing' },
  { group: 'shop', title: 'Shop' },
  { group: 'vertical', title: 'Vertical fields' },
];

const SAMPLE_BY_VALUE_TYPE: Record<LabelValueType, string> = {
  text: 'Sample',
  currency: '₹120.00',
  date: '05-Mar-2026',
  percentage: '12%',
  number: '10',
};

const WELL_KNOWN_SAMPLES: Record<string, string> = {
  productName: 'Paracetamol 650',
  companyName: 'Acme Pharma',
  barcodeText: SAMPLE_BARCODE_CODE,
  hsn: '30049099',
  baseUnit: 'Tablet',
  packSize: '10 Tablet / Strip',
  mrp: '₹120.00',
  sellingPrice: '₹110.00',
  ptr: '₹95.00',
  costPrice: '₹88.00',
  saleScheme: '10+1',
  gstRate: '12%',
  batchNo: 'B-2403A',
  expiryDate: '31-Mar-2027',
  receivedDate: '05-Mar-2026',
  shopName: 'Ali Store',
  shopTagline: 'Trusted since 1998',
  shopPhone: '8800107393',
  shopEmail: 'shop@example.com',
  shopAddress: 'Bangalore, KA',
  shopGstin: '29ABCDE1234F1Z5',
  shopFssai: '12345678901234',
  shopDlNo: 'KA-B-123456',
};

/** Builds a draft from a saved/effective layout (enabled keys in layout order). */
export function draftFromLayout(
  layout: EffectiveLabelLayout | LabelLayoutResponse,
): LabelLayoutDraft {
  const printMedia: PrintMedia = layout.printMedia ?? 'ROLL';
  return {
    enabledFieldKeys: layout.enabledFields.map((f) => f.fieldKey),
    stickerSize: layout.stickerSize,
    showBarcodeText: layout.showBarcodeText,
    showFieldLabels: layout.showFieldLabels,
    blankValueBehavior: layout.blankValueBehavior,
    printMedia,
    sheetPreset: printMedia === 'SHEET' ? layout.sheetPreset ?? null : null,
    template: layout.template ?? 'STACKED',
    barcodePosition: layout.barcodePosition ?? 'TOP',
    currencyStyle: layout.currencyStyle ?? 'RUPEE_SYMBOL',
    fieldZones: { ...(layout.fieldZones ?? {}) },
    fieldLabelOverrides: { ...(layout.fieldLabelOverrides ?? {}) },
  };
}

/** Shallow structural equality of two `fieldKey`-keyed maps. */
function mapsEqual<V>(a: Record<string, V>, b: Record<string, V>): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => key in b && a[key] === b[key]);
}

/** Structural equality of two drafts (enabled key order matters). */
export function draftsEqual(a: LabelLayoutDraft, b: LabelLayoutDraft): boolean {
  if (a === b) return true;
  if (
    a.stickerSize !== b.stickerSize ||
    a.showBarcodeText !== b.showBarcodeText ||
    a.showFieldLabels !== b.showFieldLabels ||
    a.blankValueBehavior !== b.blankValueBehavior ||
    a.printMedia !== b.printMedia ||
    a.sheetPreset !== b.sheetPreset ||
    a.template !== b.template ||
    a.barcodePosition !== b.barcodePosition ||
    a.currencyStyle !== b.currencyStyle ||
    a.enabledFieldKeys.length !== b.enabledFieldKeys.length
  ) {
    return false;
  }
  if (!a.enabledFieldKeys.every((key, i) => key === b.enabledFieldKeys[i])) return false;
  return (
    mapsEqual(a.fieldZones, b.fieldZones) && mapsEqual(a.fieldLabelOverrides, b.fieldLabelOverrides)
  );
}

/**
 * Sample label used by the live preview. Every catalog field gets a non-blank
 * value chosen by `valueType`, with nicer samples for well-known keys.
 */
export function buildSampleLabelData(catalog: FieldCatalogResponse): LabelData {
  const values: Record<string, string> = {};
  for (const field of catalog.fields) {
    const known = WELL_KNOWN_SAMPLES[field.fieldKey];
    const sample = known ?? SAMPLE_BY_VALUE_TYPE[field.valueType] ?? 'Sample';
    values[field.fieldKey] = sample.trim().length > 0 ? sample : 'Sample';
  }
  return {
    code: SAMPLE_BARCODE_CODE,
    name: WELL_KNOWN_SAMPLES.productName,
    companyName: WELL_KNOWN_SAMPLES.companyName,
    price: 120,
    productId: null,
    values,
  };
}

/**
 * Swaps `list[index]` with its neighbour in `dir`. Returns a same-content copy
 * when the move would leave the list bounds.
 */
export function moveField(list: string[], index: number, dir: 'up' | 'down'): string[] {
  const copy = [...list];
  const target = dir === 'up' ? index - 1 : index + 1;
  if (index < 0 || index >= copy.length || target < 0 || target >= copy.length) {
    return copy;
  }
  const tmp = copy[index];
  copy[index] = copy[target];
  copy[target] = tmp;
  return copy;
}

/** Groups catalog fields by `sourceGroup` in a fixed order, omitting empty groups. */
export function groupCatalogFields(catalog: FieldCatalogResponse): CatalogFieldGroup[] {
  const result: CatalogFieldGroup[] = [];
  for (const { group, title } of GROUP_ORDER) {
    const fields = catalog.fields.filter((f) => f.sourceGroup === group);
    if (fields.length > 0) result.push({ group, title, fields });
  }
  return result;
}

function catalogIndex(catalog: FieldCatalogResponse): Map<string, PrintableField> {
  const map = new Map<string, PrintableField>();
  for (const field of catalog.fields) {
    if (!map.has(field.fieldKey)) map.set(field.fieldKey, field);
  }
  return map;
}

/** Resolves the `StickerSizeSpec` for `size` from the catalog, falling back to `STICKER_SIZES`. */
export function stickerSizeSpecFor(
  size: StickerSize,
  catalog?: FieldCatalogResponse | null,
): StickerSizeSpec {
  const fromCatalog = catalog?.stickerSizes.find((s) => s.size === size);
  if (fromCatalog) return fromCatalog;
  return STICKER_SIZES.find((s) => s.size === size) ?? STICKER_SIZES[0];
}

/** Max printable lines for the draft's sticker size. */
export function maxLinesFor(
  stickerSize: StickerSize,
  catalog?: FieldCatalogResponse | null,
): number {
  return stickerSizeSpecFor(stickerSize, catalog).maxLines;
}

/**
 * Sheet presets from the catalog that can hold at least one sticker of `size`
 * (Req 10.10). A preset is compatible when the backend published a grid for the
 * size and that grid fits one or more stickers per sheet.
 */
export function compatibleSheetPresets(
  catalog: FieldCatalogResponse | null | undefined,
  stickerSize: StickerSize,
): SheetPreset[] {
  const presets = catalog?.sheetPresets ?? [];
  return presets.filter((preset) => {
    const grid = preset.perStickerSize?.[stickerSize];
    return grid != null && grid.perSheet >= 1;
  });
}

/**
 * Resolves the full `SheetSpec` for a chosen preset + sticker size from the
 * catalog, or `undefined` when the preset is unknown or cannot hold a sticker of
 * that size. Mirrors the backend `SheetLayoutCalculator.resolve` output.
 */
export function resolveSheetSpec(
  catalog: FieldCatalogResponse | null | undefined,
  presetId: string | null | undefined,
  stickerSize: StickerSize,
): SheetSpec | undefined {
  if (!presetId) return undefined;
  const preset = (catalog?.sheetPresets ?? []).find((p) => p.id === presetId);
  if (!preset) return undefined;
  const grid = preset.perStickerSize?.[stickerSize];
  if (!grid || grid.perSheet < 1) return undefined;
  return {
    presetId: preset.id,
    pageWidthMm: preset.pageWidthMm,
    pageHeightMm: preset.pageHeightMm,
    marginTopMm: preset.marginTopMm,
    marginLeftMm: preset.marginLeftMm,
    pitchXMm: grid.pitchXMm,
    pitchYMm: grid.pitchYMm,
    columns: grid.columns,
    rows: grid.rows,
    perSheet: grid.perSheet,
  };
}

/**
 * Converts a draft into what the renderer consumes. Enabled keys are enriched
 * with label/value type from the catalog; keys unknown to the catalog are dropped.
 */
export function toEffectiveLayout(
  draft: LabelLayoutDraft,
  catalog: FieldCatalogResponse,
): EffectiveLabelLayout {
  const index = catalogIndex(catalog);
  const compact = draft.template === 'COMPACT';
  const enabledFields: EnabledField[] = [];
  for (const key of draft.enabledFieldKeys) {
    const field = index.get(key);
    if (!field) continue;
    const zone = resolveFieldZone(draft, key);
    const showLabel = resolveFieldShowLabel(draft, field, zone, compact);
    enabledFields.push({
      fieldKey: field.fieldKey,
      label: field.label,
      valueType: field.valueType,
      zone,
      showLabel,
    });
  }
  const isSheet = draft.printMedia === 'SHEET';
  const sheetSpec = isSheet
    ? resolveSheetSpec(catalog, draft.sheetPreset, draft.stickerSize)
    : undefined;
  return {
    enabledFields,
    stickerSize: draft.stickerSize,
    stickerSizeSpec: stickerSizeSpecFor(draft.stickerSize, catalog),
    showBarcodeText: draft.showBarcodeText,
    showFieldLabels: draft.showFieldLabels,
    blankValueBehavior: draft.blankValueBehavior,
    printMedia: draft.printMedia,
    sheetPreset: isSheet ? draft.sheetPreset : null,
    sheetSpec: sheetSpec ?? null,
    template: draft.template,
    barcodePosition: draft.barcodePosition,
    currencyStyle: draft.currencyStyle,
    fieldZones: { ...draft.fieldZones },
    fieldLabelOverrides: { ...draft.fieldLabelOverrides },
  };
}

/** Resolved `COMPACT` zone for a field: `fieldZones[key]` or `LEFT` (Req 11.2). */
function resolveFieldZone(draft: LabelLayoutDraft, key: string): LabelZone {
  return draft.fieldZones[key] ?? 'LEFT';
}

/**
 * Resolved `showLabel` for a field, matching the renderer and the backend
 * `ZoneResolver` (Req 11.2): a per-field override wins; otherwise `STACKED` uses
 * `showFieldLabels` and `COMPACT` uses the per-zone default (HEADER off, LEFT on,
 * RIGHT on unless the value is a currency).
 */
function resolveFieldShowLabel(
  draft: LabelLayoutDraft,
  field: PrintableField,
  zone: LabelZone,
  compact: boolean,
): boolean {
  const override = draft.fieldLabelOverrides[field.fieldKey];
  if (override !== undefined) return override;
  if (!compact) return draft.showFieldLabels;
  if (zone === 'HEADER') return false;
  if (zone === 'RIGHT') return field.valueType !== 'currency';
  return true;
}

/**
 * Count of enabled fields assigned to each `COMPACT` zone (Req 11.10). Only keys
 * known to the catalog are counted, matching `toEffectiveLayout`; the zone follows
 * the same `fieldZones[key] ?? 'LEFT'` rule used for rendering.
 */
export function zoneCounts(
  draft: LabelLayoutDraft,
  catalog: FieldCatalogResponse,
): Record<LabelZone, number> {
  const index = catalogIndex(catalog);
  const counts: Record<LabelZone, number> = { HEADER: 0, LEFT: 0, RIGHT: 0 };
  for (const key of draft.enabledFieldKeys) {
    if (!index.has(key)) continue;
    counts[resolveFieldZone(draft, key)] += 1;
  }
  return counts;
}

/** Zones whose assigned count exceeds its cap (Req 11.4, 11.10), in HEADER/LEFT/RIGHT order. */
export function zoneOverflow(
  draft: LabelLayoutDraft,
  catalog: FieldCatalogResponse,
  caps: ZoneCaps,
): LabelZone[] {
  const counts = zoneCounts(draft, catalog);
  const over: LabelZone[] = [];
  if (counts.HEADER > caps.header) over.push('HEADER');
  if (counts.LEFT > caps.left) over.push('LEFT');
  if (counts.RIGHT > caps.right) over.push('RIGHT');
  return over;
}

/** Resolves the `COMPACT` zone caps for a draft's sticker size (spec override or `ZONE_CAPS`). */
export function zoneCapsFor(
  draft: LabelLayoutDraft,
  catalog?: FieldCatalogResponse | null,
): ZoneCaps {
  const spec = stickerSizeSpecFor(draft.stickerSize, catalog);
  return spec.zoneCaps ?? ZONE_CAPS[draft.stickerSize] ?? ZONE_CAPS['50x25'];
}

/** Save payload: enabled keys restricted to the catalog, order preserved. */
export function prepareSaveRequest(
  draft: LabelLayoutDraft,
  catalog: FieldCatalogResponse,
): SaveLabelLayoutRequest {
  const index = catalogIndex(catalog);
  const enabledFieldKeys = draft.enabledFieldKeys.filter((key) => index.has(key));
  const enabled = new Set(enabledFieldKeys);
  return {
    enabledFieldKeys,
    stickerSize: draft.stickerSize,
    showBarcodeText: draft.showBarcodeText,
    showFieldLabels: draft.showFieldLabels,
    blankValueBehavior: draft.blankValueBehavior,
    printMedia: draft.printMedia,
    sheetPreset: draft.printMedia === 'SHEET' ? draft.sheetPreset : null,
    template: draft.template,
    barcodePosition: draft.barcodePosition,
    currencyStyle: draft.currencyStyle,
    fieldZones: pickEnabled(draft.fieldZones, enabled),
    fieldLabelOverrides: pickEnabled(draft.fieldLabelOverrides, enabled),
  };
}

/** Copies only the map entries whose key is in `enabled` (Req 11.5: drop non-enabled keys). */
function pickEnabled<V>(map: Record<string, V>, enabled: Set<string>): Record<string, V> {
  const result: Record<string, V> = {};
  for (const [key, value] of Object.entries(map)) {
    if (enabled.has(key)) result[key] = value;
  }
  return result;
}

/**
 * Drops a field's `COMPACT` map entries (zone + label override) from a draft, used
 * when a field is toggled off (Req 11.5). Returns the same draft when nothing changes.
 */
export function dropFieldMaps(draft: LabelLayoutDraft, fieldKey: string): LabelLayoutDraft {
  const hasZone = fieldKey in draft.fieldZones;
  const hasOverride = fieldKey in draft.fieldLabelOverrides;
  if (!hasZone && !hasOverride) return draft;
  const fieldZones = { ...draft.fieldZones };
  const fieldLabelOverrides = { ...draft.fieldLabelOverrides };
  delete fieldZones[fieldKey];
  delete fieldLabelOverrides[fieldKey];
  return { ...draft, fieldZones, fieldLabelOverrides };
}

/** Enabled keys that the catalog no longer knows about (shown as "no longer available"). */
export function unavailableKeys(draft: LabelLayoutDraft, catalog: FieldCatalogResponse): string[] {
  const index = catalogIndex(catalog);
  return draft.enabledFieldKeys.filter((key) => !index.has(key));
}

/** Whether a catalog field may be printed by shops of `shopType`. */
export function fieldAvailableForShop(field: PrintableField, shopType: ShopType): boolean {
  return field.availableForShopTypes.includes(shopType);
}
