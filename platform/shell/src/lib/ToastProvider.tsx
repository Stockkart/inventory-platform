import { useEffect } from 'react';
import { Stack, shellChrome } from '@inventory-platform/ui-kit';
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
    <Stack gap="sm" className={shellChrome.toastStack}>
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={() => remove(toast.id)} />
      ))}
    </Stack>
  );
}
