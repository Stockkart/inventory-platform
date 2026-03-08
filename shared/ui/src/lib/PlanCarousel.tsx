import { useState, useCallback, useRef, useEffect } from 'react';
import type { PlanResponse } from '@inventory-platform/types';
import { buildPlanFeatures } from './PlanGrid';
import styles from './PlanCarousel.module.css';

const EXTRA_USER_PLAN = 'Extra User Plan';
const CARD_WIDTH = 300;
const CARD_GAP = 24;

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
  const visible = 3;
  const startIndex = visible;
  const [activeIndex, setActiveIndex] = useState(startIndex);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState(CARD_WIDTH + CARD_GAP);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const update = () => {
      const w = el.offsetWidth;
      const isNarrow = w < 768;
      const cardW = isNarrow ? 260 : CARD_WIDTH;
      const gap = isNarrow ? 16 : CARD_GAP;
      setStep(cardW + gap);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const sortedPlans = [...plans].sort((a, b) => {
    if (a.planName === EXTRA_USER_PLAN) return 1;
    if (b.planName === EXTRA_USER_PLAN) return -1;
    return 0;
  });

  const clones = [
    ...sortedPlans.slice(-visible),
    ...sortedPlans,
    ...sortedPlans.slice(0, visible),
  ];

  const total = sortedPlans.length;

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
  }, [activeIndex, sortedPlans.length]);

  const goNext = useCallback(() => {
    setIsPaused(true);
    setActiveIndex((i) => i + 1);
  }, []);

  const goPrev = useCallback(() => {
    setIsPaused(true);
    setActiveIndex((i) => i - 1);
  }, []);

  if (sortedPlans.length === 0) return null;

  return (
    <div className={styles.carouselWrapper}>
      <div className={styles.carouselContainer}>
        <button
          type="button"
          className={styles.navButton}
          onClick={goPrev}
          aria-label="Previous plan"
        >
          ‹
        </button>

        <div
          className={styles.trackWrapper}
          ref={wrapperRef}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div
            className={styles.track}
            style={{
              transform: `translateX(-${(activeIndex - 1) * step}px)`,
            }}
          >
            {clones.map((plan, idx) => {
              const diff = idx - activeIndex;
              const isCenter = diff === 0;
              const isLeft = diff === -1;
              const isRight = diff === 1;
              const allFeatures = buildPlanFeatures(plan);
              const features =
                plan.bestFor && plan.planName !== EXTRA_USER_PLAN
                  ? allFeatures.filter((f) => f !== plan.bestFor)
                  : allFeatures;
              const highlight =
                plan.planName === 'Silver' || plan.planName === 'Gold';

              return (
                <div
                  key={plan.id}
                  className={`${styles.slide}
${isCenter ? styles.slideCenter : ''}
${isLeft ? styles.slideLeft : ''}
${isRight ? styles.slideRight : ''}
`}
                >
                  <article
                    className={`${styles.card} ${
                      isCenter ? styles.cardCenter : ''
                    } ${highlight ? styles.cardHighlight : ''}`}
                  >
                    {highlight && isCenter && (
                      <div className={styles.badge}>Most Popular</div>
                    )}
                    <div className={styles.cardInner}>
                      {showTrialBadge && plan.planName !== EXTRA_USER_PLAN && (
                        <div className={styles.trialBadge}>
                          Free 30-day trial
                        </div>
                      )}
                      <h3 className={styles.planName}>{plan.planName}</h3>
                      {plan.planName !== EXTRA_USER_PLAN && plan.bestFor && (
                        <p className={styles.planDescription}>{plan.bestFor}</p>
                      )}
                      <div className={styles.priceRow}>
                        <span className={styles.price}>
                          ₹
                          {(plan.arcPrice ?? plan.price)?.toLocaleString(
                            'en-IN'
                          ) ?? 0}
                        </span>
                        <span className={styles.priceSuffix}>
                          {plan.planName === EXTRA_USER_PLAN
                            ? '/user/year'
                            : '/year'}
                        </span>
                      </div>
                      {plan.planName !== EXTRA_USER_PLAN &&
                        plan.price != null &&
                        plan.price > 0 && (
                          <p className={styles.oneTimePrice}>
                            One-time ₹{plan.price?.toLocaleString('en-IN')} if
                            taking support
                          </p>
                        )}
                      <ul className={styles.featuresList}>
                        {features.map((f) => (
                          <li key={f} className={styles.featureItem}>
                            <span className={styles.checkIcon}>✓</span>
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                      {onSelectPlan && isCenter && (
                        <button
                          type="button"
                          className={styles.ctaButton}
                          onClick={() => onSelectPlan(plan)}
                        >
                          {ctaLabel}
                        </button>
                      )}
                    </div>
                  </article>
                </div>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          className={styles.navButton}
          onClick={goNext}
          aria-label="Next plan"
        >
          ›
        </button>
      </div>

      <div className={styles.dots}>
        {Array.from({ length: total - 2 }, (_, i) => i + 1).map((_, i) => (
          <button
            key={i}
            type="button"
            className={`${styles.dot} ${
              i === activeIndex ? styles.dotActive : ''
            }`}
            onClick={() => {
              setIsPaused(true);
              setActiveIndex(i + 1);
            }}
            aria-label={`Go to plan ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
