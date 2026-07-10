import { useMemo, useState } from 'react';
import type { AccountResponse } from '@inventory-platform/accounting/types';
import { SearchInput, Select, type SelectOptionDef, Stack, Text } from '@inventory-platform/ui-kit';
import styles from './accounting.module.css';

type Props = {
  accounts: AccountResponse[];
  value: string;
  onChange: (accountCode: string) => void;
  disabled?: boolean;
  id?: string;
};

export function AccountPicker({ accounts, value, onChange, disabled, id }: Props) {
  const [query, setQuery] = useState('');

  const active = useMemo(
    () => accounts.filter((a) => a.active).sort((a, b) => a.code.localeCompare(b.code)),
    [accounts],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return active;
    return active.filter(
      (a) =>
        a.code.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.type.toLowerCase().includes(q),
    );
  }, [active, query]);

  const options = useMemo<SelectOptionDef[]>(
    () => [
      { value: '', label: '— Select account —' },
      ...filtered.map((a) => ({
        value: a.code,
        label: `${a.code} · ${a.name}`,
      })),
    ],
    [filtered],
  );

  const selected = active.find((a) => a.code === value);

  return (
    <Stack gap="xs" className={styles.accountPicker}>
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="Filter accounts…"
        className={styles.accountPickerSearch}
        disabled={disabled}
      />
      <Select
        id={id}
        value={value}
        options={options}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={styles.accountPickerSelect}
      />
      {selected ? (
        <Text variant="caption" color="secondary" className={styles.accountPickerHint}>
          {selected.type} · {selected.normalBalance}
        </Text>
      ) : null}
    </Stack>
  );
}
