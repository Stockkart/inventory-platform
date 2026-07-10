import type { Meta, StoryObj } from '@storybook/react';
import { Box } from './Box';
import { Stack, Inline } from './Stack';
import { Text } from './Text';
import { Divider } from './Divider';
import { Grid } from './Grid';

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

export const BoxLayoutProps: StoryObj = {
  render: () => (
    <Stack gap="lg" style={{ maxWidth: 640 }}>
      <Text variant="title">Box layout props</Text>
      <Stack
        gap="md"
        width="full"
        maxWidth="sm"
        mx="auto"
        padding="md"
        border
        rounded="md"
        bg="surface"
      >
        <Text weight="semibold">maxWidth=&quot;sm&quot; mx=&quot;auto&quot;</Text>
        <Text variant="caption" color="secondary">
          Centered page shell without a CSS module.
        </Text>
      </Stack>
      <Box display="flex" gap="md" minWidth="0">
        <Box flex="1" minWidth="0" padding="md" border rounded="md" bg="muted">
          <Text>flex=&quot;1&quot; minWidth=&quot;0&quot;</Text>
        </Box>
        <Box flex="none" padding="md" border rounded="md" bg="elevated" style={{ width: 140 }}>
          <Text>flex=&quot;none&quot;</Text>
        </Box>
      </Box>
      <Box position="relative" padding="md" border rounded="md" style={{ height: 88 }}>
        <Text>position=&quot;relative&quot;</Text>
        <Box
          position="absolute"
          zIndex="dropdown"
          padding="xs"
          bg="elevated"
          border
          rounded="sm"
          style={{ top: 8, right: 8 }}
        >
          <Text variant="caption">zIndex=&quot;dropdown&quot;</Text>
        </Box>
      </Box>
      <Grid columns={2} gap="md" width="full">
        <Box padding="sm" bg="muted" rounded="md">
          <Text variant="caption">Grid col 1</Text>
        </Box>
        <Box padding="sm" bg="muted" rounded="md">
          <Text variant="caption">Grid col 2</Text>
        </Box>
      </Grid>
    </Stack>
  ),
};
