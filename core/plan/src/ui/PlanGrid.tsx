import type { PlanResponse } from '@inventory-platform/plan/types';
import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Inline,
  Stack,
  Text,
  chartChrome,
  surfaceChrome,
  cn,
} from '@inventory-platform/ui-kit';

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
    <Box display="grid" gap="lg" width="full" className={chartChrome.autoGridFillWide}>
      {sortedPlans.map((plan, idx) => {
        const features = buildPlanFeatures(plan);
        const highlight =
          plan.planName === 'Silver' || idx === 2 || plan.planName === 'Gold' || idx === 3;
        const isCurrent = currentPlanId != null && plan.id === currentPlanId;

        return (
          <Card
            key={plan.id}
            className={cn(
              isCurrent && surfaceChrome.planCardCurrent,
              !isCurrent && highlight && surfaceChrome.planCardHighlight,
            )}
          >
            <CardBody>
              <Box position="relative">
                {highlight ? (
                  <Box position="absolute" className={surfaceChrome.planBadgeCenter}>
                    <Badge variant="info">Most Popular</Badge>
                  </Box>
                ) : null}
                {isCurrent ? (
                  <Box position="absolute" className={surfaceChrome.planBadgeRight}>
                    <Badge variant="success">Current</Badge>
                  </Box>
                ) : null}

                <Stack gap="md" className={surfaceChrome.planCardMin} justify="between">
                  <Stack gap="sm">
                    {showTrialBadge && !EXTRA_PLANS.includes(plan.planName) ? (
                      <Badge variant="success">Free 30-day trial</Badge>
                    ) : null}
                    <Text variant="heading3" weight="semibold">
                      {plan.planName}
                    </Text>
                    {!EXTRA_PLANS.includes(plan.planName) ? (
                      <Text color="secondary">{plan.bestFor || 'For your business'}</Text>
                    ) : null}

                    <Inline gap="xs" align="end">
                      <Text variant="heading1" weight="bold">
                        ₹{(plan.arcPrice ?? plan.price)?.toLocaleString('en-IN') ?? 0}
                      </Text>
                      <Text color="secondary">
                        {plan.planName === EXTRA_USER_PLAN ? '/user/year' : '/year'}
                      </Text>
                    </Inline>
                    {!EXTRA_PLANS.includes(plan.planName) &&
                      plan.price != null &&
                      plan.price > 0 && (
                        <Text variant="caption" color="secondary">
                          One-time ₹{plan.price?.toLocaleString('en-IN')} if taking support
                        </Text>
                      )}

                    <Stack gap="sm">
                      {features.map((feature) => (
                        <Inline key={feature} gap="sm" align="start">
                          <Text color="success">✓</Text>
                          <Text color="secondary">{feature}</Text>
                        </Inline>
                      ))}
                    </Stack>
                  </Stack>

                  {onSelectPlan ? (
                    <Button
                      type="button"
                      variant={highlight ? 'solid' : 'outline'}
                      fullWidth
                      onClick={() => onSelectPlan(plan)}
                      disabled={isCurrent}
                    >
                      {isCurrent ? 'Current Plan' : ctaLabel}
                    </Button>
                  ) : null}
                </Stack>
              </Box>
            </CardBody>
          </Card>
        );
      })}
    </Box>
  );
}
