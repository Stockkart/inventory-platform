import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import type { CampaignTheme } from '@inventory-platform/plan/types';
import { SaleBanner, type SaleBannerTheme } from '@inventory-platform/ui-kit';
import { useActiveCampaignQuery } from '../queries/hooks';
import { STATE_EYEBROW } from './countdown';
import { useCampaignCountdown } from './useCampaignCountdown';

const THEMES: Record<CampaignTheme, SaleBannerTheme> = {
  DEFAULT: 'default',
  MONSOON: 'monsoon',
  SUMMER: 'summer',
  DIWALI: 'diwali',
  NEW_YEAR: 'newYear',
};

function isAppPath(path: string | null): path is string {
  return path != null && path.startsWith('/') && !path.startsWith('//');
}

export interface CampaignBannerProps {
  className?: string;
}

/**
 * The active sale as a scrolling strip, if any. Marketing pages pass it to `Header` so it sits
 * under the nav. Renders nothing while loading or on error. It has no close button: the offer
 * stays visible for as long as the campaign runs.
 */
export function CampaignBanner({ className }: CampaignBannerProps) {
  const navigate = useNavigate();
  const { data: campaign, dataUpdatedAt, refetch } = useActiveCampaignQuery();
  const onBoundary = useCallback(() => void refetch(), [refetch]);
  const countdown = useCampaignCountdown(campaign ?? null, dataUpdatedAt, onBoundary);

  if (!campaign) return null;

  const ctaPath = campaign.ctaLabel && isAppPath(campaign.ctaPath) ? campaign.ctaPath : null;

  return (
    <SaleBanner
      className={className}
      theme={THEMES[campaign.theme] ?? 'default'}
      eyebrow={STATE_EYEBROW[campaign.state]}
      headline={campaign.headline}
      subtext={campaign.subtext}
      countdown={countdown}
      urgent={campaign.state === 'ENDING_SOON'}
      actionLabel={ctaPath ? campaign.ctaLabel ?? undefined : undefined}
      onActivate={ctaPath ? () => navigate(ctaPath) : undefined}
    />
  );
}
