import type { VerticalSchemaFieldDef } from '@inventory-platform/schema/types';
import { Inline, TableCell, denseDataGrid } from '@inventory-platform/ui-kit';
import {
  VerticalSchemaFieldInput,
  getVerticalFieldValue,
  type VerticalFieldProduct,
} from '@inventory-platform/schema';

function isItemTypeDegree(product: VerticalFieldProduct): boolean {
  const itemType =
    getVerticalFieldValue(product, {
      key: 'itemType',
      storage: 'core',
    } as VerticalSchemaFieldDef) || String((product as { itemType?: string }).itemType ?? '');
  return itemType === 'DEGREE';
}

/** Grid columns omit degree — it renders inline under Item Type when DEGREE. */
export function gridRegistrationFields(fields: VerticalSchemaFieldDef[]): VerticalSchemaFieldDef[] {
  return fields.filter((f) => f.key !== 'itemTypeDegree');
}

export function findDegreeField(
  fields: VerticalSchemaFieldDef[],
): VerticalSchemaFieldDef | undefined {
  return fields.find((f) => f.key === 'itemTypeDegree');
}

export interface VerticalRegistrationGridCellProps {
  field: VerticalSchemaFieldDef;
  /** The degree field, rendered inline under Item Type when the row is DEGREE. */
  degreeField?: VerticalSchemaFieldDef;
  product: VerticalFieldProduct;
  productId: string;
  disabled?: boolean;
  onFieldChange: (field: VerticalSchemaFieldDef, value: string) => void;
}

/** One schema field's grid cell. */
export function VerticalRegistrationGridCell({
  field,
  degreeField,
  product,
  productId,
  disabled = false,
  onFieldChange,
}: VerticalRegistrationGridCellProps) {
  if (field.key === 'itemType' && degreeField && isItemTypeDegree(product)) {
    return (
      <TableCell className={denseDataGrid.td}>
        <Inline gap="xs" align="center">
          <VerticalSchemaFieldInput
            field={field}
            value={getVerticalFieldValue(product, field)}
            onChange={(value) => onFieldChange(field, value)}
            disabled={disabled}
            idPrefix={`grid-${productId}`}
            inputClassName={denseDataGrid.input}
            labelClassName={denseDataGrid.srOnly}
            compact
          />
          <VerticalSchemaFieldInput
            field={degreeField}
            value={getVerticalFieldValue(product, degreeField)}
            onChange={(value) => onFieldChange(degreeField, value)}
            disabled={disabled}
            idPrefix={`grid-${productId}`}
            inputClassName={denseDataGrid.inputNarrow}
            labelClassName={denseDataGrid.srOnly}
            compact
            placeholder="°"
          />
        </Inline>
      </TableCell>
    );
  }
  return (
    <TableCell className={denseDataGrid.td}>
      <VerticalSchemaFieldInput
        field={field}
        value={getVerticalFieldValue(product, field)}
        onChange={(value) => onFieldChange(field, value)}
        disabled={disabled}
        idPrefix={`grid-${productId}`}
        inputClassName={field.type === 'date' ? denseDataGrid.inputDate : denseDataGrid.input}
        labelClassName={denseDataGrid.srOnly}
        compact
      />
    </TableCell>
  );
}
