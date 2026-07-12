import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';
import { Inline, Stack, Text } from '../layout';

const meta: Meta<typeof Button> = {
  title: 'Forms/Button',
  component: Button,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Primary action control. Use **Playground** + Controls to try variant, size, loading, and width.',
      },
    },
  },
  argTypes: {
    children: {
      control: 'text',
      description: 'Button label',
      table: { category: 'Content' },
    },
    variant: {
      control: 'select',
      options: ['solid', 'outline', 'ghost', 'danger'],
      description: 'Visual style',
      table: { category: 'Appearance', defaultValue: { summary: 'solid' } },
    },
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
      table: { category: 'Appearance', defaultValue: { summary: 'md' } },
    },
    loading: {
      control: 'boolean',
      description: 'Shows spinner and disables the button',
      table: { category: 'State' },
    },
    disabled: {
      control: 'boolean',
      table: { category: 'State' },
    },
    fullWidth: {
      control: 'boolean',
      table: { category: 'Layout' },
    },
    type: {
      control: 'select',
      options: ['button', 'submit', 'reset'],
      table: { category: 'HTML' },
    },
    onClick: { action: 'clicked', table: { disable: true } },
    leftIcon: { control: false, table: { category: 'Content' } },
    rightIcon: { control: false, table: { category: 'Content' } },
  },
  args: {
    children: 'Save changes',
    variant: 'solid',
    size: 'md',
    loading: false,
    disabled: false,
    fullWidth: false,
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

/** Change any prop in the Controls panel — this is the interactive playground. */
export const Playground: Story = {};

export const Outline: Story = {
  args: { variant: 'outline', children: 'Cancel' },
};

export const Ghost: Story = {
  args: { variant: 'ghost', children: 'Learn more' },
};

export const Danger: Story = {
  args: { variant: 'danger', children: 'Delete vendor' },
};

export const Loading: Story = {
  args: { loading: true, children: 'Saving…' },
};

export const FullWidth: Story = {
  args: { fullWidth: true, children: 'Continue' },
  decorators: [
    (Story) => (
      <div style={{ width: 320 }}>
        <Story />
      </div>
    ),
  ],
};

export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <Stack gap="md">
      <Text variant="caption" color="secondary">
        Size comparison (not bound to Controls)
      </Text>
      <Inline gap="sm" align="center">
        <Button size="sm">Small</Button>
        <Button size="md">Medium</Button>
        <Button size="lg">Large</Button>
      </Inline>
    </Stack>
  ),
};

export const AllVariants: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <Inline gap="sm" flexWrap>
      <Button variant="solid">Solid</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Danger</Button>
    </Inline>
  ),
};
