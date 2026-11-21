import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  Alert,
  Button,
  Card,
  CardBody,
  CenteredLoader,
  Divider,
  PageHeader,
  Stack,
  Switch,
  Text,
  VisuallyHidden,
  surfaceChrome,
} from '@inventory-platform/ui-kit';
import { useQueryClient } from '@tanstack/react-query';
import type {
  CreatePlanCheckoutRequest,
  VerifyPlanPaymentRequest,
} from '@inventory-platform/plan/types';
import {
  PLAN_STATUS_PATH,
  buildAddOnOnlyRequest,
  buildQuoteRequest,
  checkoutFingerprint,
  confirmingMessage,
  formatTermEnd,
  newIdempotencyKey,
  orderStage,
  paidFromWallet,
  payCaption,
  pricedPayLabel,
  quoteFailureMessage,
  readAddOnOnlyIntent,
  readVoucherRejection,
  resolveAddOnOnlyIntent,
  sellableAddOns,
  topUpAddOns,
  vouchersAfterRejection,
  type AddOnSelection,
  type OrderState,
} from '../checkout';
import { PaymentDismissedError, getPaymentCheckout } from '../payment/index.js';
import { AddOnPicker } from '../ui/AddOnPicker';
import { formatRupees, planListPriceLabel } from '../ui/planPricing';
import { PastPurchases } from '../ui/PastPurchases';
import { QuoteSummary } from '../ui/QuoteSummary';
import { VoucherField } from '../ui/VoucherField';
import {
  useAuthStore,
  usePlanEntitlementsStore,
  usePlanStatusStore,
} from '@inventory-platform/session';
import {
  useAddOnsQuery,
  useCancelPlanOrderMutation,
  useCreatePlanCheckoutMutation,
  usePlanQuery,
  usePlanQuoteQuery,
  usePlansQuery,
  usePlanTransactionsQuery,
  useShopPlanStatusQuery,
  useVerifyPlanPaymentMutation,
  useWalletQuery,
} from '../queries/hooks';
import { isPlanDataExceptQuote, planKeys } from '../queries/keys';

