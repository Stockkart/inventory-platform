import type { VerticalSchemaFieldDef } from '@inventory-platform/schema/types';
import { Inline, TableCell, TableHeaderCell, denseDataGrid } from '@inventory-platform/ui-kit';
import {
  VerticalSchemaFieldInput,
  fieldLabel,
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
      {gridRegistrationFields(fields).map((field) => (
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
  const degreeField = findDegreeField(fields);

  return (
    <>
      {gridRegistrationFields(fields).map((field) => {
        if (field.key === 'itemType' && degreeField && isItemTypeDegree(product)) {
          return (
            <TableCell key={field.key} className={denseDataGrid.td}>
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
        );
      })}
    </>
  );
}
