import { create } from 'zustand';
import type { VerticalPlugin } from '@inventory-platform/routing';
import { loadVerticalPlugin } from './plugin-loaders';

interface VerticalPluginState {
  pluginByVerticalId: Record<string, VerticalPlugin>;
  loadingVerticalIds: Set<string>;
  fetchPlugin: (verticalId: string) => Promise<VerticalPlugin | null>;
  clear: () => void;
}

const pluginInFlight = new Map<string, Promise<VerticalPlugin | null>>();

export const useVerticalPluginStore = create<VerticalPluginState>((set, get) => ({
  pluginByVerticalId: {},
  loadingVerticalIds: new Set(),

  fetchPlugin: async (verticalId) => {
    if (!verticalId) {
      return null;
    }

    const cached = get().pluginByVerticalId[verticalId];
    if (cached) {
      return cached;
    }

    const inFlight = pluginInFlight.get(verticalId);
    if (inFlight) {
      return inFlight;
    }

    const request = (async (): Promise<VerticalPlugin | null> => {
      set((state) => ({
        loadingVerticalIds: new Set(state.loadingVerticalIds).add(verticalId),
      }));

      try {
        const plugin = await loadVerticalPlugin(verticalId);
        if (plugin) {
          set((state) => ({
            pluginByVerticalId: {
              ...state.pluginByVerticalId,
              [verticalId]: plugin,
            },
          }));
        }
        return plugin;
      } finally {
        pluginInFlight.delete(verticalId);
        set((state) => {
          const loadingVerticalIds = new Set(state.loadingVerticalIds);
          loadingVerticalIds.delete(verticalId);
          return { loadingVerticalIds };
        });
      }
    })();

    pluginInFlight.set(verticalId, request);
    return request;
  },

  clear: () => {
    pluginInFlight.clear();
    set({ pluginByVerticalId: {}, loadingVerticalIds: new Set() });
  },
}));
