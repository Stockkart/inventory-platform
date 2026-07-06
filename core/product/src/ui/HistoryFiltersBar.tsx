import { useState } from 'react';
import type { HistoryFilters, HistoryTab } from './historyFilters';
import {
  showCustomerFilter,
  showVendorFilter,
  validateHistoryFilters,
} from './historyFilters';
import {
  Alert,
  Box,
  Button,
  FormField,
  Inline,
  Input,
  Text,
} from '@inventory-platform/ui-kit';
import styles from './HistoryFiltersBar.module.css';

type HistoryFiltersBarProps = {
  filters: HistoryFilters;
  onChange: (next: HistoryFilters) => void;
  onApply: () => void;
  onClear: () => void;
  activeTab: HistoryTab;
  hasAppliedFilters: boolean;
};

const TAB_HINTS: Record<HistoryTab, string> = {
  saleHistory: 'Narrow sale invoices by date, invoice number, or customer.',
  purchaseHistory: 'Narrow purchase bills by date, invoice number, or vendor.',
  customerReturnHistory: 'Narrow credit notes by date, invoice number, or customer.',
  vendorReturnHistory: 'Narrow supplier returns by date, invoice number, or vendor.',
};

export function HistoryFiltersBar({
  filters,
  onChange,
  onApply,
  onClear,
  activeTab,
  hasAppliedFilters,
}: HistoryFiltersBarProps) {
  const [regexError, setRegexError] = useState<string | null>(null);
  const showCustomer = showCustomerFilter(activeTab);
  const showVendor = showVendorFilter(activeTab);

  const set = (patch: Partial<HistoryFilters>) => {
    setRegexError(null);
    onChange({ ...filters, ...patch });
  };

  const handleApply = () => {
    const err = validateHistoryFilters(filters, activeTab);
    if (err) {
      setRegexError(err);
      return;
    }
    setRegexError(null);
    onApply();
  };

  const handleClear = () => {
    setRegexError(null);
    onClear();
  };

  return (
    <Box className={styles.bar} aria-label="History filters">
      <Inline className={styles.row} gap="sm" align="end">
        <FormField label="From" id="history-date-from" className={styles.field}>
          <Input
            id="history-date-from"
            type="date"
            value={filters.dateFrom}
            onChange={(e) => set({ dateFrom: e.target.value })}
          />
        </FormField>
        <FormField label="To" id="history-date-to" className={styles.field}>
          <Input
            id="history-date-to"
            type="date"
            value={filters.dateTo}
            onChange={(e) => set({ dateTo: e.target.value })}
          />
        </FormField>
        <FormField label="Invoice no." id="history-invoice" className={styles.field}>
          <Input
            id="history-invoice"
            type="text"
            value={filters.invoiceNo}
            onChange={(e) => set({ invoiceNo: e.target.value })}
            placeholder="e.g. INV-001"
          />
        </FormField>
        {showCustomer ? (
          <FormField label="Customer" id="history-customer" className={styles.field}>
            <Input
              id="history-customer"
              type="text"
              value={filters.customer}
              onChange={(e) => set({ customer: e.target.value })}
              placeholder="Name or phone"
            />
          </FormField>
        ) : null}
        {showVendor ? (
          <FormField label="Vendor" id="history-vendor" className={styles.field}>
            <Input
              id="history-vendor"
              type="text"
              value={filters.vendor}
              onChange={(e) => set({ vendor: e.target.value })}
              placeholder="Vendor name"
            />
          </FormField>
        ) : null}
        <Inline className={styles.actions} gap="sm">
          <Button type="button" variant="solid" size="sm" onClick={handleApply}>
            Apply
          </Button>
          {hasAppliedFilters ? (
            <Button type="button" variant="outline" size="sm" onClick={handleClear}>
              Clear
            </Button>
          ) : null}
        </Inline>
      </Inline>
      {regexError ? <Alert variant="danger">{regexError}</Alert> : null}
      <Text variant="caption" color="secondary" className={styles.hint}>
        {TAB_HINTS[activeTab]}
      </Text>
    </Box>
  );
}
