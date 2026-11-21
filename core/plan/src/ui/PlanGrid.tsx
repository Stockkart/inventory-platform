import { Check } from 'lucide-react';
import type { PlanFeature, PlanOptionResponse, PlanResponse } from '@inventory-platform/plan/types';
import {
  Badge,
  Box,
  Button,
  Text,
  VisuallyHidden,
  surfaceChrome,
  cn,
} from '@inventory-platform/ui-kit';
import {
  COMING_SOON_FEATURES,
  FEATURE_LABELS,
  formatRupees,
  planListPriceLabel,
  planYearlyPrice,
  plansForSelection,
  type PlanFeatureLine,
} from './planPricing';
import { trialLabel } from './trialLabel';
import { planCardCta } from './planCardCta';

const FEATURE_ORDER = Object.keys(FEATURE_LABELS) as PlanFeature[];

/** The backend decides which plan is highlighted. */
export function isMostPopular(plan: PlanResponse): boolean {
  return plan.badge === 'MOST_POPULAR';
}

/** Card lines in a fixed order; SMS / WhatsApp allowances and MARKETING are tagged coming soon. */
export function buildPlanFeatures(plan: PlanResponse): PlanFeatureLine[] {
  const features: PlanFeatureLine[] = [];
  const add = (label: string, comingSoon = false) =>
    features.push(comingSoon ? { label, comingSoon } : { label });

  if (plan.unlimited) {
    add('Unlimited billing');
    add('Unlimited SMS', true);
    add('Unlimited WhatsApp', true);
    return features;
  }

  // A capped plan: the API words the monthly limit ("₹1.5L").
  if (plan.billingLimit != null && plan.billingLimitLabel) {
    add(`Billing cap ${plan.billingLimitLabel}/month`);
  }

  if (plan.billCountLimit != null) {
    add(`${plan.billCountLimit} bills/month`);
  }

  // A null limit is unmetered on the backend, not "none".
  if (plan.smsLimit != null) {
    if (plan.smsLimit > 0) add(`${plan.smsLimit} SMS/month`, true);
    else add('No SMS');
  }

  if (plan.whatsappLimit != null) {
    if (plan.whatsappLimit > 0) add(`${plan.whatsappLimit} WhatsApp/month`, true);
    else add('No WhatsApp');
  }

  if (plan.userLimit != null) {
    add(`${plan.userLimit} user${plan.userLimit > 1 ? 's' : ''}`);
  } else if (plan.code) {
    add('Unlimited users');
  }

  if (plan.roleLimit != null) {
    add(`${plan.roleLimit} staff role${plan.roleLimit === 1 ? '' : 's'}`);
  }

  if (plan.ocrLimit != null) {
    add(`${plan.ocrLimit.toLocaleString('en-IN')} OCR invoices/month`);
  }

  // The API sends features as a set, so list them in one fixed order on every card.
  for (const feature of FEATURE_ORDER) {
    if (plan.features?.includes(feature)) {
      add(FEATURE_LABELS[feature], COMING_SOON_FEATURES.includes(feature));
    }
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
      {!isCurrent && isPopular ? (
        <Text as="span" className={surfaceChrome.planCardPopularPill}>
          Most popular
        </Text>
      ) : null}
      <Box className={surfaceChrome.planCardBody}>
        <Box className={surfaceChrome.planCardTop}>
          {isCurrent ? <Badge variant="success">Current</Badge> : null}
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
            One-time {formatRupees(plan.price)} with support
          </Text>
        ) : null}

        <Box className={surfaceChrome.planCardFeatures}>
          {features.map((feature) => (
            <Box key={feature.label} className={surfaceChrome.planCardFeature}>
              <Box as="span" className={surfaceChrome.planCardCheck} aria-hidden>
                <Check size={11} strokeWidth={3} />
              </Box>
              <Text as="span">
                {feature.label}
                {feature.comingSoon ? (
                  <Badge variant="warning" className={surfaceChrome.planComingSoon}>
                    Coming soon
                  </Badge>
                ) : null}
              </Text>
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
            {cta.note ? (
              <Text variant="caption" color="secondary">
                {cta.note}
              </Text>
            ) : null}
          </Box>
        ) : null}
      </Box>
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
      <Box display="grid" gap="md" width="full" className={surfaceChrome.planCardGrid}>
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
