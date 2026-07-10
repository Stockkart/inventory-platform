import { useState, useCallback, useRef, useEffect } from 'react';
import type { PlanResponse } from '@inventory-platform/plan/types';
import { Badge, Box, Button, IconButton, Inline, Stack, Text } from '@inventory-platform/ui-kit';
import { buildPlanFeatures } from './PlanGrid';
import styles from './PlanCarousel.module.css';

const EXTRA_PLANS = ['Extra User Plan', 'Extra Shop Plan'];

function getCssNumber(el: HTMLElement, varName: string, fallback: number) {
  const v = getComputedStyle(el).getPropertyValue(varName);
  return v ? parseInt(v) : fallback;
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
  const [visible, setVisible] = useState(3);
  const [activeIndex, setActiveIndex] = useState(3);
  const [step, setStep] = useState(324);
  const [isPaused, setIsPaused] = useState(false);

  const wrapperRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const update = () => {
      const cardW = getCssNumber(el, '--card-width', 300);
      const gap = getCssNumber(el, '--card-gap', 24);

      setStep(cardW + gap);
    };

    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  const sortedPlans = [...plans].sort((a, b) => {
    const aExtra = EXTRA_PLANS.includes(a.planName);
    const bExtra = EXTRA_PLANS.includes(b.planName);

    if (aExtra && !bExtra) return 1;
    if (!aExtra && bExtra) return -1;

    return 0;
  });

  const clones = [...sortedPlans.slice(-visible), ...sortedPlans, ...sortedPlans.slice(0, visible)];

  const total = sortedPlans.length;

  useEffect(() => {
    const updateVisible = () => {
      const w = window.innerWidth;

      if (w < 768) {
        setVisible(1);
        setActiveIndex(1);
      } else if (w < 1100) {
        setVisible(2);
        setActiveIndex(2);
      } else {
        setVisible(3);
        setActiveIndex(3);
      }
    };

    updateVisible();
    window.addEventListener('resize', updateVisible);

    return () => window.removeEventListener('resize', updateVisible);
  }, []);

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setActiveIndex((i) => i + 1);
    }, 4000);

    return () => clearInterval(interval);
  }, [isPaused]);

  useEffect(() => {
    if (activeIndex >= sortedPlans.length + visible) {
      setTimeout(() => setActiveIndex(visible), 0);
    }

    if (activeIndex < visible) {
      setTimeout(() => setActiveIndex(sortedPlans.length + visible - 1), 0);
    }
  }, [activeIndex, sortedPlans.length, visible]);

  const goNext = useCallback(() => {
    setIsPaused(true);
    setActiveIndex((i) => i + 1);
  }, []);

  const goPrev = useCallback(() => {
    setIsPaused(true);
    setActiveIndex((i) => i - 1);
  }, []);

  if (!sortedPlans.length) return null;

  return (
    <Box className={styles.carouselWrapper} padding="sm">
      <Inline
        className={styles.carouselContainer}
        align="center"
        justify="center"
        gap="sm"
        width="full"
        position="relative"
      >
        <IconButton
          type="button"
          label="Previous plan"
          className={styles.navButton}
          onClick={goPrev}
        >
          ‹
        </IconButton>

        <Box
          ref={wrapperRef}
          className={styles.trackWrapper}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <Inline
            className={styles.track}
            align="stretch"
            style={{
              transform: `translateX(-${(activeIndex - Math.floor(visible / 2)) * step}px)`,
            }}
          >
            {clones.map((plan, idx) => {
              const diff = idx - activeIndex;

              const isCenter = diff === 0;
              const isLeft = diff === -1;
              const isRight = diff === 1;

              const allFeatures = buildPlanFeatures(plan);

              const features =
                plan.bestFor && !EXTRA_PLANS.includes(plan.planName)
                  ? allFeatures.filter((f) => f !== plan.bestFor)
                  : allFeatures;

              const highlight = plan.planName === 'Silver' || plan.planName === 'Gold';

              return (
                <Box
                  key={`${plan.id}-${idx}`}
                  className={`${styles.slide}
                  ${isCenter ? styles.slideCenter : ''}
                  ${isLeft ? styles.slideLeft : ''}
                  ${isRight ? styles.slideRight : ''}
                  `}
                  display="flex"
                  justify="center"
                >
                  <Box
                    as="article"
                    className={`${styles.card}
                    ${isCenter ? styles.cardCenter : ''}
                    ${highlight ? styles.cardHighlight : ''}
                    `}
                    bg="elevated"
                    border
                    rounded="lg"
                    width="full"
                    display="flex"
                    flexDirection="column"
                  >
                    {highlight && isCenter ? (
                      <Badge className={styles.badge}>Most Popular</Badge>
                    ) : null}

                    <Stack gap="sm" padding="md" className={styles.cardInner}>
                      {showTrialBadge && !EXTRA_PLANS.includes(plan.planName) && (
                        <Badge className={styles.trialBadge}>Free 30-day trial</Badge>
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

                      <Stack as="ul" gap="xs" className={styles.featuresList}>
                        {features.map((f) => (
                          <Inline as="li" key={f} gap="xs" align="start">
                            <Text as="span" className={styles.checkIcon}>
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
                          className={styles.ctaButton}
                          onClick={() => onSelectPlan(plan)}
                        >
                          {ctaLabel}
                        </Button>
                      ) : null}
                    </Stack>
                  </Box>
                </Box>
              );
            })}
          </Inline>
        </Box>

        <IconButton type="button" label="Next plan" className={styles.navButton} onClick={goNext}>
          ›
        </IconButton>
      </Inline>

      <Inline className={styles.dots} justify="center" gap="sm" margin="md">
        {Array.from({ length: total - 2 }, (_, i) => i + 1).map((_, i) => (
          <IconButton
            key={i}
            type="button"
            label={`Go to slide ${i + 1}`}
            className={`${styles.dot} ${i === activeIndex ? styles.dotActive : ''}`}
            onClick={() => {
              setIsPaused(true);
              setActiveIndex(i + 1);
            }}
          >
            {'\u00A0'}
          </IconButton>
        ))}
      </Inline>
    </Box>
  );
}
