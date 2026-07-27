import type { VerticalSchemaFieldDef } from '@inventory-platform/schema/types';
import { FormRow, Stack } from '@inventory-platform/ui-kit';
import { VerticalSchemaFieldInput } from './VerticalSchemaFieldInput';
import { getVerticalFieldValue, type VerticalFieldProduct } from './verticalSchemaUtils';

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
  /** Optional class for each two-column row (e.g. registration accordion row). */
  rowClassName?: string;
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
  rowClassName,
}: VerticalInventoryFieldsProps) {
  if (fields.length === 0) {
    return null;
  }

  const idBase = idPrefix ?? `vi-${String(product.id ?? 'p')}`;

  if (layout === 'stack') {
    return (
      <Stack gap="md">
        {fields.map((field) => (
          <VerticalSchemaFieldInput
            key={field.key}
            field={field}
            value={getVerticalFieldValue(product, field)}
            onChange={(value) => onFieldChange(field, value)}
            disabled={disabled}
            idPrefix={idBase}
            inputClassName={inputClassName}
            labelClassName={labelClassName}
          />
        ))}
      </Stack>
    );
  }

  const rows: VerticalSchemaFieldDef[][] = [];
  for (let i = 0; i < fields.length; i += 2) {
    rows.push(fields.slice(i, i + 2));
  }

  return (
    <>
      {rows.map((pair, rowIdx) => (
        <FormRow key={`vr-${rowIdx}`} className={rowClassName}>
          {pair.map((field) => {
            if (field.key === 'itemTypeDegree') {
              const itemType =
                getVerticalFieldValue(product, {
                  key: 'itemType',
                  storage: 'core',
                } as VerticalSchemaFieldDef) ||
                String((product as { itemType?: string }).itemType ?? '');
              if (itemType !== 'DEGREE') {
                return <span key={field.key} aria-hidden="true" />;
              }
            }
            return (
              <VerticalSchemaFieldInput
                key={field.key}
                field={field}
                value={getVerticalFieldValue(product, field)}
                onChange={(value) => onFieldChange(field, value)}
                disabled={disabled}
                idPrefix={idBase}
                inputClassName={inputClassName}
                labelClassName={labelClassName}
              />
            );
          })}
        </FormRow>
      ))}
    </>
  );
}
