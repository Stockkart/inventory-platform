import type { VerticalSchemaFieldDef } from '@inventory-platform/types';
import {
  VerticalSchemaFieldInput,
  fieldLabel,
  getVerticalFieldValue,
  type VerticalFieldProduct,
} from '@inventory-platform/schema';
import styles from '../pages/product-registration.module.css';

export function VerticalRegistrationGridCompanyHeader({
  field,
}: {
  field: VerticalSchemaFieldDef | null;
}) {
  if (!field) {
    return null;
  }
  return (
    <th className={styles.excelTh}>
      {fieldLabel(field)}
      {field.required ? ' *' : ''}
    </th>
  );
}

export function VerticalRegistrationGridHeaders({
  fields,
}: {
  fields: VerticalSchemaFieldDef[];
}) {
  return (
    <>
      {fields.map((field) => (
        <th key={field.key} className={styles.excelTh}>
          {fieldLabel(field)}
          {field.required ? ' *' : ''}
        </th>
      ))}
    </>
  );
}

export function VerticalRegistrationGridCompanyCell({
  field,
  product,
  productId,
  disabled = false,
  onFieldChange,
}: {
  field: VerticalSchemaFieldDef | null;
  product: VerticalFieldProduct;
  productId: string;
  disabled?: boolean;
  onFieldChange: (field: VerticalSchemaFieldDef, value: string) => void;
}) {
  if (!field) {
    return null;
  }
  return (
    <td className={styles.excelTd}>
      <VerticalSchemaFieldInput
        field={field}
        value={getVerticalFieldValue(product, field)}
        onChange={(value) => onFieldChange(field, value)}
        disabled={disabled}
        idPrefix={`grid-${productId}`}
        inputClassName={styles.excelInput}
        labelClassName={styles.srOnly}
        compact
      />
    </td>
  );
}

export interface VerticalRegistrationGridCellsProps {
  fields: VerticalSchemaFieldDef[];
  product: VerticalFieldProduct;
  productId: string;
  disabled?: boolean;
  onFieldChange: (field: VerticalSchemaFieldDef, value: string) => void;
}

export function VerticalRegistrationGridCells({
  fields,
  product,
  productId,
  disabled = false,
  onFieldChange,
}: VerticalRegistrationGridCellsProps) {
  return (
    <>
      {fields.map((field) => (
        <td key={field.key} className={styles.excelTd}>
          <VerticalSchemaFieldInput
            field={field}
            value={getVerticalFieldValue(product, field)}
            onChange={(value) => onFieldChange(field, value)}
            disabled={disabled}
            idPrefix={`grid-${productId}`}
            inputClassName={
              field.type === 'date'
                ? styles.excelInputDate
                : styles.excelInput
            }
            labelClassName={styles.srOnly}
            compact
          />
        </td>
      ))}
    </>
  );
}
