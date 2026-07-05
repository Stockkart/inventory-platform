import { useState } from 'react';
import type { Purchase } from '@inventory-platform/product/types';
import { PrintInvoiceModal } from './PrintInvoiceModal';
import { formatPaymentMethod, formatPaymentSplit } from './paymentMethod';
import styles from './HistoryRecordList.module.css';

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

export function SaleHistoryCard({ purchase }: { purchase: Purchase }) {
  const [expanded, setExpanded] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  const paymentSplitLine = formatPaymentSplit({
    cashAmount: purchase.cashAmount ?? undefined,
    onlineAmount: purchase.onlineAmount ?? undefined,
    creditAmount: purchase.creditAmount ?? undefined,
  });

  const statusClass =
    purchase.status === 'COMPLETED'
      ? styles.statusCompleted
      : purchase.status === 'CANCELLED'
        ? styles.statusCancelled
        : undefined;

  return (
    <>
      <div className={styles.recordCard}>
        <div className={styles.recordHeader}>
          <div>
            <strong>Invoice:</strong> {purchase.invoiceNo}
          </div>
          <div className={styles.recordActions}>
            <div>
              <strong>Date:</strong> {formatDate(purchase.soldAt)}
            </div>
            {purchase.status === 'COMPLETED' && (
              <button
                type="button"
                className={styles.expandBtn}
                onClick={() => setShowPrintModal(true)}
              >
                Print
              </button>
            )}
            {purchase.items.length > 0 && (
              <button
                type="button"
                className={styles.expandBtn}
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
              >
                {expanded ? 'Hide items' : 'View items'}
              </button>
            )}
          </div>
        </div>
        <div className={styles.recordDetails}>
          <div>
            <strong>Customer:</strong> {purchase.customerName ?? '—'}
          </div>
          <div>
            <strong>Phone:</strong> {purchase.customerPhone ?? '—'}
          </div>
          <div>
            <strong>Total:</strong> {formatCurrency(purchase.grandTotal)}
          </div>
          <div>
            <strong>Status:</strong>{' '}
            <span className={statusClass}>{purchase.status}</span>
          </div>
          <div>
            <strong>Payment:</strong> {formatPaymentMethod(purchase.paymentMethod)}
          </div>
          {paymentSplitLine ? (
            <div>
              <strong>Split:</strong> {paymentSplitLine}
            </div>
          ) : null}
          <div>
            <strong>Items:</strong> {purchase.items.length}
          </div>
        </div>
        {expanded && purchase.items.length > 0 ? (
          <div className={styles.breakdownWrap}>
            <div className={styles.breakdownTitle}>Line items</div>
            <div className={styles.breakdownScroll}>
              <table className={styles.breakdownTable}>
                <thead>
                  <tr>
                    <th scope="col">Product</th>
                    <th scope="col">Qty</th>
                    <th scope="col">Unit price</th>
                    <th scope="col">Line total</th>
                  </tr>
                </thead>
                <tbody>
                  {purchase.items.map((item, idx) => (
                    <tr key={`${item.inventoryId ?? item.name}-${idx}`}>
                      <td>{item.name ?? item.inventoryId ?? '—'}</td>
                      <td>{item.quantity}</td>
                      <td>{formatCurrency(item.priceToRetail ?? 0)}</td>
                      <td>
                        {formatCurrency(
                          (item.priceToRetail ?? 0) * (item.quantity ?? 0)
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
        <PrintInvoiceModal
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          purchaseId={purchase.purchaseId}
          invoiceNo={purchase.invoiceNo}
        />
    </>
  );
}
