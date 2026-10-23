import { useLayoutEffect, useRef, useState, type ReactNode, type Ref, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Box } from '../layout';
import { cn } from '../utils/cn';
import styles from './AnchoredPortal.module.css';

export interface AnchoredPortalProps {
  /** The element the panel is pinned under. */
  anchorRef: RefObject<HTMLElement | null>;
  open: boolean;
  /** Gap between the bottom of the anchor and the top of the panel, in px. */
  offset?: number;
  /**
   * Open above the anchor when the panel does not fit under it but does fit above (a field near
   * the bottom of the screen).
   */
  flip?: boolean;
  /** Layer the panel over modals too, for a field inside a dialog. */
  aboveModals?: boolean;
  /** The portalled panel element, e.g. to tell a click inside it from an outside click. */
  panelRef?: Ref<HTMLDivElement>;
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
export function AnchoredPortal({
  anchorRef,
  open,
  offset = 6,
  flip = false,
  aboveModals = false,
  panelRef,
  children,
}: AnchoredPortalProps) {
  const [rect, setRect] = useState<{
    top: number;
    left: number;
    width: number;
    anchorTop: number;
  } | null>(null);
  const [panelHeight, setPanelHeight] = useState(0);
  const frameRef = useRef<number | null>(null);
  const ownPanelRef = useRef<HTMLDivElement | null>(null);

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
      setRect({ top: box.bottom + offset, left: box.left, width: box.width, anchorTop: box.top });
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

  // The panel's height decides whether it flips; it is known only once it has rendered.
  useLayoutEffect(() => {
    if (!flip || !rect) return;
    const height = ownPanelRef.current?.offsetHeight ?? 0;
    if (height !== panelHeight) setPanelHeight(height);
  });

  // Nothing to portal before the first measurement, or once the anchor is gone.
  if (!open || !rect || typeof document === 'undefined') return null;

  const above =
    flip &&
    panelHeight > 0 &&
    rect.top + panelHeight > window.innerHeight &&
    rect.anchorTop - offset - panelHeight >= 0;
  const setPanelRef = (el: HTMLDivElement | null) => {
    ownPanelRef.current = el;
    if (typeof panelRef === 'function') panelRef(el);
    else if (panelRef) (panelRef as { current: HTMLDivElement | null }).current = el;
  };

  return createPortal(
    <Box
      ref={setPanelRef}
      className={cn(styles.panel, aboveModals && styles.panelAboveModals)}
      style={{
        top: above ? rect.anchorTop - offset - panelHeight : rect.top,
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
