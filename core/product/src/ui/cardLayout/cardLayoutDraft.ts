import type { InventoryItem } from '../../model/types';
import type { LabelSourceGroup } from '../../model/labelLayout.types';
import {
  DEFAULT_CARD_OPTIONS,
  type CardCatalogField,
  type CardEmphasis,
  type CardFieldCatalogResponse,
  type CardFieldSpec,
  type CardLayoutLimits,
  type CardLayoutSpec,
  type CardOptions,
  type CardSectionSpec,
  type CardSurfaceInfo,
  type CardVariant,
  type ResolvedCardLayout,
  type SaveCardLayoutRequest,
  type SurfaceLayoutResponse,
} from '../../model/cardLayout.types';

/**
 * Pure helpers behind the "Product cards" settings tab (configurable-product-card Req 9.4–9.7).
 *
 * The editor keeps one `CardLayoutSpec` draft per surface and variant; every edit is a function
 * here that returns a new spec and never violates the caps the backend enforces, so Save can only
 * be rejected for reasons the UI could not know (a concurrent catalog change). Property 11 pins
 * these invariants.
 */

export type DraftMap = Record<string, Partial<Record<CardVariant, CardLayoutSpec>>>;

export interface CatalogFieldGroup {
  group: LabelSourceGroup;
  title: string;
  fields: CardCatalogField[];
}

const GROUP_TITLES: Record<LabelSourceGroup, string> = {
  product: 'Product',
  pricing: 'Pricing',
  lot: 'Stock & lot',
  vertical: 'Vertical fields',
  shop: 'Shop',
};

const GROUP_ORDER: LabelSourceGroup[] = ['product', 'pricing', 'lot', 'vertical', 'shop'];

export const DEFAULT_LIMITS: CardLayoutLimits = {
  maxSections: 6,
  maxRowsPerSection: 8,
  maxFieldsPerRow: 3,
  maxFieldsTotal: 20,
  maxTextLength: 40,
};

// ---- resolved ↔ spec ---------------------------------------------------------------------------

/** Strips catalog enrichment from a resolved layout, keeping only what is saved. */
export function specFromResolved(layout: ResolvedCardLayout, catalog?: CardFieldCatalogResponse): CardLayoutSpec {
  const labels = new Map(catalog?.fields.map((f) => [f.fieldKey, f.label]) ?? []);
  return {
    sections: layout.sections.map((s) => ({
      id: s.id,
      title: s.title,
      dividerAbove: s.dividerAbove,
      rows: s.rows.map((r) => ({
        fields: r.fields.map((f) => ({
          fieldKey: f.fieldKey,
          showLabel: f.showLabel,
          // A resolved label equal to the catalog label was not an override.
          labelOverride: labels.has(f.fieldKey) && labels.get(f.fieldKey) === f.label ? null : f.label,
          emphasis: f.emphasis,
        })),
      })),
    })),
    options: { ...layout.options },
  };
}

/** One draft entry per variant the surface carries. */
export function draftFromResponse(
  surface: SurfaceLayoutResponse,
  catalog?: CardFieldCatalogResponse,
): Partial<Record<CardVariant, CardLayoutSpec>> {
  const out: Partial<Record<CardVariant, CardLayoutSpec>> = {};
  (Object.keys(surface.variants) as CardVariant[]).forEach((v) => {
    const layout = surface.variants[v];
    if (layout) out[v] = specFromResolved(layout, catalog);
  });
  return out;
}

export function draftsFromResponses(
  surfaces: SurfaceLayoutResponse[],
  catalog?: CardFieldCatalogResponse,
): DraftMap {
  const out: DraftMap = {};
  surfaces.forEach((s) => {
    out[s.surfaceId] = draftFromResponse(s, catalog);
  });
  return out;
}

/** What the server validates and persists for one surface. */
export function prepareSaveRequest(variants: Partial<Record<CardVariant, CardLayoutSpec>>): SaveCardLayoutRequest {
  return { variants };
}

/**
 * Re-applies the server's resolution locally so the preview never waits on a round trip. Must
 * agree with `CardLayoutResolver` on the backend: unknown / excluded keys dropped, empty rows and
 * sections dropped, labels resolved.
 */
