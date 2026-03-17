import styles from './forms.module.css';

interface FormFieldProps {
  label: string;
  id?: string;
  type?: 'text' | 'email' | 'tel';
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  rows?: number;
  multiline?: boolean;
}

export function FormField({
  label,
  id,
  type = 'text',
  value,
  onChange,
  placeholder,
  disabled = false,
  readOnly = false,
  rows = 3,
  multiline = false,
}: FormFieldProps) {
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, '-');
  const inputClassName = readOnly ? `${styles.input} ${styles.readOnly}` : styles.input;

  return (
    <div className={styles.formGroup}>
      <label htmlFor={fieldId} className={styles.label}>
        {label}
      </label>
      {multiline ? (
        <textarea
          id={fieldId}
          className={styles.textarea}
          rows={rows}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
        />
      ) : (
        <input
          id={fieldId}
          type={type}
          className={inputClassName}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
        />
      )}
    </div>
  );
}
