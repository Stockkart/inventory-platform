import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { GripHorizontal, X } from 'lucide-react';
import { cn } from '../utils/cn';
import { IconButton } from '../forms/IconButton';
import styles from './overlay.module.css';

export interface FloatingPanelPosition {
  x: number;
  y: number;
}

export interface FloatingPanelProps {
  open: boolean;
  title: string;
  onClose: () => void;
  /** Controlled viewport-px top-left. `null` self-places near the bottom-right. */
  position?: FloatingPanelPosition | null;
  /** Fired once per gesture — on pointer-up, not per frame. */
  onPositionChange?: (next: FloatingPanelPosition) => void;
  /** Marks the panel's DOM subtree so a host keydown guard can detect it. */
  keyboardScope?: string;
  initialFocusRef?: RefObject<HTMLElement | null>;
  /**
   * Move focus into the panel when it opens (default). Pass false when the host
   * restores a panel that was left open, so a page load does not pull focus — and
   * a barcode scanner's keystrokes — away from the page.
   */
  autoFocus?: boolean;
  headerActions?: ReactNode;
  width?: number;
  className?: string;
  children: ReactNode;
}

const VIEWPORT_MARGIN = 8;
const ARROW_STEP = 16;
const ARROW_STEP_FINE = 1;
const DEFAULT_WIDTH = 300;

/**
 * Keep a panel fully on screen. Exported so hosts can re-clamp a position that
 * was persisted on one display and restored on a smaller one.
 */
export function clampToViewport(
  pos: FloatingPanelPosition,
  size: { width: number; height: number },
  viewport: { width: number; height: number },
  margin = VIEWPORT_MARGIN,
): FloatingPanelPosition {
  // When the panel is taller/wider than the viewport, the max bound falls below
  // the min one; clamping min last keeps the top-left corner visible.
  const maxX = viewport.width - size.width - margin;
  const maxY = viewport.height - size.height - margin;
  return {
    x: Math.max(margin, Math.min(pos.x, maxX)),
    y: Math.max(margin, Math.min(pos.y, maxY)),
  };
}

function defaultPosition(size: { width: number; height: number }): FloatingPanelPosition {
  if (typeof window === 'undefined') {
    return { x: VIEWPORT_MARGIN, y: VIEWPORT_MARGIN };
  }
  return clampToViewport(
    { x: window.innerWidth - size.width - 24, y: window.innerHeight - size.height - 24 },
    size,
    { width: window.innerWidth, height: window.innerHeight },
  );
}

