import type { ToastItem } from '@inventory-platform/session';
import { Toast as UiKitToast } from '@inventory-platform/ui-kit';

const variantMap = {
  success: 'success',
  error: 'error',
  info: 'default',
  warning: 'warning',
} as const;

export function Toast({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  return <UiKitToast message={toast.message} variant={variantMap[toast.type]} onClose={onClose} />;
}
