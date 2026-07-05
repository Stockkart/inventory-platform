import type { VerticalSchemaFieldDef } from '@inventory-platform/schema/types';
import { formStyles } from '@inventory-platform/ui-kit/form-styles';
import { VerticalSchemaFieldInput } from './VerticalSchemaFieldInput';
import {
  getVerticalFieldValue,
  type VerticalFieldProduct,
} from './verticalSchemaUtils';

export interface VerticalInventoryFieldsProps {
  fields: VerticalSchemaFieldDef[];
  product: VerticalFieldProduct;
  onFieldChange: (field: VerticalSchemaFieldDef, value: string) => void;
  disabled?: boolean;
  idPrefix?: string;
  /** Use dashboard registration row layout (two fields per row). */
  layout?: 'row' | 'stack';
  inputClassName?: string;
  labelClassName?: string;
}

export function VerticalInventoryFields({
  fields,
  product,
  onFieldChange,
  disabled = false,
  idPrefix,
  layout = 'row',
  inputClassName,
  labelClassName,
}: VerticalInventoryFieldsProps) {
  if (fields.length === 0) {
    return null;
  }

  if (layout === 'stack') {
    return (
      <>
        {fields.map((field) => (
          <VerticalSchemaFieldInput
            key={field.key}
            field={field}
            value={getVerticalFieldValue(product, field)}
            onChange={(value) => onFieldChange(field, value)}
            disabled={disabled}
            idPrefix={idPrefix ?? `vi-${String(product.id ?? 'p')}`}
            inputClassName={inputClassName}
            labelClassName={labelClassName}
          />
        ))}
      </>
    );
  }

  const rows: VerticalSchemaFieldDef[][] = [];
  for (let i = 0; i < fields.length; i += 2) {
    rows.push(fields.slice(i, i + 2));
  }

  return (
    <>
      {rows.map((pair, rowIdx) => (
        <div key={`vr-${rowIdx}`} className={formStyles.formRow}>
          {pair.map((field) => (
            <VerticalSchemaFieldInput
              key={field.key}
              field={field}
              value={getVerticalFieldValue(product, field)}
              onChange={(value) => onFieldChange(field, value)}
              disabled={disabled}
              idPrefix={idPrefix ?? `vi-${String(product.id ?? 'p')}`}
              inputClassName={inputClassName}
              labelClassName={labelClassName}
            />
          ))}
        </div>
      ))}
    </>
  );
}
