import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { getPaymentCheckout } from '@inventory-platform/payment';
import { useAuthStore, usePlanStatusStore } from '@inventory-platform/store';
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
    planIdFromUrl && !plans.some((p) => p.id === planIdFromUrl)
      ? planIdFromUrl
      : null
  );
  const {
    data: transactions = [],
    isLoading: transactionsLoading,
    refetch: refetchTransactions,
  } = usePlanTransactionsQuery();

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === planIdFromUrl) ?? planById ?? null,
    [plans, planIdFromUrl, planById]
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
      const result = await paymentCheckout.openCheckout(
        {
          orderId: checkout.orderId,
          provider: checkout.provider,
          amount: checkout.amount,
          currency: checkout.currency,
          planName: checkout.planName,
          razorpay: checkout.razorpay,
        },
        {
          customerEmail: user.email ?? undefined,
        }
      );

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
      setError(
        err instanceof Error ? err.message : 'Failed to process payment'
      );
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
      <div className={styles.page}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>Payment</h2>
        <p className={styles.subtitle}>
          Review your plan and pay with Razorpay (UPI, card, net banking, and more)
        </p>
      </div>

      <div className={styles.container}>
        {selectedPlan && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Selected Plan</h3>
            <div className={styles.planSummary}>
              <div className={styles.planSummaryContent}>
                <h4>{selectedPlan.planName}</h4>
                <p className={styles.planPrice}>
                  ₹{selectedPlan.arcPrice?.toLocaleString('en-IN')} /{' '}
                  {selectedPlan.planName === 'Extra User Plan'
                    ? 'user/year'
                    : 'year'}
                </p>
                {selectedPlan.planName !== 'Extra User Plan' &&
                  selectedPlan.price != null &&
                  selectedPlan.price > 0 && (
                    <p className={styles.oneTimePrice}>
                      One-time ₹{selectedPlan.price?.toLocaleString('en-IN')} if
                      taking support
                    </p>
                  )}
                {selectedPlan.bestFor && (
                  <p className={styles.planBestFor}>{selectedPlan.bestFor}</p>
                )}
              </div>

              <div className={styles.paymentSection}>
                <button
                  type="button"
                  className={styles.processBtn}
                  onClick={() => void handlePay()}
                  disabled={paying}
                >
                  {paying
                    ? 'Opening Razorpay…'
                    : `Pay ₹${selectedPlan.arcPrice?.toLocaleString('en-IN')}${
                        selectedPlan.planName === 'Extra User Plan'
                          ? ' per user/year'
                          : '/year'
                      }`}
                </button>
                <p className={styles.razorpayNote}>
                  Secured by Razorpay. Choose your payment method in the checkout
                  window.
                </p>
              </div>
            </div>
          </section>
        )}

        {!selectedPlan && (
          <section className={styles.section}>
            <div className={styles.noPlanSelected}>
              <p>Select a plan from the Plan page to proceed with payment.</p>
              <Link to="/dashboard/plan-status" className={styles.linkToPlans}>
                Go to Plan
              </Link>
            </div>
          </section>
        )}

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Transaction History</h3>
          {transactions.length === 0 ? (
            <div className={styles.emptyHistory}>
              No plan payments yet. Your transaction history will appear here.
            </div>
          ) : (
            <div className={styles.transactionList}>
              {transactions.map((tx) => (
                <div key={tx.id} className={styles.transactionItem}>
                  <div className={styles.transactionMain}>
                    <span className={styles.transactionPlan}>
                      {tx.planName}
                    </span>
                    <span className={styles.transactionAmount}>
                      ₹{tx.amount?.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className={styles.transactionMeta}>
                    <span>{tx.paymentMethod}</span>
                    <span>{formatDate(tx.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {error && <div className={styles.errorInline}>{error}</div>}
      </div>
    </div>
  );
}
