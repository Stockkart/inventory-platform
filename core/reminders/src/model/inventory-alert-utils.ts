import type { InventoryItem } from '@inventory-platform/product/types';
export type LowStockAlertRow = {
  id: string;
  product: string;
  current: number;
  threshold: number;
  status: 'critical' | 'warning';
  raw: InventoryItem;
};

export function mapLowStockItems(items: InventoryItem[]): LowStockAlertRow[] {
  return items.map((item) => {
    const current = item.currentCount ?? 0;
    const threshold = item.thresholdCount ?? 10;

    return {
      id: item.id,
      product: item.name ?? item.barcode ?? 'Unknown',
      current,
      threshold,
      status: current <= threshold / 2 ? 'critical' : 'warning',
      raw: item,
    };
  });
}
