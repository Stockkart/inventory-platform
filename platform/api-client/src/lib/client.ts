import axios, { AxiosInstance, AxiosError } from 'axios';
import { EventSourcePolyfill } from 'event-source-polyfill';
import { ApiError } from './ApiError';

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
  private onPlanExpired: (() => void) | null = null;

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

          if (error.response.status === 402 && this.onPlanExpired) {
            this.onPlanExpired();
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
      }
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

export type { ApiClient };
