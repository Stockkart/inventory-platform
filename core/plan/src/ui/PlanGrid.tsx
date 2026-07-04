import type { PlanResponse } from '@inventory-platform/types';
import styles from './PlanGrid.module.css';

const EXTRA_USER_PLAN = 'Extra User Plan';
const EXTRA_SHOP_PLAN = 'Extra Shop Plan';

const EXTRA_PLANS = [EXTRA_USER_PLAN, EXTRA_SHOP_PLAN];

export function buildPlanFeatures(plan: PlanResponse): string[] {
  if (EXTRA_PLANS.includes(plan.planName)) {
    if (plan.bestFor) {
      return [plan.bestFor];
    }

    const price = (plan.arcPrice ?? plan.price)?.toLocaleString('en-IN') ?? '0';

    return [`₹${price} per year`];
  }

  const features: string[] = [];

  if (plan.unlimited) {
    features.push('Unlimited billing', 'Unlimited SMS', 'Unlimited WhatsApp');
    return features;
  }

  if (plan.billingLimit != null) {
    features.push(
      `Billing cap ₹${(plan.billingLimit / 100000).toFixed(1)}L/month`
    );
  }

  if (plan.billCountLimit != null) {
    features.push(`${plan.billCountLimit} bills/month`);
  }

  if (plan.smsLimit != null && plan.smsLimit > 0) {
    features.push(`${plan.smsLimit} SMS/month`);
  } else {
    features.push('No SMS');
  }

  if (plan.whatsappLimit != null && plan.whatsappLimit > 0) {
    features.push(`${plan.whatsappLimit} WhatsApp messages/month`);
  } else {
    features.push('No WhatsApp');
  }

  if (plan.userLimit != null) {
    features.push(`${plan.userLimit} user${plan.userLimit > 1 ? 's' : ''}`);
  }

  return features;
}

export interface PlanGridProps {
  plans: PlanResponse[];
  currentPlanId?: string | null;
  onSelectPlan?: (plan: PlanResponse) => void;
  ctaLabel?: string;
  showTrialBadge?: boolean;
}

export function PlanGrid({
  plans,
  currentPlanId,
  onSelectPlan,
  ctaLabel = 'Get Started',
  showTrialBadge = true,
}: PlanGridProps) {
  const sortedPlans = [...plans].sort((a, b) => {
    const aExtra = EXTRA_PLANS.includes(a.planName);
    const bExtra = EXTRA_PLANS.includes(b.planName);

    if (aExtra && !bExtra) return 1;
    if (!aExtra && bExtra) return -1;

    return 0;
  });

  return (
    <div className={styles.grid}>
      {sortedPlans.map((plan, idx) => {
        const features = buildPlanFeatures(plan);
        const highlight =
          plan.planName === 'Silver' ||
          idx === 2 ||
          plan.planName === 'Gold' ||
          idx === 3;
        const isCurrent = currentPlanId != null && plan.id === currentPlanId;

        return (
          <article
            key={plan.id}
            className={`${styles.card} ${
              highlight ? styles.cardHighlight : ''
            } ${isCurrent ? styles.cardCurrent : ''}`}
          >
            {highlight && <div className={styles.badge}>Most Popular</div>}
            {isCurrent && <div className={styles.currentBadge}>Current</div>}

            <div className={styles.cardHeader}>
              {showTrialBadge && !EXTRA_PLANS.includes(plan.planName) && (
                <div className={styles.trialBadge}>Free 30-day trial</div>
              )}
              <h3 className={styles.planName}>{plan.planName}</h3>
              {!EXTRA_PLANS.includes(plan.planName) && (
                <p className={styles.planDescription}>
                  {plan.bestFor || 'For your business'}
                </p>
              )}

              <div className={styles.priceRow}>
                <span className={styles.price}>
                  ₹{(plan.arcPrice ?? plan.price)?.toLocaleString('en-IN') ?? 0}
                </span>
                <span className={styles.priceSuffix}>
                  {plan.planName === EXTRA_USER_PLAN ? '/user/year' : '/year'}
                </span>
              </div>
              {!EXTRA_PLANS.includes(plan.planName) &&
                plan.price != null &&
                plan.price > 0 && (
                  <p className={styles.oneTimePrice}>
                    One-time ₹{plan.price?.toLocaleString('en-IN')} if taking
                    support
                  </p>
                )}
            </div>

            <ul className={styles.featuresList}>
              {features.map((feature) => (
                <li key={feature} className={styles.featureItem}>
                  <span className={styles.checkIcon}>✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            {onSelectPlan && (
              <button
                className={`${styles.ctaButton} ${
                  highlight ? styles.ctaPrimary : styles.ctaGhost
                }`}
                onClick={() => onSelectPlan(plan)}
                disabled={isCurrent}
              >
                {isCurrent ? 'Current Plan' : ctaLabel}
              </button>
            )}
          </article>
        );
      })}
    </div>
  );
}
