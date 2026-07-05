export type SellSurface = 'SKU_SCAN' | 'MENU_LIST';

export interface NavItemDef {
  id: string;
  label: string;
  path: string;
}

export interface FeatureFlags {
  menuAdmin?: boolean;
  tokenOnReceipt?: boolean;
  manualStock?: boolean;
  customerReturn?: boolean;
  vendorReturn?: boolean;
  /** Ingredient registration: cost + optional sell price only (no PTR/MRP/rates). */
  simplePricing?: boolean;
}

export interface PurchaseSearchConfig {
  fields: string[];
}

export interface ShopUiCapabilities {
  sellSurface: SellSurface;
  navigation: NavItemDef[];
  features: FeatureFlags;
  purchaseSearch: PurchaseSearchConfig;
}
