import { useEffect } from 'react';
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

  return (
    <div className={styles.container}>
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={() => remove(toast.id)} />
      ))}
    </div>
  );
}
