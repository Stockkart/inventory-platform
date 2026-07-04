import type { ToastItem } from '@inventory-platform/session';
import styles from './Toast.module.css';

export function Toast({
  toast,
  onClose,
}: {
  toast: ToastItem;
  onClose: () => void;
}) {
  return (
    <div className={`${styles.toast} ${styles[toast.type]}`}>
      <div className={styles.message}>{toast.message}</div>

      <button type="button" className={styles.closeBtn} onClick={onClose}>
        ×
      </button>
    </div>
  );
}
