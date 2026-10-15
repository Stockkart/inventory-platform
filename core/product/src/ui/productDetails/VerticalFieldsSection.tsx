import type { VerticalSchemaFieldDef } from '@inventory-platform/schema/types';
import {
  VerticalSchemaFieldInput,
  fieldLabel,
  getVerticalFieldValue,
  type VerticalFieldProduct,
} from '@inventory-platform/schema';
import { Box, Grid, productChrome } from '@inventory-platform/ui-kit';
import { Layers } from 'lucide-react';
import { formatVerticalFieldDisplay, type VerticalDraft } from '../../lib/verticalFieldsEdit';
import { DetailField, DetailValue, SectionHeader } from './DetailPrimitives';

export interface VerticalFieldsSectionProps {
  /** Section heading, e.g. "Cafe details". */
  title: string;
  /** Schema fields to show; the caller has already removed the ones it renders by hand. */
  fields: readonly VerticalSchemaFieldDef[];
  item: VerticalFieldProduct;
  draft: VerticalDraft;
  isEditing: boolean;
  /** Per-field edit permission; a field the member may not edit stays read-only in edit mode. */
  canEdit: (fieldKey: string) => boolean;
  onChange: (field: VerticalSchemaFieldDef, value: string) => void;
  idPrefix?: string;
}

/**
 * The vertical-owned fields of a product, driven entirely by the shop's schema: view mode prints
 * them, edit mode renders the same inputs registration uses. Nothing here knows a vertical by name.
 */
export function VerticalFieldsSection({
  title,
  fields,
  item,
  draft,
  isEditing,
  canEdit,
  onChange,
  idPrefix = 'detail-vf',
}: VerticalFieldsSectionProps) {
  if (fields.length === 0) return null;

  return (
    <Box className={productChrome.detailSection}>
      <SectionHeader icon={Layers} title={title} />
      <Grid columns={2} gap="sm">
        {fields.map((field) => {
          const editing = isEditing && canEdit(field.key);
          if (editing) {
            return (
              <DetailField key={field.key}>
                <VerticalSchemaFieldInput
                  compact
                  field={field}
                  value={draft[field.key] ?? ''}
                  onChange={(value) => onChange(field, value)}
                  idPrefix={idPrefix}
                />
              </DetailField>
            );
          }
          return (
            <DetailField key={field.key} label={fieldLabel(field)}>
              <DetailValue>
                {formatVerticalFieldDisplay(field, getVerticalFieldValue(item, field))}
              </DetailValue>
            </DetailField>
          );
        })}
      </Grid>
    </Box>
  );
}
