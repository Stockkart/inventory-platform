import axios from 'axios';
import { REFUND_ENDPOINTS, VENDOR_PURCHASE_RETURNS_ENDPOINTS, type PrinterType } from './endpoints';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

async function fetchPdfBlob(path: string): Promise<Blob> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const shopId = typeof window !== 'undefined' ? localStorage.getItem('x_shop_id') : null;

  const response = await axios.get(`${API_BASE_URL}${path}`, {
    responseType: 'blob',
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
      ...(shopId ? { 'X-Shop-Id': shopId } : {}),
    },
  });

  return response.data;
}

export type CreditNoteSource = 'customer' | 'vendor';

export const creditNoteApi = {
  getCustomerCreditNotePdf: async (refundId: string, printerType?: PrinterType): Promise<Blob> =>
    fetchPdfBlob(REFUND_ENDPOINTS.PDF(refundId, printerType)),

  getVendorCreditNotePdf: async (returnId: string, printerType?: PrinterType): Promise<Blob> =>
    fetchPdfBlob(VENDOR_PURCHASE_RETURNS_ENDPOINTS.PDF(returnId, printerType)),
};
