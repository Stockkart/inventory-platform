import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '../utils/cn';
import { IconButton } from '../forms/IconButton';
import { Box, Inline } from '../layout';
import styles from './PlanCarousel3D.module.css';

function getCssNumber(el: HTMLElement, varName: string, fallback: number) {
  const v = getComputedStyle(el).getPropertyValue(varName);
  return v ? parseInt(v, 10) : fallback;
}

export interface CarouselSlideContext {
  index: number;
  isCenter: boolean;
  isLeft: boolean;
  isRight: boolean;
}

export interface PlanCarousel3DProps<T> {
  items: T[];
  renderSlide: (item: T, ctx: CarouselSlideContext) => ReactNode;
  getSlideKey: (item: T, cloneIndex: number) => string;
  /** Defaults to items.length */
  dotCount?: number;
  className?: string;
}

export function PlanCarousel3D<T>({
  items,
  renderSlide,
  getSlideKey,
  dotCount,
  className,
}: PlanCarousel3DProps<T>) {
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

  const clones = [...items.slice(-visible), ...items, ...items.slice(0, visible)];
  const total = items.length;
  const dots = dotCount ?? total;

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
    if (activeIndex >= items.length + visible) {
      setTimeout(() => setActiveIndex(visible), 0);
    }

    if (activeIndex < visible) {
      setTimeout(() => setActiveIndex(items.length + visible - 1), 0);
    }
  }, [activeIndex, items.length, visible]);

  const goNext = useCallback(() => {
    setIsPaused(true);
    setActiveIndex((i) => i + 1);
  }, []);

  const goPrev = useCallback(() => {
    setIsPaused(true);
    setActiveIndex((i) => i - 1);
  }, []);

  if (!items.length) return null;

  return (
    <Box className={cn(styles.carouselWrapper, className)} padding="sm">
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
          label="Previous slide"
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
            {clones.map((item, idx) => {
              const diff = idx - activeIndex;
              const isCenter = diff === 0;
              const isLeft = diff === -1;
              const isRight = diff === 1;

              return (
                <Box
                  key={getSlideKey(item, idx)}
                  className={cn(
                    styles.slide,
                    isCenter && styles.slideCenter,
                    isLeft && styles.slideLeft,
                    isRight && styles.slideRight,
                  )}
                  display="flex"
                  justify="center"
                >
                  {renderSlide(item, { index: idx, isCenter, isLeft, isRight })}
                </Box>
              );
            })}
          </Inline>
        </Box>

        <IconButton type="button" label="Next slide" className={styles.navButton} onClick={goNext}>
          ›
        </IconButton>
      </Inline>

      <Inline className={styles.dots} justify="center" gap="sm" margin="md">
        {Array.from({ length: dots }, (_, i) => (
          <IconButton
            key={i}
            type="button"
            label={`Go to slide ${i + 1}`}
            className={cn(styles.dot, i === activeIndex && styles.dotActive)}
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
