// API Client configuration
import axios, { AxiosInstance, AxiosError } from 'axios';
import { EventSourcePolyfill } from 'event-source-polyfill';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

if (import.meta.env.DEV) {
  console.log('API Base URL:', API_BASE_URL);
}

const X_SHOP_ID_KEY = 'x_shop_id';

class ApiClient {
  private axiosInstance: AxiosInstance;
  private token: string | null = null;
  private shopId: string | null = null;
  private baseURL: string;

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
          typeof window !== 'undefined'
            ? localStorage.getItem('auth_token')
            : this.token;

        if (currentToken) {
          this.token = currentToken;
          config.headers.Authorization = `Bearer ${currentToken}`;
        }

        const currentShopId =
          typeof window !== 'undefined'
            ? localStorage.getItem(X_SHOP_ID_KEY)
            : this.shopId;
        if (currentShopId) {
          config.headers['X-Shop-Id'] = currentShopId;
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response) {
          const errorData = error.response.data as {
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

          const apiError = new Error(message) as Error & {
            status?: number;
            errors?: Record<string, string[]>;
            code?: string;
            details?: unknown;
          };

          apiError.status = error.response.status;
          apiError.errors = errorData?.errors;
          apiError.code = errorData?.code;
          apiError.details = errorData?.details;

          throw apiError;
        }

        if (error.request) {
          const networkError = new Error(
            'Network error. Please check your connection.'
          ) as Error & { status?: number };

          networkError.status = 0;
          throw networkError;
        }

        throw new Error(error.message || 'Unexpected error');
      }
    );
  }

  /* Token Management */
  setToken(token: string | null) {
    // Clear shop ID when token is cleared (logout)
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

  /** Set the active shop ID for X-Shop-Id header (multi-shop support) */
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

  /* REST METHODS */
  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const r = await this.axiosInstance.get<T>(endpoint, { params });
    return r.data;
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    const r = await this.axiosInstance.post<T>(endpoint, data);
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

  /* SSE METHOD */
  createSseConnection(path: string): EventSource {
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('auth_token')
        : this.token;

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
