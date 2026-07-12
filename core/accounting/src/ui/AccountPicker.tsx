import { useMemo } from 'react';
import type { AccountResponse } from '@inventory-platform/accounting/types';
import { Select, type SelectOptionDef } from '@inventory-platform/ui-kit';

type Props = {
  accounts: AccountResponse[];
  value: string;
  onChange: (accountCode: string) => void;
  disabled?: boolean;
  id?: string;
};

export function AccountPicker({ accounts, value, onChange, disabled, id }: Props) {
  const active = useMemo(
    () => accounts.filter((a) => a.active).sort((a, b) => a.code.localeCompare(b.code)),
    [accounts],
  );

  const options = useMemo<SelectOptionDef[]>(
    () => [
      { value: '', label: 'Select account…' },
      ...active.map((a) => ({
        value: a.code,
        label: `${a.code} · ${a.name}`,
      })),
    ],
    [active],
  );

  return (
    <Select
      id={id}
      aria-label="Account"
      value={value}
      options={options}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    />
  );
}
