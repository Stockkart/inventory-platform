import styles from './payment-billing.module.css';

export function PaymentBillingPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>Payment & Billing</h2>
        <p className={styles.subtitle}>Process payments and manage invoices</p>
      </div>
      <div className={styles.container}>
        <div className={styles.paymentSection}>
          <h3 className={styles.sectionTitle}>Payment Method</h3>
          <div className={styles.paymentMethods}>
            <label className={styles.paymentOption}>
              <input type="radio" name="payment" defaultChecked />
              <div className={styles.paymentCard}>
                <span
                  className={styles.cardIcon}
                  role="img"
                  aria-label="Credit card"
                >
                  💳
                </span>
                <span>Credit/Debit Card</span>
              </div>
            </label>
            <label className={styles.paymentOption}>
              <input type="radio" name="payment" />
              <div className={styles.paymentCard}>
                <span className={styles.cardIcon} role="img" aria-label="Cash">
                  💵
                </span>
                <span>Cash</span>
              </div>
            </label>
            <label className={styles.paymentOption}>
              <input type="radio" name="payment" />
              <div className={styles.paymentCard}>
                <span
                  className={styles.cardIcon}
                  role="img"
                  aria-label="Mobile payment"
                >
                  📱
                </span>
                <span>Mobile Payment</span>
              </div>
            </label>
          </div>
          <div className={styles.cardForm}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Card Number</label>
              <input
                type="text"
                className={styles.input}
                placeholder="1234 5678 9012 3456"
              />
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Expiry Date</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="MM/YY"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>CVV</label>
                <input type="text" className={styles.input} placeholder="123" />
              </div>
            </div>
          </div>
        </div>
        <div className={styles.invoiceSection}>
          <h3 className={styles.sectionTitle}>Invoice Details</h3>
          <div className={styles.invoiceInfo}>
            <div className={styles.infoRow}>
              <span>Invoice #</span>
              <span>INV-2025-001</span>
            </div>
            <div className={styles.infoRow}>
              <span>Date</span>
              <span>{new Date().toLocaleDateString()}</span>
            </div>
            <div className={styles.infoRow}>
              <span>Customer</span>
              <span>Walk-in Customer</span>
            </div>
          </div>
          <div className={styles.invoiceItems}>
            <div className={styles.invoiceHeader}>
              <span>Item</span>
              <span>Qty</span>
              <span>Price</span>
              <span>Total</span>
            </div>
            <div className={styles.invoiceItem}>
              <span>Product Name</span>
              <span>2</span>
              <span>$99.99</span>
              <span>$199.98</span>
            </div>
          </div>
          <div className={styles.invoiceTotal}>
            <div className={styles.totalRow}>
              <span>Subtotal</span>
              <span>$199.98</span>
            </div>
            <div className={styles.totalRow}>
              <span>Tax (8%)</span>
              <span>$16.00</span>
            </div>
            <div className={styles.totalRowFinal}>
              <span>Total</span>
              <span>$215.98</span>
            </div>
          </div>
          <button className={styles.processBtn}>Process Payment</button>
        </div>
      </div>
    </div>
  );
}
