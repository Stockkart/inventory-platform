import { useState, useCallback, useRef, useEffect } from 'react';
import type { PlanResponse } from '@inventory-platform/types';
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

  const wrapperRef = useRef<HTMLDivElement>(null);

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

  const clones = [
    ...sortedPlans.slice(-visible),
    ...sortedPlans,
    ...sortedPlans.slice(0, visible),
  ];

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
  }, [activeIndex, sortedPlans.length]);

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
    <div className={styles.carouselWrapper}>
      <div className={styles.carouselContainer}>
        <button type="button" className={styles.navButton} onClick={goPrev}>
          ‹
        </button>

        <div
          ref={wrapperRef}
          className={styles.trackWrapper}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div
            className={styles.track}
            style={{
              transform: `translateX(-${
                (activeIndex - Math.floor(visible / 2)) * step
              }px)`,
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

              const highlight =
                plan.planName === 'Silver' || plan.planName === 'Gold';

              return (
                <div
                  key={`${plan.id}-${idx}`}
                  className={`${styles.slide}
                  ${isCenter ? styles.slideCenter : ''}
                  ${isLeft ? styles.slideLeft : ''}
                  ${isRight ? styles.slideRight : ''}
                  `}
                >
                  <article
                    className={`${styles.card}
                    ${isCenter ? styles.cardCenter : ''}
                    ${highlight ? styles.cardHighlight : ''}
                    `}
                  >
                    {highlight && isCenter && (
                      <div className={styles.badge}>Most Popular</div>
                    )}

                    <div className={styles.cardInner}>
                      {showTrialBadge &&
                        !EXTRA_PLANS.includes(plan.planName) && (
                          <div className={styles.trialBadge}>
                            Free 30-day trial
                          </div>
                        )}

                      <h3 className={styles.planName}>{plan.planName}</h3>

                      {!EXTRA_PLANS.includes(plan.planName) && plan.bestFor && (
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
                          {EXTRA_PLANS.includes(plan.planName)
                            ? '/year'
                            : '/year'}
                        </span>
                      </div>

                      {!EXTRA_PLANS.includes(plan.planName) &&
                        plan.price &&
                        plan.price > 0 && (
                          <p className={styles.oneTimePrice}>
                            One-time ₹{plan.price.toLocaleString('en-IN')}
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

        <button type="button" className={styles.navButton} onClick={goNext}>
          ›
        </button>
      </div>

      <div className={styles.dots}>
        {Array.from({ length: total - 2 }, (_, i) => i + 1).map((_, i) => (
          <button
            key={i}
            className={`${styles.dot} ${
              i === activeIndex ? styles.dotActive : ''
            }`}
            onClick={() => {
              setIsPaused(true);
              setActiveIndex(i + 1);
            }}
          />
        ))}
      </div>
    </div>
  );
}
