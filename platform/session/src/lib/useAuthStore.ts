import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '../api/auth.api';
import { usersApi } from '../api/users.api';
import { apiClient } from '@inventory-platform/api-client';
import type { LoginDto, SignupDto, AuthState } from '../model/index.js';
import { useVerticalSchemaStore } from './useVerticalSchemaStore';
import { usePlanStatusStore } from './usePlanStatusStore';
import { useShopAccessStore } from './useShopAccessStore';

function deriveShopFromUser(
  user: { shopId: string | null; shops?: Array<{ shopId: string; shopName: string }> } | null,
): { name?: string } | null {
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
          useShopAccessStore.getState().clear();
          set({
            user,
            shop,
            token: response.accessToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Login failed';
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
          // Prefer API phone; fall back to signup payload so onboarding can prefill
          // even if an older backend omitted phone on the response.
          const user = {
            ...response.user,
            phone: response.user?.phone || data.phone || undefined,
          };
          set({
            user,
            token: response.accessToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Signup failed';
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
          useShopAccessStore.getState().clear();
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
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch user';
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
          useShopAccessStore.getState().clear();
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
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to switch shop';
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
        if (state?.token) {
          apiClient.setToken(state.token);
        }
        if (state?.user?.shopId) {
          apiClient.setShopId(state.user.shopId);
        }
      },
    },
  ),
);
