import { useEffect, useRef } from 'react';
import { Stack, shellChrome } from '@inventory-platform/ui-kit';
import { useToastStore } from '@inventory-platform/session';
import { Toast } from './Toast';

export function ToastProvider() {
  const toasts = useToastStore((s) => s.toasts);
  const remove = useToastStore((s) => s.remove);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const timers = timersRef.current;
    const activeIds = new Set(toasts.map((t) => t.id));

    for (const [id, timer] of timers) {
      if (!activeIds.has(id)) {
        clearTimeout(timer);
        timers.delete(id);
      }
    }

    for (const toast of toasts) {
      if (timers.has(toast.id)) continue;
      const duration = toast.duration ?? 4000;
      const timer = setTimeout(() => {
        timers.delete(toast.id);
        remove(toast.id);
      }, duration);
      timers.set(toast.id, timer);
    }
  }, [toasts, remove]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    };
  }, []);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <Stack gap="sm" className={shellChrome.toastStack} aria-label="Notifications">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={() => remove(toast.id)} />
      ))}
    </Stack>
  );
}
