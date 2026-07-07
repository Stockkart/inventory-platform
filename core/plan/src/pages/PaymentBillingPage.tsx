import { useState } from 'react';
import {
  Box,
  Button,
  FormField,
  Input,
  PageHeader,
  RadioGroup,
  Stack,
  Text,
} from '@inventory-platform/ui-kit';
import styles from './payment-billing.module.css';

export function PaymentBillingPage() {
  const [paymentMethod, setPaymentMethod] = useState('card');

  return (
    <Stack gap="md" className={styles.page}>
      <PageHeader
        title="Payment & Billing"
        description="Process payments and manage invoices"
      />

      <Box className={styles.container}>
        <Box className={styles.paymentSection}>
          <Text as="h3" variant="heading3" className={styles.sectionTitle}>
            Payment Method
          </Text>
          <RadioGroup
            name="payment"
            value={paymentMethod}
            onChange={setPaymentMethod}
            className={styles.paymentMethods}
            options={[
              {
                value: 'card',
                label: (
                  <Box className={styles.paymentCard}>
                    <Text
                      as="span"
                      className={styles.cardIcon}
                      role="img"
                      aria-label="Credit card"
                    >
                      💳
                    </Text>
                    <Text as="span">Credit/Debit Card</Text>
                  </Box>
                ),
              },
              {
                value: 'cash',
                label: (
                  <Box className={styles.paymentCard}>
                    <Text
                      as="span"
                      className={styles.cardIcon}
                      role="img"
                      aria-label="Cash"
                    >
                      💵
                    </Text>
                    <Text as="span">Cash</Text>
                  </Box>
                ),
              },
              {
                value: 'mobile',
                label: (
                  <Box className={styles.paymentCard}>
                    <Text
                      as="span"
                      className={styles.cardIcon}
                      role="img"
                      aria-label="Mobile payment"
                    >
                      📱
                    </Text>
                    <Text as="span">Mobile Payment</Text>
                  </Box>
                ),
              },
            ]}
          />
          <Box className={styles.cardForm}>
            <FormField label="Card Number">
              <Input placeholder="1234 5678 9012 3456" />
            </FormField>
            <Box className={styles.formRow}>
              <FormField label="Expiry Date">
                <Input placeholder="MM/YY" />
              </FormField>
              <FormField label="CVV">
                <Input placeholder="123" />
              </FormField>
            </Box>
          </Box>
        </Box>

        <Box className={styles.invoiceSection}>
          <Text as="h3" variant="heading3" className={styles.sectionTitle}>
            Invoice Details
          </Text>
          <Stack gap="sm" className={styles.invoiceInfo}>
            <Box className={styles.infoRow}>
              <Text as="span">Invoice #</Text>
              <Text as="span">INV-2025-001</Text>
            </Box>
            <Box className={styles.infoRow}>
              <Text as="span">Date</Text>
              <Text as="span">{new Date().toLocaleDateString()}</Text>
            </Box>
            <Box className={styles.infoRow}>
              <Text as="span">Customer</Text>
              <Text as="span">Walk-in Customer</Text>
            </Box>
          </Stack>

          <Box className={styles.invoiceItems}>
            <Box className={styles.invoiceHeader}>
              <Text as="span">Item</Text>
              <Text as="span">Qty</Text>
              <Text as="span">Price</Text>
              <Text as="span">Total</Text>
            </Box>
            <Box className={styles.invoiceItem}>
              <Text as="span">Product Name</Text>
              <Text as="span">2</Text>
              <Text as="span">$99.99</Text>
              <Text as="span">$199.98</Text>
            </Box>
          </Box>

          <Stack gap="sm" className={styles.invoiceTotal}>
            <Box className={styles.totalRow}>
              <Text as="span">Subtotal</Text>
              <Text as="span">$199.98</Text>
            </Box>
            <Box className={styles.totalRow}>
              <Text as="span">Tax (8%)</Text>
              <Text as="span">$16.00</Text>
            </Box>
            <Box className={styles.totalRowFinal}>
              <Text as="span">Total</Text>
              <Text as="span">$215.98</Text>
            </Box>
          </Stack>

          <Button variant="solid" className={styles.processBtn}>
            Process Payment
          </Button>
        </Box>
      </Box>
    </Stack>
  );
}
