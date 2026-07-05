import { useEffect } from 'react';
import { Stack } from '@inventory-platform/ui-kit';
import { useToastStore } from '@inventory-platform/session';
import { Toast } from './Toast';
import styles from './ToastProvider.module.css';

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
    <Stack gap="sm" className={styles.container}>
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={() => remove(toast.id)} />
      ))}
    </Stack>
  );
}