export function resolveDraftLocally(
  spec: CardLayoutSpec,
  catalog: CardFieldCatalogResponse,
  surface: CardSurfaceInfo | undefined,
): ResolvedCardLayout {
  const byKey = new Map(catalog.fields.map((f) => [f.fieldKey, f]));
  const excluded = new Set(surface?.excludedFieldKeys ?? []);
  const sections = spec.sections
    .map((s) => ({
      id: s.id,
      title: s.title,
      dividerAbove: s.dividerAbove,
      rows: s.rows
        .map((r) => ({
          fields: r.fields.flatMap((f) => {
            const cf = byKey.get(f.fieldKey);
            if (!cf || excluded.has(f.fieldKey)) return [];
            return [
              {
                fieldKey: f.fieldKey,
                label: f.labelOverride?.trim() ? f.labelOverride.trim() : cf.label,
                showLabel: f.showLabel,
                emphasis: f.emphasis,
                valueType: cf.valueType,
                sourceGroup: cf.sourceGroup,
                itemPath: cf.itemPath,
                schemaApiKey: cf.schemaApiKey,
                sensitivity: cf.sensitivity,
              },
            ];
          }),
        }))
        .filter((r) => r.fields.length > 0),
    }))
    .filter((s) => s.rows.length > 0);
  return { sections, options: spec.options };
}

// ---- equality --------------------------------------------------------------------------------

export function specsEqual(a: CardLayoutSpec | undefined, b: CardLayoutSpec | undefined): boolean {
  return JSON.stringify(normalise(a)) === JSON.stringify(normalise(b));
}

export function variantsEqual(
  a: Partial<Record<CardVariant, CardLayoutSpec>> | undefined,
  b: Partial<Record<CardVariant, CardLayoutSpec>> | undefined,
): boolean {
  return specsEqual(a?.REGULAR, b?.REGULAR) && specsEqual(a?.BASIC, b?.BASIC);
}

export function draftMapsEqual(a: DraftMap, b: DraftMap): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) if (!variantsEqual(a[k], b[k])) return false;
  return true;
}

function normalise(spec: CardLayoutSpec | undefined) {
  if (!spec) return null;
  return {
    sections: spec.sections.map((s) => ({
      id: s.id,
      title: s.title?.trim() || null,
      dividerAbove: s.dividerAbove,
      rows: s.rows.map((r) => ({
        fields: r.fields.map((f) => ({
          fieldKey: f.fieldKey,
          showLabel: f.showLabel,
          labelOverride: f.labelOverride?.trim() || null,
          emphasis: f.emphasis,
        })),
      })),
    })),
    options: spec.options,
  };
}

// ---- catalog helpers -------------------------------------------------------------------------

export function groupCatalogFields(catalog: CardFieldCatalogResponse): CatalogFieldGroup[] {
  return GROUP_ORDER.map((group) => ({
    group,
    title: GROUP_TITLES[group],
    fields: catalog.fields.filter((f) => f.sourceGroup === group),
  })).filter((g) => g.fields.length > 0);
}

export function enabledKeys(spec: CardLayoutSpec): string[] {
  return spec.sections.flatMap((s) => s.rows.flatMap((r) => r.fields.map((f) => f.fieldKey)));
}

export function countFields(spec: CardLayoutSpec): number {
  return enabledKeys(spec).length;
}

// ---- edits -----------------------------------------------------------------------------------

export const EMPTY_SPEC: CardLayoutSpec = { sections: [], options: DEFAULT_CARD_OPTIONS };

export function newSectionId(spec: CardLayoutSpec): string {
  const used = new Set(spec.sections.map((s) => s.id));
  let n = spec.sections.length + 1;
  while (used.has(`section-${n}`)) n++;
  return `section-${n}`;
}

/**
 * Turns a field on (appended as a new row to `targetSectionId`, or a new section when none exists)
 * or off (removed wherever it sits; emptied rows and sections are dropped). Respects the caps: when
 * turning on would exceed a cap the spec is returned unchanged.
 */
