import { create } from 'zustand';
import { apiClient } from '@inventory-platform/api-client';
import type { ApiResponse } from '@inventory-platform/contracts';
import type { ShopPlanStatusResponse } from '@inventory-platform/contracts';

interface PlanStatusState {
  byShopId: Record<string, ShopPlanStatusResponse>;
  /**
   * Whether each shop's plan or trial has expired, from the last plan status or from a
   * plan-expired (402) answer to any other call, whichever came last. Read it with
   * `isShopPlanExpired`.
   */
  expiredByShopId: Record<string, boolean>;
  loading: boolean;
  error: string | null;
  fetchPlanStatus: (options?: { force?: boolean }) => Promise<ShopPlanStatusResponse | null>;
  /** The API refused a call for the active shop because its plan or trial has expired. */
  markPlanExpired: () => void;
  clear: () => void;
}

function resolveShopId(): string | null {
  return apiClient.getShopId();
}

/** True when the API has said this shop's plan or trial has expired. */
export function isShopPlanExpired(
  state: Pick<PlanStatusState, 'expiredByShopId'>,
  shopId: string | null | undefined,
): boolean {
  return shopId ? state.expiredByShopId[shopId] === true : false;
}

export const usePlanStatusStore = create<PlanStatusState>((set, get) => ({
  byShopId: {},
  expiredByShopId: {},
  loading: false,
  error: null,

  fetchPlanStatus: async (options) => {
    const shopId = resolveShopId();
    if (!shopId) {
      return null;
    }
    if (!options?.force && get().byShopId[shopId]) {
      return get().byShopId[shopId] ?? null;
    }
    set({ loading: true, error: null });
    try {
      const response = await apiClient.get<ApiResponse<ShopPlanStatusResponse>>(
        '/plans/shop/status',
      );
      const status = response.data;
      set((state) => ({
        byShopId: { ...state.byShopId, [shopId]: status },
        expiredByShopId: { ...state.expiredByShopId, [shopId]: status.planExpired },
        loading: false,
      }));
      return status;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load plan status';
      set({ loading: false, error: message });
      return null;
    }
  },

  markPlanExpired: () => {
    const shopId = resolveShopId();
    if (!shopId || get().expiredByShopId[shopId]) {
      return;
    }
    set((state) => ({ expiredByShopId: { ...state.expiredByShopId, [shopId]: true } }));
  },

  clear: () => set({ byShopId: {}, expiredByShopId: {}, loading: false, error: null }),
}));
