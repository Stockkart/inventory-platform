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

/** Download a binary file from the taxation API with auth headers. */
export async function downloadTaxationBlob(
  path: string,
  query: Record<string, string>,
  defaultFilename: string,
): Promise<{ blob: Blob; filename: string }> {
  const qs = new URLSearchParams(query).toString();
  const response = await axios.get(`${API_BASE_URL}${path}?${qs}`, {
    responseType: 'blob',
    headers: authHeaders(),
  });

  const contentDisposition = response.headers['content-disposition'];
  let filename = defaultFilename;
  if (contentDisposition) {
    const match = /filename="?([^";\n]+)"?/.exec(contentDisposition);
    if (match) filename = match[1].trim();
  }

  return { blob: response.data, filename };
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
