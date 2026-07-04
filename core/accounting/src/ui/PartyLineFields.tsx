import { useEffect, useState } from 'react';
import { customersApi } from '@inventory-platform/user/customers';
import { vendorsApi } from '@inventory-platform/user/vendors';
import type { AccountingPartyType } from '@inventory-platform/types';
import { isCreditorsAccount, isDebtorsAccount } from '../model/accountingConstants';
import styles from './accounting.module.css';

type Props = {
  accountCode: string;
  partyType?: AccountingPartyType;
  partyRefId?: string;
  partyDisplayName?: string;
  onChange: (patch: {
    partyType?: 'CUSTOMER' | 'VENDOR';
    partyRefId?: string;
    partyDisplayName?: string;
  }) => void;
  disabled?: boolean;
};

export function PartyLineFields({
  accountCode,
  partyType,
  partyRefId,
  partyDisplayName,
  onChange,
  disabled,
}: Props) {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<Array<{ id: string; label: string }>>([]);
  const [loading, setLoading] = useState(false);

  const kind = isDebtorsAccount(accountCode)
    ? 'CUSTOMER'
    : isCreditorsAccount(accountCode)
      ? 'VENDOR'
      : null;

  useEffect(() => {
    if (!kind) return;
    let cancelled = false;
    const t = window.setTimeout(async () => {
      setLoading(true);
      try {
        if (kind === 'CUSTOMER') {
          const res = await customersApi.list({ limit: 25, q: query.trim() || undefined });
          if (!cancelled) {
            setOptions(
              (res.data ?? []).map((c) => ({
                id: c.customerId,
                label: c.name + (c.phone ? ` · ${c.phone}` : ''),
              }))
            );
          }
        } else {
          const res = await vendorsApi.list({ limit: 25, q: query.trim() || undefined });
          if (!cancelled) {
            setOptions(
              (res.data ?? []).map((v) => ({
                id: v.vendorId,
                label: v.name || v.companyName,
              }))
            );
          }
        }
      } catch {
        if (!cancelled) setOptions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [kind, query]);

  if (!kind) return null;

  return (
    <div className={styles.partyFields}>
      <input
        type="search"
        className={styles.partySearch}
        placeholder={kind === 'CUSTOMER' ? 'Search customer…' : 'Search vendor…'}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        disabled={disabled}
      />
      <select
        value={partyRefId ?? ''}
        onChange={(e) => {
          const id = e.target.value;
          const opt = options.find((o) => o.id === id);
          onChange({
            partyType: kind,
            partyRefId: id || undefined,
            partyDisplayName: opt?.label.split(' · ')[0],
          });
        }}
        disabled={disabled || loading}
      >
        <option value="">
          {loading ? 'Loading…' : kind === 'CUSTOMER' ? '— Customer —' : '— Vendor —'}
        </option>
        {partyRefId &&
        partyDisplayName &&
        !options.some((o) => o.id === partyRefId) ? (
          <option value={partyRefId}>{partyDisplayName}</option>
        ) : null}
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      {partyType && partyType !== kind ? (
        <span className={styles.accountPickerHint}>Party type will update for this account.</span>
      ) : null}
    </div>
  );
}
