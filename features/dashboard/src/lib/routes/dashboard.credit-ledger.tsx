import { useState, FormEvent, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { ledgerApi, vendorsApi, customersApi } from '@inventory-platform/api';
import type {
  LedgerEntry,
  LedgerPartyType,
  VendorResponse,
  CustomerResponse,
  ReceivableItem,
  PayableItem,
  CustomerReceivableItem,
  PayableToShopItem,
} from '@inventory-platform/types';
import styles from './dashboard.refund.module.css';
import { useNotify } from '@inventory-platform/store';

export function meta() {
  return [
    { title: 'Credit Ledger - StockKart' },
    {
      name: 'description',
      content: 'Manage vendor and customer credit ledger',
    },
  ];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

export default function CreditLedgerPage() {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'entries' | 'record-payment' | 'payables' | 'receivables'>(
    tabParam === 'receivables' ? 'receivables' : tabParam === 'payables' ? 'payables' : 'entries'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { success: notifySuccess, error: notifyError } = useNotify;

  // Ledger entries
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [entriesPage, setEntriesPage] = useState(0);
  const [entriesTotalPages, setEntriesTotalPages] = useState(0);
  const [entriesTotalItems, setEntriesTotalItems] = useState(0);
  const [partyTypeFilter, setPartyTypeFilter] = useState<LedgerPartyType | ''>(
    ''
  );
  const [partyIdFilter, setPartyIdFilter] = useState('');

  // Record payment
  const [paymentPartyType, setPaymentPartyType] =
    useState<LedgerPartyType>('VENDOR');
  const [selectedVendor, setSelectedVendor] = useState<VendorResponse | null>(
    null
  );
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerResponse | null>(null);
  const [vendorSearchQuery, setVendorSearchQuery] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDescription, setPaymentDescription] = useState('');
  const [balance, setBalance] = useState<number | null>(null);

  // Amounts to pay (amounts this shop owes to vendors)
  const [payables, setPayables] = useState<PayableItem[]>([]);
  // Amounts to pay to other shops (bought from them as customer)
  const [payablesToShops, setPayablesToShops] = useState<PayableToShopItem[]>([]);
  // Amounts to collect (when this shop is the vendor's shop - from buyer shops)
  const [receivables, setReceivables] = useState<ReceivableItem[]>([]);
  // Amounts to collect from customers (we sold to them on credit)
  const [customerReceivables, setCustomerReceivables] = useState<CustomerReceivableItem[]>([]);

  const fetchEntries = async (page = 0) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await ledgerApi.listEntries({
        partyType: partyTypeFilter || undefined,
        partyId: partyIdFilter || undefined,
        page,
        size: 20,
      });
      setEntries(res.entries);
      setEntriesPage(res.page);
      setEntriesTotalPages(res.totalPages);
      setEntriesTotalItems(res.totalItems);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load entries';
      setError(msg);
      notifyError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBalance = async () => {
    const partyId =
      paymentPartyType === 'VENDOR'
        ? selectedVendor?.vendorId
        : selectedCustomer?.customerId;
    if (!partyId) {
      setBalance(null);
      return;
    }
    try {
      const res = await ledgerApi.getBalance(paymentPartyType, partyId);
      setBalance(res.balance);
    } catch {
      setBalance(null);
    }
  };

  const fetchPayables = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [payablesRes, payablesToShopsRes] = await Promise.all([
        ledgerApi.getPayables(),
        ledgerApi.getPayablesToShops(),
      ]);
      setPayables(payablesRes.payables ?? []);
      setPayablesToShops(payablesToShopsRes.payables ?? []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load payables';
      setError(msg);
      notifyError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReceivables = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [receivablesRes, customerReceivablesRes] = await Promise.all([
        ledgerApi.getReceivables(),
        ledgerApi.getCustomerReceivables(),
      ]);
      setReceivables(receivablesRes.receivables ?? []);
      setCustomerReceivables(customerReceivablesRes.receivables ?? []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load receivables';
      setError(msg);
      notifyError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'entries') {
      fetchEntries(0);
    }
  }, [activeTab, partyTypeFilter, partyIdFilter]);

  useEffect(() => {
    if (activeTab === 'record-payment') {
      fetchBalance();
    }
  }, [activeTab, paymentPartyType, selectedVendor?.vendorId, selectedCustomer?.customerId]);

  useEffect(() => {
    if (activeTab === 'payables') {
      fetchPayables();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'receivables') {
      fetchReceivables();
    }
  }, [activeTab]);

  const handleSearchVendor = async () => {
    if (!vendorSearchQuery.trim()) return;
    try {
      const vendors = await vendorsApi.search(vendorSearchQuery.trim());
      if (vendors.length > 0) {
        setSelectedVendor(vendors[0]);
        setSelectedCustomer(null);
      } else {
        setSelectedVendor(null);
        notifyError('No vendor found');
      }
    } catch (e) {
      notifyError(e instanceof Error ? e.message : 'Search failed');
    }
  };

  const handleSearchCustomer = async () => {
    if (!customerPhone.trim()) return;
    try {
      const customer = await customersApi.searchByPhone(customerPhone.trim());
      if (customer) {
        setSelectedCustomer(customer);
        setSelectedVendor(null);
      } else {
        setSelectedCustomer(null);
        notifyError('No customer found');
      }
    } catch (e) {
      notifyError(e instanceof Error ? e.message : 'Search failed');
    }
  };

  const handleRecordPayment = async (e: FormEvent) => {
    e.preventDefault();
    const partyId =
      paymentPartyType === 'VENDOR'
        ? selectedVendor?.vendorId
        : selectedCustomer?.customerId;
    if (!partyId) {
      notifyError('Select a vendor or customer first');
      return;
    }
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      notifyError('Enter a valid amount');
      return;
    }
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await ledgerApi.createEntry({
        partyType: paymentPartyType,
        partyId,
        amount,
        type: paymentPartyType === 'VENDOR' ? 'CREDIT' : 'DEBIT',
        source: 'PAYMENT',
        description: paymentDescription || undefined,
      });
      notifySuccess('Payment recorded successfully');
      setSuccess('Payment recorded');
      setPaymentAmount('');
      setPaymentDescription('');
      fetchBalance();
      fetchPayables();
      fetchReceivables();
      setActiveTab('entries');
      fetchEntries(0);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to record payment';
      setError(msg);
      notifyError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const currentPartyId =
    paymentPartyType === 'VENDOR'
      ? selectedVendor?.vendorId
      : selectedCustomer?.customerId;

  const handleRecordPaymentFromCustomer = (r: CustomerReceivableItem) => {
    setSelectedCustomer({
      customerId: r.customerId,
      name: r.customerName,
      phone: r.customerPhone || '',
      address: null,
      email: null,
      createdAt: '',
      updatedAt: '',
    });
    setSelectedVendor(null);
    setPaymentPartyType('CUSTOMER');
    setCustomerPhone(r.customerPhone || '');
    setPaymentAmount(String(r.balance));
    setPaymentDescription('');
    setActiveTab('record-payment');
  };

  const handlePayFromPayables = (p: PayableItem) => {
    setSelectedVendor({
      vendorId: p.vendorId,
      name: p.vendorName,
      contactEmail: '',
      contactPhone: '',
      address: '',
      companyName: '',
      businessType: 'RETAIL',
      createdAt: '',
      updatedAt: '',
    });
    setSelectedCustomer(null);
    setPaymentPartyType('VENDOR');
    setPaymentAmount(String(p.balance));
    setPaymentDescription('');
    setActiveTab('record-payment');
  };

  function getDirectionLabel(entry: LedgerEntry) {
    const isPayment = entry.source === 'PAYMENT';
    if (entry.roleInEntry === 'BUYER') {
      return isPayment ? (
        <span
          style={{
            display: 'inline-block',
            padding: '4px 8px',
            borderRadius: 6,
            fontSize: '0.8rem',
            fontWeight: 500,
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            color: 'var(--text-primary)',
          }}
        >
          You paid
        </span>
      ) : (
        <span
          style={{
            display: 'inline-block',
            padding: '4px 8px',
            borderRadius: 6,
            fontSize: '0.8rem',
            fontWeight: 500,
            backgroundColor: 'rgba(234, 179, 8, 0.15)',
            color: 'var(--text-primary)',
          }}
        >
          You owe
        </span>
      );
    }
    if (
      entry.roleInEntry !== undefined &&
      entry.roleInEntry !== null &&
      (entry.roleInEntry === 'VENDOR' || entry.roleInEntry === 'SELLER')
    ) {
      return isPayment ? (
        <span
          style={{
            display: 'inline-block',
            padding: '4px 8px',
            borderRadius: 6,
            fontSize: '0.8rem',
            fontWeight: 500,
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            color: 'var(--text-primary)',
          }}
        >
          Payment received
        </span>
      ) : (
        <span
          style={{
            display: 'inline-block',
            padding: '4px 8px',
            borderRadius: 6,
            fontSize: '0.8rem',
            fontWeight: 500,
            backgroundColor: 'rgba(34, 197, 94, 0.15)',
            color: 'var(--text-primary)',
          }}
        >
          Owed to you
        </span>
      );
    }
    return <span style={{ color: 'var(--text-secondary)' }}>—</span>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>Credit Ledger</h2>
        <p className={styles.subtitle}>
          View ledger entries and record vendor/customer payments
        </p>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${
            activeTab === 'entries' ? styles.activeTab : ''
          }`}
          onClick={() => setActiveTab('entries')}
        >
          Ledger Entries
        </button>
        <button
          className={`${styles.tab} ${
            activeTab === 'record-payment' ? styles.activeTab : ''
          }`}
          onClick={() => setActiveTab('record-payment')}
        >
          Record Payment
        </button>
        <button
          className={`${styles.tab} ${
            activeTab === 'payables' ? styles.activeTab : ''
          }`}
          onClick={() => setActiveTab('payables')}
        >
          Amount to Pay
        </button>
        <button
          className={`${styles.tab} ${
            activeTab === 'receivables' ? styles.activeTab : ''
          }`}
          onClick={() => setActiveTab('receivables')}
        >
          Amounts to Collect
        </button>
      </div>

      {error && <div className={styles.errorMessage}>{error}</div>}
      {success && <div className={styles.successMessage}>{success}</div>}

      {activeTab === 'entries' && (
        <div className={styles.content}>
          <div className={styles.searchSection}>
            <h3 className={styles.sectionTitle}>Filter</h3>
            <div className={styles.formRow} style={{ marginBottom: '1rem' }}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Party Type</label>
                <select
                  className={styles.input}
                  value={partyTypeFilter}
                  onChange={(e) =>
                    setPartyTypeFilter(
                      e.target.value as LedgerPartyType | ''
                    )
                  }
                >
                  <option value="">All</option>
                  <option value="VENDOR">Vendor</option>
                  <option value="CUSTOMER">Customer</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Party ID</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Vendor or customer ID"
                  value={partyIdFilter}
                  onChange={(e) => setPartyIdFilter(e.target.value)}
                />
              </div>
              <div className={styles.formGroup} style={{ alignSelf: 'flex-end' }}>
                <button
                  type="button"
                  className={styles.searchBtn}
                  onClick={() => fetchEntries(0)}
                  disabled={isLoading}
                >
                  {isLoading ? 'Loading...' : 'Apply'}
                </button>
              </div>
            </div>
          </div>

          <div>
            <h3 className={styles.sectionTitle}>
              Transactions ({entriesTotalItems})
            </h3>
            {isLoading && entries.length === 0 ? (
              <p>Loading...</p>
            ) : entries.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>
                No ledger entries found.
              </p>
            ) : (
              <>
                <div
                  style={{
                    overflowX: 'auto',
                    border: '1px solid var(--border-color)',
                    borderRadius: 8,
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr
                        style={{
                          backgroundColor: 'var(--bg-secondary)',
                          borderBottom: '1px solid var(--border-color)',
                        }}
                      >
                        <th style={{ padding: 12, textAlign: 'left' }}>Date</th>
                        <th style={{ padding: 12, textAlign: 'left' }}>Direction</th>
                        <th style={{ padding: 12, textAlign: 'left' }}>Party</th>
                        <th style={{ padding: 12, textAlign: 'left' }}>Type</th>
                        <th style={{ padding: 12, textAlign: 'left' }}>Source</th>
                        <th style={{ padding: 12, textAlign: 'right' }}>
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((entry) => (
                        <tr
                          key={entry.id}
                          style={{
                            borderBottom: '1px solid var(--border-color)',
                          }}
                        >
                          <td style={{ padding: 12 }}>
                            {formatDate(entry.createdAt)}
                          </td>
                          <td style={{ padding: 12 }}>
                            {getDirectionLabel(entry)}
                          </td>
                          <td style={{ padding: 12 }}>
                            {entry.displayPartyName || entry.partyName || entry.partyId}
                            {entry.roleInEntry === 'BUYER' && entry.counterpartyShopName && (
                              <span
                                style={{
                                  display: 'block',
                                  fontSize: '0.85rem',
                                  color: 'var(--text-secondary)',
                                }}
                              >
                                {entry.counterpartyShopName}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: 12 }}>{entry.type}</td>
                          <td style={{ padding: 12 }}>{entry.source}</td>
                          <td
                            style={{
                              padding: 12,
                              textAlign: 'right',
                              fontWeight: 500,
                            }}
                          >
                            {formatCurrency(entry.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {entriesTotalPages > 1 && (
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      marginTop: 16,
                      alignItems: 'center',
                    }}
                  >
                    <button
                      type="button"
                      className={styles.clearBtn}
                      onClick={() => fetchEntries(entriesPage - 1)}
                      disabled={entriesPage <= 0 || isLoading}
                    >
                      Previous
                    </button>
                    <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                      Page {entriesPage + 1} of {entriesTotalPages}
                    </span>
                    <button
                      type="button"
                      className={styles.searchBtn}
                      onClick={() => fetchEntries(entriesPage + 1)}
                      disabled={
                        entriesPage >= entriesTotalPages - 1 || isLoading
                      }
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === 'record-payment' && (
        <div className={styles.content}>
          <h3 className={styles.sectionTitle}>Record Payment</h3>
          <form onSubmit={handleRecordPayment} className={styles.searchForm}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Party Type</label>
                <select
                  className={styles.input}
                  value={paymentPartyType}
                  onChange={(e) => {
                    setPaymentPartyType(e.target.value as LedgerPartyType);
                    setSelectedVendor(null);
                    setSelectedCustomer(null);
                    setBalance(null);
                  }}
                >
                  <option value="VENDOR">Vendor (we are paying)</option>
                  <option value="CUSTOMER">Customer (they are paying us)</option>
                </select>
              </div>
            </div>

            {paymentPartyType === 'VENDOR' ? (
              <div className={styles.formRow}>
                <div className={styles.formGroup} style={{ flex: 2 }}>
                  <label className={styles.label}>Search Vendor</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="Search by name, phone, email"
                      value={vendorSearchQuery}
                      onChange={(e) => setVendorSearchQuery(e.target.value)}
                    />
                    <button
                      type="button"
                      className={styles.searchBtn}
                      onClick={handleSearchVendor}
                      disabled={isLoading}
                    >
                      Search
                    </button>
                  </div>
                </div>
                {selectedVendor && (
                  <div
                    className={styles.formGroup}
                    style={{
                      flex: 1,
                      padding: 12,
                      background: 'var(--bg-secondary)',
                      borderRadius: 8,
                    }}
                  >
                    <strong>{selectedVendor.name}</strong>
                    <br />
                    <small>{selectedVendor.contactPhone}</small>
                    {balance != null && (
                      <div style={{ marginTop: 8 }}>
                        Balance: {formatCurrency(balance)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.formRow}>
                <div className={styles.formGroup} style={{ flex: 2 }}>
                  <label className={styles.label}>Search Customer</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="Enter phone number"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                    />
                    <button
                      type="button"
                      className={styles.searchBtn}
                      onClick={handleSearchCustomer}
                      disabled={isLoading}
                    >
                      Search
                    </button>
                  </div>
                </div>
                {selectedCustomer && (
                  <div
                    className={styles.formGroup}
                    style={{
                      flex: 1,
                      padding: 12,
                      background: 'var(--bg-secondary)',
                      borderRadius: 8,
                    }}
                  >
                    <strong>{selectedCustomer.name}</strong>
                    <br />
                    <small>{selectedCustomer.phone}</small>
                    {balance != null && (
                      <div style={{ marginTop: 8 }}>
                        Balance: {formatCurrency(balance)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {currentPartyId && (
              <>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Amount *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className={styles.input}
                      placeholder="Enter amount"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Description</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="Optional note"
                      value={paymentDescription}
                      onChange={(e) => setPaymentDescription(e.target.value)}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className={styles.searchBtn}
                  disabled={isLoading}
                >
                  {isLoading ? 'Recording...' : 'Record Payment'}
                </button>
              </>
            )}
          </form>
        </div>
      )}

      {activeTab === 'payables' && (
        <div className={styles.content}>
          <h3 className={styles.sectionTitle}>Amount to Pay</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
            Pending amounts your shop owes. To vendors (credit purchases) and to other shops (bought from them as customer on credit).
          </p>
          {isLoading && payables.length === 0 && payablesToShops.length === 0 ? (
            <p>Loading...</p>
          ) : payables.length === 0 && payablesToShops.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>
              No pending amounts to pay.
            </p>
          ) : (
            <>
              {payables.length > 0 && (
                <>
                  <h4 style={{ marginTop: 0, marginBottom: 12 }}>To Vendors</h4>
                  <div
                    style={{
                      overflowX: 'auto',
                      border: '1px solid var(--border-color)',
                      borderRadius: 8,
                      marginBottom: 24,
                    }}
                  >
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                          <th style={{ padding: 12, textAlign: 'left' }}>Vendor</th>
                          <th style={{ padding: 12, textAlign: 'right' }}>Amount</th>
                          <th style={{ padding: 12, textAlign: 'right' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payables.map((p) => (
                          <tr key={p.vendorId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: 12 }}>
                              {p.vendorName}
                              {p.counterpartyShopName && (
                                <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                  {p.counterpartyShopName}
                                </span>
                              )}
                            </td>
                            <td style={{ padding: 12, textAlign: 'right', fontWeight: 500 }}>{formatCurrency(p.balance)}</td>
                            <td style={{ padding: 12, textAlign: 'right' }}>
                              <button
                                type="button"
                                className={styles.searchBtn}
                                onClick={() => handlePayFromPayables(p)}
                                style={{ fontSize: '0.875rem', padding: '6px 12px' }}
                              >
                                Record Payment
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              {payablesToShops.length > 0 && (
                <>
                  <h4 style={{ marginBottom: 12 }}>To Shops</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 12 }}>
                    Amounts you owe to shops you bought from as a customer. The seller records payment when received.
                  </p>
                  <div
                    style={{
                      overflowX: 'auto',
                      border: '1px solid var(--border-color)',
                      borderRadius: 8,
                    }}
                  >
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                          <th style={{ padding: 12, textAlign: 'left' }}>Shop</th>
                          <th style={{ padding: 12, textAlign: 'right' }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payablesToShops.map((p) => (
                          <tr key={p.sellerShopId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: 12 }}>{p.sellerShopName}</td>
                            <td style={{ padding: 12, textAlign: 'right', fontWeight: 500 }}>{formatCurrency(p.balance)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'receivables' && (
        <div className={styles.content}>
          <h3 className={styles.sectionTitle}>Amounts to Collect</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
            Pending amounts owed to you. From buyer shops (when you&apos;re the vendor) and from customers (when you sold to them on credit).
          </p>
          {isLoading && receivables.length === 0 && customerReceivables.length === 0 ? (
            <p>Loading...</p>
          ) : receivables.length === 0 && customerReceivables.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>
              No pending amounts to collect.
            </p>
          ) : (
            <>
              {receivables.length > 0 && (
                <>
                  <h4 style={{ marginTop: 0, marginBottom: 12 }}>From Buyer Shops</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 12 }}>
                    When this shop was assigned as the vendor&apos;s shop during product registration.
                  </p>
                  <div
                    style={{
                      overflowX: 'auto',
                      border: '1px solid var(--border-color)',
                      borderRadius: 8,
                      marginBottom: 24,
                    }}
                  >
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                          <th style={{ padding: 12, textAlign: 'left' }}>Who has to pay</th>
                          <th style={{ padding: 12, textAlign: 'left' }}>Vendor</th>
                          <th style={{ padding: 12, textAlign: 'right' }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {receivables.map((r) => (
                          <tr key={`${r.buyerShopId}-${r.vendorId}`} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: 12 }}>{r.buyerPayerName || r.buyerShopName}</td>
                            <td style={{ padding: 12 }}>{r.vendorName}</td>
                            <td style={{ padding: 12, textAlign: 'right', fontWeight: 500 }}>{formatCurrency(r.balance)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              {customerReceivables.length > 0 && (
                <>
                  <h4 style={{ marginBottom: 12 }}>From Customers</h4>
                  <div
                    style={{
                      overflowX: 'auto',
                      border: '1px solid var(--border-color)',
                      borderRadius: 8,
                    }}
                  >
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                          <th style={{ padding: 12, textAlign: 'left' }}>Customer</th>
                          <th style={{ padding: 12, textAlign: 'right' }}>Amount</th>
                          <th style={{ padding: 12, textAlign: 'right' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customerReceivables.map((r) => (
                          <tr key={r.customerId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: 12 }}>
                              {r.customerName}
                              {r.customerPhone && (
                                <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                  {r.customerPhone}
                                </span>
                              )}
                            </td>
                            <td style={{ padding: 12, textAlign: 'right', fontWeight: 500 }}>{formatCurrency(r.balance)}</td>
                            <td style={{ padding: 12, textAlign: 'right' }}>
                              <button
                                type="button"
                                className={styles.searchBtn}
                                onClick={() => handleRecordPaymentFromCustomer(r)}
                                style={{ fontSize: '0.875rem', padding: '6px 12px' }}
                              >
                                Record Payment
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
