import type { LabelValueType } from '../model/labelLayout.types';

/**
 * Display formatting for card values (configurable-product-card Req 7.2). One place, pure, so
 * every surface prints a rupee, a percentage or a date the same way.
 *
 * - `currency`: `₹` + two decimals, no grouping — `₹120.00`
 * - `percentage`: two decimals + `%` — `5.00%` (matches today's card)
 * - `number`: trailing zeros removed — `9.2`, `10`
 * - `date`: `d MMM yyyy` — `5 Mar 2026`
 * - `text`: trimmed
 *
 * Blank input (`null`, `undefined`, empty / whitespace string, `NaN`) always yields `''`.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function isBlankValue(raw: unknown): boolean {
  if (raw == null) return true;
  if (typeof raw === 'number') return Number.isNaN(raw);
  if (typeof raw === 'string') return raw.trim().length === 0;
  if (Array.isArray(raw)) return raw.length === 0;
  return false;
}

export function formatCardValue(raw: unknown, valueType: LabelValueType): string {
  if (isBlankValue(raw)) return '';
  switch (valueType) {
    case 'currency':
      return formatCurrency(raw);
    case 'percentage':
      return formatPercentage(raw);
    case 'number':
      return formatNumber(raw);
    case 'date':
      return formatDate(raw);
    case 'text':
    default:
      return asText(raw);
  }
}

/** Total string coercion: objects become JSON, symbols their description, never throws. */
function asText(raw: unknown): string {
  if (typeof raw === 'string') return raw.trim();
  if (typeof raw === 'symbol') return (raw.description ?? '').trim();
  if (typeof raw === 'object' && raw !== null && !(raw instanceof Date)) {
    try {
      return JSON.stringify(raw) ?? '';
    } catch {
      return '';
    }
  }
  return String(raw).trim();
}

function toNumber(raw: unknown): number | null {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  if (typeof raw === 'string') {
    const n = Number(raw.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function formatCurrency(raw: unknown): string {
  const n = toNumber(raw);
  return n == null ? asText(raw) : `₹${n.toFixed(2)}`;
}

function formatPercentage(raw: unknown): string {
  const n = toNumber(raw);
  return n == null ? asText(raw) : `${n.toFixed(2)}%`;
}

function formatNumber(raw: unknown): string {
  const n = toNumber(raw);
  if (n == null) return asText(raw);
  // Keep up to 3 decimals but drop trailing zeros: 9.2, 10, 0.125.
  return Number(n.toFixed(3)).toString();
}

export function formatDate(raw: unknown): string {
  const date =
    raw instanceof Date
      ? raw
      : typeof raw === 'string' || typeof raw === 'number'
        ? new Date(raw)
        : new Date(Number.NaN);
  if (Number.isNaN(date.getTime())) {
    return asText(raw).slice(0, 10);
  }
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}
