import type { Meta, StoryObj } from '@storybook/react';
import { Box } from './Box';
import { Stack, Inline } from './Stack';
import { Text } from './Text';
import { Divider } from './Divider';

const meta: Meta = {
  title: 'Layout/Primitives',
};

export default meta;

export const StackAndText: StoryObj = {
  render: () => (
    <Stack gap="md" style={{ maxWidth: 420 }}>
      <Text variant="heading1">Page title</Text>
      <Text color="secondary">Secondary description text for a dashboard section.</Text>
      <Divider />
      <Inline gap="sm">
        <Box padding="sm" style={{ background: 'var(--sk-color-bg-muted)', borderRadius: 8 }}>
          <Text variant="caption">Metric A</Text>
        </Box>
        <Box padding="sm" style={{ background: 'var(--sk-color-bg-muted)', borderRadius: 8 }}>
          <Text variant="caption">Metric B</Text>
        </Box>
      </Inline>
    </Stack>
  ),
};
