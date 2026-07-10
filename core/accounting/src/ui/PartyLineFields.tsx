import { useEffect, useMemo, useState } from 'react';
import { customersApi } from '@inventory-platform/user/customers';
import { vendorsApi } from '@inventory-platform/user/vendors';
import type { AccountingPartyType } from '@inventory-platform/accounting/types';
import { SearchInput, Select, type SelectOptionDef, Stack, Text } from '@inventory-platform/ui-kit';
import { isCreditorsAccount, isDebtorsAccount } from '../model/accountingConstants';

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
              })),
            );
          }
        } else {
          const res = await vendorsApi.list({ limit: 25, q: query.trim() || undefined });
          if (!cancelled) {
            setOptions(
              (res.data ?? []).map((v) => ({
                id: v.vendorId,
                label: v.name || v.companyName,
              })),
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

  const selectOptions = useMemo<SelectOptionDef[]>(() => {
    const placeholder = loading ? 'Loading…' : kind === 'CUSTOMER' ? '— Customer —' : '— Vendor —';
    const base: SelectOptionDef[] = [{ value: '', label: placeholder }];
    if (partyRefId && partyDisplayName && !options.some((o) => o.id === partyRefId)) {
      base.push({ value: partyRefId, label: partyDisplayName });
    }
    return [...base, ...options.map((o) => ({ value: o.id, label: o.label }))];
  }, [kind, loading, options, partyDisplayName, partyRefId]);

  if (!kind) return null;

  return (
    <Stack gap="xs">
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder={kind === 'CUSTOMER' ? 'Search customer…' : 'Search vendor…'}
        disabled={disabled}
      />
      <Select
        value={partyRefId ?? ''}
        options={selectOptions}
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
      />
      {partyType && partyType !== kind ? (
        <Text variant="caption" color="secondary">
          Party type will update for this account.
        </Text>
      ) : null}
    </Stack>
  );
}
