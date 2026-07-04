import { useMemo, useState } from 'react';
import type { AccountResponse } from '@inventory-platform/types';
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
    [accounts]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return active;
    return active.filter(
      (a) =>
        a.code.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.type.toLowerCase().includes(q)
    );
  }, [active, query]);

  const selected = active.find((a) => a.code === value);

  return (
    <div className={styles.accountPicker}>
      <input
        type="search"
        className={styles.accountPickerSearch}
        placeholder="Filter accounts…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        disabled={disabled}
        aria-label="Filter accounts"
      />
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={styles.accountPickerSelect}
      >
        <option value="">— Select account —</option>
        {filtered.map((a) => (
          <option key={a.id} value={a.code}>
            {a.code} · {a.name}
          </option>
        ))}
      </select>
      {selected ? (
        <span className={styles.accountPickerHint}>
          {selected.type} · {selected.normalBalance}
        </span>
      ) : null}
    </div>
  );
}
