/**
 * Cafe Sell uses the same ScanSellPage as medical/SKU sell.
 * When shop verticalId is `cafe`, ScanSellPage renders the menu catalog,
 * direct-stock picker, and quotation stack (same layout as Sell Estimate).
 */
export { ScanSellPage as MenuSellPage } from '@inventory-platform/product';

export function meta() {
  return [
    { title: 'Sell - StockKart' },
    { name: 'description', content: 'Sell menu items and direct stock' },
  ];
}
