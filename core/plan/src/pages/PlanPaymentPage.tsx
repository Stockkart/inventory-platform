import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  Alert,
  Button,
  Card,
  CardBody,
  CenteredLoader,
  Divider,
  Inline,
  PageHeader,
  Stack,
  Text,
  surfaceChrome,
} from '@inventory-platform/ui-kit';
import { planPeriodLabel, planPerUnitLabel } from '@inventory-platform/contracts';
import { getPaymentCheckout } from '../payment/index.js';
import { useAuthStore, usePlanStatusStore } from '@inventory-platform/session';
import {
  useCreatePlanCheckoutMutation,
  usePlanQuery,
  usePlansQuery,
  usePlanTransactionsQuery,
  useVerifyPlanPaymentMutation,
} from '../queries/hooks';

export function PlanPaymentPage() {
  const { user } = useAuthStore();
  const fetchPlanStatus = usePlanStatusStore((s) => s.fetchPlanStatus);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planIdFromUrl = searchParams.get('planId');
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  const { data: plans = [] } = usePlansQuery();
  const { data: planById } = usePlanQuery(
    planIdFromUrl && !plans.some((p) => p.id === planIdFromUrl) ? planIdFromUrl : null,
  );
  const {
    data: transactions = [],
    isLoading: transactionsLoading,
    refetch: refetchTransactions,
  } = usePlanTransactionsQuery();

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === planIdFromUrl) ?? planById ?? null,
    [plans, planIdFromUrl, planById],
  );

  const createCheckoutMutation = useCreatePlanCheckoutMutation();
  const verifyPaymentMutation = useVerifyPlanPaymentMutation();

  const handlePay = async () => {
    if (!user?.shopId || !selectedPlan) return;
    setPaying(true);
    setError(null);
    try {
      const checkout = await createCheckoutMutation.mutateAsync({
        planId: selectedPlan.id,
        durationMonths: 12,
      });

      const paymentCheckout = getPaymentCheckout(checkout.provider);
      const result = await paymentCheckout.openCheckout(checkout, {
        customerEmail: user.email ?? undefined,
      });

      await verifyPaymentMutation.mutateAsync({
        orderId: checkout.orderId,
        razorpayPaymentId: result.razorpay_payment_id,
        razorpayOrderId: result.razorpay_order_id,
        razorpaySignature: result.razorpay_signature,
      });

      await fetchPlanStatus({ force: true });
      await refetchTransactions();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process payment');
    } finally {
      setPaying(false);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  if (transactionsLoading && transactions.length === 0) {
    return (
      <Stack gap="md" width="full" maxWidth="xl" mx="auto">
        <CenteredLoader label="Loading..." />
      </Stack>
    );
  }

  return (
    <Stack gap="md" width="full" maxWidth="xl" mx="auto">
      <PageHeader description="Review your plan and pay with Razorpay (UPI, card, net banking, and more)" />

      <Stack gap="md">
        {selectedPlan ? (
          <Card>
            <CardBody>
              <Stack gap="md">
                <Text variant="heading3" weight="semibold">
                  Selected Plan
                </Text>
                <Stack gap="sm">
                  <Text variant="heading4" weight="semibold">
                    {selectedPlan.planName}
                  </Text>
                  <Text variant="title" weight="bold">
                    ₹{selectedPlan.arcPrice?.toLocaleString('en-IN')}
                    {planPeriodLabel(selectedPlan)}
                  </Text>
                  {planPerUnitLabel(selectedPlan) == null &&
                    selectedPlan.price != null &&
                    selectedPlan.price > 0 && (
                      <Text variant="caption" color="secondary">
                        One-time ₹{selectedPlan.price?.toLocaleString('en-IN')} if taking support
                      </Text>
                    )}
                  {selectedPlan.bestFor ? (
                    <Text color="secondary">{selectedPlan.bestFor}</Text>
                  ) : null}
                </Stack>

                <Divider />

                <Stack gap="sm">
                  <Button
                    type="button"
                    variant="solid"
                    onClick={() => void handlePay()}
                    disabled={paying}
                    loading={paying}
                    className={surfaceChrome.maxW400}
                  >
                    {paying
                      ? 'Opening Razorpay…'
                      : `Pay ₹${selectedPlan.arcPrice?.toLocaleString('en-IN')}${planPeriodLabel(
                          selectedPlan,
                        )}`}
                  </Button>
                  <Text variant="caption" color="secondary">
                    Secured by Razorpay. Choose your payment method in the checkout window.
                  </Text>
                </Stack>
              </Stack>
            </CardBody>
          </Card>
        ) : null}

        {!selectedPlan ? (
          <Card>
            <CardBody>
              <Stack gap="md" align="center" padding="lg">
                <Text align="center" color="secondary">
                  Select a plan from the Plan page to proceed with payment.
                </Text>
                <Button
                  type="button"
                  variant="solid"
                  onClick={() => navigate('/dashboard/plan-status')}
                >
                  Go to Plan
                </Button>
              </Stack>
            </CardBody>
          </Card>
        ) : null}

        <Card>
          <CardBody>
            <Stack gap="md">
              <Text variant="heading3" weight="semibold">
                Transaction History
              </Text>
              {transactions.length === 0 ? (
                <Stack gap="sm" padding="md" align="center">
                  <Text align="center" color="secondary">
                    No plan payments yet. Your transaction history will appear here.
                  </Text>
                </Stack>
              ) : (
                <Stack gap="sm">
                  {transactions.map((tx) => (
                    <Card key={tx.id}>
                      <CardBody>
                        <Stack gap="xs">
                          <Inline justify="between" width="full">
                            <Text weight="semibold">{tx.planName}</Text>
                            <Text weight="semibold" color="success">
                              ₹{tx.amount?.toLocaleString('en-IN')}
                            </Text>
                          </Inline>
                          <Inline justify="between" width="full">
                            <Text variant="caption" color="secondary">
                              {tx.paymentMethod}
                            </Text>
                            <Text variant="caption" color="secondary">
                              {formatDate(tx.createdAt)}
                            </Text>
                          </Inline>
                        </Stack>
                      </CardBody>
                    </Card>
                  ))}
                </Stack>
              )}
            </Stack>
          </CardBody>
        </Card>

        {error ? <Alert variant="danger">{error}</Alert> : null}
      </Stack>
    </Stack>
  );
}
