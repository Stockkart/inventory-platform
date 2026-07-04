// Central export for all Zustand stores
export {
  useAuthStore,
  useShopCapabilitiesStore,
  useVerticalSchemaStore,
  shopSchemaCacheKey,
  useShopAccessStore,
  usePlanStatusStore,
  useToastStore,
  useNotify,
} from '@inventory-platform/session';
export type { ToastItem, ToastType } from '@inventory-platform/session';
export { useProductStore } from './lib/useProductStore';
export { useCartStore } from './lib/useCartStore';
export { useOrderStore } from './lib/useOrderStore';
export { useNotifications } from './lib/useNotifications';
export { useAnalyticsStore } from './lib/useAnalyticsStore';
