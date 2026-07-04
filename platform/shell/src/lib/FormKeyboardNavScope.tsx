import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import {
  runFormKeyboardNavigation,
  shouldSkipNestedFormKeyboardNav,
} from './formKeyboardNav';

type FormKeyboardNavScopeProps = {
  children: ReactNode;
  className?: string;
  mode?: 'list' | 'grid';
  id?: string;
};

/**
 * Wraps a form or region so Enter / Shift+Enter / ArrowUp / ArrowDown move focus
 * between fields. Use mode="grid" only for Excel-style tables.
 */
export function FormKeyboardNavScope({
  children,
  className,
  mode = 'list',
  id,
}: FormKeyboardNavScopeProps) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={ref}
      id={id}
      className={className}
      onKeyDownCapture={(e: KeyboardEvent<HTMLDivElement>) => {
        const el = ref.current;
        if (!el) return;
        if (shouldSkipNestedFormKeyboardNav(document.activeElement)) return;
        runFormKeyboardNavigation(e, el, mode);
      }}
    >
      {children}
    </div>
  );
}
