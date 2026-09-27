import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import type { CampaignTheme } from '@inventory-platform/plan/types';
import { Box, Button, SaleBanner, type SaleBannerTheme } from '@inventory-platform/ui-kit';
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
  /** `brand` on marketing pages, `solid` inside the app. */
  ctaVariant?: 'brand' | 'solid';
  /** Adds page-width padding, for full-bleed pages like the landing page. */
  inset?: boolean;
  className?: string;
}

/** The active sale, if any. Renders nothing while loading, on error, or once dismissed. */
export function CampaignBanner({
  ctaVariant = 'solid',
  inset = false,
  className,
}: CampaignBannerProps) {
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

  const ctaPath = campaign.ctaPath;
  const action =
    campaign.ctaLabel && isAppPath(ctaPath) ? (
      <Button type="button" size="sm" variant={ctaVariant} onClick={() => navigate(ctaPath)}>
        {campaign.ctaLabel}
      </Button>
    ) : null;

  const banner = (
    <SaleBanner
      className={className}
      theme={THEMES[campaign.theme] ?? 'default'}
      eyebrow={STATE_EYEBROW[campaign.state]}
      headline={campaign.headline}
      subtext={campaign.subtext}
      countdown={countdown}
      urgent={campaign.state === 'ENDING_SOON'}
      action={action}
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

  return inset ? (
    <Box px="lg" pt="md" maxWidth="xl" mx="auto">
      {banner}
    </Box>
  ) : (
    banner
  );
}
