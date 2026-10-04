import type { InventoryItem } from '../model/types';
import type {
  CardEmphasis,
  ResolvedCardField,
  ResolvedCardLayout,
} from '../model/cardLayout.types';
import { resolveRawValue } from './fieldResolvers';
import { formatCardValue, isBlankValue } from './formatCardValue';
import type { FieldVisibilityPolicy } from './fieldVisibility';
import { allowAll } from './fieldVisibility';

/**
 * Turns an item plus a resolved layout into the lines a card prints (configurable-product-card
 * Req 7.1, 7.4, 7.5, 7.8). Pure: the renderer draws what this returns and tests assert on it.
 *
 * Pipeline per field: visibility policy → raw value → formatted string → blank behaviour. Rows
 * with nothing left are dropped, then sections with no rows; under `SHOW_DASH` nothing is dropped
 * and blanks print as an em dash so every card from one layout has the same lines.
 */

export const BLANK_DASH = '—';
export const SEGMENT_SEPARATOR = ' | ';

export interface CardLineSegment {
  fieldKey: string;
  /** `null` when the field hides its label. */
  label: string | null;
  value: string;
  emphasis: CardEmphasis;
}

export interface CardLine {
  key: string;
  emphasis: CardEmphasis;
  segments: CardLineSegment[];
}

export interface CardLinesSection {
  id: string;
  title: string | null;
  dividerAbove: boolean;
  lines: CardLine[];
}

export function resolveCardLines(
  item: InventoryItem,
  layout: ResolvedCardLayout,
  visible: FieldVisibilityPolicy = allowAll,
): CardLinesSection[] {
  const showDash = layout.options.blankValueBehavior === 'SHOW_DASH';
  const sections: CardLinesSection[] = [];

  for (const section of layout.sections) {
    const lines: CardLine[] = [];
    section.rows.forEach((row, rowIndex) => {
      const segments: CardLineSegment[] = [];
      for (const field of row.fields) {
        if (!visible(field)) continue;
        const raw = resolveRawValue(item, field);
        const value = formatCardValue(raw, field.valueType);
        if (isBlankValue(value)) {
          if (!showDash) continue;
          segments.push(segment(field, BLANK_DASH));
          continue;
        }
        segments.push(segment(field, value));
      }
      if (segments.length > 0) {
        lines.push({
          key: `${section.id}:${rowIndex}:${segments.map((s) => s.fieldKey).join('+')}`,
          emphasis: lineEmphasis(segments),
          segments,
        });
      }
    });
    if (lines.length > 0) {
      sections.push({ id: section.id, title: section.title, dividerAbove: section.dividerAbove, lines });
    }
  }
  return sections;
}

/** `label: value` or just `value`, segments joined with ` | `. */
export function lineText(line: CardLine): string {
  return line.segments.map(segmentText).join(SEGMENT_SEPARATOR);
}

export function segmentText(segment: CardLineSegment): string {
  return segment.label ? `${segment.label}: ${segment.value}` : segment.value;
}

function segment(field: ResolvedCardField, value: string): CardLineSegment {
  return {
    fieldKey: field.fieldKey,
    label: field.showLabel ? field.label : null,
    value,
    emphasis: field.emphasis,
  };
}

/** STRONG if any segment is strong; MUTED only if all are muted; otherwise NORMAL. */
export function lineEmphasis(segments: readonly { emphasis: CardEmphasis }[]): CardEmphasis {
  if (segments.some((s) => s.emphasis === 'STRONG')) return 'STRONG';
  if (segments.length > 0 && segments.every((s) => s.emphasis === 'MUTED')) return 'MUTED';
  return 'NORMAL';
}
