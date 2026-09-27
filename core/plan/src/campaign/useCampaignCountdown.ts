import { useEffect, useRef, useState } from 'react';
import type { CampaignResponse } from '@inventory-platform/plan/types';
import { clockOffsetMs, countdownLabel, countdownTargetMs, tickIntervalMs } from './countdown';

/**
 * Ticks the countdown on server-corrected time, pauses while the tab is hidden, and calls
 * `onBoundary` once when the server said the state would change.
 */
export function useCampaignCountdown(
  campaign: CampaignResponse | null,
  receivedAtMs: number,
  onBoundary: () => void,
): string | null {
  const offset = campaign ? clockOffsetMs(campaign.serverNow, receivedAtMs) : 0;
  const [nowMs, setNowMs] = useState(() => Date.now() + offset);
  const onBoundaryRef = useRef(onBoundary);
  const firedForRef = useRef<string | null>(null);

  useEffect(() => {
    onBoundaryRef.current = onBoundary;
  }, [onBoundary]);

  useEffect(() => {
    if (!campaign) return undefined;
    const boundary = Date.parse(campaign.nextTransitionAt);
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = () => {
      const now = Date.now() + offset;
      setNowMs(now);
      if (now >= boundary) {
        if (firedForRef.current !== campaign.nextTransitionAt) {
          firedForRef.current = campaign.nextTransitionAt;
          onBoundaryRef.current();
        }
        return;
      }
      if (document.hidden) return;
      const delay = tickIntervalMs(campaign.state, countdownTargetMs(campaign) - now);
      timer = setTimeout(tick, Math.min(delay, Math.max(boundary - now, 0) + 50));
    };

    const onVisibility = () => {
      clearTimeout(timer);
      if (!document.hidden) tick();
    };

    tick();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [campaign, offset]);

  return campaign ? countdownLabel(campaign, nowMs) : null;
}
