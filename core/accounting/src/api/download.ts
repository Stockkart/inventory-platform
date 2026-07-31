import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token) headers.Authorization = `Bearer ${token}`;
    const shopId = localStorage.getItem('x_shop_id');
    if (shopId) headers['X-Shop-Id'] = shopId;
  }
  return headers;
}

/**
 * Download a binary report file — same axios blob pattern as scan-sell invoice PDF
 * and GSTR Excel downloads.
 */
export async function downloadAccountingBlob(
  path: string,
  query: Record<string, string>,
  defaultFilename: string,
): Promise<{ blob: Blob; filename: string }> {
  const qs = new URLSearchParams(query).toString();
  const url = qs ? `${API_BASE_URL}${path}?${qs}` : `${API_BASE_URL}${path}`;
  const response = await axios.get(url, {
    responseType: 'blob',
    headers: authHeaders(),
  });

  const contentDisposition = response.headers['content-disposition'] as string | undefined;
  let filename = defaultFilename;
  if (contentDisposition) {
    const match = /filename="?([^";\n]+)"?/.exec(contentDisposition);
    if (match) filename = match[1].trim();
  }

  return { blob: response.data, filename };
}

/** Trigger a file download (Excel / fallback when pop-up blocked). */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Open PDF in a new tab like scan-sell Print Invoice; fall back to download if blocked.
 */
export function openOrDownloadPdf(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const newWindow = window.open(url, '_blank');
  if (!newWindow) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}
