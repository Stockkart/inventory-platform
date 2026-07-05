import type { Meta, StoryObj } from '@storybook/react';
import {
  LayoutDashboard,
  Package,
  Search,
  Users,
} from 'lucide-react';
import { Icon } from './Icon';
import { Stack } from '../layout/Stack';
import { Text } from '../layout/Text';

const meta: Meta = {
  title: 'Theme/Icons',
};

export default meta;

export const Sizes: StoryObj = {
  render: () => (
    <Stack gap="md">
      <Text variant="caption" color="secondary">
        Lucide icons via ui-kit Icon wrapper
      </Text>
      <Stack direction="row" gap="lg" align="center">
        <Icon icon={Package} size="sm" />
        <Icon icon={Package} size="md" />
        <Icon icon={Package} size="lg" />
      </Stack>
      <Stack direction="row" gap="md" align="center">
        <Icon icon={LayoutDashboard} size="md" />
        <Icon icon={Search} size="md" />
        <Icon icon={Users} size="md" />
        <Icon icon={Package} size="md" />
      </Stack>
    </Stack>
  ),
};
