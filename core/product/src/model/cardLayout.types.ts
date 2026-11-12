import type { LabelSourceGroup, LabelValueType } from './labelLayout.types';

/**
 * Product card layout types. These mirror the backend DTOs in `inventory-api`
 * `core/product` (`SurfaceLayoutResponse`, `CardLayoutsResponse`,
 * `CardFieldCatalogResponse`, `SaveCardLayoutRequest`) and the `pluginengine.cards`
 * model records.
 *
 * Two shapes matter:
 * - `CardLayoutSpec` is what the shop edits and saves: only field keys plus presentation.
 * - `ResolvedCardLayout` is what the server returns and the renderer consumes: the spec
 *   applied against the Field_Catalog, with every field enriched by label, value type,
 *   item path and sensitivity so a card can be drawn from an `InventoryItem` alone.
 */

export type CardVariant = 'REGULAR' | 'BASIC';
export type CardEmphasis = 'NORMAL' | 'STRONG' | 'MUTED';
export type CardBlankValueBehavior = 'HIDE_LINE' | 'SHOW_DASH';
export type FieldSensitivity = 'PUBLIC' | 'SHOP_INTERNAL';

// ---- spec (what we save) --------------------------------------------------------------

export interface CardFieldSpec {
  fieldKey: string;
  showLabel: boolean;
  labelOverride: string | null;
  emphasis: CardEmphasis;
}

export interface CardRowSpec {
  fields: CardFieldSpec[];
}

export interface CardSectionSpec {
  id: string;
  title: string | null;
  dividerAbove: boolean;
  rows: CardRowSpec[];
}

export interface CardOptions {
  blankValueBehavior: CardBlankValueBehavior;
  showAttributeChips: boolean;
  showDescription: boolean;
}

export interface CardLayoutSpec {
  sections: CardSectionSpec[];
  options: CardOptions;
}

// ---- resolved (what we render) ---------------------------------------------------------

export interface ResolvedCardField {
  fieldKey: string;
  /** The label to print: the override when set, else the catalog label. */
  label: string;
  showLabel: boolean;
  emphasis: CardEmphasis;
  valueType: LabelValueType;
  sourceGroup: LabelSourceGroup;
  /** Dot path into `InventoryItem` the value is read from when no resolver overrides it. */
  itemPath: string;
  schemaApiKey: string | null;
  sensitivity: FieldSensitivity;
}

export interface ResolvedCardRow {
  fields: ResolvedCardField[];
}

export interface ResolvedCardSection {
  id: string;
  title: string | null;
  dividerAbove: boolean;
  rows: ResolvedCardRow[];
}

export interface ResolvedCardLayout {
  sections: ResolvedCardSection[];
  options: CardOptions;
}

// ---- API ---------------------------------------------------------------------------------

export interface SurfaceLayoutResponse {
  surfaceId: string;
  label: string;
  billingModeAware: boolean;
  isDefault: boolean;
  updatedAt: string | null;
  updatedByUserId: string | null;
  variants: Partial<Record<CardVariant, ResolvedCardLayout>>;
}

export interface CardLayoutsResponse {
  surfaces: SurfaceLayoutResponse[];
}

export interface CardCatalogField {
  fieldKey: string;
  label: string;
  sourceGroup: LabelSourceGroup;
  valueType: LabelValueType;
  itemPath: string;
  schemaApiKey: string | null;
  sensitivity: FieldSensitivity;
}

export interface CardSurfaceInfo {
  surfaceId: string;
  label: string;
  billingModeAware: boolean;
  excludedFieldKeys: string[];
}

export interface CardLayoutLimits {
  maxSections: number;
  maxRowsPerSection: number;
  maxFieldsPerRow: number;
  maxFieldsTotal: number;
  maxTextLength: number;
}

export interface CardFieldCatalogResponse {
  fields: CardCatalogField[];
  surfaces: CardSurfaceInfo[];
  limits: CardLayoutLimits;
  verticalSchemaLoaded: boolean;
}

export interface SaveCardLayoutRequest {
  variants: Partial<Record<CardVariant, CardLayoutSpec>>;
}

// ---- constants --------------------------------------------------------------------------

/**
 * Surface ids the frontend knows how to render. The backend owns the list of surfaces a shop
 * can configure; these constants only let pages ask for a layout by name.
 */
export const CARD_SURFACE_IDS = {
  productSearch: 'product-search',
  scanSell: 'scan-sell',
  cafeIngredientSearch: 'cafe-ingredient-search',
} as const;

export type CardSurfaceId = (typeof CARD_SURFACE_IDS)[keyof typeof CARD_SURFACE_IDS];

export const DEFAULT_CARD_OPTIONS: CardOptions = {
  blankValueBehavior: 'HIDE_LINE',
  showAttributeChips: true,
  showDescription: true,
};
