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
import type { CreatePlanCheckoutRequest } from '@inventory-platform/plan/types';
import {
  PLAN_STATUS_PATH,
  buildAddOnOnlyRequest,
  buildQuoteRequest,
  checkoutFingerprint,
  formatTermEnd,
  newIdempotencyKey,
  paidFromWallet,
  payCaption,
  pricedPayLabel,
  readAddOnOnlyIntent,
  readVoucherRejection,
  resolveAddOnOnlyIntent,
  sellableAddOns,
  topUpAddOns,
  vouchersAfterRejection,
  type AddOnSelection,
} from '../checkout';
import { getPaymentCheckout } from '../payment/index.js';
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

  const quoteFailure =
    quoteQuery.error && !readVoucherRejection(quoteQuery.error)
      ? quoteQuery.error instanceof Error
        ? quoteQuery.error.message
        : 'Could not price this order'
      : null;

  const changeAddOn = (code: string, quantity: number) => {
    setVoucherError(null);
    setAddOnSelection((current) => ({ ...current, [code]: quantity }));
  };

  /** One key per cart and quoted total, reused across retries so a retry replays the open order. */
  const idempotency = useRef<{ cart: string; key: string } | null>(null);

  const createCheckoutMutation = useCreatePlanCheckoutMutation();
  const verifyPaymentMutation = useVerifyPlanPaymentMutation();

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
    const cart = checkoutFingerprint(request, quote);
    if (idempotency.current?.cart !== cart) {
      idempotency.current = { cart, key: newIdempotencyKey() };
    }
    try {
      const checkout = await createCheckoutMutation.mutateAsync({
        request,
        idempotencyKey: idempotency.current.key,
      });

      if (paidFromWallet(checkout)) {
        await queryClient.invalidateQueries({ predicate: isPlanDataExceptQuote });
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
      navigate(addOnOnly ? PLAN_STATUS_PATH : '/dashboard', { replace: true });
    } catch (err) {
      // An abandoned or failed order can still hold wallet credit: show the balance and price as
      // they are now. A changed total then gets a new idempotency key (checkoutFingerprint).
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

  const payAction = (
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
