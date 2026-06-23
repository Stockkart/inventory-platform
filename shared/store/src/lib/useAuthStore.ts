import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi, apiClient, usersApi } from '@inventory-platform/api';
import type { LoginDto, SignupDto } from '@inventory-platform/types';
import type { AuthState } from '@inventory-platform/types';
import { useVerticalSchemaStore } from './useVerticalSchemaStore';
import { usePlanStatusStore } from './usePlanStatusStore';

function deriveShopFromUser(user: { shopId: string | null; shops?: Array<{ shopId: string; shopName: string }> } | null): { name?: string } | null {
  if (!user?.shopId || !user.shops?.length) return null;
  const active = user.shops.find((s) => s.shopId === user.shopId);
  return active ? { name: active.shopName } : null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      shop: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (credentials: LoginDto) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login(credentials);
          const user = response.user;
          const shop = deriveShopFromUser(user) ?? response.shop;
          if (user?.shopId) {
            apiClient.setShopId(user.shopId);
          }
          useVerticalSchemaStore.getState().clear();
          set({
            user,
            shop,
            token: response.accessToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          const errorMessage = error?.message || 'Login failed';
          set({
            isLoading: false,
            error: errorMessage,
            isAuthenticated: false,
          });
          throw error;
        }
      },

      signup: async (data: SignupDto) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.signup(data);
          // Token is already set by authApi.signup via apiClient.setToken
          set({
            user: response.user,
            token: response.accessToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          const errorMessage = error?.message || 'Signup failed';
          set({
            isLoading: false,
            error: errorMessage,
            isAuthenticated: false,
          });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          const state = get();
          if (state.user?.userId && state.token) {
            await authApi.logout({
              userId: state.user.userId,
              accessToken: state.token,
            });
          }
        } catch {
          // Continue with logout even if API call fails
        } finally {
          useVerticalSchemaStore.getState().clear();
          usePlanStatusStore.getState().clear();
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      fetchCurrentUser: async () => {
        set({ isLoading: true });
        try {
          const user = await authApi.getCurrentUser();
          const state = get();
          // Ensure API client has the token from store
          if (state.token) {
            apiClient.setToken(state.token);
          }
          const shop = deriveShopFromUser(user) ?? state.shop;
          if (user?.shopId) {
            apiClient.setShopId(user.shopId);
          }
          set({
            user,
            shop,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          const errorMessage = error?.message || 'Failed to fetch user';
          set({
            isLoading: false,
            error: errorMessage,
            isAuthenticated: false,
            user: null,
            token: null,
          });
          apiClient.setToken(null);
          apiClient.setShopId(null);
        }
      },

      switchActiveShop: async (shopId: string) => {
        set({ isLoading: true });
        try {
          useVerticalSchemaStore.getState().clear();
          usePlanStatusStore.getState().clear();
          await usersApi.setActiveShop(shopId);
          const user = await authApi.getCurrentUser();
          const shop = deriveShopFromUser(user) ?? null;
          apiClient.setShopId(shopId);
          set({
            user,
            shop,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          const errorMessage = error?.message || 'Failed to switch shop';
          set({ isLoading: false, error: errorMessage });
          throw error;
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Sync API client token and shop ID when store is rehydrated from localStorage
        if (state?.token) {
          apiClient.setToken(state.token);
        }
        if (state?.user?.shopId) {
          apiClient.setShopId(state.user.shopId);
        }
      },
    }
  )
);
