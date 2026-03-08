import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router';
import { plansApi } from '@inventory-platform/api';
import { useAuthStore } from '@inventory-platform/store';
import type {
  PlanResponse,
  PlanTransactionResponse,
} from '@inventory-platform/types';
import styles from './dashboard.plan-payment.module.css';

export function meta() {
  return [
    { title: 'Payment - StockKart' },
    {
      name: 'description',
      content: 'Manage plan payments and view transaction history',
    },
  ];
}

const PAYMENT_METHODS = [
  { value: 'CARD', label: 'Credit/Debit Card', icon: '💳' },
  { value: 'UPI', label: 'UPI', icon: '📱' },
  { value: 'NET_BANKING', label: 'Net Banking', icon: '🏦' },
];

export default function PlanPaymentPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planIdFromUrl = searchParams.get('planId');

  const [plans, setPlans] = useState<PlanResponse[]>([]);
  const [transactions, setTransactions] = useState<PlanTransactionResponse[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CARD');

  const [planById, setPlanById] = useState<PlanResponse | null>(null);
  const selectedPlan = plans.find((p) => p.id === planIdFromUrl) ?? planById;

  useEffect(() => {
    if (planIdFromUrl && !plans.find((p) => p.id === planIdFromUrl)) {
      plansApi
        .getById(planIdFromUrl)
        .then(setPlanById)
        .catch(() => {
          /* empty */
        });
    } else {
      setPlanById(null);
    }
  }, [planIdFromUrl, plans]);

  const fetchPlans = useCallback(async () => {
    try {
      const data = await plansApi.list();
      setPlans(data);
    } catch {
      // Ignore
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    try {
      const data = await plansApi.listTransactions();
      setTransactions(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load transactions'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchPlans(), fetchTransactions()]);
      setLoading(false);
    };
    load();
  }, [fetchPlans, fetchTransactions]);

  const handlePay = async () => {
    if (!user?.shopId || !selectedPlan) return;
    setAssigning(true);
    setError(null);
    try {
      await plansApi.assignPlan(user.shopId, {
        planId: selectedPlan.id,
        durationMonths: 12,
        paymentMethod,
      });
      await fetchTransactions();
      navigate('/dashboard/plan-payment', { replace: true });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to process payment'
      );
    } finally {
      setAssigning(false);
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

  const getPaymentMethodLabel = (method: string) =>
    PAYMENT_METHODS.find((m) => m.value === method)?.label ?? method;

  if (loading && transactions.length === 0) {
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
          Manage plan payment and view transaction history
        </p>
      </div>

      <div className={styles.container}>
        {/* Plan to pay */}
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
                <h4 className={styles.paymentSectionTitle}>Payment Method</h4>
                <div className={styles.paymentMethods}>
                  {PAYMENT_METHODS.map((m) => (
                    <label key={m.value} className={styles.paymentOption}>
                      <input
                        type="radio"
                        name="payment"
                        value={m.value}
                        checked={paymentMethod === m.value}
                        onChange={() => setPaymentMethod(m.value)}
                      />
                      <div className={styles.paymentCard}>
                        <span
                          className={styles.cardIcon}
                          role="img"
                          aria-label={m.label}
                        >
                          {m.icon}
                        </span>
                        <span>{m.label}</span>
                      </div>
                    </label>
                  ))}
                </div>

                <button
                  className={styles.processBtn}
                  onClick={handlePay}
                  disabled={assigning}
                >
                  {assigning
                    ? 'Processing...'
                    : `Pay ₹${selectedPlan.arcPrice?.toLocaleString('en-IN')}${
                        selectedPlan.planName === 'Extra User Plan'
                          ? ' per user/year'
                          : '/year'
                      } & Activate`}
                </button>
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

        {/* Transaction History */}
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
                    <span>{getPaymentMethodLabel(tx.paymentMethod)}</span>
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
