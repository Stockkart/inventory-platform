import type { PlanOptionResponse, PlanResponse } from '@inventory-platform/plan/types';
import {
  Badge,
  Box,
  Button,
  Text,
  VisuallyHidden,
  chartChrome,
  surfaceChrome,
  cn,
} from '@inventory-platform/ui-kit';
import {
  FEATURE_LABELS,
  formatRupees,
  planListPriceLabel,
  planYearlyPrice,
  plansForSelection,
} from './planPricing';
import { trialLabel } from './trialLabel';
import { planCardCta } from './planCardCta';

/** The backend decides which plan is highlighted. */
export function isMostPopular(plan: PlanResponse): boolean {
  return plan.badge === 'MOST_POPULAR';
}

export function buildPlanFeatures(plan: PlanResponse): string[] {
  const features: string[] = [];

  if (plan.unlimited) {
    features.push('Unlimited billing', 'Unlimited SMS', 'Unlimited WhatsApp');
    return features;
  }

  if (plan.billingLimit != null) {
    features.push(`Billing cap ₹${(plan.billingLimit / 100000).toFixed(1)}L/month`);
  }

  if (plan.billCountLimit != null) {
    features.push(`${plan.billCountLimit} bills/month`);
  }

  // A null limit is unmetered on the backend, not "none".
  if (plan.smsLimit != null) {
    features.push(plan.smsLimit > 0 ? `${plan.smsLimit} SMS/month` : 'No SMS');
  }

  if (plan.whatsappLimit != null) {
    features.push(plan.whatsappLimit > 0 ? `${plan.whatsappLimit} WhatsApp/month` : 'No WhatsApp');
  }

  if (plan.userLimit != null) {
    features.push(`${plan.userLimit} user${plan.userLimit > 1 ? 's' : ''}`);
  } else if (plan.code) {
    features.push('Unlimited users');
  }

  if (plan.ocrLimit != null) {
    features.push(`${plan.ocrLimit.toLocaleString('en-IN')} OCR invoices/month`);
  }

  for (const feature of plan.features ?? []) {
    features.push(FEATURE_LABELS[feature] ?? feature);
  }

  return features;
}

export interface PlanGridProps {
  plans: PlanResponse[];
  currentPlanId?: string | null;
  onSelectPlan?: (plan: PlanResponse) => void;
  ctaLabel?: string;
  showTrialBadge?: boolean;
  /** Plan status `planOptions`: the API's action per plan. Without it `ctaLabel` is used. */
  planOptions?: PlanOptionResponse[] | null;
}

function PlanTile({
  plan,
  isCurrent,
  isPopular,
  onSelectPlan,
  ctaLabel,
  showTrialBadge,
  option,
}: {
  plan: PlanResponse;
  isCurrent: boolean;
  isPopular: boolean;
  onSelectPlan?: (plan: PlanResponse) => void;
  ctaLabel: string;
  showTrialBadge: boolean;
  option?: PlanOptionResponse;
}) {
  const cta = planCardCta(option, ctaLabel, isCurrent);
  const features = buildPlanFeatures(plan);
  const listPriceLabel = planListPriceLabel(plan);

  return (
    <Box
      className={cn(
        surfaceChrome.planCard,
        isCurrent && surfaceChrome.planCardCurrent,
        !isCurrent && isPopular && surfaceChrome.planCardHighlight,
      )}
    >
      <Box className={surfaceChrome.planCardBody}>
        <Box className={surfaceChrome.planCardTop}>
          {isCurrent ? <Badge variant="success">Current</Badge> : null}
          {!isCurrent && isPopular ? <Badge variant="info">Most popular</Badge> : null}
          {showTrialBadge ? <Badge variant="neutral">{trialLabel(plan.trialDays)}</Badge> : null}
        </Box>

        <Text as="h3" className={surfaceChrome.planCardName}>
          {plan.planName}
        </Text>

        <Text as="p" className={surfaceChrome.planCardBestFor}>
          {plan.bestFor || 'For your business'}
        </Text>

        <Box className={surfaceChrome.planCardPriceRow}>
          {listPriceLabel ? (
            <Text as="s" className={surfaceChrome.planCardListPrice}>
              <VisuallyHidden>Was </VisuallyHidden>
              {listPriceLabel}
            </Text>
          ) : null}
          <Text as="p" className={surfaceChrome.planCardPrice}>
            {formatRupees(planYearlyPrice(plan))}
          </Text>
          <Text as="span" className={surfaceChrome.planCardPeriod}>
            /year
          </Text>
        </Box>

        {plan.price != null && plan.price > 0 ? (
          <Text as="p" className={surfaceChrome.planCardOneTime}>
            One-time ₹{plan.price.toLocaleString('en-IN')} with support
          </Text>
        ) : null}

        <Box className={surfaceChrome.planCardFeatures}>
          {features.map((feature) => (
            <Box key={feature} className={surfaceChrome.planCardFeature}>
              <Text as="span" className={surfaceChrome.planCardCheck} aria-hidden>
                ✓
              </Text>
              <Text as="span">{feature}</Text>
            </Box>
          ))}
        </Box>

        {onSelectPlan ? (
          <Box className={surfaceChrome.planCardCta}>
            <Button
              type="button"
              variant={isCurrent ? 'outline' : isPopular ? 'solid' : 'outline'}
              fullWidth
              disabled={cta.disabled}
              onClick={() => onSelectPlan(plan)}
            >
              {cta.label}
            </Button>
          </Box>
        ) : null}
      </Box>
      {onSelectPlan && cta.note ? (
        <Box className={surfaceChrome.planCardNote}>
          <Text variant="caption" color="secondary">
            {cta.note}
          </Text>
        </Box>
      ) : null}
    </Box>
  );
}

export function PlanGrid({
  plans,
  currentPlanId,
  onSelectPlan,
  ctaLabel = 'Get Started',
  showTrialBadge = true,
  planOptions,
}: PlanGridProps) {
  return (
    <Box className={surfaceChrome.planGridWrap}>
      <Box display="grid" gap="md" width="full" className={chartChrome.autoGridFillWide}>
        {plansForSelection(plans).map((plan) => (
          <PlanTile
            key={plan.id}
            plan={plan}
            isCurrent={currentPlanId != null && plan.id === currentPlanId}
            isPopular={isMostPopular(plan)}
            onSelectPlan={onSelectPlan}
            ctaLabel={ctaLabel}
            showTrialBadge={showTrialBadge}
            option={planOptions?.find((o) => o.planId === plan.id)}
          />
        ))}
      </Box>
    </Box>
  );
}
