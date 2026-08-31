/** MIS REST paths (mirrors backend `/mis/*`). */
export const MIS_ENDPOINTS = {
  VENDOR_MONEY: '/mis/vendor-money',
  VENDOR_MONEY_EXCEL: '/mis/vendor-money/excel',
  VENDOR_MONEY_PDF: '/mis/vendor-money/pdf',
  CUSTOMER_MONEY: '/mis/customer-money',
  CUSTOMER_MONEY_EXCEL: '/mis/customer-money/excel',
  CUSTOMER_MONEY_PDF: '/mis/customer-money/pdf',
  SALES: '/mis/sales',
  SALES_EXCEL: '/mis/sales/excel',
  SALES_PDF: '/mis/sales/pdf',
  STOCK: '/mis/stock',
  STOCK_EXCEL: '/mis/stock/excel',
  STOCK_PDF: '/mis/stock/pdf',
  BANK_SUMMARY: '/mis/bank-summary',
  BANK_SUMMARY_EXCEL: '/mis/bank-summary/excel',
  BANK_SUMMARY_PDF: '/mis/bank-summary/pdf',
  BANK_SUMMARY_CLOSE: '/mis/bank-summary/close',
} as const;