export function toggleField(
  spec: CardLayoutSpec,
  fieldKey: string,
  on: boolean,
  targetSectionId: string | null,
  limits: CardLayoutLimits = DEFAULT_LIMITS,
): CardLayoutSpec {
  if (!on) return removeField(spec, fieldKey);
  if (enabledKeys(spec).includes(fieldKey)) return spec;
  if (countFields(spec) >= limits.maxFieldsTotal) return spec;

  const field: CardFieldSpec = { fieldKey, showLabel: true, labelOverride: null, emphasis: 'NORMAL' };
  let sections = spec.sections;
  let target = sections.find((s) => s.id === targetSectionId) ?? sections[sections.length - 1];
  if (!target) {
    if (sections.length >= limits.maxSections) return spec;
    target = { id: newSectionId(spec), title: null, dividerAbove: false, rows: [] };
    sections = [...sections, target];
  }
  if (target.rows.length >= limits.maxRowsPerSection) {
    // Try the next section with room; else a new section; else give up.
    const roomy = sections.find((s) => s.rows.length < limits.maxRowsPerSection);
    if (roomy) {
      target = roomy;
    } else if (sections.length < limits.maxSections) {
      target = { id: newSectionId({ ...spec, sections }), title: null, dividerAbove: false, rows: [] };
      sections = [...sections, target];
    } else {
      return spec;
    }
  }
  const targetId = target.id;
  return {
    ...spec,
    sections: sections.map((s) => (s.id === targetId ? { ...s, rows: [...s.rows, { fields: [field] }] } : s)),
  };
}

export function removeField(spec: CardLayoutSpec, fieldKey: string): CardLayoutSpec {
  return prune({
    ...spec,
    sections: spec.sections.map((s) => ({
      ...s,
      rows: s.rows.map((r) => ({ fields: r.fields.filter((f) => f.fieldKey !== fieldKey) })),
    })),
  });
}

/** Drops empty rows and empty sections. */
export function prune(spec: CardLayoutSpec): CardLayoutSpec {
  return {
    ...spec,
    sections: spec.sections
      .map((s) => ({ ...s, rows: s.rows.filter((r) => r.fields.length > 0) }))
      .filter((s) => s.rows.length > 0),
  };
}

export function updateField(
  spec: CardLayoutSpec,
  fieldKey: string,
  patch: Partial<Pick<CardFieldSpec, 'showLabel' | 'labelOverride' | 'emphasis'>>,
  limits: CardLayoutLimits = DEFAULT_LIMITS,
): CardLayoutSpec {
  const safe = { ...patch };
  if (safe.labelOverride != null && safe.labelOverride.length > limits.maxTextLength) {
    safe.labelOverride = safe.labelOverride.slice(0, limits.maxTextLength);
  }
  return {
    ...spec,
    sections: spec.sections.map((s) => ({
      ...s,
      rows: s.rows.map((r) => ({
        fields: r.fields.map((f) => (f.fieldKey === fieldKey ? { ...f, ...safe } : f)),
      })),
    })),
  };
}

export function updateSection(
  spec: CardLayoutSpec,
  sectionId: string,
  patch: Partial<Pick<CardSectionSpec, 'title' | 'dividerAbove'>>,
  limits: CardLayoutLimits = DEFAULT_LIMITS,
): CardLayoutSpec {
  const safe = { ...patch };
  if (safe.title != null && safe.title.length > limits.maxTextLength) {
    safe.title = safe.title.slice(0, limits.maxTextLength);
  }
  return { ...spec, sections: spec.sections.map((s) => (s.id === sectionId ? { ...s, ...safe } : s)) };
}

export function addSection(spec: CardLayoutSpec, limits: CardLayoutLimits = DEFAULT_LIMITS): CardLayoutSpec {
  if (spec.sections.length >= limits.maxSections) return spec;
  // An empty section is allowed in the draft so the user can target it; pruned on save if still empty.
  return { ...spec, sections: [...spec.sections, { id: newSectionId(spec), title: null, dividerAbove: false, rows: [] }] };
}

export function removeSection(spec: CardLayoutSpec, sectionId: string): CardLayoutSpec {
  return { ...spec, sections: spec.sections.filter((s) => s.id !== sectionId) };
}

