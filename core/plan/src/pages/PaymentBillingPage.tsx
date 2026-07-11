import { useState } from 'react';
import {
  Button,
  Card,
  CardBody,
  FormField,
  FormRow,
  Grid,
  Inline,
  Input,
  PageHeader,
  RadioGroup,
  Stack,
  Text,
} from '@inventory-platform/ui-kit';

export function PaymentBillingPage() {
  const [paymentMethod, setPaymentMethod] = useState('card');

  return (
    <Stack gap="md" width="full" maxWidth="xl" mx="auto">
      <PageHeader description="Process payments and manage invoices" />

      <Grid columns={2} gap="md" width="full">
        <Card>
          <CardBody>
            <Stack gap="md">
              <Text variant="heading3" weight="semibold">
                Payment Method
              </Text>
              <RadioGroup
                name="payment"
                value={paymentMethod}
                onChange={setPaymentMethod}
                options={[
                  {
                    value: 'card',
                    label: (
                      <Inline gap="md">
                        <Text role="img" aria-label="Credit card">
                          💳
                        </Text>
                        <Text>Credit/Debit Card</Text>
                      </Inline>
                    ),
                  },
                  {
                    value: 'cash',
                    label: (
                      <Inline gap="md">
                        <Text role="img" aria-label="Cash">
                          💵
                        </Text>
                        <Text>Cash</Text>
                      </Inline>
                    ),
                  },
                  {
                    value: 'mobile',
                    label: (
                      <Inline gap="md">
                        <Text role="img" aria-label="Mobile payment">
                          📱
                        </Text>
                        <Text>Mobile Payment</Text>
                      </Inline>
                    ),
                  },
                ]}
              />
              <Stack gap="sm">
                <FormField label="Card Number">
                  <Input placeholder="1234 5678 9012 3456" />
                </FormField>
                <FormRow>
                  <FormField label="Expiry Date">
                    <Input placeholder="MM/YY" />
                  </FormField>
                  <FormField label="CVV">
                    <Input placeholder="123" />
                  </FormField>
                </FormRow>
              </Stack>
            </Stack>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stack gap="md">
              <Text variant="heading3" weight="semibold">
                Invoice Details
              </Text>
              <Stack gap="sm">
                <Inline justify="between" width="full">
                  <Text color="secondary">Invoice #</Text>
                  <Text>INV-2025-001</Text>
                </Inline>
                <Inline justify="between" width="full">
                  <Text color="secondary">Date</Text>
                  <Text>{new Date().toLocaleDateString()}</Text>
                </Inline>
                <Inline justify="between" width="full">
                  <Text color="secondary">Customer</Text>
                  <Text>Walk-in Customer</Text>
                </Inline>
              </Stack>

              <Stack gap="xs">
                <Grid columns={4} gap="sm" width="full">
                  <Text weight="semibold" color="secondary" variant="caption">
                    Item
                  </Text>
                  <Text weight="semibold" color="secondary" variant="caption">
                    Qty
                  </Text>
                  <Text weight="semibold" color="secondary" variant="caption">
                    Price
                  </Text>
                  <Text weight="semibold" color="secondary" variant="caption">
                    Total
                  </Text>
                </Grid>
                <Grid columns={4} gap="sm" width="full">
                  <Text>Product Name</Text>
                  <Text>2</Text>
                  <Text>$99.99</Text>
                  <Text>$199.98</Text>
                </Grid>
              </Stack>

              <Stack gap="sm">
                <Inline justify="between" width="full">
                  <Text color="secondary">Subtotal</Text>
                  <Text color="secondary">$199.98</Text>
                </Inline>
                <Inline justify="between" width="full">
                  <Text color="secondary">Tax (8%)</Text>
                  <Text color="secondary">$16.00</Text>
                </Inline>
                <Inline justify="between" width="full">
                  <Text variant="title" weight="bold">
                    Total
                  </Text>
                  <Text variant="title" weight="bold">
                    $215.98
                  </Text>
                </Inline>
              </Stack>

              <Button variant="solid" fullWidth>
                Process Payment
              </Button>
            </Stack>
          </CardBody>
        </Card>
      </Grid>
    </Stack>
  );
}
