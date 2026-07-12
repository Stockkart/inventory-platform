import type { PlanResponse } from '@inventory-platform/plan/types';
import { PlanCard, PlanCarousel3D } from '@inventory-platform/ui-kit';
import { buildPlanFeatures } from './PlanGrid';

const EXTRA_PLANS = ['Extra User Plan', 'Extra Shop Plan'];

function planCardProps(
  plan: PlanResponse,
  options: {
    isCenter?: boolean;
    showCta?: boolean;
    onSelectPlan?: (plan: PlanResponse) => void;
    ctaLabel: string;
    showTrialBadge: boolean;
  },
) {
  const allFeatures = buildPlanFeatures(plan);
  const features =
    plan.bestFor && !EXTRA_PLANS.includes(plan.planName)
      ? allFeatures.filter((f) => f !== plan.bestFor)
      : allFeatures;

  const highlight = plan.planName === 'Silver';
  const showPopular = highlight && (options.isCenter ?? true);
  const showTrial = options.showTrialBadge && !EXTRA_PLANS.includes(plan.planName);

  return {
    name: plan.planName,
    bestFor: !EXTRA_PLANS.includes(plan.planName) ? plan.bestFor : null,
    priceLabel: `₹${(plan.arcPrice ?? plan.price)?.toLocaleString('en-IN') ?? 0}`,
    periodLabel: '/year',
    oneTimeLabel:
      !EXTRA_PLANS.includes(plan.planName) && plan.price && plan.price > 0
        ? `One-time ₹${plan.price.toLocaleString('en-IN')}`
        : null,
    features,
    showTrialBadge: showTrial,
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
  const sortedPlans = [...plans].sort((a, b) => {
    const aExtra = EXTRA_PLANS.includes(a.planName);
    const bExtra = EXTRA_PLANS.includes(b.planName);

    if (aExtra && !bExtra) return 1;
    if (!aExtra && bExtra) return -1;

    return 0;
  });

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
          })}
        />
      )}
    />
  );
}

export { EXTRA_PLANS, planCardProps };
