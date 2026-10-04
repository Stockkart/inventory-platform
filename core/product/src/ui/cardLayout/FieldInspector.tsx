import { X } from 'lucide-react';
import {
  Badge,
  Box,
  Button,
  FormField,
  IconButton,
  Inline,
  Input,
  SegmentedControl,
  Select,
  Switch,
  Text,
  surfaceChrome,
} from '@inventory-platform/ui-kit';
import type {
  CardCatalogField,
  CardEmphasis,
  CardFieldSpec,
  CardLayoutLimits,
  CardLayoutSpec,
} from '../../model/cardLayout.types';
import { EMPHASIS_OPTIONS } from './cardLayoutDraft';

export interface FieldInspectorProps {
  spec: CardLayoutSpec;
  fieldKey: string;
  catalogField: CardCatalogField | undefined;
  limits: CardLayoutLimits;
  onUpdate(patch: Partial<Pick<CardFieldSpec, 'showLabel' | 'labelOverride' | 'emphasis'>>): void;
  onMoveToSection(toSectionId: string): void;
  onRemove(): void;
  onClose(): void;
}

/**
 * Settings for the one selected field (configurable-product-card Req 9.5). Replaces per-field
 * inline forms: one panel, consistently laid out, that follows whichever chip was clicked.
 */
export function FieldInspector({
  spec,
  fieldKey,
  catalogField,
  limits,
  onUpdate,
  onMoveToSection,
  onRemove,
  onClose,
}: FieldInspectorProps) {
  const location = locate(spec, fieldKey);
  if (!location) return null;
  const { field, sectionId, sectionIndex } = location;
  const name = catalogField?.label ?? fieldKey;

  return (
    <Box className={surfaceChrome.cardBuilderInspector} role="region" aria-label={`Settings for ${name}`}>
      <Inline justify="between" align="center">
        <Inline gap="sm" align="center">
          <Text weight="semibold">{name}</Text>
          {catalogField ? (
            <Text variant="caption" color="secondary">
              {catalogField.sourceGroup} · {catalogField.valueType}
            </Text>
          ) : (
            <Badge variant="neutral">Unavailable in catalog</Badge>
          )}
          {catalogField?.sensitivity === 'SHOP_INTERNAL' ? <Badge variant="warning">shop-internal</Badge> : null}
        </Inline>
        <IconButton type="button" size="sm" label="Close field settings" onClick={onClose}>
          <X size={14} />
        </IconButton>
      </Inline>

      <Box className={surfaceChrome.cardBuilderInspectorGrid}>
        <FormField label="Emphasis" id={`emphasis-${fieldKey}`}>
          <SegmentedControl
            value={field.emphasis}
            options={EMPHASIS_OPTIONS}
            onChange={(v: CardEmphasis) => onUpdate({ emphasis: v })}
          />
        </FormField>
        <FormField label="Label" id={`show-label-${fieldKey}`}>
          <Switch
            id={`show-label-${fieldKey}`}
            label={field.showLabel ? 'Shown before the value' : 'Hidden — value only'}
            checked={field.showLabel}
            onChange={(e) => onUpdate({ showLabel: e.target.checked })}
          />
        </FormField>
        <FormField label="Custom label" id={`label-override-${fieldKey}`} hint={`Leave empty to use “${name}”`}>
          <Input
            id={`label-override-${fieldKey}`}
            aria-label={`Custom label for ${name}`}
            placeholder={name}
            value={field.labelOverride ?? ''}
            maxLength={limits.maxTextLength}
            disabled={!field.showLabel}
            onChange={(e) => onUpdate({ labelOverride: e.target.value || null })}
          />
        </FormField>
        <FormField label="Section" id={`section-${fieldKey}`}>
          <Select
            id={`section-${fieldKey}`}
            aria-label={`Section for ${name}`}
            value={sectionId}
            onChange={(e) => onMoveToSection(e.target.value)}
          >
            {spec.sections.map((s, i) => (
              <option key={s.id} value={s.id}>
                {s.title?.trim() || `Section ${i + 1}`}
                {i === sectionIndex ? ' (current)' : ''}
              </option>
            ))}
          </Select>
        </FormField>
      </Box>

      <Inline justify="end">
        <Button type="button" size="sm" variant="danger" onClick={onRemove}>
          Remove from card
        </Button>
      </Inline>
    </Box>
  );
}

interface Location {
  field: CardFieldSpec;
  sectionId: string;
  sectionIndex: number;
  rowIndex: number;
}

export function locate(spec: CardLayoutSpec, fieldKey: string): Location | null {
  for (let si = 0; si < spec.sections.length; si++) {
    const s = spec.sections[si];
    for (let ri = 0; ri < s.rows.length; ri++) {
      const field = s.rows[ri].fields.find((f) => f.fieldKey === fieldKey);
      if (field) return { field, sectionId: s.id, sectionIndex: si, rowIndex: ri };
    }
  }
  return null;
}