export function moveSection(spec: CardLayoutSpec, index: number, dir: 'up' | 'down'): CardLayoutSpec {
  const sections = moveItem(spec.sections, index, dir);
  return sections === spec.sections ? spec : { ...spec, sections };
}

export function moveRow(spec: CardLayoutSpec, sectionId: string, index: number, dir: 'up' | 'down'): CardLayoutSpec {
  return mapSection(spec, sectionId, (s) => {
    const rows = moveItem(s.rows, index, dir);
    return rows === s.rows ? s : { ...s, rows };
  });
}

/** Merges row `index` into row `index - 1` when the combined width fits the per-row cap. */
export function joinRowWithPrevious(
  spec: CardLayoutSpec,
  sectionId: string,
  index: number,
  limits: CardLayoutLimits = DEFAULT_LIMITS,
): CardLayoutSpec {
  if (index <= 0) return spec;
  return mapSection(spec, sectionId, (s) => {
    if (index >= s.rows.length) return s;
    const prev = s.rows[index - 1];
    const cur = s.rows[index];
    if (prev.fields.length + cur.fields.length > limits.maxFieldsPerRow) return s;
    const rows = s.rows.slice();
    rows.splice(index - 1, 2, { fields: [...prev.fields, ...cur.fields] });
    return { ...s, rows };
  });
}

/** Splits every field of row `index` onto its own row (no-op for a single-field row). */
export function splitRow(
  spec: CardLayoutSpec,
  sectionId: string,
  index: number,
  limits: CardLayoutLimits = DEFAULT_LIMITS,
): CardLayoutSpec {
  return mapSection(spec, sectionId, (s) => {
    if (index >= s.rows.length) return s;
    const row = s.rows[index];
    if (row.fields.length <= 1) return s;
    if (s.rows.length - 1 + row.fields.length > limits.maxRowsPerSection) return s;
    const rows = s.rows.slice();
    rows.splice(index, 1, ...row.fields.map((f) => ({ fields: [f] })));
    return { ...s, rows };
  });
}

/** Applies `fn` to one section; returns the same spec reference when nothing changed. */
function mapSection(
  spec: CardLayoutSpec,
  sectionId: string,
  fn: (section: CardSectionSpec) => CardSectionSpec,
): CardLayoutSpec {
  const idx = spec.sections.findIndex((s) => s.id === sectionId);
  if (idx < 0) return spec;
  const next = fn(spec.sections[idx]);
  if (next === spec.sections[idx]) return spec;
  const sections = spec.sections.slice();
  sections[idx] = next;
  return { ...spec, sections };
}

export function moveRowToSection(
  spec: CardLayoutSpec,
  fromSectionId: string,
  index: number,
  toSectionId: string,
  limits: CardLayoutLimits = DEFAULT_LIMITS,
): CardLayoutSpec {
  if (fromSectionId === toSectionId) return spec;
  const from = spec.sections.find((s) => s.id === fromSectionId);
  const to = spec.sections.find((s) => s.id === toSectionId);
  if (!from || !to || index >= from.rows.length) return spec;
  if (to.rows.length >= limits.maxRowsPerSection) return spec;
  const row = from.rows[index];
  return prune({
    ...spec,
    sections: spec.sections.map((s) => {
      if (s.id === fromSectionId) return { ...s, rows: s.rows.filter((_, i) => i !== index) };
      if (s.id === toSectionId) return { ...s, rows: [...s.rows, row] };
      return s;
    }),
  });
}

export function updateOptions(spec: CardLayoutSpec, patch: Partial<CardOptions>): CardLayoutSpec {
  return { ...spec, options: { ...spec.options, ...patch } };
}

/**
 * Moves one field to the end of another section as its own line. The field leaves its current
 * line (which is dropped if emptied). No-op when the target is full or unknown.
 */
