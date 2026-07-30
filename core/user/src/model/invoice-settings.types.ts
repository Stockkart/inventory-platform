/** Sale invoice template / field-visibility settings for a shop. */
export type InvoicePrinterType = 'NORMAL' | 'DOT_MATRIX' | 'THERMAL_3INCH';

export type InvoiceBillingModePreview = 'REGULAR' | 'BASIC';

export interface InvoiceFieldVisibility {
  showSellerDetails: boolean;
  showBuyerDetails: boolean;
  showPaymentMethod: boolean;
  showTaxDetails: boolean;
  showAmountInWords: boolean;
  showAmountSaved: boolean;
  showAdditionalDiscount: boolean;
  showHsn: boolean;
  showMfg: boolean;
  showExpiry: boolean;
  showBatch: boolean;
  showMrp: boolean;
  showScheme: boolean;
  showLineDiscount: boolean;
  showSignatures: boolean;
}

export interface InvoiceSettingsResponse {
  shopId: string;
  defaultPrinterType: InvoicePrinterType;
  footerNote: string;
  regularFields: InvoiceFieldVisibility;
  basicFields: InvoiceFieldVisibility;
}

export interface UpdateInvoiceSettingsDto {
  defaultPrinterType?: InvoicePrinterType;
  footerNote?: string;
  regularFields?: InvoiceFieldVisibility;
  basicFields?: InvoiceFieldVisibility;
}

export interface PreviewInvoiceSettingsDto extends UpdateInvoiceSettingsDto {
  previewBillingMode?: InvoiceBillingModePreview;
  previewPrinterType?: InvoicePrinterType;
}

export const INVOICE_FIELD_TOGGLES: Array<{
  key: keyof InvoiceFieldVisibility;
  label: string;
  group: 'parties' | 'money' | 'columns' | 'footer';
}> = [
  { key: 'showSellerDetails', label: 'Seller details', group: 'parties' },
  { key: 'showBuyerDetails', label: 'Buyer details', group: 'parties' },
  { key: 'showPaymentMethod', label: 'Payment method', group: 'parties' },
  { key: 'showTaxDetails', label: 'Tax details', group: 'money' },
  { key: 'showAmountInWords', label: 'Amount in words', group: 'money' },
  { key: 'showAmountSaved', label: 'Amount saved', group: 'money' },
  { key: 'showAdditionalDiscount', label: 'Additional discount', group: 'money' },
  { key: 'showHsn', label: 'HSN', group: 'columns' },
  { key: 'showMfg', label: 'MFG / MKT', group: 'columns' },
  { key: 'showExpiry', label: 'Expiry', group: 'columns' },
  { key: 'showBatch', label: 'Batch', group: 'columns' },
  { key: 'showMrp', label: 'MRP', group: 'columns' },
  { key: 'showScheme', label: 'Scheme', group: 'columns' },
  { key: 'showLineDiscount', label: 'Line discount', group: 'columns' },
  { key: 'showSignatures', label: 'Signatures', group: 'footer' },
];
