import { create } from 'zustand';
import { verticalsApi } from '@inventory-platform/api';
import type {
  SchemaDisplayMode,
  ShopSchemaResponse,
  VerticalSchemaResponse,
} from '@inventory-platform/types';

interface VerticalSchemaState {
  shopSchemaByKey: Record<string, ShopSchemaResponse>;
  verticalSchemaByKey: Record<string, VerticalSchemaResponse>;
  loadingKeys: Set<string>;
  errors: Record<string, string>;
  fetchShopSchema: (mode?: SchemaDisplayMode) => Promise<ShopSchemaResponse | null>;
  fetchVerticalSchema: (
    verticalId: string,
    mode?: SchemaDisplayMode,
    version?: string
  ) => Promise<VerticalSchemaResponse | null>;
  clear: () => void;
}

function shopKey(mode: SchemaDisplayMode): string {
  return `shop:${mode}`;
}

function verticalKey(
  verticalId: string,
  mode: SchemaDisplayMode,
  version?: string
): string {
  return `vertical:${verticalId}:${version ?? 'active'}:${mode}`;
}

export const useVerticalSchemaStore = create<VerticalSchemaState>((set, get) => ({
  shopSchemaByKey: {},
  verticalSchemaByKey: {},
  loadingKeys: new Set(),
  errors: {},

  fetchShopSchema: async (mode = 'regular') => {
    const key = shopKey(mode);
    const cached = get().shopSchemaByKey[key];
    if (cached) {
      return cached;
    }
    if (get().loadingKeys.has(key)) {
      return null;
    }
    set((state) => ({
      loadingKeys: new Set(state.loadingKeys).add(key),
      errors: { ...state.errors, [key]: '' },
    }));
    try {
      const schema = await verticalsApi.getShopSchema(mode);
      set((state) => {
        const loadingKeys = new Set(state.loadingKeys);
        loadingKeys.delete(key);
        return {
          shopSchemaByKey: { ...state.shopSchemaByKey, [key]: schema },
          loadingKeys,
        };
      });
      return schema;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load shop schema';
      set((state) => {
        const loadingKeys = new Set(state.loadingKeys);
        loadingKeys.delete(key);
        return {
          loadingKeys,
          errors: { ...state.errors, [key]: message },
        };
      });
      return null;
    }
  },

  fetchVerticalSchema: async (verticalId, mode = 'regular', version) => {
    const key = verticalKey(verticalId, mode, version);
    const cached = get().verticalSchemaByKey[key];
    if (cached) {
      return cached;
    }
    if (get().loadingKeys.has(key)) {
      return null;
    }
    set((state) => ({
      loadingKeys: new Set(state.loadingKeys).add(key),
      errors: { ...state.errors, [key]: '' },
    }));
    try {
      const schema = await verticalsApi.getSchema(verticalId, mode, version);
      set((state) => {
        const loadingKeys = new Set(state.loadingKeys);
        loadingKeys.delete(key);
        return {
          verticalSchemaByKey: { ...state.verticalSchemaByKey, [key]: schema },
          loadingKeys,
        };
      });
      return schema;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load vertical schema';
      set((state) => {
        const loadingKeys = new Set(state.loadingKeys);
        loadingKeys.delete(key);
        return {
          loadingKeys,
          errors: { ...state.errors, [key]: message },
        };
      });
      return null;
    }
  },

  clear: () =>
    set({
      shopSchemaByKey: {},
      verticalSchemaByKey: {},
      loadingKeys: new Set(),
      errors: {},
    }),
}));
