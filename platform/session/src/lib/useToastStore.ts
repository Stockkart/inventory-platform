import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration?: number; // ms
}

interface ToastState {
  toasts: ToastItem[];
  show: (toast: Omit<ToastItem, 'id'>) => void;
  remove: (id: string) => void;
  clearAll: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  // A toast already on screen with the same type and message is not added again, so a
  // failure repeated by several calls at once (e.g. every request refused because the plan
  // expired) shows one message, not a pile.
  show: (toast) =>
    set((state) => {
      if (state.toasts.some((t) => t.type === toast.type && t.message === toast.message)) {
        return state;
      }
      return {
        toasts: [
          ...state.toasts,
          {
            id:
              typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random()}`,
            duration: 4000,
            ...toast,
          },
        ],
      };
    }),

  remove: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  clearAll: () => set({ toasts: [] }),
}));
