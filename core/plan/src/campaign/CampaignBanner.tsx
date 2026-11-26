import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { SaleBanner } from '@inventory-platform/ui-kit';
import { useActiveCampaignQuery } from '../queries/hooks';
import { bannerTheme } from './bannerTheme';
import { STATE_EYEBROW } from './countdown';
import { dismissCampaign, isCampaignDismissed } from './dismissal';
import { useCampaignCountdown } from './useCampaignCountdown';

function isAppPath(path: string | null): path is string {
  return path != null && path.startsWith('/') && !path.startsWith('//');
}

export interface CampaignBannerProps {
  className?: string;
}

/**
 * The active sale as a scrolling strip, if any. Marketing pages pass it to `Header` so it sits
 * under the nav. Renders nothing while loading, on error, or once dismissed.
 */
export function CampaignBanner({ className }: CampaignBannerProps) {
  const navigate = useNavigate();
  const { data: campaign, dataUpdatedAt, refetch } = useActiveCampaignQuery();
  const onBoundary = useCallback(() => void refetch(), [refetch]);
  const countdown = useCampaignCountdown(campaign ?? null, dataUpdatedAt, onBoundary);

  const code = campaign?.code;
  const state = campaign?.state;
  const [dismissed, setDismissed] = useState(false);

  // Read storage after mount so server and first client render match.
  useEffect(() => {
    setDismissed(code != null && state != null && isCampaignDismissed(code, state));
  }, [code, state]);

  if (!campaign || dismissed) return null;

  const ctaPath = campaign.ctaLabel && isAppPath(campaign.ctaPath) ? campaign.ctaPath : null;

  return (
    <SaleBanner
      className={className}
      theme={bannerTheme(campaign.theme)}
      eyebrow={STATE_EYEBROW[campaign.state]}
      headline={campaign.headline}
      subtext={campaign.subtext}
      countdown={countdown}
      urgent={campaign.state === 'ENDING_SOON'}
      actionLabel={ctaPath ? campaign.ctaLabel ?? undefined : undefined}
      onActivate={ctaPath ? () => navigate(ctaPath) : undefined}
      onDismiss={
        campaign.dismissible
          ? () => {
              dismissCampaign(campaign.code, campaign.state);
              setDismissed(true);
            }
          : undefined
      }
    />
  );
}
