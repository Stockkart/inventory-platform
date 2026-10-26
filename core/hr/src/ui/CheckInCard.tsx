import { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  Inline,
  Stack,
  Text,
  hrChrome,
} from '@inventory-platform/ui-kit';
import { useNotify } from '@inventory-platform/session';
import {
  formatClock,
  type SelfCheckInRequest,
  type SelfCheckInResponse,
} from '@inventory-platform/hr/types';
import { useCheckInMutation, useMyCheckInQuery } from '../queries/hooks';
import { getCurrentPosition } from './currentPosition';

function todayLine(s: SelfCheckInResponse): string {
  if (!s.todayIn) return 'Not checked in today';
  const parts = [`Checked in at ${formatClock(s.todayIn)}`];
  if (s.todayOut) parts.push(`Checked out at ${formatClock(s.todayOut)}`);
  return parts.join(' · ');
}

/**
 * Self check-in on My HR (R2, R3): one big button, "Check in" or "Check out" as the server says.
 * When the shop checks location the browser is asked first; without a location the punch is
 * still sent and the server applies the shop's rule. The location goes into the request only.
 */
export function CheckInCard() {
  const status = useMyCheckInQuery();
  const punch = useCheckInMutation();
  const [locating, setLocating] = useState(false);
  const [locationNote, setLocationNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const s = status.data;
  if (!s?.enabled) return null;

  const label = s.nextDirection === 'OUT' ? 'Check out' : 'Check in';

  const press = async () => {
    setError(null);
    setLocationNote(null);
    let body: SelfCheckInRequest = {};
    if (s.locationRequired) {
      setLocating(true);
      const fix = await getCurrentPosition();
      setLocating(false);
      if (fix.ok) body = { lat: fix.lat, lng: fix.lng, accuracy: fix.accuracy };
      else setLocationNote(fix.message);
    }
    punch.mutate(body, {
      // The punch just stored is the day's last one: "out" once there is a check-out time.
      onSuccess: (r) =>
        useNotify.success(
          r.todayOut
            ? `Checked out at ${formatClock(r.todayOut)}`
            : `Checked in at ${formatClock(r.todayIn)}`,
        ),
      // Sent as the server says it: "You're not at the shop", locked month, on leave…
      onError: (err) => setError(err.message || 'Could not record your check-in'),
    });
  };

  return (
    <Card>
      <CardBody>
        <Stack gap="sm" as="section" aria-labelledby="hr-me-check-in">
          <Inline gap="md" justify="between" align="center" flexWrap>
            <Stack gap="xs">
              <Text variant="heading4" as="h2" id="hr-me-check-in">
                Today
              </Text>
              <Inline gap="xs" align="center" flexWrap>
                <Text color="secondary" role="status">
                  {locating ? 'Getting your location…' : todayLine(s)}
                </Text>
                {s.missingCheckOut ? (
                  <Badge variant="warning" className={hrChrome.hrChip}>
                    Missing check-out
                  </Badge>
                ) : null}
              </Inline>
            </Stack>
            {s.canCheckIn ? (
              <Button
                type="button"
                variant="solid"
                size="lg"
                loading={locating || punch.isPending}
                onClick={() => void press()}
              >
                {label}
              </Button>
            ) : null}
          </Inline>
          {!s.canCheckIn && s.reason ? <Text color="secondary">{s.reason}</Text> : null}
          {locationNote ? (
            <Text variant="caption" color="secondary">
              {locationNote}
            </Text>
          ) : null}
          {error ? <Alert variant="danger">{error}</Alert> : null}
        </Stack>
      </CardBody>
    </Card>
  );
}
