import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { plansApi } from '@inventory-platform/api';
import { PlanGrid } from '@inventory-platform/ui';
import type {
  ShopPlanStatusResponse,
  PlanResponse,
} from '@inventory-platform/types';
import styles from './dashboard.plan-status.module.css';

export function meta() {
  return [
    { title: 'Plan - StockKart' },
    {
      name: 'description',
      content: 'View your plan, usage, and upgrade options',
    },
  ];
}

export default function PlanStatusPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<ShopPlanStatusResponse | null>(null);
  const [plans, setPlans] = useState<PlanResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await plansApi.getShopStatus();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load plan status'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPlans = useCallback(async () => {
    try {
      const data = await plansApi.list();
      setPlans(data);
    } catch {
      // Ignore - plans are optional
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchPlans();
  }, [fetchStatus, fetchPlans]);

  const handleSelectPlan = useCallback(
    (plan: PlanResponse) => {
      navigate(`/dashboard/plan-payment?planId=${plan.id}`);
    },
    [navigate]
  );

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Loading plan status...</div>
      </div>
    );
  }

  if (error && !status) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  const s = status!;
  const formatDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('en-IN') : '—';
  const currentPlanIndex = s.plan
    ? plans.findIndex((p) => p.id === s.planId)
    : -1;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>Plan</h2>
        <p className={styles.subtitle}>
          View your subscription, usage, and upgrade options
        </p>
      </div>

      <div className={styles.container}>
        {/* Current Plan Summary */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Current Plan</h3>
          <div className={styles.planCard}>
            {s.trial ? (
              <>
                <div className={styles.trialBadge}>Trial</div>
                <p className={styles.planName}>Base (Trial) — 30 days</p>
                <p className={styles.planExpiry}>
                  Expires: {formatDate(s.planExpiryDate)}
                </p>
                {s.trialExpired && (
                  <div className={styles.trialExpired}>
                    Your trial has ended. Choose a plan below to continue.
                  </div>
                )}
              </>
            ) : (
              <>
                <p className={styles.planName}>{s.plan?.planName ?? '—'}</p>
                <p className={styles.planExpiry}>
                  Renews: {formatDate(s.planExpiryDate)}
                </p>
                <p className={styles.planPosition}>
                  Plan {currentPlanIndex + 1} of {plans.length}
                </p>
              </>
            )}
          </div>
        </section>

        {/* Usage */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>This Month&apos;s Usage</h3>
          <div className={styles.usageGrid}>
            <div className={styles.usageItem}>
              <span className={styles.usageLabel}>Billing Amount</span>
              <span
                className={
                  s.billingLimitReached ? styles.usageLimitReached : undefined
                }
              >
                ₹
                {s.currentUsage?.billingAmountUsed?.toLocaleString('en-IN') ??
                  0}
              </span>
            </div>
            <div className={styles.usageItem}>
              <span className={styles.usageLabel}>Bills</span>
              <span
                className={
                  s.billCountLimitReached ? styles.usageLimitReached : undefined
                }
              >
                {s.currentUsage?.billCountUsed ?? 0}
              </span>
            </div>
            <div className={styles.usageItem}>
              <span className={styles.usageLabel}>SMS</span>
              <span
                className={
                  s.smsLimitReached ? styles.usageLimitReached : undefined
                }
              >
                {s.currentUsage?.smsUsed ?? 0}
              </span>
            </div>
            <div className={styles.usageItem}>
              <span className={styles.usageLabel}>WhatsApp</span>
              <span
                className={
                  s.whatsappLimitReached ? styles.usageLimitReached : undefined
                }
              >
                {s.currentUsage?.whatsappUsed ?? 0}
              </span>
            </div>
          </div>
        </section>

        {/* All Plans Grid - same design as pre-login Pricing */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>
            {s.trialExpired ? 'Choose a Plan' : 'Available Plans'}
          </h3>
          <p className={styles.sectionSubtitle}>
            Select a plan to proceed to payment
          </p>
          <PlanGrid
            plans={plans}
            currentPlanId={s.trial ? null : s.planId}
            onSelectPlan={handleSelectPlan}
            ctaLabel={s.trialExpired ? 'Select Plan' : 'Upgrade'}
            showTrialBadge
          />
        </section>

        {error && <div className={styles.errorInline}>{error}</div>}
      </div>
    </div>
  );
}
