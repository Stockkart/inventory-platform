import type { VerticalSchemaFieldDef } from '@inventory-platform/schema/types';
import { TableCell, TableHeaderCell, denseDataGrid } from '@inventory-platform/ui-kit';
import {
  VerticalSchemaFieldInput,
  fieldLabel,
  getVerticalFieldValue,
  type VerticalFieldProduct,
} from '@inventory-platform/schema';

export function VerticalRegistrationGridCompanyHeader({
  field,
}: {
  field: VerticalSchemaFieldDef | null;
}) {
  if (!field) {
    return null;
  }
  return (
    <TableHeaderCell className={denseDataGrid.th}>
      {fieldLabel(field)}
      {field.required ? ' *' : ''}
    </TableHeaderCell>
  );
}

export function VerticalRegistrationGridHeaders({ fields }: { fields: VerticalSchemaFieldDef[] }) {
  return (
    <>
      {fields.map((field) => (
        <TableHeaderCell key={field.key} className={denseDataGrid.th}>
          {fieldLabel(field)}
          {field.required ? ' *' : ''}
        </TableHeaderCell>
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
    <TableCell className={denseDataGrid.td}>
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
    </TableCell>
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
        <TableCell key={field.key} className={denseDataGrid.td}>
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
      ))}
    </>
  );
}
