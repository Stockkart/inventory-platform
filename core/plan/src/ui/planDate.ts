/**
 * The one display date for the plan area, e.g. "21 Nov 2027": the Indian calendar day, in the
 * day-month-year style the rest of the app uses. Null when the API sent no date or an unreadable one.
 */
export function formatPlanDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return null;
  return new Date(time).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}
