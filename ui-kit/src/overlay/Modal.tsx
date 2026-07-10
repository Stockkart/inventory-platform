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
}

function useModalContext() {
  const ctx = useContext(ModalContext);
  if (!ctx) {
    throw new Error('Modal compound components must be used within Modal');
  }
  return ctx;
}

export function Modal({ open, onClose, size = 'md', children, className }: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    panelRef.current?.focus();
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

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

export interface DrawerProps {
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
}

export function Drawer({ open, onClose, children }: DrawerProps) {
  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className={styles.drawerBackdrop}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={styles.drawer}
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
