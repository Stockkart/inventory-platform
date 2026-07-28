import type { ReactNode } from 'react';
import type { VerticalSchemaFieldDef } from '@inventory-platform/schema/types';
import {
  FormField,
  Input,
  Label,
  RadioGroup,
  Select,
  Stack,
  Text,
} from '@inventory-platform/ui-kit';
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
  if (value === 'NORMAL') return 'Normal';
  if (value === 'COSTLY') return 'Costly';
  if (value === 'DEGREE') return 'Temperature for the item';
  return value;
}

function FieldShell({
  compact,
  label,
  id,
  required,
  labelClassName,
  hint,
  children,
}: {
  compact?: boolean;
  label: string;
  id: string;
  required: boolean;
  labelClassName?: string;
  hint?: string;
  children: ReactNode;
}) {
  if (compact) {
    return (
      <Stack gap="xs">
        <Label htmlFor={id} required={required} className={labelClassName}>
          {label}
        </Label>
        {children}
        {hint ? (
          <Text variant="caption" color="muted">
            {hint}
          </Text>
        ) : null}
      </Stack>
    );
  }

  return (
    <FormField label={label} id={id} required={required} hint={hint}>
      {children}
    </FormField>
  );
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
  const inputPlaceholder = placeholder ?? FIELD_PLACEHOLDERS[field.key] ?? label;

  if (field.key === 'sellDirect') {
    const selected = value === 'yes' || value === 'true' ? 'yes' : 'no';
    return (
      <FieldShell
        compact={compact}
        label={label}
        id={id}
        required={required}
        labelClassName={labelClassName}
        hint="Yes = show on sell screen and reduce stock when sold"
      >
        <RadioGroup
          name={id}
          value={selected}
          onChange={onChange}
          disabled={disabled}
          options={[
            { value: 'no', label: 'No' },
            { value: 'yes', label: 'Yes' },
          ]}
        />
      </FieldShell>
    );
  }

  if (field.type === 'enum' && field.values?.length) {
    const options = [
      ...(field.key !== 'sellDirect' ? [{ value: '', label: 'Select…' }] : []),
      ...field.values.map((v) => ({
        value: v,
        label: enumOptionLabel(v),
      })),
    ];

    return (
      <FieldShell
        compact={compact}
        label={label}
        id={id}
        required={required}
        labelClassName={labelClassName}
      >
        <Select
          id={id}
          className={inputClassName}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          required={required}
          options={options}
        />
      </FieldShell>
    );
  }

  if (field.type === 'date') {
    return (
      <FieldShell
        compact={compact}
        label={label}
        id={id}
        required={required}
        labelClassName={labelClassName}
      >
        <Input
          id={id}
          type="date"
          className={inputClassName}
          value={dateInputValue(value)}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v ? `${v}T00:00:00Z` : '');
          }}
          disabled={disabled}
          required={required}
        />
      </FieldShell>
    );
  }

  const inputMode = field.type === 'number' ? 'numeric' : undefined;

  return (
    <FieldShell
      compact={compact}
      label={label}
      id={id}
      required={required}
      labelClassName={labelClassName}
    >
      <Input
        id={id}
        type="text"
        inputMode={inputMode}
        className={inputClassName}
        placeholder={inputPlaceholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
      />
    </FieldShell>
  );
}
