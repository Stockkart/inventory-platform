import type { ReactNode } from 'react';
import { FormKeyboardNavScope } from './FormKeyboardNavScope';
import styles from './forms.module.css';

interface EditModalProps {
  title: string;
  onClose: () => void;
  error?: string | null;
  children: ReactNode;
  onCancel: () => void;
  onSave: () => void | Promise<void>;
  saving?: boolean;
  saveLabel?: string;
}

export function EditModal({
  title,
  onClose,
  error,
  children,
  onCancel,
  onSave,
  saving = false,
  saveLabel = 'Save',
}: EditModalProps) {
  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{title}</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            ×
          </button>
        </div>
        {error && <div className={styles.modalError}>{error}</div>}
        <FormKeyboardNavScope className={styles.modalBody}>
          {children}
          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              className={styles.saveBtn}
              onClick={onSave}
              disabled={saving}
            >
              {saving ? 'Saving…' : saveLabel}
            </button>
          </div>
        </FormKeyboardNavScope>
      </div>
    </div>
  );
}
