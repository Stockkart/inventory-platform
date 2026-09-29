/**
 * A billed sale's totals worked from its lines, the way the printed invoice and GSTR-1 read
 * the same sale: the value before the additional discount, the taxable value after it, and the
 * CGST and SGST at each rate.
 *
 * Worked from the lines rather than read from the sale's header because the header of a sale
 * with lines sold at MRP stated no GST on them, and a subtotal that still held it. A line's
 * amount always includes its GST, so its taxable value is that amount with the GST taken out
 * at the line's own rate -- which holds whether the GST was added on top of the rate or was
 * already inside an MRP.
 *
 * Typed structurally, like billedLineLabels, since the cart and the completed sale carry these
 * fields under the same names but not the same type.
 */

export interface TaxedLine {
  quantity?: number | null;
  baseQuantity?: number | null;
  unitFactor?: number | null;
  maximumRetailPrice?: number | null;
  priceToRetail?: number | null;
  saleAdditionalDiscount?: number | null;
  totalAmount?: number | null;
  cgst?: string | null;
  sgst?: string | null;
  schemeType?: string | null;
  schemePercentage?: number | null;
  schemePayFor?: number | null;
  schemeFree?: number | null;
}

export interface GstRateRow {
  cgstRate: number;
  sgstRate: number;
  taxableValue: number;
  cgstAmount: number;
  sgstAmount: number;
}

export interface SaleTaxSummary {
  /** Before the additional discount, at each line's taxable rate. */
  subTotal: number;
  additionalDiscount: number;
  taxableValue: number;
  rows: GstRateRow[];
}

// Half up to the paisa, as the invoice rounds. Trimmed to 12 significant digits first so a half
// paisa held in binary as 304.16499… still rounds up rather than down.
const round2 = (value: number) => Math.round(Number((value * 100).toPrecision(12))) / 100;

function parseRate(raw: string | null | undefined): number {
  const n = Number(String(raw ?? '').trim());
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Quantity in pricing units, then the part of it paid for under a pay-for/free scheme. */
function billableQuantity(line: TaxedLine): number {
  const qty =
    line.baseQuantity != null && line.unitFactor != null && line.unitFactor > 0
      ? line.baseQuantity / line.unitFactor
      : line.quantity ?? 0;
  const payFor = line.schemePayFor ?? 0;
  const free = line.schemeFree ?? 0;
  if (line.schemeType === 'FIXED_UNITS' && payFor > 0 && free >= 0) {
    return (qty * payFor) / (payFor + free);
  }
  return qty;
}

/**
 * The line's price as the RATE column prints it: before tax. A line sold at MRP has its GST
 * inside the price, so it is taken out; any other line's rate is already before tax.
 */
export function taxableRate(line: TaxedLine): number {
  const price = line.priceToRetail ?? 0;
  const rate = parseRate(line.cgst) + parseRate(line.sgst);
  const atMrp = line.maximumRetailPrice != null && price === line.maximumRetailPrice;
  return round2(atMrp && rate > 0 ? (price * 100) / (100 + rate) : price);
}

/** The taxable rate with a percentage scheme applied, which is what the line is billed at. */
function taxableSellingPrice(line: TaxedLine): number {
  const price = line.priceToRetail ?? 0;
  const pct = line.schemePercentage ?? 0;
  const afterScheme = line.schemeType === 'PERCENTAGE' && pct > 0 ? price * (1 - pct / 100) : price;
  return round2(price > 0 ? (taxableRate(line) * afterScheme) / price : 0);
}

/**
 * Null when a line has no amount, or no line carries tax: there is then nothing to work from,
 * and the sale's own header totals are the ones to show.
 */
export function summariseSaleTax(lines: TaxedLine[]): SaleTaxSummary | null {
  const rows = new Map<string, GstRateRow & { tax: number }>();
  let subTotal = 0;
  let taxableValue = 0;
  for (const line of lines) {
    if (line.totalAmount == null) return null;
    const cgstRate = parseRate(line.cgst);
    const sgstRate = parseRate(line.sgst);
    const rate = cgstRate + sgstRate;
    const lineTaxable =
      rate > 0 ? round2((line.totalAmount * 100) / (100 + rate)) : line.totalAmount;
    subTotal += round2(taxableSellingPrice(line) * billableQuantity(line));
    taxableValue += lineTaxable;
    if (rate <= 0) continue;
    // Keyed on the rate's value, not its spelling: "9" and "9.00" are one rate.
    const key = `${cgstRate}|${sgstRate}`;
    const row = rows.get(key) ?? {
      cgstRate,
      sgstRate,
      taxableValue: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      tax: 0,
    };
    row.taxableValue += lineTaxable;
    row.tax += line.totalAmount - lineTaxable;
    rows.set(key, row);
  }
  if (rows.size === 0) return null;
  subTotal = round2(subTotal);
  taxableValue = round2(taxableValue);
  return {
    subTotal,
    additionalDiscount: round2(subTotal - taxableValue),
    taxableValue,
    // Split once per rate, not per line, so the two halves do not drift a paisa a line apart.
    rows: [...rows.values()].map(({ tax, ...row }) => {
      const cgstAmount = round2((tax * row.cgstRate) / (row.cgstRate + row.sgstRate));
      return {
        ...row,
        taxableValue: round2(row.taxableValue),
        cgstAmount,
        sgstAmount: round2(tax - cgstAmount),
      };
    }),
  };
}
