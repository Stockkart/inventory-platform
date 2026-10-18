import type { PricingRate } from '@inventory-platform/contracts';
import { Select } from '@inventory-platform/ui-kit';
import { rateGstLabel } from '../../lib/pricingRate';

const CUSTOM = '__custom__';

interface RatePickerProps {
  /** System options (MRP / PTR / Cost) and the batch's rates, as the API sent them. */
  rates: PricingRate[];
  /** Name of the option the line is on; Custom when absent. */
  value?: string;
  /** Called with the picked option's name; the page decides what the pick sends. */
  onPick: (rateName: string) => void;
  /** Called when the dropdown is opened, e.g. to load the batch's rates. */
  onOpen?: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

/**
 * `Rate-A · 83.64/unit + GST · PTR less 8%, 10+1`: price, GST mode and terms exactly as the API
 * sent them; a legacy rate or system option has no terms and shows name and price only.
 */
export function rateOptionLabel(rate: PricingRate): string {
  const gst = rateGstLabel(rate.gstMode);
  const price = `${rate.price.toFixed(2)}/unit${gst ? ` ${gst}` : ''}`;
  return [rate.name, price, rate.termsText?.trim() || null].filter(Boolean).join(' · ');
}

/** Scan & Sell rate dropdown for one cart line. Displays the API's figures; does no arithmetic. */
export function RatePicker({
  rates,
  value,
  onPick,
  onOpen,
  disabled,
  loading,
  className,
}: RatePickerProps) {
  const selected = value != null ? rates.find((r) => r.name === value) : undefined;
  const ariaLabel = loading
    ? 'Loading rates'
    : selected
    ? `Rate: ${rateOptionLabel(selected)}`
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
        ...rates.map((rate) => ({ value: rate.name, label: rateOptionLabel(rate) })),
      ]}
    />
  );
}
