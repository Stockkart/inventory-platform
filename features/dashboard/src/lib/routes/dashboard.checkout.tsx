import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { cartApi } from '@inventory-platform/api';
import type { CartResponse } from '@inventory-platform/types';
import styles from './dashboard.checkout.module.css';
import { useNotify } from '@inventory-platform/store';

export function meta() {
  return [
    { title: 'Checkout - StockKart' },
    { name: 'description', content: 'Review and complete your purchase' },
  ];
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { error: notifyError } = useNotify;
  const [checkoutData, setCheckoutData] = useState<CartResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const cartLoadedRef = useRef(false);

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

      // If status is CREATED, redirect to scan-sell page
      if (cart.status === 'CREATED') {
        navigate('/dashboard/scan-sell');
        return;
      }

      // If status is PENDING, stay on checkout page
      if (cart.status === 'PENDING') {
        setCheckoutData(cart);
        return;
      }

      // For any other status, redirect to scan-sell
      navigate('/dashboard/scan-sell');
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
      navigate('/dashboard/scan-sell');
    } finally {
      setIsLoading(false);
    }
  }, [navigate, checkoutData]);

  // Load cart data on mount
  useEffect(() => {
    if (!cartLoadedRef.current) {
      cartLoadedRef.current = true;
      loadCart();
    }
  }, [loadCart]);

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
          <p>Please start a new transaction from the Scan and Sell page.</p>
          <button
            className={styles.backBtn}
            onClick={() => navigate('/dashboard/scan-sell')}
          >
            Go to Scan and Sell
          </button>
        </div>
      </div>
    );
  }

  const handlePayment = async (method: 'CASH' | 'ONLINE' | 'CREDIT') => {
    if (!checkoutData) {
      notifyError('Checkout data not available');
      return;
    }

    setIsProcessingPayment(true);
    setError(null);

    try {
      const purchaseId = checkoutData.purchaseId;

      if (!purchaseId) {
        throw new Error('Purchase ID not found in checkout data');
      }

      // Call update status API with status COMPLETED and payment method
      const statusPayload = {
        purchaseId,
        status: 'COMPLETED',
        paymentMethod: method,
      };

      await cartApi.updateStatus(statusPayload);

      // Update local checkout data status to COMPLETED
      if (checkoutData) {
        setCheckoutData({
          ...checkoutData,
          status: 'COMPLETED',
          paymentMethod: method,
        });
      }

      // Show success animation
      setShowSuccess(true);
      setIsProcessingPayment(false);

      // After showing success overlay, hide it (don't call loadCart as it will return 404 for COMPLETED)
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
      navigate('/dashboard/scan-sell');
      return;
    }

    setIsUpdating(true);
    setError(null);

    try {
      const purchaseId = checkoutData.purchaseId;

      if (!purchaseId) {
        throw new Error('Purchase ID not found in checkout data');
      }

      // Call update status API with status CREATED
      const statusPayload = {
        purchaseId,
        status: 'CREATED',
        paymentMethod: checkoutData.paymentMethod || 'CASH',
      };

      await cartApi.updateStatus(statusPayload);

      // Navigate back to scan-sell page
      navigate('/dashboard/scan-sell');
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to update cart status';
      notifyError(errorMessage);
      setIsUpdating(false);
    }
  };

  const handlePrintInvoice = async () => {
    if (!checkoutData?.purchaseId) {
      notifyError('Purchase ID not found');
      return;
    }

    setIsPrinting(true);
    setError(null);

    try {
      const pdfBlob = await cartApi.getInvoicePdf(checkoutData.purchaseId);

      // Create a blob URL and open it in a new window for viewing/printing
      const url = window.URL.createObjectURL(pdfBlob);
      const newWindow = window.open(url, '_blank');

      if (!newWindow) {
        // If popup was blocked, fall back to download
        const link = document.createElement('a');
        link.href = url;
        link.download = `invoice-${
          checkoutData.invoiceNo || checkoutData.purchaseId
        }.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      // Clean up the blob URL after a delay
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to download invoice PDF';
      notifyError(errorMessage);
    } finally {
      setIsPrinting(false);
    }
  };

  // Get SGST and CGST percentages from items if available, otherwise calculate from amounts
  const billingMode = checkoutData.billingMode === 'BASIC' ? 'BASIC' : 'REGULAR';
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
          <p className={styles.successMessage}>
            Your payment has been processed successfully.
          </p>
          <p className={styles.successSubMessage}>Updating order status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>Checkout</h2>
        <p className={styles.subtitle}>Invoice #{checkoutData.invoiceNo}</p>
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
                  className={styles.printBtn}
                  onClick={handlePrintInvoice}
                  disabled={isPrinting}
                  aria-label="Print Invoice"
                  title="Print Invoice"
                >
                  {isPrinting ? (
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
                      className={styles.spinner}
                    >
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
                    </svg>
                  ) : (
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
                  )}
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
                {checkoutData.paymentMethod || 'Not specified'}
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
                  <th>Scheme</th>
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
                        {item.additionalDiscount !== null &&
                        item.additionalDiscount !== undefined
                          ? `${item.additionalDiscount.toFixed(2)}%`
                          : '—'}
                      </td>
                      <td>
                        {item.schemePayFor != null || item.schemeFree != null
                          ? `${item.schemePayFor ?? '—'} + ${item.schemeFree ?? '—'}`
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
            {checkoutData.additionalDiscountTotal > 0 && (
              <div className={styles.summaryRow}>
                <span>Additional Discount:</span>
                <span>-₹{checkoutData.additionalDiscountTotal.toFixed(2)}</span>
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
            <h3 className={styles.sectionTitle}>Payment Options</h3>
            <div className={styles.paymentButtons}>
              <button
                className={`${styles.paymentBtn} ${styles.cashBtn}`}
                onClick={() => handlePayment('CASH')}
                disabled={isProcessingPayment || isUpdating}
              >
                <span role="img" aria-label="Cash">
                  💵
                </span>
                {isProcessingPayment ? 'Processing...' : 'Pay in Cash'}
              </button>
              <button
                className={`${styles.paymentBtn} ${styles.onlineBtn}`}
                onClick={() => handlePayment('ONLINE')}
                disabled={isProcessingPayment || isUpdating}
              >
                <span role="img" aria-label="Online Payment">
                  💳
                </span>
                {isProcessingPayment ? 'Processing...' : 'Pay Online'}
              </button>
              <button
                className={`${styles.paymentBtn} ${styles.creditBtn}`}
                onClick={() => handlePayment('CREDIT')}
                disabled={isProcessingPayment || isUpdating}
                title={
                  !checkoutData.customerId
                    ? 'Add customer (search by phone in cart) to sell on credit'
                    : 'Complete sale on credit – amount will be tracked in Credit Ledger'
                }
              >
                <span role="img" aria-label="Credit">
                  📒
                </span>
                {isProcessingPayment ? 'Processing...' : 'Sell on Credit'}
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
    </div>
  );
}
