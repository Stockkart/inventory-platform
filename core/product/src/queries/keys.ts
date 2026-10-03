import { createQueryKeyFactory } from '@inventory-platform/query';
import type { PurchaseTaxPreviewRequest } from '@inventory-platform/product/types';

const base = createQueryKeyFactory('product');

export const productKeys = {
  ...base,
  inventoryList: (page: number, size: number) =>
    [...base.all, 'inventory-list', page, size] as const,
  inventoryDetail: (id: string) => [...base.all, 'inventory', id] as const,
  pricingDetail: (pricingId: string) => [...base.all, 'pricing', pricingId] as const,
  estimateDetail: (purchaseId: string) => [...base.all, 'estimate', purchaseId] as const,
  stockEntryEstimateDetail: (id: string) => [...base.all, 'stock-entry-estimate', id] as const,
  purchaseTaxPreview: (request: PurchaseTaxPreviewRequest) =>
    [...base.all, 'purchase-tax-preview', request] as const,
  vendorPurchaseInvoices: () => [...base.all, 'vendor-purchase-invoices'] as const,
};

export const PRODUCT_MODULE_VERSION = '0.1.0';
