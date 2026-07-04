import { useToastStore } from './useToastStore';

export const useNotify = {
  success: (message: string, duration?: number) =>
    useToastStore.getState().show({ type: 'success', message, duration }),

  error: (message: string, duration?: number) =>
    useToastStore.getState().show({ type: 'error', message, duration }),

  info: (message: string, duration?: number) =>
    useToastStore.getState().show({ type: 'info', message, duration }),

  warning: (message: string, duration?: number) =>
    useToastStore.getState().show({ type: 'warning', message, duration }),
};