export function moveFieldToSection(
  spec: CardLayoutSpec,
  fieldKey: string,
  toSectionId: string,
  limits: CardLayoutLimits = DEFAULT_LIMITS,
): CardLayoutSpec {
  const to = spec.sections.find((s) => s.id === toSectionId);
  if (!to) return spec;
  const field = spec.sections.flatMap((s) => s.rows.flatMap((r) => r.fields)).find((f) => f.fieldKey === fieldKey);
  if (!field) return spec;
  const alreadyThere = to.rows.some((r) => r.fields.some((f) => f.fieldKey === fieldKey));
  if (alreadyThere) return spec;
  if (to.rows.length >= limits.maxRowsPerSection) return spec;
  const without = removeField(spec, fieldKey);
  // removeField may have pruned `to` if it only held this field — it cannot, since the field was elsewhere.
  return {
    ...without,
    sections: without.sections.map((s) => (s.id === toSectionId ? { ...s, rows: [...s.rows, { fields: [field] }] } : s)),
  };
}

function moveItem<T>(list: T[], index: number, dir: 'up' | 'down'): T[] {
  const target = dir === 'up' ? index - 1 : index + 1;
  if (index < 0 || index >= list.length || target < 0 || target >= list.length) return list;
  const out = list.slice();
  [out[index], out[target]] = [out[target], out[index]];
  return out;
}

// ---- preview sample --------------------------------------------------------------------------

/**
 * An `InventoryItem` with a non-blank value for every card field in the catalog, so the preview
 * shows every enabled line (Req 9.7). Vertical fields get a readable placeholder.
 */
export function buildSampleItem(catalog: CardFieldCatalogResponse): InventoryItem {
  const sample: Record<string, unknown> = {
    id: 'sample',
    lotId: 'sample-lot',
    name: 'Sample product',
    companyName: 'Sample Pharma',
    barcode: 'SKA79BMEZWB04Y',
    description: 'Short product description',
    hsn: '3004',
    baseUnit: 'strip',
    unitsPerPack: 10,
    unitConversions: { unit: 'strip', factor: 10 },
    location: 'J2',
    batchNo: 'TMT0151',
    expiryDate: '2028-01-08T00:00:00Z',
    purchaseDate: '2026-09-29T00:00:00Z',
    createdAt: '2026-09-29T00:00:00Z',
    receivedCount: 10,
    soldCount: 2,
    currentCount: 8,
    availableCount: 7,
    thresholdCount: 3,
    maximumRetailPrice: 200,
    sellingPrice: 120,
    priceToRetail: 110,
    costPrice: 95,
    effectiveCostPrice: 92.5,
    saleAdditionalDiscount: 5,
    purchaseAdditionalDiscount: 3,
    purchaseSchemeType: 'FIXED_UNITS',
    purchaseSchemePayFor: 10,
    purchaseSchemeFree: 1,
    schemeType: 'FIXED_UNITS',
    scheme: 1,
    schemePayFor: 10,
    schemeFree: 1,
    sgst: '6',
    cgst: '6',
    itemType: 'COSTLY',
    discountApplicable: 'DISCOUNT_AND_SCHEME',
    billingMode: 'REGULAR',
    shopId: 'sample-shop',
    rates: [],
    verticalFields: {} as Record<string, unknown>,
  };
  const vertical = sample.verticalFields as Record<string, unknown>;
  for (const f of catalog.fields) {
    if (f.itemPath.startsWith('verticalFields.')) {
      const key = f.itemPath.slice('verticalFields.'.length);
      vertical[key] = sampleFor(f.valueType, f.label);
    } else if (f.fieldKey.startsWith('pricing.rate.')) {
      (sample.rates as { name: string; price: number }[]).push({
        name: f.fieldKey.slice('pricing.rate.'.length),
        price: 115,
      });
    }
  }
  return sample as unknown as InventoryItem;
}

function sampleFor(valueType: CardCatalogField['valueType'], label: string): unknown {
  switch (valueType) {
    case 'currency':
      return 99;
    case 'number':
      return 12;
    case 'percentage':
      return 7.5;
    case 'date':
      return '2027-06-15T00:00:00Z';
    default:
      return `Sample ${label.toLowerCase()}`;
  }
}

export const EMPHASIS_OPTIONS: ReadonlyArray<{ value: CardEmphasis; label: string }> = [
  { value: 'NORMAL', label: 'Normal' },
  { value: 'STRONG', label: 'Bold' },
  { value: 'MUTED', label: 'Muted' },
];
