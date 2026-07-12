import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { AppShell, navItemClassName, PopoverPanel, NotificationDot } from './AppShell';
import { Box, Inline, Stack, Text } from '../layout';
import { Button, IconButton } from '../forms';
import { Badge } from '../feedback';

const meta: Meta = {
  title: 'Patterns/AppShell',
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

function DemoNav({ active }: { active: string }) {
  const items = [
    { id: 'overview', label: 'Overview' },
    { id: 'sell', label: 'Scan & Sell' },
    { id: 'products', label: 'Products' },
    { id: 'settings', label: 'Settings' },
  ];
  return (
    <Stack gap="xs" padding="sm" style={{ height: '100%' }}>
      <Text variant="title" weight="semibold" style={{ padding: '0.75rem' }}>
        StockKart
      </Text>
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className={navItemClassName(item.id === active)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.55rem 0.75rem',
            borderRadius: 8,
            color: 'inherit',
          }}
        >
          {item.label}
        </a>
      ))}
    </Stack>
  );
}

export const Default: StoryObj = {
  render: function DefaultStory() {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    return (
      <AppShell
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        mobileMenuButton={
          <IconButton label="Open menu" onClick={() => setMobileOpen(true)}>
            ☰
          </IconButton>
        }
        sidebar={<DemoNav active="overview" />}
        header={
          <Inline
            justify="between"
            align="center"
            padding="sm"
            style={{
              borderBottom: '1px solid var(--sk-color-border-default)',
              background: 'var(--sk-color-bg-surface)',
            }}
          >
            <Inline gap="sm">
              <Button size="sm" variant="outline" onClick={() => setCollapsed((c) => !c)}>
                {collapsed ? 'Expand' : 'Collapse'} sidebar
              </Button>
              <Text variant="caption" color="secondary">
                Sticky header
              </Text>
            </Inline>
            <Box position="relative">
              <IconButton label="Notifications" onClick={() => setMenuOpen((o) => !o)}>
                🔔
                <NotificationDot />
              </IconButton>
              {menuOpen ? (
                <PopoverPanel
                  style={{
                    top: '100%',
                    right: 0,
                    marginTop: 8,
                    minWidth: 220,
                    padding: '0.75rem',
                    background: 'var(--sk-color-bg-elevated)',
                    border: '1px solid var(--sk-color-border-default)',
                    borderRadius: 8,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  }}
                >
                  <Stack gap="sm">
                    <Text weight="semibold">Notifications</Text>
                    <Text variant="caption" color="secondary">
                      No new alerts
                    </Text>
                  </Stack>
                </PopoverPanel>
              ) : null}
            </Box>
          </Inline>
        }
      >
        <Stack gap="md">
          <Text variant="heading2">Overview</Text>
          <Text color="secondary">
            AppShell owns sidebar collapse, sticky header, and mobile drawer CSS so domains stay
            CSS-module free.
          </Text>
          <Inline gap="sm">
            <Badge variant="info">navItemClassName</Badge>
            <Badge variant="success">PopoverPanel</Badge>
            <Badge variant="warning">NotificationDot</Badge>
          </Inline>
        </Stack>
      </AppShell>
    );
  },
};
