import type { Meta, StoryObj } from '@storybook/react';
import { LinkButton } from './LinkButton';
import { Stack, Text } from '../layout';

const meta: Meta<typeof LinkButton> = {
  title: 'Forms/LinkButton',
  component: LinkButton,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A button that reads as a link, for "click to open" values in lists (entry numbers, employee names, months). Keyboard focusable with a visible focus ring.',
      },
    },
  },
  args: { children: 'JE-000123' },
};

export default meta;
type Story = StoryObj<typeof LinkButton>;

export const Playground: Story = {};

export const InText: Story = {
  render: () => (
    <Stack gap="sm">
      <Text>
        Payroll for <LinkButton>October 2026</LinkButton> is ready.
      </Text>
      <Text>
        <LinkButton truncate>A very long employee name that is cut with an ellipsis</LinkButton>
      </Text>
    </Stack>
  ),
};
