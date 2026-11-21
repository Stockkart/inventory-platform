import type { PlanMisParams } from '@inventory-platform/plan/types';

export type MisPreset = 'last30' | 'thisMonth' | 'lastMonth' | 'last12Months';

export const MIS_PRESETS: ReadonlyArray<{ key: MisPreset; label: string }> = [
  { key: 'last30', label: 'Last 30 days' },
  { key: 'thisMonth', label: 'This month' },
  { key: 'lastMonth', label: 'Last month' },
  { key: 'last12Months', label: 'Last 12 months' },
];

/** Matches the server's cap: both days inclusive, at most 366 of them. */
export const MIS_MAX_DAYS = 366;

const DAY_MS = 86_400_000;

function isoDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

export function misPresetRange(preset: MisPreset, today: Date = new Date()): PlanMisParams {
  const to = isoDate(today);
  switch (preset) {
    case 'thisMonth':
      return { from: isoDate(new Date(today.getFullYear(), today.getMonth(), 1)), to };
    case 'lastMonth':
      return {
        from: isoDate(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
        to: isoDate(new Date(today.getFullYear(), today.getMonth(), 0)),
      };
    case 'last12Months':
      return { from: isoDate(addDays(today, -(MIS_MAX_DAYS - 1))), to };
    case 'last30':
    default:
      return { from: isoDate(addDays(today, -29)), to };
  }
}

/** A message to show instead of querying, or null when the range is fine. */
export function misRangeError({ from, to }: PlanMisParams): string | null {
  if (!from || !to) return 'Choose both dates.';
  if (from > to) return 'The start date must not be after the end date.';
  const days = Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS) + 1;
  if (days > MIS_MAX_DAYS) return `Choose at most ${MIS_MAX_DAYS} days.`;
  return null;
}

export function formatPercent(value: number | null | undefined): string {
  return value == null ? '—' : `${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}%`;
}

export function formatCount(value: number): string {
  return value.toLocaleString('en-IN');
}
