import type { Meta, StoryObj } from '@storybook/react';
import { SaleBanner } from './SaleBanner';

const meta: Meta<typeof SaleBanner> = {
  title: 'Patterns/Sale banner',
  component: SaleBanner,
  parameters: { layout: 'fullscreen' },
};

export default meta;

export const Live: StoryObj<typeof SaleBanner> = {
  args: {
    theme: 'monsoon',
    eyebrow: 'Sale is live',
    headline: 'Monsoon sale: annual plans from ₹4,999',
    subtext: 'New yearly prices, locked in for your first term.',
    countdown: 'Ends 20 Oct',
    actionLabel: 'See plans',
    onActivate: () => undefined,
    onDismiss: () => undefined,
  },
};

export const EndingSoon: StoryObj<typeof SaleBanner> = {
  args: { ...Live.args, eyebrow: 'Last days', countdown: 'Ends in 1d 04h', urgent: true },
};

export const Upcoming: StoryObj<typeof SaleBanner> = {
  args: {
    theme: 'diwali',
    eyebrow: 'Coming soon',
    headline: 'Diwali sale is coming',
    countdown: 'Starts 1 Nov',
  },
};
