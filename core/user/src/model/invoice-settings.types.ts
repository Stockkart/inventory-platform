/** Sale invoice template / field-visibility settings for a shop. */
export type InvoicePrinterType = 'NORMAL' | 'DOT_MATRIX' | 'THERMAL_3INCH';

export type InvoiceBillingModePreview = 'REGULAR' | 'BASIC';

export type InvoicePartyParent = 'showSellerDetails' | 'showBuyerDetails';

export type InvoiceShopValueKey =
  | 'name'
  | 'address'
  | 'tagline'
  | 'phone'
  | 'email'
  | 'gstin'
  | 'pan'
  | 'dlNo'
  | 'fssai';

export interface InvoiceFieldVisibility {
  showSellerDetails: boolean;
  showShopName: boolean;
  showShopAddress: boolean;
  showShopTagline: boolean;
  showShopPhone: boolean;
  showShopEmail: boolean;
  showShopGstin: boolean;
  showShopPan: boolean;
  showShopDlNo: boolean;
  showShopFssai: boolean;
  showBuyerDetails: boolean;
  showCustomerName: boolean;
  showCustomerAddress: boolean;
  showCustomerPhone: boolean;
  showCustomerEmail: boolean;
  showCustomerGstin: boolean;
  showCustomerPan: boolean;
  showCustomerDlNo: boolean;
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
  parent?: InvoicePartyParent;
  shopValueKey?: InvoiceShopValueKey;
}> = [
  { key: 'showSellerDetails', label: 'Seller details', group: 'parties' },
  {
    key: 'showShopName',
    label: 'Name',
    group: 'parties',
    parent: 'showSellerDetails',
    shopValueKey: 'name',
  },
  {
    key: 'showShopAddress',
    label: 'Address',
    group: 'parties',
    parent: 'showSellerDetails',
    shopValueKey: 'address',
  },
  {
    key: 'showShopTagline',
    label: 'Tagline',
    group: 'parties',
    parent: 'showSellerDetails',
    shopValueKey: 'tagline',
  },
  {
    key: 'showShopPhone',
    label: 'Phone',
    group: 'parties',
    parent: 'showSellerDetails',
    shopValueKey: 'phone',
  },
  {
    key: 'showShopEmail',
    label: 'Email',
    group: 'parties',
    parent: 'showSellerDetails',
    shopValueKey: 'email',
  },
  {
    key: 'showShopGstin',
    label: 'GSTIN',
    group: 'parties',
    parent: 'showSellerDetails',
    shopValueKey: 'gstin',
  },
  {
    key: 'showShopPan',
    label: 'PAN',
    group: 'parties',
    parent: 'showSellerDetails',
    shopValueKey: 'pan',
  },
  {
    key: 'showShopDlNo',
    label: 'D.L. No.',
    group: 'parties',
    parent: 'showSellerDetails',
    shopValueKey: 'dlNo',
  },
  {
    key: 'showShopFssai',
    label: 'FSSAI',
    group: 'parties',
    parent: 'showSellerDetails',
    shopValueKey: 'fssai',
  },
  { key: 'showBuyerDetails', label: 'Buyer details', group: 'parties' },
  { key: 'showCustomerName', label: 'Name', group: 'parties', parent: 'showBuyerDetails' },
  { key: 'showCustomerAddress', label: 'Address', group: 'parties', parent: 'showBuyerDetails' },
  { key: 'showCustomerPhone', label: 'Phone', group: 'parties', parent: 'showBuyerDetails' },
  { key: 'showCustomerEmail', label: 'Email', group: 'parties', parent: 'showBuyerDetails' },
  { key: 'showCustomerGstin', label: 'GSTIN', group: 'parties', parent: 'showBuyerDetails' },
  { key: 'showCustomerPan', label: 'PAN', group: 'parties', parent: 'showBuyerDetails' },
  { key: 'showCustomerDlNo', label: 'D.L. No.', group: 'parties', parent: 'showBuyerDetails' },
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
