import type { VerticalSchemaFieldDef } from '@inventory-platform/types';
import { formStyles } from '@inventory-platform/ui-kit/form-styles';
import { fieldLabel } from './verticalSchemaUtils';

const FIELD_PLACEHOLDERS: Record<string, string> = {
  companyName: 'Enter company name',
  batchNo: 'Enter the batch number',
};

export interface VerticalSchemaFieldInputProps {
  field: VerticalSchemaFieldDef;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  idPrefix?: string;
  inputClassName?: string;
  labelClassName?: string;
  compact?: boolean;
  placeholder?: string;
}

function dateInputValue(value: string): string {
  if (!value) {
    return '';
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const d = new Date(value);
  if (!Number.isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }
  return '';
}

function enumOptionLabel(value: string): string {
  if (value === 'yes') return 'Yes';
  if (value === 'no') return 'No';
  return value;
}

export function VerticalSchemaFieldInput({
  field,
  value,
  onChange,
  disabled = false,
  idPrefix = 'vf',
  inputClassName,
  labelClassName,
  compact = false,
  placeholder,
}: VerticalSchemaFieldInputProps) {
  const id = `${idPrefix}-${field.key}`;
  const label = fieldLabel(field);
  const required = Boolean(field.required);
  const inputPlaceholder =
    placeholder ?? FIELD_PLACEHOLDERS[field.key] ?? label;
  const inputCls = inputClassName ?? formStyles.input;
  const labelCls = labelClassName ?? formStyles.label;

  if (field.key === 'sellDirect') {
    const selected =
      value === 'yes' || value === 'true' ? 'yes' : 'no';
    return (
      <div className={compact ? undefined : formStyles.formGroup}>
        <span className={labelCls} id={`${id}-label`}>
          {label}
          {required ? ' *' : ''}
        </span>
        <div
          className={formStyles.radioGroup}
          role="radiogroup"
          aria-labelledby={`${id}-label`}
        >
          <label className={formStyles.radioOption}>
            <input
              type="radio"
              name={id}
              value="no"
              checked={selected === 'no'}
              onChange={() => onChange('no')}
              disabled={disabled}
              required={required}
            />
            No
          </label>
          <label className={formStyles.radioOption}>
            <input
              type="radio"
              name={id}
              value="yes"
              checked={selected === 'yes'}
              onChange={() => onChange('yes')}
              disabled={disabled}
            />
            Yes
          </label>
        </div>
        <span className={formStyles.fieldHint}>
          Yes = show on sell screen and reduce stock when sold
        </span>
      </div>
    );
  }

  if (field.type === 'enum' && field.values?.length) {
    return (
      <div className={compact ? undefined : formStyles.formGroup}>
        <label htmlFor={id} className={labelCls}>
          {label}
          {required ? ' *' : ''}
        </label>
        <select
          id={id}
          className={inputCls}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          required={required}
        >
          {field.key !== 'sellDirect' ? (
            <option value="">Select…</option>
          ) : null}
          {field.values.map((v) => (
            <option key={v} value={v}>
              {enumOptionLabel(v)}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === 'date') {
    return (
      <div className={compact ? undefined : formStyles.formGroup}>
        <label htmlFor={id} className={labelCls}>
          {label}
          {required ? ' *' : ''}
        </label>
        <input
          id={id}
          type="date"
          className={inputCls}
          value={dateInputValue(value)}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v ? `${v}T00:00:00Z` : '');
          }}
          disabled={disabled}
          required={required}
        />
      </div>
    );
  }

  const inputMode = field.type === 'number' ? 'numeric' : undefined;

  return (
    <div className={compact ? undefined : formStyles.formGroup}>
      <label htmlFor={id} className={labelCls}>
        {label}
        {required ? ' *' : ''}
      </label>
      <input
        id={id}
        type="text"
        inputMode={inputMode}
        className={inputCls}
        placeholder={inputPlaceholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
      />
    </div>
  );
}
