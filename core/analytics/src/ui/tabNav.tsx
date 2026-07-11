import type { ReactNode } from 'react';
import { Box, Button, Inline, cn, accountingChrome } from '@inventory-platform/ui-kit';

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
