import { useState, FormEvent, useEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router';
import { refundsApi } from '@inventory-platform/api';
import type {
  CheckoutItemResponse,
  CustomerResponse,
  PaymentMethod,
  PaymentSplit,
  Purchase,
  RefundItem,
  SearchPurchasesParams,
} from '@inventory-platform/types';
import {
  inventoryLotIdFromSellableRef,
  lineSellableRef,
} from '@inventory-platform/types';
import { PaginationBar } from '@inventory-platform/ui-kit';
import { useCapabilityFeatureGuard } from '@inventory-platform/shell';
import {
  PaymentMethodSplit,
  RefundHistoryList,
  emptyPaymentSplit,
  isCreditMethod,
  roundMoney,
  validatePaymentSplit,
} from '../ui';
import styles from './refund.module.css';
import { useNotify } from '@inventory-platform/session';

export function meta() {
  return [
    { title: 'Return to customer - StockKart' },
    {
      name: 'description',
      content: 'Process customer purchase returns',
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

function parseGstPct(rate: string | null | undefined): number {
  if (rate == null) return 0;
  const s = String(rate).trim().replace(/%/g, '');
  if (!s) return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

/** GST column for a sale line (matches vendor return screen wording). */
function formatGstRatesLabelForSaleLine(line: CheckoutItemResponse): string {
  const cg = parseGstPct(line.cgst);
  const sg = parseGstPct(line.sgst);
  if (cg <= 0 && sg <= 0) {
    return line.billingMode === 'BASIC' ? 'Basic' : '—';
  }
  if (cg > 0 && sg > 0) {
    return `CGST ${cg}% + SGST ${sg}%`;
  }
  if (cg > 0) return `CGST ${cg}%`;
  return `SGST ${sg}%`;
}

const roundMoney2 = (n: number) => Math.round(n * 100) / 100;

function refundLineKey(line: CheckoutItemResponse, index: number): string {
  return lineSellableRef(line) ?? `line-${index}`;
}

/**
 * Mirrors RefundService: credit = priceToRetail × return qty (per selling unit on the bill).
 * Optional tooltip lines assume tax-inclusive SP for a notional GST split (display only).
 */
function estimateCustomerRefundLine(
  returnQty: number,
  line: CheckoutItemResponse
): { total: number; title: string } | null {
  if (returnQty <= 0) return null;
  const unit = Number(line.priceToRetail);
  if (!Number.isFinite(unit) || unit < 0) return null;
  const total = roundMoney2(unit * returnQty);

  const parts = [
    `Refund ${formatCurrency(total)} (${formatCurrency(unit)} × ${returnQty}); matches processed return.`,
  ];

  const cg = parseGstPct(line.cgst);
  const sg = parseGstPct(line.sgst);
  const sumPct = cg + sg;
  if (sumPct > 0) {
    const taxable = roundMoney2(total / (1 + sumPct / 100));
    const cgst = roundMoney2((taxable * cg) / 100);
    const sgst = roundMoney2((taxable * sg) / 100);
    parts.push(
      `If SP includes GST — taxable ${formatCurrency(taxable)}, CGST ${formatCurrency(cgst)}, SGST ${formatCurrency(sgst)}`
    );
  }

  return { total, title: parts.join(' · ') };
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
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

export function RefundPage() {
  const { enabled, loading: guardLoading } =
    useCapabilityFeatureGuard('customerReturn');
  const location = useLocation();
  const state = location.state as
    | { prefillCustomer?: CustomerResponse; prefillTab?: 'process' | 'history' }
    | null;
  const [activeTab, setActiveTab] = useState<'process' | 'history'>('process');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { success: notifySuccess, error: notifyError } = useNotify;

  // Search state
  const [searchParams, setSearchParams] = useState<SearchPurchasesParams>({
    customerEmail: '',
    customerPhone: '',
    customerName: '',
    invoiceNo: '',
  });
  const [appliedSearch, setAppliedSearch] = useState<SearchPurchasesParams>({
    customerEmail: '',
    customerPhone: '',
    customerName: '',
    invoiceNo: '',
  });
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(
    null
  );
  const [refundItems, setRefundItems] = useState<
    Record<string, { quantity: number; maxQuantity: number }>
  >({});

  // Refresh refund history when a refund is processed (used by RefundHistoryList)
  const [refundHistoryRefreshTrigger, setRefundHistoryRefreshTrigger] =
    useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [paymentSplit, setPaymentSplit] = useState<PaymentSplit>(() =>
    emptyPaymentSplit()
  );

  useEffect(() => {
    if (!state?.prefillCustomer) return;
    const { name, phone, email } = state.prefillCustomer;
    const next = {
      customerName: name ?? '',
      customerPhone: phone ?? '',
      customerEmail: email ?? '',
      invoiceNo: '',
    };

    setSearchParams(next);
    setAppliedSearch(next);
    setPage(0);
    setActiveTab(state.prefillTab ?? 'process');
    setError(null);
    setSuccess(null);
  }, [state]);

  const handleSearchChange = (
    field: keyof SearchPurchasesParams,
    value: string
  ) => {
    setSearchParams((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const hasActiveSearch = Boolean(
    appliedSearch.customerEmail?.trim() ||
      appliedSearch.customerPhone?.trim() ||
      appliedSearch.customerName?.trim() ||
      appliedSearch.invoiceNo?.trim()
  );

  const loadPurchases = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await refundsApi.searchPurchases({
        ...appliedSearch,
        page: page + 1,
        limit: pageSize,
      });
      setPurchases(response.purchases);
      setTotalPages(response.totalPages);
      setTotalItems(response.total);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to load purchases. Please try again.';
      notifyError(errorMessage);
      setPurchases([]);
      setTotalPages(0);
      setTotalItems(0);
    } finally {
      setIsLoading(false);
    }
  }, [appliedSearch, notifyError, page, pageSize]);

  useEffect(() => {
    if (activeTab !== 'process') return;
    void loadPurchases();
  }, [activeTab, loadPurchases]);

  useEffect(() => {
    setSelectedPurchase(null);
    setRefundItems({});
    setPaymentMethod(null);
    setPaymentSplit(emptyPaymentSplit());
  }, [page]);

  const handleSearchPurchases = (e: FormEvent) => {
    e.preventDefault();
    setSuccess(null);
    setSelectedPurchase(null);
    setRefundItems({});
    setPaymentMethod(null);
    setPaymentSplit(emptyPaymentSplit());
    setAppliedSearch({ ...searchParams });
    setPage(0);
  };

  const clearSearch = () => {
    const empty = {
      customerEmail: '',
      customerPhone: '',
      customerName: '',
      invoiceNo: '',
    };
    setSearchParams(empty);
    setAppliedSearch(empty);
    setSelectedPurchase(null);
    setRefundItems({});
    setPaymentMethod(null);
    setPaymentSplit(emptyPaymentSplit());
    setPage(0);
  };

  const handleSelectPurchase = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setPaymentMethod(null);
    setPaymentSplit(emptyPaymentSplit());
    // Initialize refund items with max quantities
    const items: Record<string, { quantity: number; maxQuantity: number }> = {};
    purchase.items.forEach((item, index) => {
      items[refundLineKey(item, index)] = {
        quantity: 0,
        maxQuantity: item.quantity,
      };
    });
    setRefundItems(items);
    setError(null);
    setSuccess(null);
  };

  const handleRefundQuantityChange = (inventoryId: string, value: string) => {
    const item = refundItems[inventoryId];
    if (!item) return;

    const numValue = parseInt(value, 10);
    if (isNaN(numValue) || numValue < 0) {
      setRefundItems((prev) => ({
        ...prev,
        [inventoryId]: { ...item, quantity: 0 },
      }));
      return;
    }

    if (numValue > item.maxQuantity) {
      setRefundItems((prev) => ({
        ...prev,
        [inventoryId]: { ...item, quantity: item.maxQuantity },
      }));
      return;
    }

    setRefundItems((prev) => ({
      ...prev,
      [inventoryId]: { ...item, quantity: numValue },
    }));
  };

  const handleProcessRefund = async () => {
    if (!selectedPurchase) {
      notifyError('Please select a purchase first.');
      return;
    }

    const itemsToRefund: RefundItem[] = [];
    let hasItems = false;

    Object.entries(refundItems).forEach(([lineKey, item]) => {
      if (item.quantity > 0) {
        const inventoryId =
          inventoryLotIdFromSellableRef(lineKey) ?? lineKey;
        itemsToRefund.push({
          inventoryId,
          quantity: item.quantity,
        });
        hasItems = true;
      }
    });

    if (!hasItems) {
      notifyError('Please select at least one item to return.');
      return;
    }

    const returnTotal = estimatedRefund.grandTotal;
    if (returnTotal <= 0) {
      notifyError('Enter return quantities to set a refund total.');
      return;
    }
    if (!paymentMethod) {
      notifyError('Choose how to refund the customer (cash, online, credit, or mixed).');
      return;
    }
    const payCheck = validatePaymentSplit(paymentMethod, paymentSplit, returnTotal);
    if (!payCheck.ok) {
      notifyError(payCheck.message ?? 'Invalid refund payment split.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await refundsApi.create({
        purchaseId: selectedPurchase.purchaseId,
        items: itemsToRefund,
        paymentMethod,
        cashAmount: paymentSplit.cashAmount,
        onlineAmount: paymentSplit.onlineAmount,
        creditAmount: paymentSplit.creditAmount,
      });

      notifySuccess(
        `Return processed successfully! Return Amount: ${formatCurrency(
          response.refundAmount
        )}. Credit note: ${response.creditNoteNo ?? response.refundId}`
      );

      // Reset form and refresh lists
      setSelectedPurchase(null);
      setRefundItems({});
      setPaymentMethod(null);
      setPaymentSplit(emptyPaymentSplit());
      setRefundHistoryRefreshTrigger((t) => t + 1);
      void loadPurchases();
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to process return. Please try again.';
      notifyError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (tab: 'process' | 'history') => {
    setActiveTab(tab);
    setError(null);
    setSuccess(null);
  };

  const estimatedRefund = useMemo(() => {
    if (!selectedPurchase) {
      return { grandTotal: 0, linesWithQty: 0 };
    }
    let grand = 0;
    let linesWithQty = 0;
    for (let i = 0; i < selectedPurchase.items.length; i++) {
      const it = selectedPurchase.items[i];
      const ri = refundItems[refundLineKey(it, i)];
      const q = ri?.quantity ?? 0;
      if (q <= 0) continue;
      const est = estimateCustomerRefundLine(q, it);
      if (est && est.total > 0) {
        grand += est.total;
        linesWithQty += 1;
      }
    }
    return {
      grandTotal: linesWithQty > 0 ? roundMoney2(grand) : 0,
      linesWithQty,
    };
  }, [selectedPurchase, refundItems]);

  const returnTotalNum = roundMoney(estimatedRefund.grandTotal);
  const refundPaymentValidation = validatePaymentSplit(
    paymentMethod,
    paymentSplit,
    returnTotalNum
  );
  const canProcessReturn =
    returnTotalNum > 0 && refundPaymentValidation.ok && !isLoading;

  if (guardLoading || !enabled) {
    return null;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>Return to customer</h2>
        <p className={styles.subtitle}>
          Process customer sale returns and view return history
        </p>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${
            activeTab === 'process' ? styles.activeTab : ''
          }`}
          onClick={() => handleTabChange('process')}
        >
          Process Return
        </button>
        <button
          className={`${styles.tab} ${
            activeTab === 'history' ? styles.activeTab : ''
          }`}
          onClick={() => handleTabChange('history')}
        >
          Return History
        </button>
      </div>

      {error && <div className={styles.errorMessage}>{error}</div>}
      {success && <div className={styles.successMessage}>{success}</div>}

      {activeTab === 'process' && (
        <div className={styles.content}>
          <div className={styles.searchSection}>
            <h3 className={styles.sectionTitle}>Search purchase</h3>
            <p className={styles.subtitle} style={{ marginBottom: '1rem' }}>
              Recent sales load automatically. Use the fields below to narrow the list.
            </p>
            <form
              onSubmit={handleSearchPurchases}
              className={styles.searchForm}
            >
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="customerName" className={styles.label}>
                    Customer Name
                  </label>
                  <input
                    type="text"
                    id="customerName"
                    className={styles.input}
                    placeholder="Enter customer name"
                    value={searchParams.customerName || ''}
                    onChange={(e) =>
                      handleSearchChange('customerName', e.target.value)
                    }
                    disabled={isLoading}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="customerPhone" className={styles.label}>
                    Customer Phone
                  </label>
                  <input
                    type="text"
                    id="customerPhone"
                    className={styles.input}
                    placeholder="Enter customer phone"
                    value={searchParams.customerPhone || ''}
                    onChange={(e) =>
                      handleSearchChange('customerPhone', e.target.value)
                    }
                    disabled={isLoading}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="customerEmail" className={styles.label}>
                    Customer Email
                  </label>
                  <input
                    type="email"
                    id="customerEmail"
                    className={styles.input}
                    placeholder="Enter customer email"
                    value={searchParams.customerEmail || ''}
                    onChange={(e) =>
                      handleSearchChange('customerEmail', e.target.value)
                    }
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="invoiceNo" className={styles.label}>
                    Invoice Number
                  </label>
                  <input
                    type="text"
                    id="invoiceNo"
                    className={styles.input}
                    placeholder="Enter invoice number"
                    value={searchParams.invoiceNo || ''}
                    onChange={(e) =>
                      handleSearchChange('invoiceNo', e.target.value)
                    }
                    disabled={isLoading}
                  />
                </div>
              </div>
              <button
                type="submit"
                className={styles.searchBtn}
                disabled={isLoading}
              >
                {isLoading ? 'Searching...' : 'Search purchases'}
              </button>
              {hasActiveSearch ? (
                <button
                  type="button"
                  className={styles.searchBtn}
                  disabled={isLoading}
                  onClick={clearSearch}
                  style={{ marginLeft: '0.5rem' }}
                >
                  Clear
                </button>
              ) : null}
            </form>
          </div>

          <div className={styles.purchasesSection}>
            <h3 className={styles.sectionTitle}>
              {hasActiveSearch ? 'Matching sales' : 'Recent sales'}
            </h3>
            {isLoading ? (
              <p className={styles.loading}>Loading purchases…</p>
            ) : purchases.length === 0 ? (
              <p className={styles.emptyState}>
                {hasActiveSearch
                  ? 'No sales matched your search. Try different criteria or clear the search.'
                  : 'No sales yet.'}
              </p>
            ) : (
              <>
              <div className={styles.purchasesList}>
                {purchases.map((purchase) => (
                  <div key={purchase.purchaseId}>
                    <div
                      className={`${styles.purchaseCard} ${
                        selectedPurchase?.purchaseId === purchase.purchaseId
                          ? styles.selectedPurchase
                          : ''
                      }`}
                      onClick={() => handleSelectPurchase(purchase)}
                    >
                      <div className={styles.purchaseHeader}>
                        <div>
                          <strong>Invoice No:</strong> {purchase.invoiceNo}
                        </div>
                        <div>
                          <strong>Date:</strong> {formatDate(purchase.soldAt)}
                        </div>
                      </div>
                      <div className={styles.purchaseDetails}>
                        <div>
                          <strong>Customer:</strong>{' '}
                          {purchase.customerName || 'N/A'}
                        </div>
                        <div>
                          <strong>Phone:</strong>{' '}
                          {purchase.customerPhone || 'N/A'}
                        </div>
                        <div>
                          <strong>Total:</strong>{' '}
                          {formatCurrency(purchase.grandTotal)}
                        </div>
                        <div>
                          <strong>Payment:</strong> {purchase.paymentMethod}
                        </div>
                      </div>
                    </div>

                    {selectedPurchase?.purchaseId === purchase.purchaseId && (
                      <div className={styles.refundSection}>
                        <h3 className={styles.sectionTitle}>
                          Select Items to Return
                        </h3>
                        <div className={styles.purchaseInfo}>
                          <div>
                            <strong>Invoice No:</strong>{' '}
                            {selectedPurchase.invoiceNo}
                          </div>
                          <div>
                            <strong>Customer:</strong>{' '}
                            {selectedPurchase.customerName || 'N/A'}
                          </div>
                          <div>
                            <strong>Date:</strong>{' '}
                            {formatDate(selectedPurchase.soldAt)}
                          </div>
                        </div>

                        <div className={styles.itemsTable}>
                          <table>
                            <thead>
                              <tr>
                                <th>Item Name</th>
                                <th>MRP</th>
                                <th>Selling Price</th>
                                <th>Purchased Qty</th>
                                <th>GST rates</th>
                                <th className={styles.numericTh}>
                                  Est. credit
                                </th>
                                <th>Return Qty</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedPurchase.items.map((item, index) => {
                                const lineKey = refundLineKey(item, index);
                                const refundItem = refundItems[lineKey];
                                const rq = refundItem?.quantity ?? 0;
                                const lineEst =
                                  rq > 0
                                    ? estimateCustomerRefundLine(rq, item)
                                    : null;
                                return (
                                  <tr key={lineKey}>
                                    <td>{item.name}</td>
                                    <td>
                                      {formatCurrency(item.maximumRetailPrice)}
                                    </td>
                                    <td>{formatCurrency(item.priceToRetail)}</td>
                                    <td>{item.quantity}</td>
                                    <td>{formatGstRatesLabelForSaleLine(item)}</td>
                                    <td
                                      className={styles.numericCell}
                                      title={lineEst?.title}
                                    >
                                      {lineEst != null
                                        ? formatCurrency(lineEst.total)
                                        : '—'}
                                    </td>
                                    <td>
                                      <input
                                        type="number"
                                        min="0"
                                        max={item.quantity}
                                        value={refundItem?.quantity || 0}
                                        onChange={(e) =>
                                          handleRefundQuantityChange(
                                            lineKey,
                                            e.target.value
                                          )
                                        }
                                        className={styles.quantityInput}
                                        disabled={isLoading}
                                      />
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        <div className={styles.refundSummary}>
                          <div className={styles.summaryRow}>
                            <span>Estimated return amount:</span>
                            <strong>
                              {formatCurrency(estimatedRefund.grandTotal)}
                            </strong>
                          </div>
                        </div>
                        {estimatedRefund.linesWithQty > 0 ? (
                          <p
                            className={styles.returnEstimateBanner}
                            role="status"
                          >
                            <strong>Estimated credit total:</strong>{' '}
                            {formatCurrency(estimatedRefund.grandTotal)}
                            <span className={styles.returnEstimateMuted}>
                              Same as server: selling price × return qty per line.
                              Hover “Est. credit” for a notional GST split when rates
                              apply. Final amount is set when you process the return.
                            </span>
                          </p>
                        ) : null}

                        {estimatedRefund.linesWithQty > 0 ? (
                          <div className={styles.returnPaymentSection}>
                            <PaymentMethodSplit
                              context="sale"
                              title="How are you refunding?"
                              intro="Choose cash, online, credit (reduces what they owe), or a mix. This drives accounting — not the original sale payment."
                              total={returnTotalNum}
                              value={{ method: paymentMethod, split: paymentSplit }}
                              onChange={(next) => {
                                setPaymentMethod(next.method);
                                setPaymentSplit(next.split);
                              }}
                              disabled={isLoading}
                            />
                            {paymentMethod &&
                            isCreditMethod(paymentMethod) &&
                            paymentSplit.creditAmount > 0 ? (
                              <p className={styles.returnPaymentHint}>
                                ₹{paymentSplit.creditAmount.toFixed(2)} reduces
                                customer credit (they owe you less).
                              </p>
                            ) : null}
                          </div>
                        ) : null}

                        <button
                          className={styles.processRefundBtn}
                          onClick={handleProcessRefund}
                          disabled={!canProcessReturn}
                        >
                          {isLoading ? 'Processing...' : 'Process Return'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <PaginationBar
                page={page}
                totalPages={totalPages}
                totalItems={totalItems}
                onPageChange={setPage}
                disabled={isLoading}
                aria-label="Sale pages"
              />
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className={styles.content}>
          <div className={styles.historySection}>
            <h3 className={styles.sectionTitle}>Return History</h3>
            <RefundHistoryList refreshTrigger={refundHistoryRefreshTrigger} />
          </div>
        </div>
      )}
    </div>
  );
}
