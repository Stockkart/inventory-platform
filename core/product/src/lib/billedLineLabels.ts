/**
 * Labels a billed line shows for the terms it was sold on.
 *
 * Sale history, estimates and checkout all render the same line from the same cart, so
 * they read these from one place: a scheme that prints as `— + —` on one screen and as
 * `5%` on another is the same bill disagreeing with itself.
 *
 * Typed structurally rather than against a response DTO, since the cart and the completed
 * sale carry these fields under the same names but not the same type.
 */

export interface BilledLineScheme {
  schemeType?: string | null;
  schemePercentage?: number | null;
  schemePayFor?: number | null;
  schemeFree?: number | null;
}

/** Percent as it was entered, without the trailing zeros a fixed format would add. */
export function formatPercent(value: number): string {
  return `${Number(value.toFixed(2))}%`;
}

/**
 * The scheme the line was billed on: a percentage, or a pay-for/free pair, or nothing.
 * Reads the sale-side fields; the purchase-side ones are what the stock was bought on,
 * not sold on.
 */
export function schemeLabel(item: BilledLineScheme): string {
  if (item.schemeType === 'PERCENTAGE' && item.schemePercentage) {
    return formatPercent(item.schemePercentage);
  }
  if (item.schemePayFor != null && item.schemeFree != null) {
    return `${item.schemePayFor}+${item.schemeFree}`;
  }
  return '—';
}
