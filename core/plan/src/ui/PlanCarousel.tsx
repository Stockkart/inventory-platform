import type { PlanResponse } from '@inventory-platform/plan/types';
import {
  isAddon,
  isSubscriptionPlan,
  isUsagePriced,
  planPeriodLabel,
  planPrice,
  planTierRank,
} from '@inventory-platform/contracts';
import { PlanCard, PlanCarousel3D } from '@inventory-platform/ui-kit';
import { buildPlanFeatures, popularPlanId } from './PlanGrid';

/** Trial length used until the backend sends `trialDays` on the plan. */
const DEFAULT_TRIAL_DAYS = 3;

function planCardProps(
  plan: PlanResponse,
  options: {
    isCenter?: boolean;
    showCta?: boolean;
    onSelectPlan?: (plan: PlanResponse) => void;
    ctaLabel: string;
    showTrialBadge: boolean;
    popularId: string | null;
  },
) {
  const extra = isAddon(plan);
  const allFeatures = buildPlanFeatures(plan);
  const features =
    plan.bestFor && !extra ? allFeatures.filter((f) => f !== plan.bestFor) : allFeatures;

  const highlight = plan.id === options.popularId;
  const showPopular = highlight && (options.isCenter ?? true);
  const showOneTime = !extra && !isUsagePriced(plan) && plan.price != null && plan.price > 0;

  return {
    name: plan.planName,
    bestFor: !extra ? plan.bestFor : null,
    priceLabel: isUsagePriced(plan)
      ? 'Pay per use'
      : `₹${planPrice(plan)?.toLocaleString('en-IN') ?? 0}`,
    periodLabel: planPeriodLabel(plan),
    oneTimeLabel: showOneTime ? `One-time ₹${plan.price.toLocaleString('en-IN')}` : null,
    features,
    showTrialBadge: options.showTrialBadge && !extra,
    trialDays: plan.trialDays ?? DEFAULT_TRIAL_DAYS,
    highlighted: Boolean(options.isCenter),
    showPopularBadge: showPopular,
    ctaLabel: options.ctaLabel,
    onSelect:
      options.showCta && options.onSelectPlan ? () => options.onSelectPlan?.(plan) : undefined,
  };
}

export interface PlanCarouselProps {
  plans: PlanResponse[];
  onSelectPlan?: (plan: PlanResponse) => void;
  ctaLabel?: string;
  showTrialBadge?: boolean;
}

export function PlanCarousel({
  plans,
  onSelectPlan,
  ctaLabel = 'Get Started',
  showTrialBadge = true,
}: PlanCarouselProps) {
  // Subscription tiers lead, cheapest first; add-ons and top-ups trail behind.
  const sortedPlans = [...plans].sort((a, b) => {
    const aCore = isSubscriptionPlan(a);
    const bCore = isSubscriptionPlan(b);

    if (aCore !== bCore) {
      return aCore ? -1 : 1;
    }

    return planTierRank(a) - planTierRank(b);
  });
  const popularId = popularPlanId(plans);

  return (
    <PlanCarousel3D
      items={sortedPlans}
      dotCount={Math.max(sortedPlans.length - 2, 1)}
      getSlideKey={(plan, cloneIndex) => `${plan.id}-${cloneIndex}`}
      renderSlide={(plan, { isCenter }) => (
        <PlanCard
          {...planCardProps(plan, {
            isCenter,
            showCta: isCenter,
            onSelectPlan,
            ctaLabel,
            showTrialBadge,
            popularId,
          })}
        />
      )}
    />
  );
}

export { planCardProps };
