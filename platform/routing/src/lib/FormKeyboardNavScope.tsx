import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { Box } from '@inventory-platform/ui-kit';
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
  const ref = useRef<HTMLElement>(null);

  return (
    <Box
      ref={ref}
      id={id}
      className={className}
      onKeyDownCapture={(e: KeyboardEvent<HTMLElement>) => {
        const el = ref.current;
        if (!el) return;
        if (shouldSkipNestedFormKeyboardNav(document.activeElement)) return;
        runFormKeyboardNavigation(e, el, mode);
      }}
    >
      {children}
    </Box>
  );
}
