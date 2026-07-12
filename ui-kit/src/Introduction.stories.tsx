import type { Meta, StoryObj } from '@storybook/react';
import { Box, Stack, Text, Inline, Grid } from './layout';
import { Button } from './forms';
import { Alert, Badge } from './feedback';
import { Card, CardBody } from './data-display';

const meta: Meta = {
  title: 'Introduction/Welcome',
  parameters: {
    layout: 'padded',
    options: { showPanel: false },
    controls: { disable: true },
  },
};

export default meta;

type QuickLink = {
  title: string;
  description: string;
  href: string;
  badge: string;
};

const QUICK_LINKS: QuickLink[] = [
  {
    title: 'FormField',
    description: 'Labels, hints, errors — tweak every prop in Controls.',
    href: '/?path=/story/forms-formfield--playground',
    badge: 'Forms',
  },
  {
    title: 'Button',
    description: 'Variants, sizes, loading — live playground.',
    href: '/?path=/story/forms-button--playground',
    badge: 'Forms',
  },
  {
    title: 'Input',
    description: 'Text field primitive used inside FormField.',
    href: '/?path=/story/forms-input--playground',
    badge: 'Forms',
  },
  {
    title: 'Alert',
    description: 'Info / success / warning / danger messages.',
    href: '/?path=/story/feedback-alert--playground',
    badge: 'Feedback',
  },
  {
    title: 'Modal',
    description: 'Dialog sizes and open state via Controls.',
    href: '/?path=/story/overlay-modal--playground',
    badge: 'Overlay',
  },
  {
    title: 'QtyStepper',
    description: 'POS quantity control used in Scan & Sell.',
    href: '/?path=/story/patterns-qtystepper--playground',
    badge: 'Patterns',
  },
];

function LinkCard({ item }: { item: QuickLink }) {
  return (
    <a
      href={item.href}
      style={{
        display: 'block',
        textDecoration: 'none',
        color: 'inherit',
        height: '100%',
      }}
    >
      <Card
        style={{
          height: '100%',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        }}
      >
        <CardBody>
          <Stack gap="sm">
            <Inline justify="between" align="center">
              <Text variant="title" weight="semibold">
                {item.title}
              </Text>
              <Badge variant="info">{item.badge}</Badge>
            </Inline>
            <Text color="secondary">{item.description}</Text>
            <Text variant="caption" weight="medium" style={{ color: 'var(--sk-color-accent)' }}>
              Open Playground →
            </Text>
          </Stack>
        </CardBody>
      </Card>
    </a>
  );
}

export const Guide: StoryObj = {
  name: 'Get started',
  render: () => (
    <Stack gap="xl" style={{ maxWidth: 880, margin: '0 auto' }}>
      <Stack gap="md">
        <Badge variant="neutral">@inventory-platform/ui-kit</Badge>
        <Text variant="heading1">Component catalog</Text>
        <Text color="secondary" style={{ fontSize: '1.05rem', maxWidth: 560 }}>
          Interactive docs for every primitive. Domains compose these — they never ship their own
          CSS modules.
        </Text>
      </Stack>

      <Box
        padding="lg"
        border
        rounded="lg"
        bg="surface"
        style={{ borderColor: 'var(--sk-color-accent)', borderWidth: 1 }}
      >
        <Stack gap="md">
          <Text variant="heading3">How to explore</Text>
          <Stack gap="sm">
            <Inline gap="sm" align="start">
              <Badge variant="info">1</Badge>
              <Text>
                Use the <strong>left sidebar</strong> to browse components (Forms, Feedback,
                Patterns…).
              </Text>
            </Inline>
            <Inline gap="sm" align="start">
              <Badge variant="info">2</Badge>
              <Text>
                Open a story named <strong>Playground</strong>.
              </Text>
            </Inline>
            <Inline gap="sm" align="start">
              <Badge variant="info">3</Badge>
              <Text>
                Use the bottom <strong>Controls</strong> panel to change props live.
              </Text>
            </Inline>
            <Inline gap="sm" align="start">
              <Badge variant="info">4</Badge>
              <Text>
                Switch to the <strong>Docs</strong> tab for the full props table and code.
              </Text>
            </Inline>
            <Inline gap="sm" align="start">
              <Badge variant="info">5</Badge>
              <Text>
                Toggle <strong>Light / Dark</strong> from the toolbar (sun / moon icon).
              </Text>
            </Inline>
          </Stack>
        </Stack>
      </Box>

      <Stack gap="md">
        <Text variant="heading3">Start here</Text>
        <Grid columns={2} gap="md" width="full">
          {QUICK_LINKS.map((item) => (
            <LinkCard key={item.href} item={item} />
          ))}
        </Grid>
      </Stack>

      <Stack gap="md">
        <Text variant="heading3">Button preview</Text>
        <Text color="secondary">
          If these look wrong (e.g. invisible outline text), the theme is out of sync — use the
          toolbar theme toggle.
        </Text>
        <Inline gap="sm" flexWrap>
          <Button variant="solid">Primary</Button>
          <Button variant="outline">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Destructive</Button>
        </Inline>
      </Stack>

      <Alert variant="info">
        Prefer <strong>Playground</strong> stories. Gallery stories (All variants, Sizes) are for
        comparison only — Controls are disabled there on purpose.
      </Alert>
    </Stack>
  ),
};
