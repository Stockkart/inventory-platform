import type { CSSProperties, ReactNode } from 'react';
import {
  Box,
  Button,
  Inline,
  accountingChrome,
  cn,
  templateChipClassName,
} from '@inventory-platform/ui-kit';

export const navTabBorderStyle = accountingChrome.navTabBar;

export const numColStyle: CSSProperties = {
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
};

export function NavTabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      role="tab"
      aria-selected={active}
      className={cn(accountingChrome.navTab, active && accountingChrome.navTabActive)}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

export function NavTabBar({ ariaLabel, children }: { ariaLabel: string; children: ReactNode }) {
  return (
    <Box as="nav" aria-label={ariaLabel} overflow="auto" className={accountingChrome.navTabBar}>
      <Inline gap="none">{children}</Inline>
    </Box>
  );
}

export function ChipTabButton({
  active,
  label,
  onClick,
  title,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  title?: string;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      role="tab"
      aria-selected={active}
      title={title}
      className={templateChipClassName(active)}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

export function ChipTabBar({ ariaLabel, children }: { ariaLabel: string; children: ReactNode }) {
  return (
    <Box as="nav" aria-label={ariaLabel}>
      <Inline gap="sm" flexWrap>
        {children}
      </Inline>
    </Box>
  );
}
