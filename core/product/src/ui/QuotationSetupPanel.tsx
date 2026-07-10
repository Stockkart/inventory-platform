import type { FormEvent } from 'react';
import {
  Box,
  Button,
  Card,
  CardBody,
  Checkbox,
  FormField,
  Grid,
  Inline,
  Input,
  Stack,
  Text,
} from '@inventory-platform/ui-kit';
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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (canSubmit) {
      onSubmit();
    }
  };

  return (
    <Box className={styles.setupWrap}>
      <Card className={styles.setupCard}>
        <CardBody>
          <Stack gap="md">
            <Stack gap="xs" className={styles.setupHeader}>
              <Text variant="heading3" weight="bold" className={styles.setupTitle}>
                New quotation
              </Text>
              <Text color="secondary" className={styles.setupSubtitle}>
                Add customer details if you have them, or start selling and fill them in later.
              </Text>
            </Stack>

            <Box as="form" className={styles.setupForm} onSubmit={handleSubmit}>
              <Grid columns={2} gap="sm" className={styles.fieldGrid}>
                <FormField label="Phone" id="setup-customerPhone" className={styles.field}>
                  <Inline className={styles.inputRow} gap="sm">
                    <Input
                      id="setup-customerPhone"
                      type="tel"
                      className={styles.input}
                      placeholder="e.g. 9876543210"
                      value={customerPhone}
                      onChange={(e) => onPhoneChange(e.target.value)}
                      disabled={isSearchingCustomer || isSubmitting}
                      autoFocus
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={styles.searchBtn}
                      onClick={onSearchByPhone}
                      disabled={isSearchingCustomer || !customerPhone.trim() || isSubmitting}
                      title="Look up customer by phone"
                    >
                      {isSearchingCustomer ? '…' : 'Find'}
                    </Button>
                  </Inline>
                </FormField>

                <FormField label="Name" id="setup-customerName" className={styles.field}>
                  <Input
                    id="setup-customerName"
                    type="text"
                    className={styles.input}
                    placeholder="Customer name"
                    value={customerName}
                    onChange={(e) => onNameChange(e.target.value)}
                    disabled={isSubmitting}
                  />
                </FormField>

                <FormField label="Email" id="setup-customerEmail" className={styles.field}>
                  <Inline className={styles.inputRow} gap="sm">
                    <Input
                      id="setup-customerEmail"
                      type="email"
                      className={styles.input}
                      placeholder="Email (optional)"
                      value={customerEmail}
                      onChange={(e) => onEmailChange(e.target.value)}
                      disabled={isSearchingCustomer || isSubmitting}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={styles.searchBtn}
                      onClick={onSearchByEmail}
                      disabled={isSearchingCustomer || !customerEmail.trim() || isSubmitting}
                      title="Look up customer by email"
                    >
                      {isSearchingCustomer ? '…' : 'Find'}
                    </Button>
                  </Inline>
                </FormField>

                <FormField
                  label="Address"
                  id="setup-customerAddress"
                  className={`${styles.field} ${styles.fieldFull}`}
                >
                  <Input
                    id="setup-customerAddress"
                    type="text"
                    className={styles.input}
                    placeholder="Address (optional)"
                    value={customerAddress}
                    onChange={(e) => onAddressChange(e.target.value)}
                    disabled={isSubmitting}
                  />
                </FormField>
              </Grid>

              <Checkbox
                label="This customer is a retailer (GSTIN / DL / PAN)"
                checked={isRetailer}
                onChange={(e) => onRetailerChange(e.target.checked)}
                disabled={isSubmitting}
                className={styles.retailerCheck}
              />

              {isRetailer ? (
                <Grid columns={3} gap="sm" className={styles.retailerGrid}>
                  <FormField label="GSTIN" id="setup-customerGstin" className={styles.field}>
                    <Input
                      id="setup-customerGstin"
                      type="text"
                      className={styles.input}
                      value={customerGstin}
                      onChange={(e) => onGstinChange(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </FormField>
                  <FormField label="DL No" id="setup-customerDlNo" className={styles.field}>
                    <Input
                      id="setup-customerDlNo"
                      type="text"
                      className={styles.input}
                      value={customerDlNo}
                      onChange={(e) => onDlNoChange(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </FormField>
                  <FormField label="PAN" id="setup-customerPan" className={styles.field}>
                    <Input
                      id="setup-customerPan"
                      type="text"
                      className={styles.input}
                      value={customerPan}
                      onChange={(e) => onPanChange(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </FormField>
                </Grid>
              ) : null}

              <Inline className={styles.actions} gap="sm" justify="end">
                {showCancel && onCancel ? (
                  <Button
                    type="button"
                    variant="outline"
                    className={styles.cancelBtn}
                    onClick={onCancel}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                ) : null}
                <Button
                  type="submit"
                  variant="solid"
                  className={styles.submitBtn}
                  disabled={!canSubmit}
                >
                  {isSubmitting ? 'Creating…' : 'Create quotation & start selling'}
                </Button>
              </Inline>
            </Box>
          </Stack>
        </CardBody>
      </Card>
    </Box>
  );
}
