import { Fragment } from 'react';
import { ArrowDown, ArrowUp, Merge, Plus, Split, Trash2 } from 'lucide-react';
import {
  Badge,
  Box,
  Button,
  IconButton,
  Input,
  Switch,
  Text,
  Tooltip,
  cn,
  surfaceChrome,
} from '@inventory-platform/ui-kit';
import type {
  CardCatalogField,
  CardFieldSpec,
  CardLayoutLimits,
  CardLayoutSpec,
  CardOptions,
  CardSectionSpec,
} from '../../model/cardLayout.types';

export interface LayoutBuilderProps {
  spec: CardLayoutSpec;
  catalogByKey: Map<string, CardCatalogField>;
  limits: CardLayoutLimits;
  /** The section new fields land in. */
  targetSectionId: string | null;
  selectedFieldKey: string | null;
  onSelectSection(sectionId: string): void;
  onSelectField(fieldKey: string | null): void;
  onAddSection(): void;
  onRemoveSection(sectionId: string): void;
  onMoveSection(index: number, dir: 'up' | 'down'): void;
  onUpdateSection(
    sectionId: string,
    patch: Partial<Pick<CardSectionSpec, 'title' | 'dividerAbove'>>,
  ): void;
  onMoveRow(sectionId: string, index: number, dir: 'up' | 'down'): void;
  onJoinRow(sectionId: string, index: number): void;
  onSplitRow(sectionId: string, index: number): void;
  /** What the card shows after the last section. */
  options: CardOptions;
  /** True when the surface excludes `description`, so the switch is shown disabled. */
  descriptionUnavailable: boolean;
  onUpdateOptions(patch: Partial<CardOptions>): void;
}

/**
 * The card as a stack of sections, each a stack of lines, each line a row of field chips
 * (configurable-product-card Req 9.4, 9.5). Chips are the only way into field settings: click one
 * and the inspector beneath edits it. Line and section controls sit in a fixed right-hand column so
 * every row lines up regardless of its content.
 */
