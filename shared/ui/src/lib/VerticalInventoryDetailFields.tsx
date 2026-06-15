import type { VerticalSchemaFieldDef } from '@inventory-platform/types';
import { VerticalSchemaFieldInput } from './VerticalSchemaFieldInput';
import {
  fieldLabel,
  formatVerticalFieldDisplay,
  getVerticalFieldValue,
  type VerticalFieldProduct,
} from './verticalSchemaUtils';
import styles from './InventoryAlertDetails.module.css';

export interface VerticalInventoryDetailFieldsProps {
  fields: VerticalSchemaFieldDef[];
  item: VerticalFieldProduct;
  isEditing?: boolean;
  editValues?: Record<string, string>;
  onFieldChange?: (field: VerticalSchemaFieldDef, value: string) => void;
  idPrefix?: string;
}

export function VerticalInventoryDetailFields({
  fields,
  item,
  isEditing = false,
  editValues = {},
  onFieldChange,
  idPrefix = 'detail-vf',
}: VerticalInventoryDetailFieldsProps) {
  if (fields.length === 0) {
    return null;
  }

  return (
    <>
      {fields.map((field) => (
        <div key={field.key} className={styles.detailCard}>
          <div className={styles.detailIcon}>🏷️</div>
          <div className={styles.detailContent}>
            <span className={styles.detailLabel}>{fieldLabel(field)}</span>
            {isEditing && onFieldChange ? (
              <VerticalSchemaFieldInput
                field={field}
                value={editValues[field.key] ?? getVerticalFieldValue(item, field)}
                onChange={(value) => onFieldChange(field, value)}
                idPrefix={idPrefix}
                inputClassName={styles.editInput}
                labelClassName={styles.srOnly}
                compact
              />
            ) : (
              <span className={styles.detailValue}>
                {formatVerticalFieldDisplay(
                  field,
                  getVerticalFieldValue(item, field)
                )}
              </span>
            )}
          </div>
        </div>
      ))}
    </>
  );
}
