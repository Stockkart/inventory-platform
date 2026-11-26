import { createContext, useContext, useEffect, useId, useRef, type ReactNode } from 'react';
import { cn } from '../utils/cn';
import { IconButton } from '../forms/IconButton';
import styles from './overlay.module.css';

type ModalSize = 'sm' | 'md' | 'lg' | 'full';

interface ModalContextValue {
  titleId: string;
  onClose?: () => void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

export interface ModalProps {
  open: boolean;
  onClose?: () => void;
  size?: ModalSize;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

function useModalContext() {
  const ctx = useContext(ModalContext);
  if (!ctx) {
    throw new Error('Modal compound components must be used within Modal');
  }
  return ctx;
}

export function Modal({ open, onClose, size = 'md', children, className, style }: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current?.();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    panelRef.current?.focus();
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <ModalContext.Provider value={{ titleId, onClose }}>
      <div
        className={styles.backdrop}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            onClose?.();
          }
        }}
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className={cn(styles.modal, styles[`size-${size}`], className)}
          style={style}
          onClick={(event) => event.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </ModalContext.Provider>
  );
}

function ModalHeader({ title, onClose }: { title: ReactNode; onClose?: () => void }) {
  const { titleId, onClose: contextClose } = useModalContext();
  const close = onClose ?? contextClose;

  return (
    <div className={styles.header}>
      <h2 id={titleId} className={styles.title}>
        {title}
      </h2>
      {close ? (
        <IconButton label="Close dialog" onClick={close}>
          ×
        </IconButton>
      ) : null}
    </div>
  );
}

function ModalBody({ children }: { children: ReactNode }) {
  return <div className={styles.body}>{children}</div>;
}

function ModalFooter({ children }: { children: ReactNode }) {
  return <div className={styles.footer}>{children}</div>;
}

Modal.Header = ModalHeader;
Modal.Body = ModalBody;
Modal.Footer = ModalFooter;

export type DrawerSize = 'md' | 'lg';

export interface DrawerProps {
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
  /** Which edge the drawer slides from. Default: left. */
  side?: 'left' | 'right';
  /** `md` = 400 px, `lg` = 480 px (both full width on narrower screens). Default: md. */
  size?: DrawerSize;
  /** Optional labelled-by id for accessibility. */
  labelledBy?: string;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Tabbable elements inside `root`, in DOM order. */
function focusableWithin(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => el.getAttribute('aria-hidden') !== 'true',
  );
}

export function Drawer({
  open,
  onClose,
  children,
  side = 'left',
  size = 'md',
  labelledBy,
}: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }
    // Focus moves into the drawer on open and back to the opener (the row, the button) on close.
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current?.();
        return;
      }
      // Tab stays inside the dialog: wrap from the last tabbable to the first and back.
      if (event.key === 'Tab') {
        const panel = panelRef.current;
        if (!panel) return;
        const items = focusableWithin(panel);
        if (items.length === 0) {
          event.preventDefault();
          panel.focus();
          return;
        }
        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement;
        const inside = active instanceof Node && panel.contains(active);
        if (event.shiftKey) {
          if (!inside || active === first || active === panel) {
            event.preventDefault();
            last.focus();
          }
        } else if (!inside || active === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      if (opener && opener.isConnected) {
        opener.focus();
      }
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className={cn(
        styles.drawerBackdrop,
        side === 'left' ? styles.drawerBackdropLeft : styles.drawerBackdropRight,
      )}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={cn(
          styles.drawer,
          size === 'lg' && styles.drawerLg,
          side === 'left' ? styles.drawerLeft : styles.drawerRight,
        )}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export interface PopoverProps {
  open: boolean;
  anchor: ReactNode;
  children: ReactNode;
  onClose?: () => void;
}

export function Popover({ open, anchor, children, onClose }: PopoverProps) {
  return (
    <span className={styles.popoverAnchor}>
      {anchor}
      {open ? (
        <div className={styles.popover} role="dialog">
          {children}
          {onClose ? (
            <button type="button" onClick={onClose} aria-label="Close popover">
              Close
            </button>
          ) : null}
        </div>
      ) : null}
    </span>
  );
}

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
}

export function Tooltip({ content, children }: TooltipProps) {
  return (
    <span className={styles.popoverAnchor}>
      {children}
      <span className={styles.tooltip} role="tooltip">
        {content}
      </span>
    </span>
  );
}

export interface DropdownMenuProps {
  trigger: ReactNode;
  items: Array<{
    id: string;
    label: ReactNode;
    onSelect?: () => void;
    disabled?: boolean;
  }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DropdownMenu({ trigger, items, open, onOpenChange }: DropdownMenuProps) {
  return (
    <span className={styles.popoverAnchor}>
      <span onClick={() => onOpenChange(!open)}>{trigger}</span>
      {open ? (
        <div className={styles.menu} role="menu">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              className={styles.menuItem}
              disabled={item.disabled}
              onClick={() => {
                item.onSelect?.();
                onOpenChange(false);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </span>
  );
}
