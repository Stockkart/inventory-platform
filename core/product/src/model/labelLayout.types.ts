import type { ShopType } from '@inventory-platform/user/types';
import type { BarcodeLabelDto } from './types.js';

/**
 * Barcode label layout types. These mirror the backend DTOs in
 * `inventory-api` `core/product` (`LabelLayoutResponse`, `FieldCatalogResponse`,
 * `SaveLabelLayoutRequest`, `StickerSizeSpec`, ...).
 */

export type { ShopType };

export type StickerSize = '50x25' | '38x25' | '38x38' | '100x50';
export type BlankValueBehavior = 'HIDE_LINE' | 'PRINT_BLANK';
export type LabelSourceGroup = 'product' | 'lot' | 'pricing' | 'shop' | 'vertical';
export type LabelValueType = 'text' | 'number' | 'currency' | 'date' | 'percentage';

/**
 * Sticker template (Req 11). `STACKED` is the legacy single-column layout; `COMPACT`
 * splits the sticker into a header band plus left/right columns. Absent is treated as
 * `STACKED` by the renderer, so this stays optional while the configuration screen is
 * wired up; the backend always supplies it on responses.
 */
export type StickerTemplate = 'STACKED' | 'COMPACT';

/** Which band of a `COMPACT` sticker a field renders in (Req 11). */
export type LabelZone = 'HEADER' | 'LEFT' | 'RIGHT';

/** Where the barcode bars sit on a `COMPACT` sticker (Req 11). Absent is treated as `TOP`. */
export type BarcodePosition = 'TOP' | 'BOTTOM';

/** How currency values are prefixed (Req 11). */
export type CurrencyStyle = 'RUPEE_SYMBOL' | 'RS_PREFIX';

/** Maximum field lines each `COMPACT` zone may hold for a given Sticker_Size (Req 11). */
export interface ZoneCaps {
  header: number;
  left: number;
  right: number;
}

/** One sticker template entry returned in the Field_Catalog (Req 11). */
export interface TemplateInfo {
  id: StickerTemplate;
  label: string;
}

/** Physical print medium: a continuous label roll or a fixed label sheet (A4/Letter). */
export type PrintMedia = 'ROLL' | 'SHEET';

/** Resolved grid for one Sticker_Size on a Sheet_Preset (mirrors the backend `SheetGridDto`). */
export interface SheetGrid {
  columns: number;
  rows: number;
  perSheet: number;
  pitchXMm: number;
  pitchYMm: number;
}

/** A fixed label-sheet definition returned in the Field_Catalog (mirrors `SheetPresetDto`). */
export interface SheetPreset {
  id: string;
  label: string;
  pageWidthMm: number;
  pageHeightMm: number;
  marginTopMm: number;
  marginLeftMm: number;
  plain: boolean;
  compatibleStickerSizes: StickerSize[];
  /** Grid per compatible Sticker_Size; plain presets include every preset size. */
  perStickerSize: Record<StickerSize, SheetGrid>;
}

/**
 * The resolved roll geometry carried on the effective layout when `printMedia` is
 * `ROLL` and the shop saved how its roll is cut (mirrors the backend `RollSpec`).
 * One roll row prints per page: `pageWidthMm` spans every label and gap across
 * the web, `pageHeightMm` is one label. Absent/`null` means the legacy
 * single-column roll output where the printer driver decides the page.
 */
export interface RollSpec {
  labelsAcross: number;
  columnGapMm: number;
  pageWidthMm: number;
  pageHeightMm: number;
}

/** Fewest / most labels per roll row the backend accepts (`RollLayoutCalculator`). */
export const ROLL_LABELS_ACROSS_MIN = 1;
export const ROLL_LABELS_ACROSS_MAX = 4;
/** Widest roll column gap the backend accepts, in millimetres. */
export const ROLL_COLUMN_GAP_MAX_MM = 20;

