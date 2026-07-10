import { useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router';
import {
  Alert,
  Box,
  Button,
  Card,
  CardBody,
  CenteredLoader,
  PageHeader,
  Stack,
  Text,
} from '@inventory-platform/ui-kit';
import { getPaymentCheckout } from '../payment/index.js';
import { useAuthStore, usePlanStatusStore } from '@inventory-platform/session';
import {
  useCreatePlanCheckoutMutation,
  usePlanQuery,
  usePlansQuery,
  usePlanTransactionsQuery,
  useVerifyPlanPaymentMutation,
} from '../queries/hooks';
import styles from './plan-payment.module.css';

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
      <Box className={styles.page}>
        <CenteredLoader label="Loading..." />
      </Box>
    );
  }

  return (
    <Stack gap="md" className={styles.page}>
      <PageHeader
        title="Payment"
        description="Review your plan and pay with Razorpay (UPI, card, net banking, and more)"
      />

      <Box className={styles.container}>
        <Stack gap="md">
          {selectedPlan ? (
            <Box as="section" className={styles.section}>
              <Text as="h3" variant="heading3" className={styles.sectionTitle}>
                Selected Plan
              </Text>
              <Card className={styles.planSummary}>
                <CardBody>
                  <Box className={styles.planSummaryContent}>
                    <Text as="h4" variant="heading4">
                      {selectedPlan.planName}
                    </Text>
                    <Text className={styles.planPrice}>
                      ₹{selectedPlan.arcPrice?.toLocaleString('en-IN')} /{' '}
                      {selectedPlan.planName === 'Extra User Plan' ? 'user/year' : 'year'}
                    </Text>
                    {selectedPlan.planName !== 'Extra User Plan' &&
                      selectedPlan.price != null &&
                      selectedPlan.price > 0 && (
                        <Text className={styles.oneTimePrice}>
                          One-time ₹{selectedPlan.price?.toLocaleString('en-IN')} if taking support
                        </Text>
                      )}
                    {selectedPlan.bestFor ? (
                      <Text className={styles.planBestFor}>{selectedPlan.bestFor}</Text>
                    ) : null}
                  </Box>

                  <Box className={styles.paymentSection}>
                    <Button
                      type="button"
                      variant="solid"
                      className={styles.processBtn}
                      onClick={() => void handlePay()}
                      disabled={paying}
                      loading={paying}
                    >
                      {paying
                        ? 'Opening Razorpay…'
                        : `Pay ₹${selectedPlan.arcPrice?.toLocaleString('en-IN')}${
                            selectedPlan.planName === 'Extra User Plan' ? ' per user/year' : '/year'
                          }`}
                    </Button>
                    <Text className={styles.razorpayNote}>
                      Secured by Razorpay. Choose your payment method in the checkout window.
                    </Text>
                  </Box>
                </CardBody>
              </Card>
            </Box>
          ) : null}

          {!selectedPlan ? (
            <Box as="section" className={styles.section}>
              <Stack gap="sm" className={styles.noPlanSelected}>
                <Text>Select a plan from the Plan page to proceed with payment.</Text>
                <RouterLink to="/dashboard/plan-status" className={styles.linkToPlans}>
                  Go to Plan
                </RouterLink>
              </Stack>
            </Box>
          ) : null}

          <Box as="section" className={styles.section}>
            <Text as="h3" variant="heading3" className={styles.sectionTitle}>
              Transaction History
            </Text>
            {transactions.length === 0 ? (
              <Text className={styles.emptyHistory}>
                No plan payments yet. Your transaction history will appear here.
              </Text>
            ) : (
              <Stack gap="sm" className={styles.transactionList}>
                {transactions.map((tx) => (
                  <Box key={tx.id} className={styles.transactionItem}>
                    <Box className={styles.transactionMain}>
                      <Text as="span" className={styles.transactionPlan}>
                        {tx.planName}
                      </Text>
                      <Text as="span" className={styles.transactionAmount}>
                        ₹{tx.amount?.toLocaleString('en-IN')}
                      </Text>
                    </Box>
                    <Box className={styles.transactionMeta}>
                      <Text as="span">{tx.paymentMethod}</Text>
                      <Text as="span">{formatDate(tx.createdAt)}</Text>
                    </Box>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>

          {error ? (
            <Alert variant="danger" className={styles.errorInline}>
              {error}
            </Alert>
          ) : null}
        </Stack>
      </Box>
    </Stack>
  );
}
