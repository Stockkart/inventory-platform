import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Switch,
  Text,
  VisuallyHidden,
  surfaceChrome,
} from '@inventory-platform/ui-kit';
import { useQueryClient } from '@tanstack/react-query';
import type { CreatePlanCheckoutRequest } from '@inventory-platform/plan/types';
import {
  buildQuoteRequest,
  newIdempotencyKey,
  paidFromWallet,
  readVoucherRejection,
  sellableAddOns,
  type AddOnSelection,
} from '../checkout';
import { getPaymentCheckout } from '../payment/index.js';
import { AddOnPicker } from '../ui/AddOnPicker';
import { formatRupees, planListPriceLabel } from '../ui/planPricing';
import { QuoteSummary } from '../ui/QuoteSummary';
import { VoucherField } from '../ui/VoucherField';
import {
  useAuthStore,
  usePlanEntitlementsStore,
  usePlanStatusStore,
} from '@inventory-platform/session';
import {
  useAddOnsQuery,
  useCreatePlanCheckoutMutation,
  usePlanQuery,
  usePlanQuoteQuery,
  usePlansQuery,
  usePlanTransactionsQuery,
  useVerifyPlanPaymentMutation,
  useWalletQuery,
} from '../queries/hooks';
import { planKeys } from '../queries/keys';

