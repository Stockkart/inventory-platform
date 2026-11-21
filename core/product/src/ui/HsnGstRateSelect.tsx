import { Select } from '@inventory-platform/ui-kit';
import { useHsnGstRatesQuery } from '../queries/hooks';

export interface HsnGstRateSelectProps {
  hsn: string | undefined;
  cgst: string | undefined;
  sgst: string | undefined;
  /** Called with the CGST and SGST of the rate picked; the caller stores them on the row. */
  onPick: (cgst: string, sgst: string) => void;
  id?: string;
  className?: string;
  disabled?: boolean;
}

function sameRate(offered: number, typed: string | undefined): boolean {
  return typed != null && typed.trim() !== '' && Number(typed) === offered;
}

/**
 * GST choices for a stock-in row, from the rate notifications for its HSN. Picking one fills the
 * row's CGST and SGST, which stay editable: an HSN not on file, or goods the table does not name,
 * are typed by hand and show here as "Custom".
 */
export function HsnGstRateSelect({
  hsn,
  cgst,
  sgst,
  onPick,
  id,
  className,
  disabled,
}: HsnGstRateSelectProps) {
  const { data } = useHsnGstRatesQuery(hsn);
  const options = data?.rates ?? [];
  const picked = options.findIndex(
    (option) => sameRate(option.cgst, cgst) && sameRate(option.sgst, sgst),
  );
  const typedByHand = Boolean(cgst?.trim() || sgst?.trim());
  const emptyLabel = options.length === 0 ? '—' : typedByHand ? 'Custom' : 'Choose';

  return (
    <Select
      id={id}
      className={className}
      aria-label="GST rate for this HSN"
      title={data?.ref ?? undefined}
      value={picked >= 0 ? String(picked) : ''}
      onChange={(e) => {
        const option = options[Number(e.target.value)];
        if (e.target.value !== '' && option) onPick(String(option.cgst), String(option.sgst));
      }}
      disabled={disabled || options.length === 0}
    >
      <option value="">{emptyLabel}</option>
      {options.map((option, index) => (
        <option key={option.gstRate} value={String(index)}>
          {`${option.gstRate}%`}
        </option>
      ))}
    </Select>
  );
}
