import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Box } from '@inventory-platform/ui-kit';
import { createPortal } from 'react-dom';

/**
 * Renders a typeahead menu in a portal, pinned under the field that opened it.
 *
 * The registration grid scrolls in both axes (`DenseDataGrid .wrap` sets
 * `overflow-x: auto`, `overflow-y: auto`, `max-height: 70vh`), and a menu positioned
 * absolutely inside a cell is clipped to that box: on any row far enough down, the
 * suggestions were invisible even though the request had returned them. A z-index
 * does not help, because a scroll container clips its descendants regardless of
 * stacking, and setting one axis to `visible` does not either — CSS computes it back
 * to `auto` when the other axis scrolls.
 *
 * So the menu leaves the container entirely and is positioned from the field's own
 * rect, recalculated while it is open so it stays attached as the grid scrolls.
 */
export function TypeaheadPortal({
  anchorRef,
  open,
  children,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  children: ReactNode;
}) {
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
      setRect({ top: box.bottom + 6, left: box.left, width: box.width });
    };

    measure();

    // Capture phase: the grid's own scroll container is an ancestor, and scroll events
    // from it do not bubble to window.
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
  }, [open, anchorRef]);

  // Nothing to portal before the first measurement, or once the field is gone.
  if (!open || !rect || typeof document === 'undefined') return null;

  return createPortal(
    <Box
      style={{
        position: 'fixed',
        top: rect.top,
        left: rect.left,
        // The menu's own stylesheet sets a min width and a cap; this keeps it at least
        // as wide as the field it belongs to.
        minWidth: rect.width,
        zIndex: 1000,
      }}
    >
      {children}
    </Box>,
    document.body,
  );
}
