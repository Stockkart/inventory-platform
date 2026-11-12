import axios from 'axios';
import { toBlobRequestError } from '@inventory-platform/api-client';

/**
 * HR file downloads (payslip PDFs, salary register, Excel exports). Copies of the product-internal
 * helpers in `core/accounting/src/api/download.ts` and `core/product/src/lib/printDocument.ts`
 * (`downloadBlob`, `openPdfPreview`); domain packages must not deep-import each other.
 */
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

export interface HrFile {
  blob: Blob;
  filename: string;
}

/**
 * GET a binary file from an HR path (relative to the API base, like `HR_ENDPOINTS`). Errors come
 * back as `ApiError` carrying the server's message (e.g. the heavy-request limiter's 503 "busy,
 * try again"), not axios' "Request failed with status code 503".
 */
export async function downloadHrBlob(
  path: string,
  query: Record<string, string> | undefined,
  defaultFilename: string,
): Promise<HrFile> {
  const qs = query ? new URLSearchParams(query).toString() : '';
  const url = qs ? `${API_BASE_URL}${path}?${qs}` : `${API_BASE_URL}${path}`;
  const response = await axios
    .get(url, {
      responseType: 'blob',
      headers: authHeaders(),
    })
    .catch(async (e: unknown) => {
      throw await toBlobRequestError(e);
    });

  // `HrFileResponses.attachment` names the file; fall back to ours when the header is missing.
  const contentDisposition = response.headers['content-disposition'] as string | undefined;
  let filename = defaultFilename;
  if (contentDisposition) {
    const match = /filename="?([^";\n]+)"?/.exec(contentDisposition);
    if (match) filename = match[1].trim();
  }

  return { blob: response.data as Blob, filename };
}

/** Save a file (Excel, or a PDF when the new tab is blocked). */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}

/**
 * Open a PDF in a new tab to read or print; falls back to a download when a popup blocker
 * refuses the tab, so the document is never silently lost.
 */
export function openOrDownloadPdf(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const newWindow = window.open(url, '_blank');
  if (!newWindow) {
    triggerBlobDownload(blob, filename);
  } else {
    window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
  }
}

/** Excel opens as a download, PDF in a new tab. */
export function deliverHrFile(file: HrFile, kind: 'xlsx' | 'pdf'): void {
  if (kind === 'pdf') openOrDownloadPdf(file.blob, file.filename);
  else triggerBlobDownload(file.blob, file.filename);
}
