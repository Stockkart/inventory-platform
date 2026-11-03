import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '../utils/cn';
import { Box } from '../layout/Box';
import styles from './SocialAuthSlot.module.css';

/** Google Identity Services accepts a button width between 200 and 400 px. */
const MIN_BUTTON_WIDTH = 200;
const MAX_BUTTON_WIDTH = 400;

export interface SocialAuthSlotRenderProps {
  /**
   * Width in px the third-party button should request, clamped to what GIS accepts.
   * `undefined` until the slot has been measured (first client render, SSR).
   */
  buttonWidth: number | undefined;
}

export interface SocialAuthSlotProps {
  children: ReactNode | ((slot: SocialAuthSlotRenderProps) => ReactNode);
  className?: string;
}

/**
 * Centered, full-width slot for third-party OAuth buttons (e.g. GoogleLogin).
 *
 * GIS renders its button inside an iframe at a fixed pixel width; stretching that iframe with CSS
 * leaves the button left-aligned inside it (visible with the personalised "Sign in as …" variant).
 * The slot therefore measures itself and hands the width to the child so the button is rendered at
 * the slot's width, and the CSS only centres whatever GIS produces.
 */
export function SocialAuthSlot({ children, className }: SocialAuthSlotProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [buttonWidth, setButtonWidth] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === 'undefined') {
      return;
    }
    const measure = () => {
      const width = Math.floor(node.getBoundingClientRect().width);
      if (width > 0) {
        setButtonWidth(Math.min(MAX_BUTTON_WIDTH, Math.max(MIN_BUTTON_WIDTH, width)));
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Box ref={ref} className={cn(styles.root, className)}>
      {typeof children === 'function' ? children({ buttonWidth }) : children}
    </Box>
  );
}
