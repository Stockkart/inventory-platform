import type { ShopUiCapabilities } from '@inventory-platform/access';

/** Defaults to enabled when capabilities are absent (medical / legacy). */
export function isCustomerReturnEnabled(
  capabilities: ShopUiCapabilities | null | undefined
): boolean {
  return capabilities?.features?.customerReturn !== false;
}

/** Defaults to enabled when capabilities are absent (medical / legacy). */
export function isVendorReturnEnabled(
  capabilities: ShopUiCapabilities | null | undefined
): boolean {
  return capabilities?.features?.vendorReturn !== false;
}
