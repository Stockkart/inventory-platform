import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import type { CampaignTheme } from '@inventory-platform/plan/types';
import { SaleBanner, type SaleBannerTheme } from '@inventory-platform/ui-kit';
import { useActiveCampaignQuery } from '../queries/hooks';
import { STATE_EYEBROW } from './countdown';
import { dismissCampaign, isCampaignDismissed } from './dismissal';
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
  /**
   * Set `false` to hide the close button and ignore an earlier dismissal, whatever the campaign
   * says. My Plan uses this: it is where the sale applies, so the offer must stay visible there.
   */
  dismissible?: boolean;
}

/**
 * The active sale as a scrolling strip, if any. Marketing pages pass it to `Header` so it sits
 * under the nav. Renders nothing while loading, on error, or once dismissed.
 */
export function CampaignBanner({ className, dismissible = true }: CampaignBannerProps) {
  const navigate = useNavigate();
  const { data: campaign, dataUpdatedAt, refetch } = useActiveCampaignQuery();
  const onBoundary = useCallback(() => void refetch(), [refetch]);
  const countdown = useCampaignCountdown(campaign ?? null, dataUpdatedAt, onBoundary);

  const code = campaign?.code;
  const state = campaign?.state;
  const [dismissed, setDismissed] = useState(false);

  // Read storage after mount so server and first client render match.
  useEffect(() => {
    setDismissed(dismissible && code != null && state != null && isCampaignDismissed(code, state));
  }, [code, state, dismissible]);

  if (!campaign || dismissed) return null;

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
      onDismiss={
        dismissible && campaign.dismissible
          ? () => {
              dismissCampaign(campaign.code, campaign.state);
              setDismissed(true);
            }
          : undefined
      }
    />
  );
}
