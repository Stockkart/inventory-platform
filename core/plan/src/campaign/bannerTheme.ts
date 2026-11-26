import type { SaleBannerTheme } from '@inventory-platform/ui-kit';

/**
 * Theme codes that have their own ui-kit look. Theme rows live in the database (campaign_themes),
 * so an admin can add a code before ui-kit has a design for it; that code shows the default look.
 */
const LOOKS: Readonly<Record<string, SaleBannerTheme>> = {
  DEFAULT: 'default',
  MONSOON: 'monsoon',
  SUMMER: 'summer',
  DIWALI: 'diwali',
  NEW_YEAR: 'newYear',
};

export function bannerTheme(code: string | null | undefined): SaleBannerTheme {
  return code != null && Object.hasOwn(LOOKS, code) ? LOOKS[code] : 'default';
}
