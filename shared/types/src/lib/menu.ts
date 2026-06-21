export type MenuSellMode = 'menu' | 'direct';

export interface MenuItem {
  id: string;
  name: string;
  sellingPrice: number;
  sellMode: MenuSellMode;
  inventoryId?: string | null;
  available?: boolean;
  cgst?: string | null;
  sgst?: string | null;
}

export interface MenuSection {
  id: string;
  title: string;
  sortOrder?: number;
  items: MenuItem[];
}

export interface ShopMenu {
  id?: string;
  shopId?: string;
  verticalId?: string;
  pluginVersion?: string;
  revision?: number;
  sections: MenuSection[];
  updatedAt?: string;
  updatedBy?: string;
}
