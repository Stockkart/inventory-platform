import type { PlanResponse } from '@inventory-platform/plan/types';
import {
  addonPlans,
  includedFeatures,
  isAddon,
  isUsagePriced,
  ocrTopupPlans,
  planPeriodLabel,
  planPrice,
  sortedSubscriptionPlans,
} from '@inventory-platform/contracts';
import {
  Badge,
  Box,
  Button,
  Text,
  chartChrome,
  surfaceChrome,
  cn,
} from '@inventory-platform/ui-kit';

/** Trial length used until the backend sends `trialDays` on the plan. */
const DEFAULT_TRIAL_DAYS = 3;

function priceLabel(plan: PlanResponse): string {
  if (isUsagePriced(plan)) {
    return 'Pay per use';
  }
  return `₹${planPrice(plan)?.toLocaleString('en-IN') ?? 0}`;
}

/**
 * Feature bullets for a plan card.
 *
 * Prefers the backend capability list; falls back to deriving bullets from the
 * numeric quotas so a catalog without `features` still renders something.
 */
export function buildPlanFeatures(plan: PlanResponse): string[] {
  const fromCatalog = includedFeatures(plan);
  if (fromCatalog.length > 0) {
    const bullets = fromCatalog.map((feature) =>
      feature.availability === 'INCLUDED'
        ? feature.label
        : `${feature.label} (${titleCase(feature.availability)})`,
    );
    if (plan.ocrInvoiceLimit != null) {
      bullets.push(`${plan.ocrInvoiceLimit.toLocaleString('en-IN')} OCR invoices/month`);
    }
    return bullets;
  }

  if (isAddon(plan)) {
    if (plan.bestFor) {
      return [plan.bestFor];
    }
    if (isUsagePriced(plan)) {
      return ['Charged per use'];
    }
    return [`₹${planPrice(plan)?.toLocaleString('en-IN') ?? 0} per year`];
  }

  const features: string[] = [];

  if (plan.unlimited) {
    features.push('Unlimited billing', 'Unlimited SMS', 'Unlimited WhatsApp');
  } else {
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
  }

  if (plan.ocrInvoiceLimit != null) {
    features.push(`${plan.ocrInvoiceLimit.toLocaleString('en-IN')} OCR invoices/month`);
  }

  if (plan.userRoles && plan.userRoles.length > 0) {
    features.push(plan.userRoles.join(', '));
  }

  return features;
}

function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

/**
 * The tier to flag as most popular: the middle of the ladder.
 *
 * Replaces a hardcoded `'Silver'` name check, so renaming the catalog no longer
 * silently drops the badge.
 */
export function popularPlanId(plans: PlanResponse[]): string | null {
  const core = sortedSubscriptionPlans(plans);
  if (core.length < 3) {
    return null;
  }
  return core[Math.floor(core.length / 2)].id;
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
  const isExtra = isAddon(plan);
  const trialDays = plan.trialDays ?? DEFAULT_TRIAL_DAYS;
  const showOneTime = !isExtra && !isUsagePriced(plan) && plan.price != null && plan.price > 0;

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
          {showTrialBadge && !isExtra ? (
            <Badge variant="neutral">{trialDays}-day trial</Badge>
          ) : null}
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
            {priceLabel(plan)}
          </Text>
          <Text as="span" className={surfaceChrome.planCardPeriod}>
            {planPeriodLabel(plan)}
          </Text>
        </Box>

        {showOneTime ? (
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

function PlanTileSection({
  title,
  plans,
  currentPlanId,
  onSelectPlan,
  ctaLabel,
}: {
  title: string;
  plans: PlanResponse[];
  currentPlanId?: string | null;
  onSelectPlan?: (plan: PlanResponse) => void;
  ctaLabel: string;
}) {
  if (plans.length === 0) {
    return null;
  }

  return (
    <Box className={surfaceChrome.planGridWrap}>
      <Text as="h4" className={surfaceChrome.planGridAddonsTitle}>
        {title}
      </Text>
      <Box display="grid" gap="md" width="full" className={chartChrome.autoGridFillWide}>
        {plans.map((plan) => (
          <PlanTile
            key={plan.id}
            plan={plan}
            isCurrent={currentPlanId != null && plan.id === currentPlanId}
            isPopular={false}
            onSelectPlan={onSelectPlan}
            ctaLabel={ctaLabel}
            showTrialBadge={false}
          />
        ))}
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
  const corePlans = sortedSubscriptionPlans(plans);
  const addons = addonPlans(plans);
  const topups = ocrTopupPlans(plans);
  const popularId = popularPlanId(plans);
  const addonCtaLabel = ctaLabel === 'Upgrade' ? 'Add' : ctaLabel;

  return (
    <Box className={surfaceChrome.planGridWrap}>
      <Box display="grid" gap="md" width="full" className={chartChrome.autoGridFillWide}>
        {corePlans.map((plan) => (
          <PlanTile
            key={plan.id}
            plan={plan}
            isCurrent={currentPlanId != null && plan.id === currentPlanId}
            isPopular={plan.id === popularId}
            onSelectPlan={onSelectPlan}
            ctaLabel={ctaLabel}
            showTrialBadge={showTrialBadge}
          />
        ))}
      </Box>

      <PlanTileSection
        title="Add-ons"
        plans={addons}
        currentPlanId={currentPlanId}
        onSelectPlan={onSelectPlan}
        ctaLabel={addonCtaLabel}
      />

      <PlanTileSection
        title="OCR top-ups"
        plans={topups}
        currentPlanId={currentPlanId}
        onSelectPlan={onSelectPlan}
        ctaLabel={addonCtaLabel}
      />
    </Box>
  );
}
