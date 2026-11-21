/**
 * Date arithmetic for the history screen (R4.10): the attendance day is the calendar date in
 * Asia/Kolkata, which is UTC+05:30 all year with no daylight saving, so the conversion is a fixed
 * shift and needs no time-zone database on the phone (Hermes ships none).
 *
 * Pure; no Expo or React Native import.
 */

/** Asia/Kolkata is UTC+05:30, fixed. */
export const KOLKATA_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

const DAY_MS = 24 * 60 * 60 * 1000;

/** The 31-day history window: today and the 30 days before it (R4.10). */
export const HISTORY_WINDOW_DAYS = 31;

/** `yyyy-MM-dd` of an instant in Asia/Kolkata. */
export function kolkataDate(epochMs: number): string {
  const shifted = new Date(epochMs + KOLKATA_OFFSET_MS);
  return `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}-${pad2(
    shifted.getUTCDate(),
  )}`;
}

/** `HH:mm`, 24-hour, of an instant in Asia/Kolkata (R4.7, R4.10). */
export function kolkataTime(epochMs: number): string {
  const shifted = new Date(epochMs + KOLKATA_OFFSET_MS);
  return `${pad2(shifted.getUTCHours())}:${pad2(shifted.getUTCMinutes())}`;
}

/** `date` (`yyyy-MM-dd`) moved by `days` calendar days; negative goes back. */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const moved = new Date(Date.UTC(y, m - 1, d) + days * DAY_MS);
  return `${moved.getUTCFullYear()}-${pad2(moved.getUTCMonth() + 1)}-${pad2(moved.getUTCDate())}`;
}

/**
 * The `from` / `to` dates of the history read (R4.10): `to` is today in Asia/Kolkata, `from` is
 * 30 days earlier, so the window holds 31 calendar days including today.
 */
export function historyWindow(nowMs: number): { from: string; to: string } {
  const to = kolkataDate(nowMs);
  return { from: addDays(to, -(HISTORY_WINDOW_DAYS - 1)), to };
}

/** Parses an ISO instant to epoch ms, or null when it is not a date. */
export function parseInstant(iso: string): number | null {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}
