import { create } from 'zustand';
import { verticalsApi } from '@inventory-platform/api';
import { apiClient } from '@inventory-platform/api-client';
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

const shopSchemaInFlight = new Map<
  string,
  Promise<ShopSchemaResponse | null>
>();

function resolveActiveShopId(): string | null {
  return apiClient.getShopId();
}

export function shopSchemaCacheKey(
  shopId: string | null | undefined,
  mode: SchemaDisplayMode
): string {
  return `shop:${shopId ?? '_'}:${mode}`;
}

function shopKey(shopId: string, mode: SchemaDisplayMode): string {
  return shopSchemaCacheKey(shopId, mode);
}

function verticalKey(
  verticalId: string,
  mode: SchemaDisplayMode,
  version?: string
): string {
  return `vertical:${verticalId}:${version ?? 'active'}:${mode}`;
}

function normalizeShopSchema(
  schema: ShopSchemaResponse,
  shopId: string
): ShopSchemaResponse {
  return {
    ...schema,
    shopId: schema.shopId ?? shopId,
  };
}

export const useVerticalSchemaStore = create<VerticalSchemaState>((set, get) => ({
  shopSchemaByKey: {},
  verticalSchemaByKey: {},
  loadingKeys: new Set(),
  errors: {},

  fetchShopSchema: async (mode = 'regular') => {
    const shopId = resolveActiveShopId();
    if (!shopId) {
      return null;
    }
    const key = shopKey(shopId, mode);
    const cached = get().shopSchemaByKey[key];
    if (cached?.verticalId && cached.entities) {
      return cached;
    }

    const inFlight = shopSchemaInFlight.get(key);
    if (inFlight) {
      return inFlight;
    }

    const schemaRequest = (async (): Promise<ShopSchemaResponse | null> => {
      set((state) => ({
        loadingKeys: new Set(state.loadingKeys).add(key),
        errors: { ...state.errors, [key]: '' },
      }));
      try {
        const raw = await verticalsApi.getShopSchema(mode);
        const schema = normalizeShopSchema(raw, shopId);
        if (schema.shopId !== shopId) {
          return null;
        }
        const cacheKey = shopKey(schema.shopId, mode);
        set((state) => {
          const loadingKeys = new Set(state.loadingKeys);
          loadingKeys.delete(key);
          return {
            shopSchemaByKey: { ...state.shopSchemaByKey, [cacheKey]: schema },
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
      } finally {
        shopSchemaInFlight.delete(key);
      }
    })();

    shopSchemaInFlight.set(key, schemaRequest);
    return schemaRequest;
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

  clear: () => {
    shopSchemaInFlight.clear();
    set({
      shopSchemaByKey: {},
      verticalSchemaByKey: {},
      loadingKeys: new Set(),
      errors: {},
    });
  },
}));
