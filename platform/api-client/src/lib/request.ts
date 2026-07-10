import { apiClient, type ApiClient } from './client';

/** Typed HTTP helpers delegating to the shared API client instance. */
export const request = {
  get: <T>(endpoint: string, params?: Record<string, string>) => apiClient.get<T>(endpoint, params),
  post: <T>(endpoint: string, data?: unknown) => apiClient.post<T>(endpoint, data),
  put: <T>(endpoint: string, data?: unknown) => apiClient.put<T>(endpoint, data),
  patch: <T>(endpoint: string, data?: unknown) => apiClient.patch<T>(endpoint, data),
  delete: <T>(endpoint: string) => apiClient.delete<T>(endpoint),
} satisfies Pick<ApiClient, 'get' | 'post' | 'put' | 'patch' | 'delete'>;
