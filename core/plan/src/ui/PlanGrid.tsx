import type { PlanResponse } from '@inventory-platform/plan/types';
import {
  Badge,
  Box,
  Button,
  Text,
  chartChrome,
  surfaceChrome,
  cn,
} from '@inventory-platform/ui-kit';

const EXTRA_USER_PLAN = 'Extra User Plan';
const EXTRA_SHOP_PLAN = 'Extra Shop Plan';
const EXTRA_PLANS = [EXTRA_USER_PLAN, EXTRA_SHOP_PLAN];
const POPULAR_PLAN = 'Silver';

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
    features.push(`Billing cap ₹${(plan.billingLimit / 100000).toFixed(1)}L/month`);
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
    features.push(`${plan.whatsappLimit} WhatsApp/month`);
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

function PlanTile({
  plan,
  isCurrent,
  isPopular,
  onSelectPlan,
  ctaLabel,
  showTrialBadge,
}: {
  plan: PlanResponse;
  isCurrent: boolean;
  isPopular: boolean;
  onSelectPlan?: (plan: PlanResponse) => void;
  ctaLabel: string;
  showTrialBadge: boolean;
}) {
  const features = buildPlanFeatures(plan);
  const isExtra = EXTRA_PLANS.includes(plan.planName);

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
          {showTrialBadge && !isExtra ? <Badge variant="neutral">30-day trial</Badge> : null}
        </Box>

        <Text as="h3" className={surfaceChrome.planCardName}>
          {plan.planName}
        </Text>

        {!isExtra ? (
          <Text as="p" className={surfaceChrome.planCardBestFor}>
            {plan.bestFor || 'For your business'}
          </Text>
        ) : null}

        <Box className={surfaceChrome.planCardPriceRow}>
          <Text as="p" className={surfaceChrome.planCardPrice}>
            ₹{(plan.arcPrice ?? plan.price)?.toLocaleString('en-IN') ?? 0}
          </Text>
          <Text as="span" className={surfaceChrome.planCardPeriod}>
            {plan.planName === EXTRA_USER_PLAN ? '/user/year' : '/year'}
          </Text>
        </Box>

        {!isExtra && plan.price != null && plan.price > 0 ? (
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
              disabled={isCurrent}
              onClick={() => onSelectPlan(plan)}
            >
              {isCurrent ? 'Current plan' : ctaLabel}
            </Button>
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
}: PlanGridProps) {
  const corePlans = plans.filter((plan) => !EXTRA_PLANS.includes(plan.planName));
  const addonPlans = plans.filter((plan) => EXTRA_PLANS.includes(plan.planName));

  return (
    <Box className={surfaceChrome.planGridWrap}>
      <Box display="grid" gap="md" width="full" className={chartChrome.autoGridFillWide}>
        {corePlans.map((plan) => (
          <PlanTile
            key={plan.id}
            plan={plan}
            isCurrent={currentPlanId != null && plan.id === currentPlanId}
            isPopular={plan.planName === POPULAR_PLAN}
            onSelectPlan={onSelectPlan}
            ctaLabel={ctaLabel}
            showTrialBadge={showTrialBadge}
          />
        ))}
      </Box>

      {addonPlans.length > 0 ? (
        <Box className={surfaceChrome.planGridWrap}>
          <Text as="h4" className={surfaceChrome.planGridAddonsTitle}>
            Add-ons
          </Text>
          <Box display="grid" gap="md" width="full" className={chartChrome.autoGridFillWide}>
            {addonPlans.map((plan) => (
              <PlanTile
                key={plan.id}
                plan={plan}
                isCurrent={currentPlanId != null && plan.id === currentPlanId}
                isPopular={false}
                onSelectPlan={onSelectPlan}
                ctaLabel={ctaLabel === 'Upgrade' ? 'Add' : ctaLabel}
                showTrialBadge={false}
              />
            ))}
          </Box>
        </Box>
      ) : null}
    </Box>
  );
}
