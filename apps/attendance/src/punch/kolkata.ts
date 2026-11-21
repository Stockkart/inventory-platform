/**
 * Date helpers for the home screen (R4.1: "today's date (Asia/Kolkata)"). Pure arithmetic rather
 * than `Intl`, so the result is the same on Hermes and in node. India Standard Time is UTC+05:30
 * with no daylight saving, so a fixed offset is exact.
 */

/** Asia/Kolkata offset from UTC in minutes. */
export const KOLKATA_OFFSET_MINUTES = 330;

/** The attendance day (`yyyy-MM-dd`) in Asia/Kolkata for an instant. */
export function kolkataDate(at: Date): string {
  if (Number.isNaN(at.getTime())) {
    throw new Error('kolkataDate needs a valid date');
  }
  return new Date(at.getTime() + KOLKATA_OFFSET_MINUTES * 60_000).toISOString().slice(0, 10);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * A `yyyy-MM-dd` day as the screen shows it, e.g. `Thu, 3 Apr 2025`. Returns the input unchanged
 * when it is not a calendar date, so a surprising server value is shown rather than hidden.
 */
export function displayDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) {
    return isoDate;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return isoDate;
  }
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (utc.getUTCDate() !== day) {
    return isoDate;
  }
  return `${WEEKDAYS[utc.getUTCDay()]}, ${day} ${MONTHS[month - 1]} ${year}`;
}

/** The button label for the direction the next punch would have (R4.1a). */
export function punchButtonLabel(nextDirection: 'IN' | 'OUT'): 'Check in' | 'Check out' {
  return nextDirection === 'IN' ? 'Check in' : 'Check out';
}
