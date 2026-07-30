import { apiClient } from '@inventory-platform/api-client';
import type { ApiResponse } from '@inventory-platform/contracts';
import type { PrinterType } from './endpoints';

const INVOICE_SETTINGS_ENDPOINT = '/shops/active-shop/invoice-settings';

export interface InvoiceSettingsSummary {
  defaultPrinterType: PrinterType;
}

export const invoiceSettingsApi = {
  get: async (): Promise<InvoiceSettingsSummary> => {
    const response = await apiClient.get<ApiResponse<{ defaultPrinterType: PrinterType }>>(
      INVOICE_SETTINGS_ENDPOINT,
    );
    return {
      defaultPrinterType: response.data.defaultPrinterType ?? 'NORMAL',
    };
  },
};
