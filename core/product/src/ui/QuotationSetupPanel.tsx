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
    <Box
      display="flex"
      justify="center"
      align="start"
      padding="sm"
      style={{ flex: 1, paddingBottom: '1.5rem' }}
    >
      <Box maxWidth="md" width="full" mx="auto">
        <Card>
          <CardBody>
            <Stack gap="md">
              <Stack gap="xs" style={{ marginBottom: '0.25rem' }}>
                <Text variant="heading3" weight="bold">
                  New quotation
                </Text>
                <Text color="secondary">
                  Add customer details if you have them, or start selling and fill them in later.
                </Text>
              </Stack>

              <Box as="form" onSubmit={handleSubmit}>
                <Stack gap="md">
                  <Grid columns={2} gap="sm">
                    <FormField label="Phone" id="setup-customerPhone">
                      <Inline gap="sm" width="full">
                        <Input
                          id="setup-customerPhone"
                          type="tel"
                          style={{ flex: 1, minWidth: 0 }}
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
                          onClick={onSearchByPhone}
                          disabled={isSearchingCustomer || !customerPhone.trim() || isSubmitting}
                          title="Look up customer by phone"
                        >
                          {isSearchingCustomer ? '…' : 'Find'}
                        </Button>
                      </Inline>
                    </FormField>

                    <FormField label="Name" id="setup-customerName">
                      <Input
                        id="setup-customerName"
                        type="text"
                        placeholder="Customer name"
                        value={customerName}
                        onChange={(e) => onNameChange(e.target.value)}
                        disabled={isSubmitting}
                      />
                    </FormField>

                    <FormField label="Email" id="setup-customerEmail">
                      <Inline gap="sm" width="full">
                        <Input
                          id="setup-customerEmail"
                          type="email"
                          style={{ flex: 1, minWidth: 0 }}
                          placeholder="Email (optional)"
                          value={customerEmail}
                          onChange={(e) => onEmailChange(e.target.value)}
                          disabled={isSearchingCustomer || isSubmitting}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={onSearchByEmail}
                          disabled={isSearchingCustomer || !customerEmail.trim() || isSubmitting}
                          title="Look up customer by email"
                        >
                          {isSearchingCustomer ? '…' : 'Find'}
                        </Button>
                      </Inline>
                    </FormField>

                    <Box style={{ gridColumn: '1 / -1' }}>
                      <FormField label="Address" id="setup-customerAddress">
                        <Input
                          id="setup-customerAddress"
                          type="text"
                          placeholder="Address (optional)"
                          value={customerAddress}
                          onChange={(e) => onAddressChange(e.target.value)}
                          disabled={isSubmitting}
                        />
                      </FormField>
                    </Box>
                  </Grid>

                  <Checkbox
                    label="This customer is a retailer (GSTIN / DL / PAN)"
                    checked={isRetailer}
                    onChange={(e) => onRetailerChange(e.target.checked)}
                    disabled={isSubmitting}
                  />

                  {isRetailer ? (
                    <Grid columns={3} gap="sm">
                      <FormField label="GSTIN" id="setup-customerGstin">
                        <Input
                          id="setup-customerGstin"
                          type="text"
                          value={customerGstin}
                          onChange={(e) => onGstinChange(e.target.value)}
                          disabled={isSubmitting}
                        />
                      </FormField>
                      <FormField label="DL No" id="setup-customerDlNo">
                        <Input
                          id="setup-customerDlNo"
                          type="text"
                          value={customerDlNo}
                          onChange={(e) => onDlNoChange(e.target.value)}
                          disabled={isSubmitting}
                        />
                      </FormField>
                      <FormField label="PAN" id="setup-customerPan">
                        <Input
                          id="setup-customerPan"
                          type="text"
                          value={customerPan}
                          onChange={(e) => onPanChange(e.target.value)}
                          disabled={isSubmitting}
                        />
                      </FormField>
                    </Grid>
                  ) : null}

                  <Inline gap="sm" justify="end" padding="none" style={{ paddingTop: '0.25rem' }}>
                    {showCancel && onCancel ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={onCancel}
                        disabled={isSubmitting}
                      >
                        Cancel
                      </Button>
                    ) : null}
                    <Button type="submit" variant="solid" disabled={!canSubmit}>
                      {isSubmitting ? 'Creating…' : 'Create quotation & start selling'}
                    </Button>
                  </Inline>
                </Stack>
              </Box>
            </Stack>
          </CardBody>
        </Card>
      </Box>
    </Box>
  );
}
