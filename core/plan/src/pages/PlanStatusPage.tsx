import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { PlanGrid } from '../ui/PlanGrid';
import type { PlanResponse } from '@inventory-platform/types';
import { usePlansQuery, useShopPlanStatusQuery } from '../queries/hooks';
import styles from './plan-status.module.css';

export function PlanStatusPage() {
  const navigate = useNavigate();
  const {
    data: status,
    isLoading: statusLoading,
    isError: statusError,
    error: statusErr,
  } = useShopPlanStatusQuery();
  const { data: plans = [] } = usePlansQuery();

  const handleSelectPlan = useCallback(
    (plan: PlanResponse) => {
      navigate(`/dashboard/plan-payment?planId=${plan.id}`);
    },
    [navigate]
  );

  if (statusLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Loading plan status...</div>
      </div>
    );
  }

  if (statusError && !status) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>
          {statusErr instanceof Error
            ? statusErr.message
            : 'Failed to load plan status'}
        </div>
      </div>
    );
  }

  if (!status) {
    return null;
  }

  const formatDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('en-IN') : '—';
  const currentPlanIndex = status.plan
    ? plans.findIndex((p) => p.id === status.planId)
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
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Current Plan</h3>
          <div className={styles.planCard}>
            {status.trial ? (
              <>
                <div className={styles.trialBadge}>Trial</div>
                <p className={styles.planName}>Base (Trial) — 30 days</p>
                <p className={styles.planExpiry}>
                  Expires: {formatDate(status.planExpiryDate)}
                </p>
                {status.trialExpired && (
                  <div className={styles.trialExpired}>
                    Your trial has ended. Choose a plan below to continue.
                  </div>
                )}
              </>
            ) : (
              <>
                <p className={styles.planName}>{status.plan?.planName ?? '—'}</p>
                <p className={styles.planExpiry}>
                  {status.planExpired ? 'Expired' : 'Renews'}:{' '}
                  {formatDate(status.planExpiryDate)}
                </p>
                {status.planExpired && (
                  <div className={styles.trialExpired}>
                    Your subscription has ended. Choose a plan below to continue.
                  </div>
                )}
                <p className={styles.planPosition}>
                  Plan {currentPlanIndex + 1} of {plans.length}
                </p>
              </>
            )}
          </div>
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>This Month&apos;s Usage</h3>
          <div className={styles.usageGrid}>
            <div className={styles.usageItem}>
              <span className={styles.usageLabel}>Billing Amount</span>
              <span
                className={
                  status.billingLimitReached ? styles.usageLimitReached : undefined
                }
              >
                ₹
                {status.currentUsage?.billingAmountUsed?.toLocaleString(
                  'en-IN'
                ) ?? 0}
              </span>
            </div>
            <div className={styles.usageItem}>
              <span className={styles.usageLabel}>Bills</span>
              <span
                className={
                  status.billCountLimitReached ? styles.usageLimitReached : undefined
                }
              >
                {status.currentUsage?.billCountUsed ?? 0}
              </span>
            </div>
            <div className={styles.usageItem}>
              <span className={styles.usageLabel}>SMS</span>
              <span
                className={
                  status.smsLimitReached ? styles.usageLimitReached : undefined
                }
              >
                {status.currentUsage?.smsUsed ?? 0}
              </span>
            </div>
            <div className={styles.usageItem}>
              <span className={styles.usageLabel}>WhatsApp</span>
              <span
                className={
                  status.whatsappLimitReached ? styles.usageLimitReached : undefined
                }
              >
                {status.currentUsage?.whatsappUsed ?? 0}
              </span>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>
            {status.planExpired ? 'Choose a Plan' : 'Available Plans'}
          </h3>
          <p className={styles.sectionSubtitle}>
            Select a plan to proceed to payment
          </p>
          <PlanGrid
            plans={plans}
            currentPlanId={status.trial ? null : status.planId}
            onSelectPlan={handleSelectPlan}
            ctaLabel={status.planExpired ? 'Select Plan' : 'Upgrade'}
            showTrialBadge
          />
        </section>

        {statusError && (
          <div className={styles.errorInline}>
            {statusErr instanceof Error
              ? statusErr.message
              : 'Failed to load plan status'}
          </div>
        )}
      </div>
    </div>
  );
}
