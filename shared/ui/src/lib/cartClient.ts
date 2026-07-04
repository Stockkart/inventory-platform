import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

function invoicePdfPath(
  purchaseId: string,
  printerType?: 'NORMAL' | 'DOT_MATRIX'
): string {
  return printerType != null
    ? `/invoices/${purchaseId}/pdf?printerType=${printerType}`
    : `/invoices/${purchaseId}/pdf`;
}

/** Cart invoice PDF for shared UI (avoids core/product ↔ ui cycle). */
export const cartClient = {
  getInvoicePdf: async (
    purchaseId: string,
    printerType?: 'NORMAL' | 'DOT_MATRIX'
  ): Promise<Blob> => {
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('auth_token')
        : null;

    const response = await axios.get(
      `${API_BASE_URL}${invoicePdfPath(purchaseId, printerType)}`,
      {
        responseType: 'blob',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      }
    );

    return response.data;
  },
};
