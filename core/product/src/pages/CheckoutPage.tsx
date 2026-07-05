import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router';
import { cartApi } from '../api/cart.api';
import type { CartResponse, UpdateCartStatusDto } from '@inventory-platform/product/types';
import type { PaymentMethod, PaymentSplit } from '@inventory-platform/contracts';
import {
  PaymentMethodSplit,
  emptyPaymentSplit,
  formatPaymentMethod,
  formatPaymentSplit,
  isCreditMethod,
  PrintInvoiceModal,
  roundMoney,
  validatePaymentSplit,
} from '../ui';
import { useResolvedSellPath } from '@inventory-platform/routing';
import styles from './checkout.module.css';
import { useAuthStore, useNotify, useShopCapabilitiesStore } from '@inventory-platform/session';

export function meta() {
  return [
    { title: 'Checkout - StockKart' },
    { name: 'description', content: 'Review and complete your purchase' },
  ];
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const { error: notifyError } = useNotify;
  const activeShopId = useAuthStore((s) => s.user?.shopId ?? null);
  const fetchCapabilities = useShopCapabilitiesStore((s) => s.fetchCapabilities);
  const shopCapabilities = useShopCapabilitiesStore((s) =>
    activeShopId ? s.byShopId[activeShopId] : undefined
  );
  const sellPath = useResolvedSellPath(shopCapabilities ?? null);
  const showTokenOnReceipt =
    shopCapabilities?.features?.tokenOnReceipt === true;

  useEffect(() => {
    void fetchCapabilities();
  }, [fetchCapabilities]);
  const [checkoutData, setCheckoutData] = useState<CartResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const cartLoadedRef = useRef(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [paymentSplit, setPaymentSplit] = useState<PaymentSplit>(() => emptyPaymentSplit());

  const loadCart = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const cart = await cartApi.get();

      // Debug: Log cart data to verify retailer fields
      if (import.meta.env.DEV) {
        console.log('Cart data:', cart);
        console.log('Retailer fields:', {
          customerGstin: cart.customerGstin,
          customerDlNo: cart.customerDlNo,
          customerPan: cart.customerPan,
        });
      }

      // If status is CREATED, redirect to sell page
      if (cart.status === 'CREATED') {
        navigate(sellPath);
        return;
      }

      // If status is PENDING, stay on checkout page
      if (cart.status === 'PENDING') {
        setCheckoutData(cart);
        return;
      }

      // For any other status, redirect to sell page
      navigate(sellPath);
    } catch (err) {
      // 404 or other error - cart API doesn't return COMPLETED carts
      // If we already have checkout data (likely COMPLETED), stay on checkout page
      // Otherwise, redirect to scan-sell
      console.log('Cart API returned 404 (no active cart):', err);
      if (checkoutData && checkoutData.status === 'COMPLETED') {
        // Already showing completed order, stay on checkout page
        setIsLoading(false);
        return;
      }
      // No checkout data, redirect to scan-sell
      console.error('Error loading cart:', err);
      navigate(sellPath);
    } finally {
      setIsLoading(false);
    }
  }, [navigate, checkoutData, sellPath]);

  // Load cart data on mount
  useEffect(() => {
    if (!cartLoadedRef.current) {
      cartLoadedRef.current = true;
      loadCart();
    }
  }, [loadCart]);

  const grandTotalNum = roundMoney(checkoutData?.grandTotal ?? 0);
  const paymentValidation = validatePaymentSplit(
    paymentMethod,
    paymentSplit,
    grandTotalNum
  );
  const canSubmitPayment = paymentValidation.ok && grandTotalNum > 0;

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.errorContainer}>
          <h2>Loading...</h2>
          <p>Please wait while we load your cart data.</p>
        </div>
      </div>
    );
  }

  if (!checkoutData) {
    return (
      <div className={styles.page}>
        <div className={styles.errorContainer}>
          <h2>No checkout data found</h2>
          <p>Please start a new transaction from the sell page.</p>
          <button
            className={styles.backBtn}
            onClick={() => navigate(sellPath)}
          >
            Go to Sell
          </button>
        </div>
      </div>
    );
  }

  const handlePayment = async () => {
    if (!checkoutData) {
      notifyError('Checkout data not available');
      return;
    }
    if (!paymentMethod) {
      notifyError('Select a payment method to continue.');
      return;
    }
    if (!paymentValidation.ok) {
      notifyError(paymentValidation.message ?? 'Payment split is invalid');
      return;
    }

    setIsProcessingPayment(true);
    setError(null);

    try {
      const purchaseId = checkoutData.purchaseId;
      if (!purchaseId) {
        throw new Error('Purchase ID not found in checkout data');
      }

      const statusPayload: UpdateCartStatusDto = {
        purchaseId,
        status: 'COMPLETED',
        paymentMethod,
        cashAmount: paymentSplit.cashAmount,
        onlineAmount: paymentSplit.onlineAmount,
        creditAmount: paymentSplit.creditAmount,
        // Legacy field for back-compat: tells older servers how much of a
        // CREDIT bill was paid up-front. New servers should prefer the
        // explicit split above.
        ...(paymentSplit.creditAmount > 0
          ? {
              creditPaidAmount: roundMoney(
                paymentSplit.cashAmount + paymentSplit.onlineAmount
              ),
            }
          : {}),
      };

      const completed = await cartApi.updateStatus(statusPayload);

      setCheckoutData({
        ...checkoutData,
        ...completed,
        purchaseId: completed.purchaseId ?? checkoutData.purchaseId,
        status: 'COMPLETED',
        paymentMethod: paymentMethod ?? checkoutData.paymentMethod,
        cashAmount: paymentSplit.cashAmount,
        onlineAmount: paymentSplit.onlineAmount,
        creditAmount: paymentSplit.creditAmount,
      });

      setShowSuccess(true);
      setIsProcessingPayment(false);

      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to process payment';
      notifyError(errorMessage);
      setIsProcessingPayment(false);
    }
  };

  const handleGoBack = async () => {
    if (!checkoutData) {
      navigate(sellPath);
      return;
    }

    setIsUpdating(true);
    setError(null);

    try {
      const purchaseId = checkoutData.purchaseId;

      if (!purchaseId) {
        throw new Error('Purchase ID not found in checkout data');
      }

      const statusPayload: UpdateCartStatusDto = {
        purchaseId,
        status: 'CREATED',
        paymentMethod: checkoutData.paymentMethod || 'CASH',
      };

      await cartApi.updateStatus(statusPayload);

      navigate(sellPath);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to update cart status';
      notifyError(errorMessage);
      setIsUpdating(false);
    }
  };

  // Get SGST and CGST percentages from items if available, otherwise calculate from amounts
  const billingMode =
    checkoutData.billingMode === 'BASIC' ? 'BASIC' : 'REGULAR';
  const firstItem = checkoutData.items[0];
  const sgstPercentage = firstItem?.sgst
    ? parseFloat(firstItem.sgst).toFixed(1)
    : checkoutData.subTotal > 0 && checkoutData.sgstAmount
    ? ((checkoutData.sgstAmount / checkoutData.subTotal) * 100).toFixed(1)
    : '0';

  const cgstPercentage = firstItem?.cgst
    ? parseFloat(firstItem.cgst).toFixed(1)
    : checkoutData.subTotal > 0 && checkoutData.cgstAmount
    ? ((checkoutData.cgstAmount / checkoutData.subTotal) * 100).toFixed(1)
    : '0';

  // Get current date
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Show success overlay
  if (showSuccess) {
    return (
      <div className={styles.successOverlay}>
        <div className={styles.successContainer}>
          <div className={styles.successIcon}>
            <div className={styles.checkmarkContainer}>
              <svg
                className={styles.checkmark}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 52 52"
              >
                <circle
                  className={styles.checkmarkCircle}
                  cx="26"
                  cy="26"
                  r="25"
                  fill="none"
                />
                <path
                  className={styles.checkmarkCheck}
                  fill="none"
                  d="M14.1 27.2l7.1 7.2 16.7-16.8"
                />
              </svg>
            </div>
          </div>
          <h2 className={styles.successTitle}>Order Successful!</h2>
          {showTokenOnReceipt && checkoutData?.tokenNo != null && (
            <p className={styles.tokenNo}>
              Token #{checkoutData.tokenNo}
            </p>
          )}
          <p className={styles.successMessage}>
            Your payment has been processed successfully.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>Checkout</h2>
        <p className={styles.subtitle}>
          Invoice #{checkoutData.invoiceNo}
          {showTokenOnReceipt && checkoutData.tokenNo != null && (
            <> · Token #{checkoutData.tokenNo}</>
          )}
        </p>
      </div>

      {error && <div className={styles.errorMessage}>{error}</div>}

      <div className={styles.container}>
        {/* Invoice Details */}
        <div className={styles.invoiceSection}>
          <div className={styles.invoiceHeader}>
            <div>
              <h3 className={styles.invoiceTitle}>Invoice Details</h3>
            </div>
            <div className={styles.headerActions}>
              <div
                className={`${styles.statusBadge} ${
                  checkoutData.status === 'COMPLETED'
                    ? styles.statusBadgeCompleted
                    : ''
                }`}
              >
                <span className={styles.statusText}>{checkoutData.status}</span>
              </div>
              {checkoutData.status === 'COMPLETED' && (
                <button
                  type="button"
                  className={styles.printBtn}
                  onClick={() => {
                    if (!checkoutData.purchaseId) {
                      notifyError('Invoice is not ready to print yet.');
                      return;
                    }
                    setShowPrintModal(true);
                  }}
                  aria-label="Print Invoice"
                  title="Print Invoice"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 6 2 18 2 18 9"></polyline>
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                    <rect x="6" y="14" width="12" height="8"></rect>
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Billing Mode:</span>
              <span className={styles.infoValue}>{billingMode}</span>
            </div>
            {checkoutData.customerName && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Customer Name:</span>
                <span className={styles.infoValue}>
                  {checkoutData.customerName}
                </span>
              </div>
            )}
            {checkoutData.customerPhone && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Customer Phone:</span>
                <span className={styles.infoValue}>
                  {checkoutData.customerPhone}
                </span>
              </div>
            )}
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Address:</span>
              <span className={styles.infoValue}>
                {checkoutData.customerAddress || 'Not specified'}
              </span>
            </div>
            {checkoutData.customerGstin &&
              checkoutData.customerGstin.trim() && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Customer GSTIN:</span>
                  <span className={styles.infoValue}>
                    {checkoutData.customerGstin}
                  </span>
                </div>
              )}
            {checkoutData.customerDlNo && checkoutData.customerDlNo.trim() && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Customer DL No:</span>
                <span className={styles.infoValue}>
                  {checkoutData.customerDlNo}
                </span>
              </div>
            )}
            {checkoutData.customerPan && checkoutData.customerPan.trim() && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Customer PAN:</span>
                <span className={styles.infoValue}>
                  {checkoutData.customerPan}
                </span>
              </div>
            )}
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Payment Method:</span>
              <span className={styles.infoValue}>
                {formatPaymentMethod(checkoutData.paymentMethod)}
                {(() => {
                  const split = formatPaymentSplit({
                    cashAmount: checkoutData.cashAmount ?? undefined,
                    onlineAmount: checkoutData.onlineAmount ?? undefined,
                    creditAmount: checkoutData.creditAmount ?? undefined,
                  });
                  return split ? (
                    <>
                      <br />
                      <small>{split}</small>
                    </>
                  ) : null;
                })()}
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Date:</span>
              <span className={styles.infoValue}>{currentDate}</span>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className={styles.itemsSection}>
          <h3 className={styles.sectionTitle}>Items</h3>
          <div className={styles.tableContainer}>
            <table className={styles.itemsTable}>
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Quantity</th>
                  <th>MRP</th>
                  <th>Selling Price</th>
                  <th>Discount</th>
                  <th>Additional Discount</th>
                  <th>Scheme/Deal</th>
                  {billingMode === 'REGULAR' && <th>CGST%</th>}
                  {billingMode === 'REGULAR' && <th>SGST%</th>}
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {checkoutData.items.map((item, index: number) => {
                  // Calculate discount amount: (MRP - Selling Price) * quantity
                  const discountAmount =
                    (item.maximumRetailPrice - item.priceToRetail) *
                    item.quantity;
                  return (
                    <tr key={index}>
                      <td>{item.name}</td>
                      <td>{item.quantity}</td>
                      <td>₹{item.maximumRetailPrice.toFixed(2)}</td>
                      <td>₹{item.priceToRetail.toFixed(2)}</td>
                      <td>₹{discountAmount.toFixed(2)}</td>
                      <td>
                        {item.saleAdditionalDiscount !== null &&
                        item.saleAdditionalDiscount !== undefined
                          ? `${item.saleAdditionalDiscount.toFixed(2)}%`
                          : '—'}
                      </td>
                      <td>
                        {item.schemePayFor != null || item.schemeFree != null
                          ? `${item.schemePayFor ?? '—'} + ${
                              item.schemeFree ?? '—'
                            }`
                          : '—'}
                      </td>
                      {billingMode === 'REGULAR' && (
                        <td>
                          {item.cgst !== null && item.cgst !== undefined
                            ? `${item.cgst}%`
                            : '—'}
                        </td>
                      )}
                      {billingMode === 'REGULAR' && (
                        <td>
                          {item.sgst !== null && item.sgst !== undefined
                            ? `${item.sgst}%`
                            : '—'}
                        </td>
                      )}
                      <td>₹{item.totalAmount.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary */}
        <div className={styles.summarySection}>
          <h3 className={styles.sectionTitle}>Summary</h3>
          <div className={styles.summaryTable}>
            <div className={styles.summaryRow}>
              <span>Subtotal:</span>
              <span>₹{checkoutData.subTotal.toFixed(2)}</span>
            </div>
            {checkoutData.sgstAmount !== undefined &&
              checkoutData.sgstAmount > 0 && (
                <div className={styles.summaryRow}>
                  <span>SGST ({sgstPercentage}%):</span>
                  <span>₹{checkoutData.sgstAmount.toFixed(2)}</span>
                </div>
              )}
            {checkoutData.cgstAmount !== undefined &&
              checkoutData.cgstAmount > 0 && (
                <div className={styles.summaryRow}>
                  <span>CGST ({cgstPercentage}%):</span>
                  <span>₹{checkoutData.cgstAmount.toFixed(2)}</span>
                </div>
              )}
            {((checkoutData.taxTotal ?? 0) !== 0 ||
              (checkoutData.sgstAmount ?? 0) !== 0 ||
              (checkoutData.cgstAmount ?? 0) !== 0) && (
              <div className={styles.summaryRow}>
                <span>Tax:</span>
                <span>₹{checkoutData.taxTotal.toFixed(2)}</span>
              </div>
            )}
            {checkoutData.saleAdditionalDiscountTotal !== 0 &&
              checkoutData.saleAdditionalDiscountTotal != null && (
                <div className={styles.summaryRow}>
                  <span>
                    {checkoutData.saleAdditionalDiscountTotal > 0
                      ? 'Additional Discount:'
                      : 'Additional (markup):'}
                  </span>
                  <span>
                    {checkoutData.saleAdditionalDiscountTotal > 0
                      ? `-₹${checkoutData.saleAdditionalDiscountTotal.toFixed(
                          2
                        )}`
                      : `+₹${Math.abs(
                          checkoutData.saleAdditionalDiscountTotal
                        ).toFixed(2)}`}
                  </span>
                </div>
              )}
            <div className={styles.summaryRowTotal}>
              <span>Grand Total:</span>
              <span>₹{checkoutData.grandTotal.toFixed(2)}</span>
            </div>
            {(checkoutData.totalCost != null ||
              checkoutData.revenueAfterTax != null ||
              checkoutData.totalProfit != null ||
              checkoutData.marginPercent != null) && (
              <>
                <div className={styles.summaryDivider} />
                <div className={styles.summaryRow}>
                  <span>Total Cost:</span>
                  <span>₹{(checkoutData.totalCost ?? 0).toFixed(2)}</span>
                </div>
                {checkoutData.revenueAfterTax != null && (
                  <div className={styles.summaryRow}>
                    <span>Revenue (after tax):</span>
                    <span>₹{checkoutData.revenueAfterTax.toFixed(2)}</span>
                  </div>
                )}
                {checkoutData.totalProfit != null && (
                  <div className={styles.summaryRow}>
                    <span>Profit:</span>
                    <span>₹{checkoutData.totalProfit.toFixed(2)}</span>
                  </div>
                )}
                {checkoutData.marginPercent != null && (
                  <div className={styles.summaryRow}>
                    <span>Margin:</span>
                    <span>{checkoutData.marginPercent.toFixed(1)}%</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Payment Options */}
        {checkoutData.status !== 'COMPLETED' && (
          <div className={styles.paymentSection}>
            <h3 className={styles.sectionTitle}>Payment</h3>

            <PaymentMethodSplit
              context="sale"
              title="How was this bill settled?"
              intro="Pick one of the six tenders. For split sales (e.g. Credit + Cash), enter the deposit and the remainder posts to Credit balances."
              total={grandTotalNum}
              value={{ method: paymentMethod, split: paymentSplit }}
              onChange={(next) => {
                setPaymentMethod(next.method);
                setPaymentSplit(next.split);
              }}
              disabled={isProcessingPayment || isUpdating}
            />

            {paymentMethod && isCreditMethod(paymentMethod) && paymentSplit.creditAmount > 0 ? (
              <p className={styles.splitSellFoot}>
                <Link className={styles.splitSellLink} to="/dashboard/credit">
                  Credit balances
                </Link>{' '}
                · <strong>Owes you</strong> ₹{paymentSplit.creditAmount.toFixed(2)}
              </p>
            ) : null}

            <div className={styles.paymentButtons}>
              <button
                className={`${styles.paymentBtn} ${styles.cashBtn}`}
                onClick={handlePayment}
                disabled={isProcessingPayment || isUpdating || !canSubmitPayment}
              >
                <span role="img" aria-label="Complete sale">
                  ✅
                </span>
                {isProcessingPayment ? 'Processing…' : 'Complete sale'}
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className={styles.actionsSection}>
          <button
            className={styles.backBtn}
            onClick={handleGoBack}
            disabled={isUpdating}
          >
            {isUpdating ? 'Updating...' : 'Go Back and Sell'}
          </button>
        </div>
      </div>

      {checkoutData?.purchaseId && (
        <PrintInvoiceModal
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          purchaseId={checkoutData.purchaseId}
          invoiceNo={checkoutData.invoiceNo}
          onError={(msg) => msg && notifyError(msg)}
        />
      )}
    </div>
  );
}
