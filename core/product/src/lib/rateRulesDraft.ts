import type { RateRule, RateRuleBase, RateRuleScheme } from '../model/rateRules.types';

/** One editable row. `key` is a client-only id so rows keep their identity while reordered. */
export interface RateRuleDraft {
  key: string;
  name: string;
  base: RateRuleBase;
  /** Text as typed; empty means no discount. Parsed to a number only when saving. */
  discount: string;
  scheme: RateRuleScheme | null;
}

export interface RateRulesDraft {
  rules: RateRuleDraft[];
}

/** Display text for the base keys the API offers. Unknown keys show as sent. */
const BASE_LABELS: Record<string, string> = {
  priceToRetail: 'PTR',
  maximumRetailPrice: 'MRP',
  sellingPrice: 'Selling price',
};

export function baseLabel(base: string): string {
  return BASE_LABELS[base] ?? base;
}

let nextKey = 0;
export function newRuleKey(): string {
  nextKey += 1;
  return `rule-${nextKey}`;
}

export function draftFromRules(rules: readonly RateRule[]): RateRulesDraft {
  return {
    rules: rules.map((rule) => ({
      key: newRuleKey(),
      name: rule.name,
      base: rule.base,
      discount: rule.discountPercent == null ? '' : String(rule.discountPercent),
      scheme: rule.scheme ?? null,
    })),
  };
}

export function emptyRule(base: RateRuleBase): RateRuleDraft {
  return { key: newRuleKey(), name: '', base, discount: '', scheme: null };
}

function parseDiscount(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Rows in the shape the API takes. The server validates names, bases and ranges. */
export function toRules(draft: RateRulesDraft): RateRule[] {
  return draft.rules.map((row) => ({
    name: row.name.trim(),
    base: row.base,
    discountPercent: parseDiscount(row.discount),
    scheme: row.scheme,
  }));
}

/** Same rows without the blank-named ones, for a live preview of the draft. */
export function toPreviewRules(draft: RateRulesDraft): RateRule[] {
  return toRules(draft).filter((rule) => rule.name !== '');
}

/** Moves the row at `index` one place up or down; out-of-range moves return the list unchanged. */
export function moveRule<T>(list: readonly T[], index: number, dir: 'up' | 'down'): T[] {
  const target = dir === 'up' ? index - 1 : index + 1;
  if (index < 0 || index >= list.length || target < 0 || target >= list.length) return [...list];
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function draftsEqual(a: RateRulesDraft, b: RateRulesDraft): boolean {
  return JSON.stringify(toRules(a)) === JSON.stringify(toRules(b));
}

/** Scheme as the text the scheme box shows ("10 + 1" or "5%"), for read-only rows. */
export function schemeText(scheme: RateRuleScheme | null | undefined): string {
  if (!scheme) return '';
  if (scheme.schemeType === 'PERCENTAGE' && scheme.schemePercentage != null) {
    return `${scheme.schemePercentage}%`;
  }
  if (scheme.schemePayFor != null || scheme.schemeFree != null) {
    return `${scheme.schemePayFor ?? 0} + ${scheme.schemeFree ?? 0}`;
  }
  return '';
}

/** A skipped or warned rate's server reason in words, e.g. "BELOW_COST" -> "below cost". Wording only. */
export function skippedReasonText(reason: string): string {
  return reason.replace(/_/g, ' ').toLowerCase();
}
