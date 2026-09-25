import axios, { AxiosInstance, AxiosError } from 'axios';
import { EventSourcePolyfill } from 'event-source-polyfill';
import { ApiError } from './ApiError';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

if (import.meta.env.DEV) {
  console.log('API Base URL:', API_BASE_URL);
}

const X_SHOP_ID_KEY = 'x_shop_id';

/**
 * Per-call options for the typed helpers below.
 *
 * `headers` exists for the one thing a shared instance cannot carry as a default: a header
 * that is unique to a single request, such as the `Idempotency-Key` on a write that must
 * never take effect twice. Without it those writes had to be issued through raw `axios`,
 * which meant they never passed through the interceptors on this instance — no 401 bounce to
 * login, no 402 plan-expired, and an `AxiosError` instead of an `ApiError`.
 */
export interface ApiRequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string>;
}

/**
 * An error body read off a response whose `responseType` was `blob`.
 *
 * Axios hands back the raw `Blob` for the failure too, so the server's message is inside a
 * binary the interceptor cannot read synchronously. Without this, every failed PDF request
 * could only ever report the status text — the server's own explanation was unreachable.
 */
async function readErrorBody(raw: unknown): Promise<Record<string, unknown>> {
  if (typeof Blob !== 'undefined' && raw instanceof Blob) {
    try {
      const text = await raw.text();
      const parsed: unknown = text ? JSON.parse(text) : null;
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
    } catch {
      // A blob that is not JSON (an HTML error page, a truncated PDF) carries no message
      // this layer can use; the status text below still does.
      return {};
    }
  }
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
}

/** Auth routes where 401 is an expected credential failure, not session expiry. */
function isPublicAuthRequest(url: string | undefined): boolean {
  if (!url) return false;
  return /\/auth\/(login|signup|logout|refresh|forgot-password|reset-password|accept-invite)(\/|$|\?)/.test(
    url,
  );
}

class ApiClient {
  private axiosInstance: AxiosInstance;
  private token: string | null = null;
  private shopId: string | null = null;
  private baseURL: string;
  private onPlanExpired: (() => void) | null = null;
  private onUnauthorized: (() => void) | null = null;
  private unauthorizedHandling = false;

  constructor(baseURL: string) {
    this.baseURL = baseURL.replace(/\/$/, '');

    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
      if (this.token) {
        this.axiosInstance.defaults.headers.common.Authorization = `Bearer ${this.token}`;
      }
    }

    this.axiosInstance.interceptors.request.use(
      (config) => {
        const currentToken =
          typeof window !== 'undefined' ? localStorage.getItem('auth_token') : this.token;

        if (currentToken) {
          this.token = currentToken;
          config.headers.Authorization = `Bearer ${currentToken}`;
        }

        const currentShopId =
          typeof window !== 'undefined' ? localStorage.getItem(X_SHOP_ID_KEY) : this.shopId;
        if (currentShopId) {
          config.headers['X-Shop-Id'] = currentShopId;
        }

        return config;
      },
      (error) => Promise.reject(error),
    );

    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response) {
          const errorData = (await readErrorBody(error.response.data)) as {
            message?: string;
            error?: string;
            data?: { message?: string };
            errors?: Record<string, string[]>;
            code?: string;
            details?: unknown;
          };

          const message =
            errorData?.data?.message ||
            errorData?.error ||
            errorData?.message ||
            error.response.statusText;

          if (error.response.status === 402 && this.onPlanExpired) {
            this.onPlanExpired();
          }

          if (
            error.response.status === 401 &&
            this.onUnauthorized &&
            !isPublicAuthRequest(error.config?.url) &&
            !this.unauthorizedHandling
          ) {
            this.unauthorizedHandling = true;
            try {
              this.onUnauthorized();
            } finally {
              window.setTimeout(() => {
                this.unauthorizedHandling = false;
              }, 2_000);
            }
          }

          throw new ApiError(message, {
            status: error.response.status,
            errors: errorData?.errors,
            code: errorData?.code,
            details: errorData?.details,
          });
        }

        if (error.request) {
          throw new ApiError('Network error. Please check your connection.', {
            status: 0,
          });
        }

        throw new ApiError(error.message || 'Unexpected error');
      },
    );
  }

  setToken(token: string | null) {
    if (!token) {
      this.setShopId(null);
    }
    this.token = token;

    if (token && typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
      this.axiosInstance.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
      }
      delete this.axiosInstance.defaults.headers.common.Authorization;
    }
  }

  setShopId(shopId: string | null) {
    this.shopId = shopId;
    if (typeof window !== 'undefined') {
      if (shopId) {
        localStorage.setItem(X_SHOP_ID_KEY, shopId);
      } else {
        localStorage.removeItem(X_SHOP_ID_KEY);
      }
    }
  }

  getShopId(): string | null {
    if (this.shopId) {
      return this.shopId;
    }
    if (typeof window !== 'undefined') {
      return localStorage.getItem(X_SHOP_ID_KEY);
    }
    return null;
  }

  setPlanExpiredHandler(handler: (() => void) | null) {
    this.onPlanExpired = handler;
  }

  setUnauthorizedHandler(handler: (() => void) | null) {
    this.onUnauthorized = handler;
  }

  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const r = await this.axiosInstance.get<T>(endpoint, { params });
    return r.data;
  }

  async post<T>(endpoint: string, data?: unknown, options?: ApiRequestOptions): Promise<T> {
    const r = await this.axiosInstance.post<T>(endpoint, data, {
      headers: options?.headers,
      params: options?.params,
    });
    return r.data;
  }

  /**
   * GET a document (a PDF slip, an export) as a `Blob`, through the same interceptors as
   * every other call — so an expired session bounces to login instead of surfacing a raw
   * axios message next to a print button.
   */
  async getBlob(endpoint: string, options?: ApiRequestOptions): Promise<Blob> {
    const r = await this.axiosInstance.get<Blob>(endpoint, {
      responseType: 'blob',
      headers: options?.headers,
      params: options?.params,
    });
    return r.data;
  }

  /** POST and read the response as a document rather than JSON. See {@link getBlob}. */
  async postBlob(endpoint: string, data?: unknown, options?: ApiRequestOptions): Promise<Blob> {
    const r = await this.axiosInstance.post<Blob>(endpoint, data, {
      responseType: 'blob',
      headers: options?.headers,
      params: options?.params,
    });
    return r.data;
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    const r = await this.axiosInstance.put<T>(endpoint, data);
    return r.data;
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    const r = await this.axiosInstance.patch<T>(endpoint, data);
    return r.data;
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.axiosInstance.delete<T>(endpoint).then((r) => r.data);
  }

  createSseConnection(path: string): EventSource {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : this.token;

    const url = `${this.baseURL}${path}`;

    if (token) {
      return new EventSourcePolyfill(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        withCredentials: false,
      }) as unknown as EventSource;
    }

    return new EventSource(url);
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

export type { ApiClient };
