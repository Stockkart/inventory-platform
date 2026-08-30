import { useState } from 'react';
import type { HistoryFilters, HistoryTab } from './historyFilters';
import { showCustomerFilter, showVendorFilter, validateHistoryFilters } from './historyFilters';
import {
  Alert,
  Box,
  Button,
  FormField,
  Inline,
  Input,
  Stack,
  Text,
  productChrome,
} from '@inventory-platform/ui-kit';

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
    <Stack
      gap="sm"
      width="full"
      padding="none"
      className={productChrome.historyFiltersBar}
      aria-label="History filters"
    >
      <Inline gap="sm" align="end" flexWrap>
        <Box className={productChrome.historyFilterField}>
          <FormField label="From" id="history-date-from">
            <Input
              id="history-date-from"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => set({ dateFrom: e.target.value })}
            />
          </FormField>
        </Box>
        <Box className={productChrome.historyFilterField}>
          <FormField label="To" id="history-date-to">
            <Input
              id="history-date-to"
              type="date"
              value={filters.dateTo}
              onChange={(e) => set({ dateTo: e.target.value })}
            />
          </FormField>
        </Box>
        <Box className={productChrome.historyFilterField}>
          <FormField label="Invoice no." id="history-invoice">
            <Input
              id="history-invoice"
              type="text"
              value={filters.invoiceNo}
              onChange={(e) => set({ invoiceNo: e.target.value })}
              placeholder="e.g. INV-001"
            />
          </FormField>
        </Box>
        {showCustomer ? (
          <Box className={productChrome.historyFilterField}>
            <FormField label="Customer" id="history-customer">
              <Input
                id="history-customer"
                type="text"
                value={filters.customer}
                onChange={(e) => set({ customer: e.target.value })}
                placeholder="Name, phone or email"
              />
            </FormField>
          </Box>
        ) : null}
        {showVendor ? (
          <Box className={productChrome.historyFilterField}>
            <FormField label="Vendor" id="history-vendor">
              <Input
                id="history-vendor"
                type="text"
                value={filters.vendor}
                onChange={(e) => set({ vendor: e.target.value })}
                placeholder="Vendor name"
              />
            </FormField>
          </Box>
        ) : null}
        <Inline gap="sm" className={productChrome.historyFilterActions}>
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
      <Text variant="caption" color="secondary">
        {TAB_HINTS[activeTab]}
      </Text>
    </Stack>
  );
}