/** The resolved sheet geometry carried on the effective layout when `printMedia` is `SHEET`. */
export interface SheetSpec {
  presetId: string;
  pageWidthMm: number;
  pageHeightMm: number;
  marginTopMm: number;
  marginLeftMm: number;
  pitchXMm: number;
  pitchYMm: number;
  columns: number;
  rows: number;
  perSheet: number;
}

/** One entry of the Field_Catalog returned by `GET /barcodes/label-layout/fields`. */
export interface PrintableField {
  fieldKey: string;
  label: string;
  sourceGroup: LabelSourceGroup;
  valueType: LabelValueType;
  availableForShopTypes: ShopType[];
  /** Vertical schema API key backing a `vertical.*` field; absent for static fields. */
  schemaApiKey?: string | null;
}

/** Physical sticker preset. `size` matches the backend `StickerSizeSpec.size`. */
export interface StickerSizeSpec {
  size: StickerSize;
  widthMm: number;
  heightMm: number;
  maxLines: number;
  /**
   * Per-zone line caps for the `COMPACT` template (Req 11). Optional so older
   * servers stay type-compatible; the renderer falls back to `ZONE_CAPS[size]`.
   */
  zoneCaps?: ZoneCaps;
}

export interface FieldCatalogResponse {
  fields: PrintableField[];
  stickerSizes: StickerSizeSpec[];
  shopType: ShopType;
  verticalSchemaLoaded: boolean;
  /**
   * Fixed list of label-sheet presets the shop may print on (Req 10.2).
   * Optional so older servers (and callers built before Requirement 10) stay
   * type-compatible; the backend always includes it.
   */
  sheetPresets?: SheetPreset[];
  /**
   * Sticker templates the shop may choose (Req 11). Optional so callers built
   * before Requirement 11 stay type-compatible; the backend always includes it.
   */
  templates?: TemplateInfo[];
}

export interface EnabledField {
  fieldKey: string;
  label: string;
  valueType: LabelValueType;
  /** Server-resolved `COMPACT` zone for this field (Req 11); falls back to `fieldZones`. */
  zone?: LabelZone;
  /** Server-resolved per-field label visibility for `COMPACT` (Req 11); falls back to `fieldLabelOverrides`. */
  showLabel?: boolean;
}

/** What the renderer consumes. */
export interface EffectiveLabelLayout {
  enabledFields: EnabledField[];
  stickerSize: StickerSize;
  /** Resolved spec for `stickerSize`; when omitted, look it up in `STICKER_SIZES`. */
  stickerSizeSpec?: StickerSizeSpec;
  showBarcodeText: boolean;
  showFieldLabels: boolean;
  blankValueBehavior: BlankValueBehavior;
  /**
   * Physical print medium (Req 10). Absent is treated as `ROLL` by the renderer,
   * so this stays optional while the configuration screen (task 15.5) is wired up;
   * the backend always supplies it on responses.
   */
  printMedia?: PrintMedia;
  /** Chosen Sheet_Preset id; present only when `printMedia` is `SHEET`. */
  sheetPreset?: string | null;
  /** Resolved sheet geometry; present only when `printMedia` is `SHEET`. */
  sheetSpec?: SheetSpec | null;
  /**
   * Resolved roll geometry; present only for `ROLL` layouts whose shop saved a
   * roll setup. Absent/`null` keeps the legacy single-column roll output.
   */
  rollSpec?: RollSpec | null;
  /**
   * Sticker template (Req 11). Absent is treated as `STACKED` by the renderer,
   * so this stays optional; the backend always supplies it on responses.
   */
  template?: StickerTemplate;
  /** Barcode band position for `COMPACT` (Req 11). Absent is treated as `TOP`. */
  barcodePosition?: BarcodePosition;
  /** Currency prefix style for formatted values (Req 11). */
  currencyStyle?: CurrencyStyle;
  /** Per-field `COMPACT` zone fallback used when an `EnabledField` omits `zone` (Req 11). */
  fieldZones?: Record<string, LabelZone>;
  /** Per-field label-visibility fallback used when an `EnabledField` omits `showLabel` (Req 11). */
  fieldLabelOverrides?: Record<string, boolean>;
}

