import type { Meta, StoryObj } from '@storybook/react';
import { ThemeToggle } from './ThemeToggle';
import { Text } from '../layout/Text';
import { Stack, Box, Inline } from '../layout';
import { Alert } from '../feedback';

const meta: Meta = {
  title: 'Theme/Tokens',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Design tokens (`--sk-*`). Prefer the Storybook toolbar Light/Dark control so the canvas background stays in sync.',
      },
    },
  },
};

export default meta;

export const Overview: StoryObj = {
  render: () => (
    <Stack gap="lg" style={{ maxWidth: 560 }}>
      <Alert variant="info">
        Use the toolbar <strong>theme</strong> control (sun / moon) — not only this toggle — so the
        whole canvas background updates with the tokens.
      </Alert>
      <Inline gap="md" align="center">
        <Text weight="semibold">Local toggle</Text>
        <ThemeToggle />
      </Inline>
      <Box
        padding="md"
        rounded="md"
        border
        bg="surface"
        style={{ border: '1px solid var(--sk-color-border-default)' }}
      >
        <Stack gap="sm">
          <Text variant="title">Surface</Text>
          <Text color="secondary">Secondary text — should stay readable in both themes.</Text>
          <Text color="muted">Muted caption</Text>
        </Stack>
      </Box>
      <Inline gap="sm" flexWrap>
        <Box
          padding="sm"
          rounded="md"
          style={{ background: 'var(--sk-color-accent)', color: '#fff' }}
        >
          Accent
        </Box>
        <Box
          padding="sm"
          rounded="md"
          style={{ background: 'var(--sk-color-success-soft)', color: 'var(--sk-color-success)' }}
        >
          Success
        </Box>
        <Box
          padding="sm"
          rounded="md"
          style={{ background: 'var(--sk-color-danger-soft)', color: 'var(--sk-color-danger)' }}
        >
          Danger
        </Box>
      </Inline>
    </Stack>
  ),
};
