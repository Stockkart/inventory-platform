import type { Meta, StoryObj } from '@storybook/react';
import { PlanCard } from './PlanCard';

const meta: Meta<typeof PlanCard> = {
  title: 'Patterns/Plan card',
  component: PlanCard,
};

export default meta;

const base = {
  name: 'Professional',
  bestFor: 'Growing shops with a small team',
  priceLabel: '₹9,999',
  features: ['5 users', '500 SMS/month', 'Accounting', 'Barcode generator'],
  ctaLabel: 'Get Started',
  onSelect: () => undefined,
};

export const Default: StoryObj<typeof PlanCard> = { args: base };

export const WithListPriceAnchor: StoryObj<typeof PlanCard> = {
  args: { ...base, listPriceLabel: '₹12,999', highlighted: true, showPopularBadge: true },
};

/** Tag a line that is sold but not live yet, e.g. SMS before StockKart sends it. */
export const WithComingSoonLines: StoryObj<typeof PlanCard> = {
  args: {
    ...base,
    features: [
      '5 users',
      { label: '500 SMS/month', comingSoon: true },
      { label: '500 WhatsApp/month', comingSoon: true },
      'Accounting',
    ],
  },
};
