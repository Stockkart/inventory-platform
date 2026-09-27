import type { Meta, StoryObj } from '@storybook/react';
import { SaleBanner, type SaleBannerTheme } from './SaleBanner';
import { Button } from '../forms';
import { Stack } from '../layout';

const meta: Meta<typeof SaleBanner> = {
  title: 'Patterns/Sale banner',
  component: SaleBanner,
};

export default meta;

const cta = (
  <Button type="button" variant="brand" size="sm">
    See plans
  </Button>
);

export const Live: StoryObj<typeof SaleBanner> = {
  args: {
    theme: 'monsoon',
    eyebrow: 'Sale is live',
    headline: 'Monsoon sale: annual plans from ₹4,999',
    subtext: 'New yearly prices, locked in for your first term.',
    countdown: 'Ends 20 Oct',
    action: cta,
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

const themes: SaleBannerTheme[] = ['default', 'monsoon', 'summer', 'diwali', 'newYear'];

export const AllThemes: StoryObj<typeof SaleBanner> = {
  render: () => (
    <Stack gap="md">
      {themes.map((theme) => (
        <SaleBanner
          key={theme}
          theme={theme}
          eyebrow="Sale is live"
          headline={`Theme: ${theme}`}
          countdown="Ends in 3d 02h"
          action={cta}
          onDismiss={() => undefined}
        />
      ))}
    </Stack>
  ),
};