export function LayoutBuilder({
  spec,
  catalogByKey,
  limits,
  targetSectionId,
  selectedFieldKey,
  onSelectSection,
  onSelectField,
  onAddSection,
  onRemoveSection,
  onMoveSection,
  onUpdateSection,
  onMoveRow,
  onJoinRow,
  onSplitRow,
  options,
  descriptionUnavailable,
  onUpdateOptions,
}: LayoutBuilderProps) {
  const canAddSection = spec.sections.length < limits.maxSections;

  // Chips and description render after the sections on the card, so they are configured there too.
  const extras = (
    <Box
      className={surfaceChrome.cardBuilderExtras}
      role="group"
      aria-label="Shown after the sections"
    >
      <Text as="span" className={surfaceChrome.cardBuilderSectionIndex}>
        After the sections
      </Text>
      <Box className={surfaceChrome.cardBuilderExtrasRow}>
        <Switch
          id="card-show-chips"
          className={surfaceChrome.cardBuilderNoWrap}
          label="Attribute chips"
          checked={options.showAttributeChips}
          onChange={(e) => onUpdateOptions({ showAttributeChips: e.target.checked })}
        />
        <Switch
          id="card-show-description"
          className={surfaceChrome.cardBuilderNoWrap}
          label="Description text"
          checked={options.showDescription}
          disabled={descriptionUnavailable}
          onChange={(e) => onUpdateOptions({ showDescription: e.target.checked })}
        />
      </Box>
    </Box>
  );

  if (spec.sections.length === 0) {
    return (
      <Box className={surfaceChrome.cardBuilderEmpty}>
        <Text weight="medium">This card is empty</Text>
        <Text variant="caption" color="secondary">
          Tick fields on the left to add them. Each field becomes a line; you can then join lines,
          reorder them and group them into sections.
        </Text>
        <Button
          type="button"
          size="sm"
          variant="outline"
          leftIcon={<Plus size={14} />}
          onClick={onAddSection}
        >
          Add a section
        </Button>
        {extras}
      </Box>
    );
  }

  return (
    <>
      <Box
        as="ol"
        className={surfaceChrome.cardBuilderLines}
        aria-label="Card sections in display order"
      >
        {spec.sections.map((section, sIdx) => {
          const isTarget = section.id === targetSectionId;
          const sectionName = section.title?.trim() || `Section ${sIdx + 1}`;
          return (
            <Box
              as="li"
              key={section.id}
              className={cn(
                surfaceChrome.cardBuilderSection,
                isTarget && surfaceChrome.cardBuilderSectionSelected,
              )}
            >
              <Box className={surfaceChrome.cardBuilderSectionHead}>
                <Box className={surfaceChrome.cardBuilderSectionHeadRow}>
                  <Text as="span" className={surfaceChrome.cardBuilderSectionIndex}>
                    Section {sIdx + 1}
                  </Text>
                  <Input
                    className={surfaceChrome.cardBuilderSectionTitleInput}
                    aria-label={`Title of ${sectionName} (optional)`}
                    placeholder="Title (optional)"
                    value={section.title ?? ''}
                    maxLength={limits.maxTextLength}
                    onChange={(e) => onUpdateSection(section.id, { title: e.target.value || null })}
                    onFocus={() => onSelectSection(section.id)}
                  />
                  <Switch
                    id={`divider-${section.id}`}
                    className={surfaceChrome.cardBuilderNoWrap}
                    label="Divider above"
                    checked={section.dividerAbove}
                    onChange={(e) =>
                      onUpdateSection(section.id, { dividerAbove: e.target.checked })
                    }
                  />
                </Box>
                <Box className={surfaceChrome.cardBuilderSectionHeadRow}>
                  {isTarget ? (
                    <Badge variant="info">New fields go here</Badge>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => onSelectSection(section.id)}
                    >
                      Add new fields here
                    </Button>
                  )}
                  <Box className={surfaceChrome.cardBuilderActions}>
                    <IconButton
                      type="button"
                      size="sm"
                      label={`Move ${sectionName} up`}
                      disabled={sIdx === 0}
                      onClick={() => onMoveSection(sIdx, 'up')}
                    >
                      <ArrowUp size={14} />
                    </IconButton>
                    <IconButton
                      type="button"
                      size="sm"
                      label={`Move ${sectionName} down`}
                      disabled={sIdx === spec.sections.length - 1}
                      onClick={() => onMoveSection(sIdx, 'down')}
                    >
                      <ArrowDown size={14} />
                    </IconButton>
                    <IconButton
                      type="button"
                      size="sm"
                      label={`Delete ${sectionName}`}
                      onClick={() => onRemoveSection(section.id)}
                    >
                      <Trash2 size={14} />
                    </IconButton>
                  </Box>
                </Box>
              </Box>

              {section.dividerAbove ? (
                <Box className={surfaceChrome.cardBuilderDivider} aria-hidden />
              ) : null}

              {section.rows.length === 0 ? (
                <Text variant="caption" color="secondary">
                  Empty section — tick a field on the left to add a line here.
                </Text>
              ) : (
                <Box
                  as="ol"
                  className={surfaceChrome.cardBuilderLines}
                  aria-label={`Lines in ${sectionName}`}
                >
                  {section.rows.map((row, rIdx) => {
                    const prevWidth = rIdx > 0 ? section.rows[rIdx - 1].fields.length : Infinity;
                    const canJoin =
                      rIdx > 0 && prevWidth + row.fields.length <= limits.maxFieldsPerRow;
                    const canSplit =
                      row.fields.length > 1 &&
                      section.rows.length - 1 + row.fields.length <= limits.maxRowsPerSection;
                    return (
                      <Box
                        as="li"
                        key={row.fields.map((f) => f.fieldKey).join('+')}
                        className={surfaceChrome.cardBuilderLine}
                      >
                        <Text as="span" className={surfaceChrome.cardBuilderLineIndex}>
                          {rIdx + 1}
                        </Text>
                        <Box className={surfaceChrome.cardBuilderChips}>
                          {row.fields.map((field, fIdx) => (
                            <Fragment key={field.fieldKey}>
                              {fIdx > 0 ? (
                                <Text
                                  as="span"
                                  className={surfaceChrome.cardBuilderChipSeparator}
                                  aria-hidden
                                >
                                  |
                                </Text>
                              ) : null}
                              <FieldChip
                                field={field}
                                catalogField={catalogByKey.get(field.fieldKey)}
                                selected={field.fieldKey === selectedFieldKey}
                                onSelect={() =>
                                  onSelectField(
                                    field.fieldKey === selectedFieldKey ? null : field.fieldKey,
                                  )
                                }
                              />
                            </Fragment>
                          ))}
                        </Box>
                        <Box className={surfaceChrome.cardBuilderActions}>
                          <IconButton
                            type="button"
                            size="sm"
                            label={`Move line ${rIdx + 1} up`}
                            disabled={rIdx === 0}
                            onClick={() => onMoveRow(section.id, rIdx, 'up')}
                          >
                            <ArrowUp size={14} />
                          </IconButton>
                          <IconButton
                            type="button"
                            size="sm"
                            label={`Move line ${rIdx + 1} down`}
                            disabled={rIdx === section.rows.length - 1}
                            onClick={() => onMoveRow(section.id, rIdx, 'down')}
                          >
                            <ArrowDown size={14} />
                          </IconButton>
                          <Tooltip
                            content={
                              canJoin
                                ? 'Join with the line above'
                                : rIdx === 0
                                ? 'First line'
                                : `A line holds at most ${limits.maxFieldsPerRow} fields`
                            }
                          >
                            <IconButton
                              type="button"
                              size="sm"
                              label={`Join line ${rIdx + 1} with the previous line`}
                              disabled={!canJoin}
                              onClick={() => onJoinRow(section.id, rIdx)}
                            >
                              <Merge size={14} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip
                            content={
                              canSplit
                                ? 'One field per line'
                                : 'Only lines with several fields can be split'
                            }
                          >
                            <IconButton
                              type="button"
                              size="sm"
                              label={`Split line ${rIdx + 1} into one field per line`}
                              disabled={!canSplit}
                              onClick={() => onSplitRow(section.id, rIdx)}
                            >
                              <Split size={14} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              )}
            </Box>
          );
        })}
      </Box>

      <Button
        type="button"
        size="sm"
        variant="outline"
        leftIcon={<Plus size={14} />}
        onClick={onAddSection}
        disabled={!canAddSection}
        title={canAddSection ? undefined : `At most ${limits.maxSections} sections`}
      >
        Add section
      </Button>
      {extras}
    </>
  );
}

interface FieldChipProps {
  field: CardFieldSpec;
  catalogField: CardCatalogField | undefined;
  selected: boolean;
  onSelect(): void;
}

function FieldChip({ field, catalogField, selected, onSelect }: FieldChipProps) {
  const name = catalogField?.label ?? field.fieldKey;
  const shown = field.labelOverride?.trim() || name;
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn(
        surfaceChrome.cardBuilderChip,
        selected && surfaceChrome.cardBuilderChipSelected,
        field.emphasis === 'STRONG' && surfaceChrome.cardBuilderChipStrong,
        field.emphasis === 'MUTED' && surfaceChrome.cardBuilderChipMuted,
      )}
      aria-pressed={selected}
      aria-label={`${name}${selected ? ' (selected)' : ''} — edit field`}
      onClick={onSelect}
    >
      <Text as="span">{field.showLabel ? shown : name}</Text>
      {!field.showLabel ? (
        <Text as="span" className={surfaceChrome.cardBuilderChipHint}>
          no label
        </Text>
      ) : null}
      {!catalogField ? <Badge variant="neutral">unavailable</Badge> : null}
    </Button>
  );
}