export interface LabelLayoutResponse extends EffectiveLabelLayout {
  stickerSizeSpec: StickerSizeSpec;
  isDefault: boolean;
  updatedAt?: string | null;
  updatedByUserId?: string | null;
  shopType: ShopType;
}

export interface SaveLabelLayoutRequest {
  enabledFieldKeys: string[];
  stickerSize?: StickerSize;
  showBarcodeText?: boolean;
  showFieldLabels?: boolean;
  blankValueBehavior?: BlankValueBehavior;
  /** Defaults to `ROLL` on the backend when omitted (Req 10.5). */
  printMedia?: PrintMedia;
  /** Required when `printMedia` is `SHEET`; ignored for `ROLL` (Req 10.1). */
  sheetPreset?: string | null;
  /**
   * Labels side by side on the roll (1–4); only used for `ROLL`. Omitting both
   * roll fields keeps the legacy single-column roll output.
   */
  rollLabelsAcross?: number | null;
  /** Gap between neighbouring roll labels in millimetres (0–20); only used for `ROLL`. */
  rollColumnGapMm?: number | null;
  /** Defaults to `STACKED` on the backend when omitted (Req 11). */
  template?: StickerTemplate;
  /** Defaults to `TOP` on the backend when omitted (Req 11). */
  barcodePosition?: BarcodePosition;
  /** Currency prefix style (Req 11). */
  currencyStyle?: CurrencyStyle;
  /** Per-field `COMPACT` zone assignments (Req 11). */
  fieldZones?: Record<string, LabelZone>;
  /** Per-field label-visibility overrides for `COMPACT` (Req 11). */
  fieldLabelOverrides?: Record<string, boolean>;
}

/** A `BarcodeLabelDto` plus the resolved, server-formatted values for every enabled field. */
export interface LabelData extends BarcodeLabelDto {
  values?: Record<string, string> | null;
}

export interface BarcodeLabelsResponse {
  labels: LabelData[];
  /** `null` when an older server omits the layout; callers fall back to `DEFAULT_LAYOUT`. */
  layout: LabelLayoutResponse | null;
}

export const STICKER_SIZES: StickerSizeSpec[] = [
  { size: '50x25', widthMm: 50, heightMm: 25, maxLines: 3 },
  { size: '38x25', widthMm: 38, heightMm: 25, maxLines: 2 },
  { size: '38x38', widthMm: 38, heightMm: 38, maxLines: 4 },
  { size: '100x50', widthMm: 100, heightMm: 50, maxLines: 6 },
];

export const DEFAULT_STICKER_SIZE: StickerSize = '50x25';

/**
 * Per-Sticker_Size `COMPACT` zone caps (Req 11). Used by the renderer when a
 * `StickerSizeSpec` does not carry its own `zoneCaps`.
 */
export const ZONE_CAPS: Record<StickerSize, ZoneCaps> = {
  '50x25': { header: 1, left: 4, right: 2 },
  '38x25': { header: 1, left: 3, right: 1 },
  '38x38': { header: 1, left: 4, right: 2 },
  '100x50': { header: 1, left: 6, right: 3 },
};

/** Mirrors the backend `defaultLayout()`; used when no shop layout is available. */
export const DEFAULT_LAYOUT: EffectiveLabelLayout = {
  enabledFields: [
    { fieldKey: 'productName', label: 'Product name', valueType: 'text' },
    { fieldKey: 'companyName', label: 'Company', valueType: 'text' },
  ],
  stickerSize: DEFAULT_STICKER_SIZE,
  stickerSizeSpec: { size: '50x25', widthMm: 50, heightMm: 25, maxLines: 3 },
  showBarcodeText: true,
  showFieldLabels: false,
  blankValueBehavior: 'HIDE_LINE',
  printMedia: 'ROLL',
  template: 'STACKED',
};
