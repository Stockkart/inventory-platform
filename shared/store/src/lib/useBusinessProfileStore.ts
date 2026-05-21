import { create } from 'zustand';
import { shopsApi } from '@inventory-platform/api';
import type { BusinessProfile } from '@inventory-platform/types';

interface BusinessProfileState {
  profile: BusinessProfile | null;
  isLoading: boolean;
  error: string | null;
  loadProfile: () => Promise<void>;
  clearProfile: () => void;
}

export const useBusinessProfileStore = create<BusinessProfileState>((set) => ({
  profile: null,
  isLoading: false,
  error: null,

  loadProfile: async () => {
    set({ isLoading: true, error: null });
    try {
      const profile = await shopsApi.getBusinessProfile();
      set({ profile, isLoading: false, error: null });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to load business profile';
      set({ profile: null, isLoading: false, error: message });
    }
  },

  clearProfile: () => set({ profile: null, isLoading: false, error: null }),
}));