export function FloatingPanel({
  open,
  title,
  onClose,
  position = null,
  onPositionChange,
  keyboardScope,
  initialFocusRef,
  autoFocus = true,
  headerActions,
  width = DEFAULT_WIDTH,
  className,
  children,
}: FloatingPanelProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const dragOffsetRef = useRef<FloatingPanelPosition | null>(null);
  const pendingPointRef = useRef<FloatingPanelPosition | null>(null);
  const frameRef = useRef<number | null>(null);

  const [mounted, setMounted] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [livePos, setLivePos] = useState<FloatingPanelPosition | null>(position);

  useEffect(() => setMounted(true), []);

  // Adopt controlled position changes, except mid-drag where the pointer wins.
  useEffect(() => {
    if (!dragging) setLivePos(position);
  }, [position, dragging]);

  const measure = useCallback(() => {
    const rect = panelRef.current?.getBoundingClientRect();
    return { width: rect?.width ?? width, height: rect?.height ?? 0 };
  }, [width]);

  // Place and clamp once the panel has real dimensions. useLayoutEffect so the
  // first painted frame is already in the right place.
  useLayoutEffect(() => {
    if (!open || !mounted) return;
    const size = measure();
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    setLivePos((current) =>
      current ? clampToViewport(current, size, viewport) : defaultPosition(size),
    );
  }, [open, mounted, measure]);

  // A position saved on a large display must survive being restored on a small one.
  useEffect(() => {
    if (!open) return;
    let frame: number | null = null;
    const onResize = () => {
      if (frame !== null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        setLivePos((current) =>
          current
            ? clampToViewport(current, measure(), {
                width: window.innerWidth,
                height: window.innerHeight,
              })
            : current,
        );
      });
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [open, measure]);

  // Focus the panel on open, hand focus back to the opener on close. A panel
  // opened without focus never took it, so it has nothing to hand back.
  // `mounted` is a dependency because the portal does not exist on the first
  // render; without it a panel that mounts already open never gets focus.
  useEffect(() => {
    if (!open || !mounted || !autoFocus) return;
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const target = initialFocusRef?.current ?? panelRef.current;
    target?.focus({ preventScroll: true });
    return () => {
      returnFocusRef.current?.focus({ preventScroll: true });
      returnFocusRef.current = null;
    };
  }, [open, mounted, autoFocus, initialFocusRef]);

  useEffect(
    () => () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    },
    [],
  );

  const commit = useCallback(
    (next: FloatingPanelPosition) => {
      setLivePos(next);
      onPositionChange?.(next);
    },
    [onPositionChange],
  );

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    if (event.target instanceof Element && event.target.closest('button, [data-no-drag]')) return;
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragOffsetRef.current = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const offset = dragOffsetRef.current;
    if (!offset) return;
    pendingPointRef.current = { x: event.clientX - offset.x, y: event.clientY - offset.y };
    // One state update per frame — a setState per pointermove janks on slow counter PCs.
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      const point = pendingPointRef.current;
      if (!point) return;
      setLivePos(
        clampToViewport(point, measure(), {
          width: window.innerWidth,
          height: window.innerHeight,
        }),
      );
    });
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragOffsetRef.current) return;
    dragOffsetRef.current = null;
    pendingPointRef.current = null;
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragging(false);
    // One persisted write per gesture rather than one per frame.
    const rect = panelRef.current?.getBoundingClientRect();
    if (rect) onPositionChange?.({ x: rect.left, y: rect.top });
  };

  const onHandleKeyDown = (event: ReactKeyboardEvent<HTMLSpanElement>) => {
    const step = event.shiftKey ? ARROW_STEP_FINE : ARROW_STEP;
    const current = livePos ?? defaultPosition(measure());
    let next: FloatingPanelPosition | null = null;
    if (event.key === 'ArrowLeft') next = { x: current.x - step, y: current.y };
    else if (event.key === 'ArrowRight') next = { x: current.x + step, y: current.y };
    else if (event.key === 'ArrowUp') next = { x: current.x, y: current.y - step };
    else if (event.key === 'ArrowDown') next = { x: current.x, y: current.y + step };
    else if (event.key === 'Home') next = defaultPosition(measure());
    if (!next) return;
    event.preventDefault();
    commit(
      clampToViewport(next, measure(), { width: window.innerWidth, height: window.innerHeight }),
    );
  };

  // Escape is handled here rather than on `document`: a persistent panel must not
  // swallow Escape from the page it floats over.
  const onPanelKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onClose();
    }
  };

  if (!open || !mounted || typeof document === 'undefined') return null;

  const pos = livePos ?? { x: -9999, y: -9999 };

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-labelledby={titleId}
      tabIndex={-1}
      data-sk-keyboard-scope={keyboardScope}
      className={cn(styles.floatingPanel, dragging && styles.floatingPanelDragging, className)}
      // Runtime coordinates cannot be a class. Same approach as AnchoredPortal,
      // the other ui-kit surface positioned from JavaScript.
      style={{ left: pos.x, top: pos.y, width }}
      onKeyDown={onPanelKeyDown}
    >
      {/* Pointer drag surface only. Keyboard moving lives on the handle below, so
          the header holds no interactive element inside another one. */}
      <div
        className={cn(styles.floatingPanelHeader, dragging && styles.floatingPanelHeaderDragging)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
      >
        <span
          className={styles.floatingPanelHandle}
          role="button"
          tabIndex={0}
          aria-label={`Move ${title}. Use the arrow keys; Home resets.`}
          onKeyDown={onHandleKeyDown}
        >
          <GripHorizontal size={14} aria-hidden />
        </span>
        <h2 id={titleId} className={styles.floatingPanelTitle}>
          {title}
        </h2>
        <span className={styles.floatingPanelActions}>
          {headerActions}
          <IconButton label={`Close ${title}`} size="sm" shape="circle" onClick={onClose}>
            <X size={16} aria-hidden />
          </IconButton>
        </span>
      </div>
      <div className={styles.floatingPanelBody}>{children}</div>
    </div>,
    document.body,
  );
}
