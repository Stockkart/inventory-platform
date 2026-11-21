import type { PricingRate } from '@inventory-platform/contracts';
import { useState } from 'react';
import { ChoiceList, FilterDropdown } from '@inventory-platform/ui-kit';
import { isRuleRate, rateGstLabel } from '../../lib/pricingRate';
import type { RateOption } from '../../lib/scanSellRatePick';

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
  /** System options (MRP / PTR / Cost) and the batch's rates (`buildRateOptions`). */
  options: RateOption[];
  /** `value` of the option the line is on; Custom when absent. */
  value?: string;
  /** Called with the picked option's `value`; the page decides what the pick sends. */
  onPick: (value: string) => void;
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

/**
 * Scan & Sell rate dropdown for one cart line: the ui-kit `FilterDropdown` with a `ChoiceList`,
 * as Product Search's sort. It reads `Rate: <option>`, or `Rate: Custom` when the line's price
 * matches no option (Custom is not offered, as picking it never changed the line). Picking the
 * option already shown does nothing. Displays the API's figures; does no arithmetic.
 */
export function RatePicker({
  options,
  value,
  onPick,
  layout,
  onOpen,
  disabled,
  loading,
  className,
}: RatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = value != null ? options.find((o) => o.value === value) : undefined;
  const shown = loading
    ? 'Loading rates…'
    : selected
    ? rateOptionLabel(selected.rate, layout)
    : 'Custom';
  return (
    <FilterDropdown
      block
      className={className}
      label="Rate"
      value={shown}
      panelTitle="Selling rate"
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) onOpen?.();
      }}
      disabled={disabled}
    >
      <ChoiceList
        aria-label="Selling rates"
        value={selected?.value ?? ''}
        options={options.map((option) => ({
          value: option.value,
          label: rateOptionLabel(option.rate, layout),
        }))}
        onChange={(picked) => {
          setOpen(false);
          if (picked !== selected?.value) onPick(picked);
        }}
      />
    </FilterDropdown>
  );
}