export function PlanPaymentPage() {
  const { user } = useAuthStore();
  const fetchPlanStatus = usePlanStatusStore((s) => s.fetchPlanStatus);
  const fetchEntitlements = usePlanEntitlementsStore((s) => s.fetchEntitlements);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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
  const selectedListPrice = selectedPlan ? planListPriceLabel(selectedPlan) : null;
  /** Legacy plans have no catalogue code: no add-ons, vouchers or quote, just the plan price. */
  const planCode = selectedPlan?.code ?? null;

  const [addOnSelection, setAddOnSelection] = useState<AddOnSelection>({});
  const [voucherCodes, setVoucherCodes] = useState<string[]>([]);
  const [voucherError, setVoucherError] = useState<string | null>(null);

  const [useWalletCredit, setUseWalletCredit] = useState(false);

  useEffect(() => {
    setAddOnSelection({});
    setVoucherCodes([]);
    setVoucherError(null);
  }, [selectedPlan?.id]);

  const { data: wallet } = useWalletQuery({ enabled: planCode != null });
  const walletBalance = wallet?.availableBalance ?? 0;
  const applyWalletCredit = useWalletCredit && walletBalance > 0;

  const { data: addOnCatalogue = [] } = useAddOnsQuery({ enabled: planCode != null });
  const addOns = useMemo(
    () => (selectedPlan ? sellableAddOns(addOnCatalogue, selectedPlan) : []),
    [addOnCatalogue, selectedPlan],
  );

  const quoteRequest = useMemo(
    () =>
      planCode
        ? buildQuoteRequest(planCode, addOnSelection, voucherCodes, applyWalletCredit)
        : null,
    [planCode, addOnSelection, voucherCodes, applyWalletCredit],
  );
  const quoteQuery = usePlanQuoteQuery(quoteRequest, { retry: false });
  const quote = quoteQuery.isError ? undefined : quoteQuery.data;
  const walletCoversAll = quote != null && quote.grandTotal === 0 && quote.walletCredit > 0;

  const dropRejectedVoucher = useCallback((err: unknown): boolean => {
    const rejection = readVoucherRejection(err);
    if (!rejection) return false;
    if (rejection.voucherCode) {
      setVoucherCodes((codes) => codes.filter((code) => code !== rejection.voucherCode));
    }
    setVoucherError(rejection.message);
    return true;
  }, []);

  useEffect(() => {
    if (quoteQuery.error) dropRejectedVoucher(quoteQuery.error);
  }, [quoteQuery.error, dropRejectedVoucher]);

  const quoteFailure =
    quoteQuery.error && !readVoucherRejection(quoteQuery.error)
      ? quoteQuery.error instanceof Error
        ? quoteQuery.error.message
        : 'Could not price this order'
      : null;

  const changeAddOn = (code: string, quantity: number) => {
    setAddOnSelection((current) => ({ ...current, [code]: quantity }));
  };

  /** One key per cart, reused across retries so a retry replays the open order. */
  const idempotency = useRef<{ cart: string; key: string } | null>(null);

  const createCheckoutMutation = useCreatePlanCheckoutMutation();
  const verifyPaymentMutation = useVerifyPlanPaymentMutation();

  const handlePay = async () => {
    if (!user?.shopId || !selectedPlan) return;
    setPaying(true);
    setError(null);
    const request: CreatePlanCheckoutRequest = quoteRequest ?? {
      planId: selectedPlan.id,
      durationMonths: 12,
    };
    const cart = JSON.stringify(request);
    if (idempotency.current?.cart !== cart) {
      idempotency.current = { cart, key: newIdempotencyKey() };
    }
    try {
      const checkout = await createCheckoutMutation.mutateAsync({
        request,
        idempotencyKey: idempotency.current.key,
      });

      if (paidFromWallet(checkout)) {
        await queryClient.invalidateQueries({ queryKey: planKeys.all });
      } else {
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
      }

      idempotency.current = null;
      await Promise.all([fetchPlanStatus({ force: true }), fetchEntitlements({ force: true })]);
      await refetchTransactions();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (dropRejectedVoucher(err)) return;
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
                  {selectedListPrice ? (
                    <Text as="s" color="secondary">
                      <VisuallyHidden>Was </VisuallyHidden>
                      {selectedListPrice}
                    </Text>
                  ) : null}
                  <Text variant="title" weight="bold">
                    ₹{selectedPlan.arcPrice?.toLocaleString('en-IN')} /{' '}
                    {selectedPlan.planName === 'Extra User Plan' ? 'user/year' : 'year'}
                  </Text>
                  {selectedPlan.planName !== 'Extra User Plan' &&
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

                {planCode ? (
                  <>
                    <AddOnPicker
                      addOns={addOns}
                      selection={addOnSelection}
                      onChange={changeAddOn}
                      disabled={paying}
                    />
                    <VoucherField
                      applied={voucherCodes}
                      onApply={(code) => {
                        setVoucherError(null);
                        setVoucherCodes((codes) => [...codes, code]);
                      }}
                      onRemove={(code) => {
                        setVoucherError(null);
                        setVoucherCodes((codes) => codes.filter((c) => c !== code));
                      }}
                      quoteError={voucherError}
                      disabled={paying}
                    />
                    {walletBalance > 0 ? (
                      <Switch
                        id="use-wallet-credit"
                        label={`Use wallet credit (${formatRupees(walletBalance)} available)`}
                        checked={useWalletCredit}
                        disabled={paying}
                        onChange={(event) => setUseWalletCredit(event.target.checked)}
                      />
                    ) : null}
                    <Divider />
                    <QuoteSummary quote={quote} loading={quoteQuery.isFetching} />
                    {quoteFailure ? <Alert variant="danger">{quoteFailure}</Alert> : null}
                  </>
                ) : null}

                <Stack gap="sm">
                  <Button
                    type="button"
                    variant="solid"
                    onClick={() => void handlePay()}
                    disabled={paying || (planCode != null && (!quote || quoteQuery.isFetching))}
                    loading={paying}
                    className={surfaceChrome.maxW400}
                  >
                    {paying
                      ? walletCoversAll
                        ? 'Paying from wallet…'
                        : 'Opening Razorpay…'
                      : planCode
                      ? quote
                        ? walletCoversAll
                          ? 'Pay with wallet credit'
                          : `Pay ${formatRupees(quote.grandTotal)}`
                        : 'Pricing your order…'
                      : `Pay ₹${selectedPlan.arcPrice?.toLocaleString('en-IN')}${
                          selectedPlan.planName === 'Extra User Plan' ? ' per user/year' : '/year'
                        }`}
                  </Button>
                  <Text variant="caption" color="secondary">
                    {walletCoversAll
                      ? 'Your wallet credit covers this order; no card or UPI payment is needed.'
                      : 'Secured by Razorpay. Choose your payment method in the checkout window.'}
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
