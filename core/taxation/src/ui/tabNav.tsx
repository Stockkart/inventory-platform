import type { CSSProperties, ReactNode } from 'react';
import { Box, Button, Inline } from '@inventory-platform/ui-kit';

export const navTabBorderStyle: CSSProperties = {
  borderBottom: '1px solid var(--sk-color-border-default)',
};

export function navTabStyle(active: boolean): CSSProperties {
  return {
    borderBottom: active ? '2px solid var(--sk-color-accent)' : '2px solid transparent',
    borderRadius: 0,
    marginBottom: -1,
    color: active ? 'var(--sk-color-accent)' : undefined,
    fontWeight: active ? 600 : undefined,
  };
}

export const numColStyle: CSSProperties = {
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
};

interface NavTabButtonProps {
  active: boolean;
  label: string;
  onClick: () => void;
}

export function NavTabButton({ active, label, onClick }: NavTabButtonProps) {
  return (
    <Button type="button" size="sm" variant="ghost" style={navTabStyle(active)} onClick={onClick}>
      {label}
    </Button>
  );
}

export function NavTabBar({ ariaLabel, children }: { ariaLabel: string; children: ReactNode }) {
  return (
    <Box as="nav" aria-label={ariaLabel} overflow="auto" style={navTabBorderStyle}>
      <Inline gap="none">{children}</Inline>
    </Box>
  );
}
