import type { PricingRate } from '@inventory-platform/contracts';
import { Select } from '@inventory-platform/ui-kit';
import { isRuleRate, rateGstLabel } from '../../lib/pricingRate';

const CUSTOM = '__custom__';

/** Where the picker sits; system and legacy options keep each view's label from before rate rules. */
export type RatePickerLayout = 'list' | 'grid';

function formatInr(n: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

interface RatePickerProps {
  /** System options (MRP / PTR / Cost) and the batch's rates, as the API sent them. */
  rates: PricingRate[];
  /** Name of the option the line is on; Custom when absent. */
  value?: string;
  /** Called with the picked option's name; the page decides what the pick sends. */
  onPick: (rateName: string) => void;
  /** Grid (table) view labels `PTR (₹100.00)`, list (card) view `PTR · ₹100.00` (system and legacy options). */
  layout: RatePickerLayout;
  /** Called when the dropdown is opened, e.g. to load the batch's rates. */
  onOpen?: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

/**
 * A rule rate reads `Rate-A · 83.64/unit + GST · PTR less 8%, 10+1`: price, GST mode and terms
 * exactly as the API sent them. MRP / PTR / Cost and legacy rates keep the label they had before
 * rate rules: `PTR (₹100.00)` in the grid (table) view, `PTR · ₹100.00` in the list (card) view.
 */
export function rateOptionLabel(rate: PricingRate, layout: RatePickerLayout): string {
  if (!isRuleRate(rate)) {
    return layout === 'grid'
      ? `${rate.name} (${formatInr(rate.price)})`
      : `${rate.name} · ${formatInr(rate.price)}`;
  }
  const gst = rateGstLabel(rate.gstMode);
  const price = `${rate.price.toFixed(2)}/unit${gst ? ` ${gst}` : ''}`;
  return [rate.name, price, rate.termsText?.trim() || null].filter(Boolean).join(' · ');
}

function selectedAriaLabel(rate: PricingRate, layout: RatePickerLayout): string {
  return isRuleRate(rate)
    ? `Rate: ${rateOptionLabel(rate, layout)}`
    : `Rate: ${rate.name}, ${formatInr(rate.price)}`;
}

/** Scan & Sell rate dropdown for one cart line. Displays the API's figures; does no arithmetic. */
export function RatePicker({
  rates,
  value,
  onPick,
  layout,
  onOpen,
  disabled,
  loading,
  className,
}: RatePickerProps) {
  const selected = value != null ? rates.find((r) => r.name === value) : undefined;
  const ariaLabel = loading
    ? 'Loading rates'
    : selected
    ? selectedAriaLabel(selected, layout)
    : 'Select selling rate';
  return (
    <Select
      className={className}
      value={selected ? selected.name : CUSTOM}
      onChange={(e) => {
        const name = e.currentTarget.value;
        if (name !== CUSTOM) onPick(name);
      }}
      onMouseDown={onOpen}
      disabled={disabled}
      aria-label={ariaLabel}
      options={[
        { value: CUSTOM, label: 'Custom' },
        ...rates.map((rate) => ({ value: rate.name, label: rateOptionLabel(rate, layout) })),
      ]}
    />
  );
}
