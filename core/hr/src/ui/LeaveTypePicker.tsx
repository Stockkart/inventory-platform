import { useState } from 'react';
import { ChoiceList, FilterDropdown } from '@inventory-platform/ui-kit';
import { formatDays, type LeaveTypeResponse } from '@inventory-platform/hr/types';

export interface LeaveTypePickerProps {
  value: string;
  /** Active types only; inactive ones cannot take new leave. */
  types: readonly LeaveTypeResponse[];
  onChange: (leaveTypeId: string) => void;
  disabled?: boolean;
}

/** App dropdown (R13.4) for a leave type: name, with paid/unpaid and the yearly quota as a hint. */
export function LeaveTypePicker({ value, types, onChange, disabled }: LeaveTypePickerProps) {
  const [open, setOpen] = useState(false);
  const options = types.map((t) => ({
    value: t.id,
    label: t.name,
    hint: `${t.paid ? 'Paid' : 'Unpaid'} · ${
      t.yearlyQuotaDays == null ? 'no limit' : `${formatDays(t.yearlyQuotaDays)} a year`
    }`,
  }));
  const current = types.find((t) => t.id === value);
  return (
    <FilterDropdown
      label="Leave type"
      value={current?.name ?? 'Choose'}
      open={open}
      onOpenChange={setOpen}
      disabled={disabled}
      wide
    >
      <ChoiceList
        aria-label="Leave type"
        options={options}
        value={value}
        onChange={(v) => {
          setOpen(false);
          onChange(v);
        }}
      />
    </FilterDropdown>
  );
}
