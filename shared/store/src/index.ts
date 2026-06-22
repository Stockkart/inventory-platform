// Central export for all Zustand stores
export { useAuthStore } from './lib/useAuthStore';
export { useProductStore } from './lib/useProductStore';
export { useCartStore } from './lib/useCartStore';
export { useOrderStore } from './lib/useOrderStore';
export { useNotifications } from './lib/useNotifications';
export { useAnalyticsStore } from './lib/useAnalyticsStore';
export { useToastStore } from './lib/useToastStore';
export type { ToastItem, ToastType } from './lib/useToastStore';
export { useNotify } from './lib/useNotify';
export { useVerticalSchemaStore, shopSchemaCacheKey } from './lib/useVerticalSchemaStore';
export { useShopCapabilitiesStore } from './lib/useShopCapabilitiesStore';
