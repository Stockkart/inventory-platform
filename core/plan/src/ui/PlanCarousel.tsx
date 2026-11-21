import type { PlanResponse } from '@inventory-platform/plan/types';
import { PlanCard, PlanCarousel3D } from '@inventory-platform/ui-kit';
import { buildPlanFeatures, isMostPopular } from './PlanGrid';
import {
  formatRupees,
  planListPriceLabel,
  planYearlyPrice,
  plansForSelection,
} from './planPricing';
import { freeTrialLabel } from './trialLabel';

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
  const features = plan.bestFor ? allFeatures.filter((f) => f !== plan.bestFor) : allFeatures;

  const highlight = isMostPopular(plan);
  const showPopular = highlight && (options.isCenter ?? true);
  const showTrial = options.showTrialBadge;

  return {
    name: plan.planName,
    bestFor: plan.bestFor,
    priceLabel: formatRupees(planYearlyPrice(plan)),
    listPriceLabel: planListPriceLabel(plan),
    periodLabel: '/year',
    oneTimeLabel:
      plan.price && plan.price > 0 ? `One-time ₹${plan.price.toLocaleString('en-IN')}` : null,
    features,
    showTrialBadge: showTrial,
    trialLabel: freeTrialLabel(plan.trialDays),
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
  const selectablePlans = plansForSelection(plans);

  return (
    <PlanCarousel3D
      items={selectablePlans}
      dotCount={Math.max(selectablePlans.length - 2, 1)}
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

export { planCardProps };