export function PlanPaymentPage() {
  const { user } = useAuthStore();
  const fetchPlanStatus = usePlanStatusStore((s) => s.fetchPlanStatus);
  const fetchEntitlements = usePlanEntitlementsStore((s) => s.fetchEntitlements);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const planIdFromUrl = searchParams.get('planId');
  /** `?addOn=CODE&qty=N` with no planId: buy add-ons on their own for the current paid plan. */
  const addOnIntent = useMemo(() => readAddOnOnlyIntent(searchParams), [searchParams]);
  const addOnOnly = addOnIntent != null;
  const intentCode = addOnIntent?.code ?? null;
  const intentQuantity = addOnIntent?.quantity ?? 0;
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  const { data: plans = [] } = usePlansQuery();
  const { data: planById } = usePlanQuery(
    planIdFromUrl && !plans.some((p) => p.id === planIdFromUrl) ? planIdFromUrl : null,
  );
  const {
    data: transactions = [],
    isLoading: transactionsLoading,
    isError: transactionsError,
    isFetching: transactionsFetching,
    refetch: refetchTransactions,
  } = usePlanTransactionsQuery();

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === planIdFromUrl) ?? planById ?? null,
    [plans, planIdFromUrl, planById],
  );
  const selectedListPrice = selectedPlan ? planListPriceLabel(selectedPlan) : null;
  /** Legacy plans have no catalogue code: no add-ons, vouchers or quote, just the plan price. */
  const planCode = selectedPlan?.code ?? null;
  /** Server-quoted cart: a catalogue plan, or add-ons on their own. Legacy plans skip the quote. */
  const priced = planCode != null || addOnOnly;
  const planStatusQuery = useShopPlanStatusQuery({ enabled: addOnOnly });
  const planStatus = planStatusQuery.data;

  const [addOnSelection, setAddOnSelection] = useState<AddOnSelection>({});
  const [voucherCodes, setVoucherCodes] = useState<string[]>([]);
  const [voucherError, setVoucherError] = useState<string | null>(null);

  const [useWalletCredit, setUseWalletCredit] = useState(false);

  /** The add-on link already put in the cart, so a catalogue refetch never overwrites the shopper's edits. */
  const seededIntent = useRef<string | null>(null);

  useEffect(() => {
    seededIntent.current = null;
    setAddOnSelection({});
    setVoucherCodes([]);
    setVoucherError(null);
  }, [selectedPlan?.id, intentCode, intentQuantity]);

  const { data: wallet } = useWalletQuery({ enabled: priced });
  const walletBalance = wallet?.availableBalance ?? 0;
  const applyWalletCredit = useWalletCredit && walletBalance > 0;

  const addOnsQuery = useAddOnsQuery({ enabled: priced });
  const addOnCatalogue = addOnsQuery.data;
  const addOns = useMemo(() => {
    const catalogue = addOnCatalogue ?? [];
    if (addOnOnly) return planStatus ? topUpAddOns(catalogue, planStatus) : [];
    return selectedPlan ? sellableAddOns(catalogue, selectedPlan) : [];
  }, [addOnOnly, addOnCatalogue, planStatus, selectedPlan]);

  /** An add-on link is checked against the plan and catalogue before it reaches the cart. */
  const intentState = useMemo(
    () => (addOnIntent ? resolveAddOnOnlyIntent(addOnIntent, addOnCatalogue, planStatus) : null),
    [addOnIntent, addOnCatalogue, planStatus],
  );
  /** Still waiting on a request that failed; an ineligible plan never needs the catalogue. */
  const addOnOnlyLoadFailed =
    intentState?.kind === 'loading' && (planStatusQuery.isError || addOnsQuery.isError);

  useEffect(() => {
    if (intentState?.kind !== 'ready') return;
    const seed = JSON.stringify(intentState.selection);
    if (seededIntent.current === seed) return;
    seededIntent.current = seed;
    setAddOnSelection(intentState.selection);
  }, [intentState]);

  const quoteRequest = useMemo(() => {
    if (addOnOnly) {
      return buildAddOnOnlyRequest(addOnSelection, voucherCodes, applyWalletCredit);
    }
    return planCode
      ? buildQuoteRequest(planCode, addOnSelection, voucherCodes, applyWalletCredit)
      : null;
  }, [addOnOnly, planCode, addOnSelection, voucherCodes, applyWalletCredit]);
  const quoteQuery = usePlanQuoteQuery(quoteRequest, { retry: false });
  const quote = quoteQuery.isError || !quoteRequest ? undefined : quoteQuery.data;

  const dropRejectedVoucher = useCallback((err: unknown): boolean => {
    const rejection = readVoucherRejection(err);
    if (!rejection) return false;
    setVoucherCodes((codes) => {
      const next = vouchersAfterRejection(codes, rejection);
      return next.length === codes.length ? codes : next;
    });
    setVoucherError(rejection.message);
    return true;
  }, []);

  useEffect(() => {
    if (quoteQuery.error) dropRejectedVoucher(quoteQuery.error);
  }, [quoteQuery.error, dropRejectedVoucher]);

  const quoteFailure = quoteFailureMessage(quoteQuery.error, voucherCodes);

  const changeAddOn = (code: string, quantity: number) => {
    setVoucherError(null);
    setAddOnSelection((current) => ({ ...current, [code]: quantity }));
  };

  /** One key per cart and quoted total, reused across retries so a retry replays the open order. */
  const idempotency = useRef<{ cart: string; key: string } | null>(null);

  /**
   * The unpaid order the last checkout opened. While it is open its idempotency key is reused, so a
   * retry replays it instead of opening a second order at a different price; it is cancelled when
   * the shopper closes the payment window, which releases its wallet and voucher holds.
   */
  const openOrder = useRef<{ orderId: string; key: string } | null>(null);

  const createCheckoutMutation = useCreatePlanCheckoutMutation();
  const verifyPaymentMutation = useVerifyPlanPaymentMutation();
  const cancelOrderMutation = useCancelPlanOrderMutation();

  /**
   * A gateway payment that went through but is not confirmed yet. Kept so "Confirm payment" retries
   * the verification alone and never opens Razorpay again for an order that is already paid.
   */
  const [pendingVerify, setPendingVerify] = useState<VerifyPlanPaymentRequest | null>(null);
  /** The order is paid and the API is still applying it: show that, never the Pay button. */
  const [confirming, setConfirming] = useState<string | null>(null);

  const finishPaid = async () => {
    idempotency.current = null;
    openOrder.current = null;
    setPendingVerify(null);
    setConfirming(null);
    await Promise.all([fetchPlanStatus({ force: true }), fetchEntitlements({ force: true })]);
    await refetchTransactions();
    navigate(addOnOnly ? PLAN_STATUS_PATH : '/dashboard', { replace: true });
  };

  /** Act on the order phase the API reports after checkout, verify or cancel. True when handled. */
  const settle = async (state: OrderState): Promise<boolean> => {
    const stage = orderStage(state);
    if (stage === 'done') {
      await finishPaid();
      return true;
    }
    if (stage === 'confirming') {
      openOrder.current = null;
      setConfirming(confirmingMessage(state.status));
      await queryClient.invalidateQueries({ predicate: isPlanDataExceptQuote });
      return true;
    }
    if (stage === 'closed') {
      // This order can no longer be paid; the next attempt opens a new one.
      idempotency.current = null;
      openOrder.current = null;
      setError('This order was closed. Check the total and pay again.');
      return true;
    }
    return false;
  };

  const verify = async (request: VerifyPlanPaymentRequest) => {
    setPendingVerify(request);
    const verified = await verifyPaymentMutation.mutateAsync(request);
    if (await settle(verified)) return;
    await finishPaid();
  };

  /** Retry only the verification of a payment Razorpay already took. */
  const handleConfirm = async () => {
    if (!pendingVerify) return;
    setPaying(true);
    setError(null);
    try {
      await verify(pendingVerify);
    } catch (err) {
      setError(
        `Payment received, but we could not confirm it yet (${
          err instanceof Error ? err.message : 'no answer'
        }). Try again; you will not be charged again.`,
      );
    } finally {
      setPaying(false);
    }
  };

  /**
   * The shopper left an unpaid order: cancel it so its holds come back now, not at expiry. If the
   * API says it was paid after all, show that. If the cancel fails, keep the order (and its key)
   * so the next attempt replays it rather than opening another.
   */
  const abandon = async (orderId: string) => {
    try {
      const cancelled = await cancelOrderMutation.mutateAsync(orderId);
      if (orderStage(cancelled) === 'closed') {
        openOrder.current = null;
        idempotency.current = null;
        return;
      }
      await settle(cancelled);
    } catch {
      // Still open on the server; the next Pay replays it with the same key.
    }
  };

  const handlePay = async () => {
    if (!user?.shopId) return;
    let request: CreatePlanCheckoutRequest;
    if (quoteRequest) {
      request = quoteRequest;
    } else if (selectedPlan && !addOnOnly) {
      request = { planId: selectedPlan.id, durationMonths: 12 };
    } else {
      return;
    }
    setPaying(true);
    setError(null);
    setConfirming(null);
    const cart = checkoutFingerprint(request, quote);
    // An order from the last attempt is still open: replay it with its key.
    const replaying = openOrder.current != null;
    if (openOrder.current) {
      idempotency.current = { cart, key: openOrder.current.key };
    } else if (idempotency.current?.cart !== cart) {
      idempotency.current = { cart, key: newIdempotencyKey() };
    }
    let paidAtGateway = false;
    let orderId: string | null = null;
    try {
      const checkout = await createCheckoutMutation.mutateAsync({
        request,
        idempotencyKey: idempotency.current.key,
      });

      // A replayed key returns the order as it is now: never reopen Razorpay on a paid order.
      if (await settle(checkout)) return;
      orderId = checkout.orderId;
      openOrder.current = { orderId: checkout.orderId, key: idempotency.current.key };

      if (paidFromWallet(checkout)) {
        await queryClient.invalidateQueries({ predicate: isPlanDataExceptQuote });
        await finishPaid();
        return;
      }

      // The server's total is what Razorpay charges. If it is not what the shopper was shown,
      // show the new price instead of charging it.
      // A replayed order keeps the price it was opened at, which is what the shopper saw then.
      if (!replaying && quote && checkout.amount !== quote.grandTotal) {
        await abandon(checkout.orderId);
        idempotency.current = null;
        void queryClient.invalidateQueries({ queryKey: planKeys.quotes() });
        setError(
          `The total changed to ${formatRupees(
            checkout.amount,
          )}. Check the new total and pay again.`,
        );
        return;
      }

      const paymentCheckout = getPaymentCheckout(checkout.provider);
      const result = await paymentCheckout.openCheckout(checkout, {
        customerEmail: user.email ?? undefined,
      });
      paidAtGateway = true;
      await verify({
        orderId: checkout.orderId,
        razorpayPaymentId: result.razorpay_payment_id,
        razorpayOrderId: result.razorpay_order_id,
        razorpaySignature: result.razorpay_signature,
      });
    } catch (err) {
      if (paidAtGateway) {
        // Razorpay took the money; only the confirmation failed. Keep the order and offer to
        // confirm again instead of paying again.
        setError(
          `Payment received, but we could not confirm it yet (${
            err instanceof Error ? err.message : 'no answer'
          }). Try again; you will not be charged again.`,
        );
        return;
      }
      if (err instanceof PaymentDismissedError) {
        // Closed the payment window: cancel the order so its wallet credit and vouchers come back.
        if (orderId) await abandon(orderId);
        if (err.lastFailure) setError(err.lastFailure);
        return;
      }
      // A failed order can still hold wallet credit: show the balance and price as they are now.
      void queryClient.invalidateQueries({ queryKey: planKeys.wallet() });
      void queryClient.invalidateQueries({ queryKey: planKeys.quotes() });
      if (dropRejectedVoucher(err)) return;
      setError(err instanceof Error ? err.message : 'Failed to process payment');
    } finally {
      setPaying(false);
    }
  };

  const termEnd = formatTermEnd(quote?.termEndsAt);

  const cartControls = (
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
        quote={quote}
        disabled={paying}
      />
      {walletBalance > 0 ? (
        <Switch
          id="use-wallet-credit"
          label={`Use wallet credit (${formatRupees(walletBalance)} available)`}
          checked={useWalletCredit}
          disabled={paying}
          onChange={(event) => {
            setVoucherError(null);
            setUseWalletCredit(event.target.checked);
          }}
        />
      ) : null}
      <Divider />
      <QuoteSummary quote={quote} loading={quoteQuery.isFetching} />
      {addOnOnly && termEnd ? (
        <Text variant="caption" color="secondary">
          Valid until {termEnd}
        </Text>
      ) : null}
      {quoteFailure ? (
        <Stack gap="sm" align="start">
          <Alert variant="danger">{quoteFailure}</Alert>
          <Button
            type="button"
            variant="solid"
            size="sm"
            loading={quoteQuery.isFetching}
            onClick={() => void quoteQuery.refetch()}
          >
            Try again
          </Button>
        </Stack>
      ) : null}
    </>
  );

  let payLabel: string;
  if (priced || paying) {
    payLabel = pricedPayLabel({
      paying,
      hasCart: quoteRequest != null,
      quote,
      quoteFailed: quoteFailure != null,
    });
  } else if (selectedPlan) {
    payLabel = `Pay ₹${selectedPlan.arcPrice?.toLocaleString('en-IN')}${
      selectedPlan.planName === 'Extra User Plan' ? ' per user/year' : '/year'
    }`;
  } else {
    payLabel = 'Pay';
  }

  // Paid at the gateway (or reported paid by the API): only confirming is left, never paying again.
  const paidAction =
    pendingVerify || confirming ? (
      <Stack gap="sm">
        <Alert variant="info">
          {confirming ?? 'Payment received. Confirm it to finish; you will not be charged again.'}
        </Alert>
        <Button
          type="button"
          variant="solid"
          onClick={() => void (pendingVerify ? handleConfirm() : handlePay())}
          loading={paying}
          disabled={paying}
          className={surfaceChrome.maxW400}
        >
          {pendingVerify ? 'Confirm payment' : 'Check again'}
        </Button>
        {error ? <Alert variant="danger">{error}</Alert> : null}
      </Stack>
    ) : null;

  const payAction = paidAction ?? (
    <Stack gap="sm">
      <Button
        type="button"
        variant="solid"
        onClick={() => void handlePay()}
        disabled={paying || (priced && (!quoteRequest || !quote || quoteQuery.isFetching))}
        loading={paying}
        className={surfaceChrome.maxW400}
      >
        {payLabel}
      </Button>
      <Text variant="caption" color="secondary">
        {payCaption(quote)}
      </Text>
      {error ? <Alert variant="danger">{error}</Alert> : null}
    </Stack>
  );

  let addOnOnlyBody: ReactNode = null;
  if (addOnOnlyLoadFailed) {
    addOnOnlyBody = (
      <Stack gap="sm" align="start">
        <Alert variant="danger">Could not load your plan or the add-ons.</Alert>
        <Button
          type="button"
          variant="solid"
          size="sm"
          loading={planStatusQuery.isFetching || addOnsQuery.isFetching}
          onClick={() => {
            void planStatusQuery.refetch();
            void addOnsQuery.refetch();
          }}
        >
          Try again
        </Button>
      </Stack>
    );
  } else if (intentState?.kind === 'planNotEligible') {
    addOnOnlyBody = (
      <Stack gap="sm" align="start">
        <Text color="secondary">
          Add-ons can be bought on their own only on an active paid plan. Choose a plan on My Plan
          and add what you need there.
        </Text>
        <Button type="button" variant="solid" onClick={() => navigate(PLAN_STATUS_PATH)}>
          Back to My Plan
        </Button>
      </Stack>
    );
  } else if (intentState?.kind === 'loading') {
    addOnOnlyBody = <CenteredLoader label="Loading add-ons..." />;
  } else if (intentState) {
    addOnOnlyBody = (
      <>
        {intentState.kind === 'unavailable' ? (
          <Alert variant="warning">This add-on isn&apos;t available for your plan.</Alert>
        ) : null}
        {cartControls}
        {payAction}
      </>
    );
  }

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

                {planCode ? cartControls : null}

                {payAction}
              </Stack>
            </CardBody>
          </Card>
        ) : null}

        {addOnOnly ? (
          <Card>
            <CardBody>
              <Stack gap="md">
                <Stack gap="xs">
                  <Text variant="heading3" weight="semibold">
                    Buy add-ons
                  </Text>
                  <Text color="secondary">
                    {planStatus?.plan
                      ? `Added to your current ${planStatus.plan.planName} plan.`
                      : 'Added to your current plan.'}
                  </Text>
                </Stack>
                <Divider />
                {addOnOnlyBody}
              </Stack>
            </CardBody>
          </Card>
        ) : null}

        {!selectedPlan && !addOnOnly ? (
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
                Past purchases
              </Text>
              {transactionsError && transactions.length === 0 ? (
                <Stack gap="sm" align="start">
                  <Alert variant="danger">Could not load your past purchases.</Alert>
                  <Button
                    type="button"
                    variant="solid"
                    size="sm"
                    loading={transactionsFetching}
                    onClick={() => void refetchTransactions()}
                  >
                    Try again
                  </Button>
                </Stack>
              ) : (
                <PastPurchases transactions={transactions} />
              )}
            </Stack>
          </CardBody>
        </Card>
      </Stack>
    </Stack>
  );
}
