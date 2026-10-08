import { createQueryKeyFactory } from '@inventory-platform/query';
import type {
  AmendVendorPurchaseInvoicePayload,
  PurchaseTaxPreviewRequest,
} from '@inventory-platform/product/types';
import type { SearchRequest } from '../model/search.types';

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
  hsnGstRates: (hsn: string) => [...base.all, 'hsn-gst-rates', hsn] as const,
  invoiceAmendmentPreview: (id: string, payload: AmendVendorPurchaseInvoicePayload) =>
    [...base.all, 'invoice-amendment-preview', id, payload] as const,
  labelLayout: () => [...base.all, 'label-layout'] as const,
  labelFieldCatalog: () => [...base.all, 'label-field-catalog'] as const,
  labelLayoutPreview: (request: unknown) => [...base.all, 'label-layout-preview', request] as const,
  cardLayouts: () => [...base.all, 'card-layouts'] as const,
  cardFieldCatalog: () => [...base.all, 'card-field-catalog'] as const,
  searchFields: () => [...base.all, 'search-fields'] as const,
  searches: () => [...base.all, 'search'] as const,
  search: (request: SearchRequest | null) => [...base.all, 'search', request] as const,
  searchValues: (field: string, prefix: string) =>
    [...base.all, 'search-values', field, prefix] as const,
};

export const PRODUCT_MODULE_VERSION = '0.1.0';
