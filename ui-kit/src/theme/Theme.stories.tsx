import type { Meta, StoryObj } from '@storybook/react';
import { ThemeToggle } from './ThemeToggle';
import { Text } from '../layout/Text';
import { Stack } from '../layout/Stack';

const meta: Meta = {
  title: 'Theme/Tokens',
};

export default meta;

export const Toggle: StoryObj = {
  render: () => (
    <Stack gap="md">
      <Text>Use the toggle to preview light/dark tokens in the canvas.</Text>
      <ThemeToggle />
      <div
        style={{
          padding: '1rem',
          borderRadius: 8,
          background: 'var(--sk-color-bg-surface)',
          border: '1px solid var(--sk-color-border-default)',
        }}
      >
        <Text>Surface sample</Text>
        <Text color="secondary">Secondary text on surface</Text>
      </div>
    </Stack>
  ),
};
