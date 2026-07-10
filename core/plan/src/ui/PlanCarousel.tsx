import type { PlanResponse } from '@inventory-platform/plan/types';
import {
  Badge,
  Box,
  Button,
  Inline,
  PlanCarousel3D,
  Stack,
  Text,
} from '@inventory-platform/ui-kit';
import { buildPlanFeatures } from './PlanGrid';

const EXTRA_PLANS = ['Extra User Plan', 'Extra Shop Plan'];

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
      dotCount={sortedPlans.length - 2}
      getSlideKey={(plan, cloneIndex) => `${plan.id}-${cloneIndex}`}
      renderSlide={(plan, { isCenter }) => {
        const allFeatures = buildPlanFeatures(plan);

        const features =
          plan.bestFor && !EXTRA_PLANS.includes(plan.planName)
            ? allFeatures.filter((f) => f !== plan.bestFor)
            : allFeatures;

        const highlight = plan.planName === 'Silver' || plan.planName === 'Gold';

        return (
          <Box
            as="article"
            bg="elevated"
            border
            rounded="lg"
            width="full"
            display="flex"
            flexDirection="column"
            position="relative"
            style={{
              minHeight: 400,
              transition: 'all 0.5s ease',
              overflow: 'visible',
              ...(isCenter
                ? {
                    boxShadow: '0 30px 70px rgba(0, 0, 0, 0.35)',
                    borderColor: highlight ? '#2563eb' : 'var(--border-hover)',
                  }
                : {}),
            }}
          >
            {highlight && isCenter ? (
              <Box
                position="absolute"
                style={{
                  top: -10,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 10,
                }}
              >
                <Badge>Most Popular</Badge>
              </Box>
            ) : null}

            <Stack gap="sm" padding="md" style={{ position: 'relative', flex: 1 }}>
              {showTrialBadge && !EXTRA_PLANS.includes(plan.planName) && (
                <Box
                  style={{
                    background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)',
                    color: 'white',
                    width: 'fit-content',
                    borderRadius: 999,
                    padding: '0.2rem 0.6rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}
                >
                  <Text as="span" style={{ color: 'white' }}>
                    Free 30-day trial
                  </Text>
                </Box>
              )}

              <Text as="h3" variant="heading3" weight="semibold">
                {plan.planName}
              </Text>

              {!EXTRA_PLANS.includes(plan.planName) && plan.bestFor ? (
                <Text color="secondary">{plan.bestFor}</Text>
              ) : null}

              <Inline align="end" gap="xs">
                <Text variant="heading1" weight="bold">
                  ₹{(plan.arcPrice ?? plan.price)?.toLocaleString('en-IN') ?? 0}
                </Text>
                <Text color="secondary">/year</Text>
              </Inline>

              {!EXTRA_PLANS.includes(plan.planName) && plan.price && plan.price > 0 && (
                <Text variant="caption" color="secondary">
                  One-time ₹{plan.price.toLocaleString('en-IN')}
                </Text>
              )}

              <Stack as="ul" gap="xs" style={{ flexGrow: 1 }}>
                {features.map((f) => (
                  <Inline as="li" key={f} gap="xs" align="start">
                    <Text as="span" style={{ color: '#22c55e', flexShrink: 0 }}>
                      ✓
                    </Text>
                    <Text as="span" variant="caption" color="secondary">
                      {f}
                    </Text>
                  </Inline>
                ))}
              </Stack>

              {onSelectPlan && isCenter ? (
                <Button
                  type="button"
                  variant="solid"
                  fullWidth
                  style={{
                    marginTop: 'auto',
                    background: 'linear-gradient(90deg, #2563eb 0%, #06b6d4 100%)',
                    color: 'white',
                    borderRadius: 999,
                  }}
                  onClick={() => onSelectPlan(plan)}
                >
                  {ctaLabel}
                </Button>
              ) : null}
            </Stack>
          </Box>
        );
      }}
    />
  );
}
