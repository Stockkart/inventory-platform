import { useEffect } from 'react';
import { Stack } from '@inventory-platform/ui-kit';
import { useToastStore } from '@inventory-platform/session';
import { Toast } from './Toast';

export function ToastProvider() {
  const { toasts, remove } = useToastStore();

  useEffect(() => {
    toasts.forEach((t) => {
      const duration = t.duration ?? 4000;

      const timer = setTimeout(() => {
        remove(t.id);
      }, duration);

      return () => clearTimeout(timer);
    });
  }, [toasts, remove]);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <Stack
      gap="sm"
      style={{
        position: 'fixed',
        top: 18,
        right: 18,
        zIndex: 99999,
      }}
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={() => remove(toast.id)} />
      ))}
    </Stack>
  );
}
