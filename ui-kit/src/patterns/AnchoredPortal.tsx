import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Box } from '../layout';
import styles from './AnchoredPortal.module.css';

export interface AnchoredPortalProps {
  /** The element the panel is pinned under. */
  anchorRef: RefObject<HTMLElement | null>;
  open: boolean;
  /** Gap between the bottom of the anchor and the top of the panel, in px. */
  offset?: number;
  children: ReactNode;
}

/**
 * Renders a panel in a portal, pinned under the element that opened it.
 *
 * A menu positioned absolutely inside a scroll container is clipped to that box: in
 * a grid that scrolls in both axes, the menu on a lower row is invisible even though
 * its content is there. A z-index does not help, because a scroll container clips its
 * descendants regardless of stacking, and setting one axis to `visible` does not
 * either — CSS computes it back to `auto` when the other axis scrolls.
 *
 * So the panel leaves the container entirely and is positioned from the anchor's own
 * rect, recalculated while it is open so it stays attached as the grid scrolls.
 *
 * Everything portalled to `<body>` shares one stacking context, so the panel takes
 * `--sk-z-popover` rather than a literal — see `PackagingFactorField`, which sits on
 * the same layer in the same grid.
 */
export function AnchoredPortal({ anchorRef, open, offset = 6, children }: AnchoredPortalProps) {
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const frameRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setRect(null);
      return;
    }

    const measure = () => {
      const el = anchorRef.current;
      if (!el) return;
      const box = el.getBoundingClientRect();
      // Viewport coordinates, to be used with position: fixed. Scrolling any ancestor
      // changes these, which is why this re-runs on scroll rather than measuring once.
      setRect({ top: box.bottom + offset, left: box.left, width: box.width });
    };

    measure();

    // Capture phase: the scroll container is an ancestor, and scroll events from it do
    // not bubble to window.
    const onReflow = () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(measure);
    };
    window.addEventListener('scroll', onReflow, true);
    window.addEventListener('resize', onReflow);
    return () => {
      window.removeEventListener('scroll', onReflow, true);
      window.removeEventListener('resize', onReflow);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [open, anchorRef, offset]);

  // Nothing to portal before the first measurement, or once the anchor is gone.
  if (!open || !rect || typeof document === 'undefined') return null;

  return createPortal(
    <Box
      className={styles.panel}
      style={{
        top: rect.top,
        left: rect.left,
        // The panel's own stylesheet sets a min width and a cap; this keeps it at least
        // as wide as the field it belongs to.
        minWidth: rect.width,
      }}
    >
      {children}
    </Box>,
    document.body,
  );
}
