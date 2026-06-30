import { useState, type FormEvent } from 'react';
import type { HistoryFilters, HistoryTab } from './historyFilters';
import {
  showCustomerFilter,
  showVendorFilter,
  validateHistoryFilters,
} from './historyFilters';
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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
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
    <form className={styles.bar} onSubmit={handleSubmit} aria-label="History filters">
      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="history-date-from" className={styles.label}>
            From
          </label>
          <input
            id="history-date-from"
            type="date"
            className={styles.input}
            value={filters.dateFrom}
            onChange={(e) => set({ dateFrom: e.target.value })}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="history-date-to" className={styles.label}>
            To
          </label>
          <input
            id="history-date-to"
            type="date"
            className={styles.input}
            value={filters.dateTo}
            onChange={(e) => set({ dateTo: e.target.value })}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="history-invoice" className={styles.label}>
            Invoice no.
          </label>
          <input
            id="history-invoice"
            type="text"
            className={styles.input}
            value={filters.invoiceNo}
            onChange={(e) => set({ invoiceNo: e.target.value })}
            placeholder="e.g. INV-001"
          />
        </div>
        {showCustomer ? (
          <div className={styles.field}>
            <label htmlFor="history-customer" className={styles.label}>
              Customer
            </label>
            <input
              id="history-customer"
              type="text"
              className={styles.input}
              value={filters.customer}
              onChange={(e) => set({ customer: e.target.value })}
              placeholder="Name or phone"
            />
          </div>
        ) : null}
        {showVendor ? (
          <div className={styles.field}>
            <label htmlFor="history-vendor" className={styles.label}>
              Vendor
            </label>
            <input
              id="history-vendor"
              type="text"
              className={styles.input}
              value={filters.vendor}
              onChange={(e) => set({ vendor: e.target.value })}
              placeholder="Vendor name"
            />
          </div>
        ) : null}
        <div className={styles.actions}>
          <button type="submit" className={styles.applyBtn}>
            Apply
          </button>
          {hasAppliedFilters ? (
            <button type="button" className={styles.clearBtn} onClick={handleClear}>
              Clear
            </button>
          ) : null}
        </div>
      </div>
      {regexError ? (
        <p className={styles.error} role="alert">
          {regexError}
        </p>
      ) : null}
      <p className={styles.hint}>{TAB_HINTS[activeTab]}</p>
    </form>
  );
}
