import type { ChangeEvent } from 'react';
import styles from './QuotationSetupPanel.module.css';

export interface QuotationSetupPanelProps {
  customerPhone: string;
  customerName: string;
  customerEmail: string;
  customerAddress: string;
  isRetailer: boolean;
  customerGstin: string;
  customerDlNo: string;
  customerPan: string;
  isSearchingCustomer: boolean;
  isSubmitting: boolean;
  onPhoneChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onAddressChange: (value: string) => void;
  onRetailerChange: (checked: boolean) => void;
  onGstinChange: (value: string) => void;
  onDlNoChange: (value: string) => void;
  onPanChange: (value: string) => void;
  onSearchByPhone: () => void;
  onSearchByEmail: () => void;
  onSubmit: () => void;
  onCancel?: () => void;
  showCancel?: boolean;
}

export function QuotationSetupPanel({
  customerPhone,
  customerName,
  customerEmail,
  customerAddress,
  isRetailer,
  customerGstin,
  customerDlNo,
  customerPan,
  isSearchingCustomer,
  isSubmitting,
  onPhoneChange,
  onNameChange,
  onEmailChange,
  onAddressChange,
  onRetailerChange,
  onGstinChange,
  onDlNoChange,
  onPanChange,
  onSearchByPhone,
  onSearchByEmail,
  onSubmit,
  onCancel,
  showCancel = false,
}: QuotationSetupPanelProps) {
  const canSubmit = !isSubmitting;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSubmit) {
      onSubmit();
    }
  };

  return (
    <div className={styles.setupWrap}>
      <div className={styles.setupCard}>
        <div className={styles.setupHeader}>
          <h3 className={styles.setupTitle}>New quotation</h3>
          <p className={styles.setupSubtitle}>
            Add customer details if you have them, or start selling and fill them in later.
          </p>
        </div>

        <form className={styles.setupForm} onSubmit={handleSubmit}>
          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <label htmlFor="setup-customerPhone" className={styles.label}>
                Phone
              </label>
              <div className={styles.inputRow}>
                <input
                  id="setup-customerPhone"
                  type="tel"
                  className={styles.input}
                  placeholder="e.g. 9876543210"
                  value={customerPhone}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    onPhoneChange(e.currentTarget.value)
                  }
                  disabled={isSearchingCustomer || isSubmitting}
                  autoFocus
                />
                <button
                  type="button"
                  className={styles.searchBtn}
                  onClick={onSearchByPhone}
                  disabled={isSearchingCustomer || !customerPhone.trim() || isSubmitting}
                  title="Look up customer by phone"
                >
                  {isSearchingCustomer ? '…' : 'Find'}
                </button>
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="setup-customerName" className={styles.label}>
                Name
              </label>
              <input
                id="setup-customerName"
                type="text"
                className={styles.input}
                placeholder="Customer name"
                value={customerName}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  onNameChange(e.currentTarget.value)
                }
                disabled={isSubmitting}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="setup-customerEmail" className={styles.label}>
                Email
              </label>
              <div className={styles.inputRow}>
                <input
                  id="setup-customerEmail"
                  type="email"
                  className={styles.input}
                  placeholder="Email (optional)"
                  value={customerEmail}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    onEmailChange(e.currentTarget.value)
                  }
                  disabled={isSearchingCustomer || isSubmitting}
                />
                <button
                  type="button"
                  className={styles.searchBtn}
                  onClick={onSearchByEmail}
                  disabled={isSearchingCustomer || !customerEmail.trim() || isSubmitting}
                  title="Look up customer by email"
                >
                  {isSearchingCustomer ? '…' : 'Find'}
                </button>
              </div>
            </div>

            <div className={`${styles.field} ${styles.fieldFull}`}>
              <label htmlFor="setup-customerAddress" className={styles.label}>
                Address
              </label>
              <input
                id="setup-customerAddress"
                type="text"
                className={styles.input}
                placeholder="Address (optional)"
                value={customerAddress}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  onAddressChange(e.currentTarget.value)
                }
                disabled={isSubmitting}
              />
            </div>
          </div>

          <label className={styles.retailerCheck}>
            <input
              type="checkbox"
              checked={isRetailer}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                onRetailerChange(e.currentTarget.checked)
              }
              disabled={isSubmitting}
            />
            <span>This customer is a retailer (GSTIN / DL / PAN)</span>
          </label>

          {isRetailer && (
            <div className={styles.retailerGrid}>
              <div className={styles.field}>
                <label htmlFor="setup-customerGstin" className={styles.label}>
                  GSTIN
                </label>
                <input
                  id="setup-customerGstin"
                  type="text"
                  className={styles.input}
                  value={customerGstin}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    onGstinChange(e.currentTarget.value)
                  }
                  disabled={isSubmitting}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="setup-customerDlNo" className={styles.label}>
                  DL No
                </label>
                <input
                  id="setup-customerDlNo"
                  type="text"
                  className={styles.input}
                  value={customerDlNo}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    onDlNoChange(e.currentTarget.value)
                  }
                  disabled={isSubmitting}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="setup-customerPan" className={styles.label}>
                  PAN
                </label>
                <input
                  id="setup-customerPan"
                  type="text"
                  className={styles.input}
                  value={customerPan}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    onPanChange(e.currentTarget.value)
                  }
                  disabled={isSubmitting}
                />
              </div>
            </div>
          )}

          <div className={styles.actions}>
            {showCancel && onCancel && (
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={!canSubmit}
            >
              {isSubmitting ? 'Creating…' : 'Create quotation & start selling'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
