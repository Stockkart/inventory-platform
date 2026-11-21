import { Fragment, useMemo } from 'react';
import { Box, Stack, Text, cn, productChrome } from '@inventory-platform/ui-kit';
import type { InventoryItem } from '../../model/types';
import type { ResolvedCardLayout } from '../../model/cardLayout.types';
import { attributeChips } from '../../cardLayout/attributeChips';
import { allowAll, type FieldVisibilityPolicy } from '../../cardLayout/fieldVisibility';
import {
  SEGMENT_SEPARATOR,
  resolveCardLines,
  segmentText,
  type CardLine,
  type CardLinesSection,
} from '../../cardLayout/resolveCardLines';

export interface CardLayoutBodyProps {
  item: InventoryItem;
  layout: ResolvedCardLayout;
  /** Hides fields the caller must not show (RBAC, hide-purchase preference). Default: show all. */
  visibility?: FieldVisibilityPolicy;
  /**
   * `card`: the search-result card body — `productChrome.searchResult*` lines, dividers, chips.
   * `compact`: caption-sized lines for the Scan & Sell dropdown row.
   */
  variant?: 'card' | 'compact';
  /** Extra chips a surface contributes (cafe "Low stock"); shown only when chips are enabled. */
  chips?: string[];
}

/**
 * Renders the configurable body of a product card from an `InventoryItem` and a resolved layout
 * (configurable-product-card Req 7.1, 7.6, 7.7, 7.9). The header and footer stay with the
 * surface component; this draws only what the shop configured, as React text nodes.
 */
export function CardLayoutBody({
  item,
  layout,
  visibility = allowAll,
  variant = 'card',
  chips: extraChips,
}: CardLayoutBodyProps) {
  const sections = useMemo(
    () => resolveCardLines(item, layout, visibility),
    [item, layout, visibility],
  );
  const chips = useMemo(() => {
    if (!layout.options.showAttributeChips) return [];
    return [...attributeChips(item), ...(extraChips ?? [])];
  }, [item, layout.options.showAttributeChips, extraChips]);
  const description = layout.options.showDescription && item.description ? item.description : null;

  if (variant === 'compact') {
    return <CompactBody sections={sections} chips={chips} description={description} />;
  }
  return <CardBody sections={sections} chips={chips} description={description} />;
}

interface BodyProps {
  sections: CardLinesSection[];
  chips: string[];
  description: string | null;
}

function CardBody({ sections, chips, description }: BodyProps) {
  const trailing = chips.length > 0 || description;
  return (
    <>
      {sections.map((section) => (
        <Fragment key={section.id}>
          {section.dividerAbove ? (
            <Box as="hr" className={productChrome.searchResultDivider} />
          ) : null}
          <Box
            className={cn(productChrome.searchResultStack, productChrome.searchResultStackTight)}
          >
            {section.title ? (
              <Text variant="caption" color="secondary">
                {section.title}
              </Text>
            ) : null}
            {section.lines.map((line) => (
              <Box as="p" key={line.key} className={lineClass(line)}>
                {lineNodes(line)}
              </Box>
            ))}
          </Box>
        </Fragment>
      ))}
      {trailing ? (
        <Box className={cn(productChrome.searchResultStack, productChrome.searchResultStackTight)}>
          {chips.length > 0 ? (
            <Box className={productChrome.searchResultChips}>
              {chips.map((chip) => (
                <Box as="span" key={chip} className={productChrome.searchResultChip}>
                  {chip}
                </Box>
              ))}
            </Box>
          ) : null}
          {description ? (
            <Box as="p" className={productChrome.searchResultDesc}>
              {description}
            </Box>
          ) : null}
        </Box>
      ) : null}
    </>
  );
}

function CompactBody({ sections, chips, description }: BodyProps) {
  return (
    <Stack gap="xs">
      {sections.map((section) =>
        section.lines.map((line) => (
          <Text
            key={line.key}
            variant="caption"
            color={line.emphasis === 'STRONG' ? 'primary' : 'secondary'}
            weight={line.emphasis === 'STRONG' ? 'semibold' : undefined}
            truncate
          >
            {lineNodes(line)}
          </Text>
        )),
      )}
      {chips.length > 0 ? (
        <Text variant="caption" color="secondary" truncate>
          {chips.join(' · ')}
        </Text>
      ) : null}
      {description ? (
        <Text variant="caption" color="secondary" truncate>
          {description}
        </Text>
      ) : null}
    </Stack>
  );
}

function lineClass(line: CardLine): string {
  return cn(
    productChrome.searchResultLine,
    line.emphasis === 'STRONG' && productChrome.searchResultLineStrong,
    line.emphasis === 'MUTED' && productChrome.searchResultDesc,
  );
}

/** Segments as text nodes joined with the separator; never HTML. */
function lineNodes(line: CardLine) {
  return line.segments.map((segment, index) => (
    <Fragment key={segment.fieldKey}>
      {index > 0 ? SEGMENT_SEPARATOR : null}
      {segmentText(segment)}
    </Fragment>
  ));
}
