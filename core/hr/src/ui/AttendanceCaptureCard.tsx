import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardBody,
  FormField,
  Inline,
  Input,
  SegmentedControl,
  Stack,
  Switch,
  Text,
} from '@inventory-platform/ui-kit';
import { useNotify } from '@inventory-platform/session';
import {
  DEFAULT_RADIUS_METRES,
  MAX_RADIUS_METRES,
  MIN_RADIUS_METRES,
  type AttendanceCaptureChange,
  type HrSettingsResponse,
  type OutsideAction,
} from '@inventory-platform/hr/types';
import { useUpdateHrSettingsMutation } from '../queries/hooks';
import { getCurrentPosition } from './currentPosition';

interface Draft {
  selfCheckIn: boolean;
  locationCheck: boolean;
  radius: string;
  outsideAction: OutsideAction;
}

const OUTSIDE_OPTIONS: { value: OutsideAction; label: string }[] = [
  { value: 'BLOCK', label: 'Block' },
  { value: 'FLAG', label: 'Allow and flag' },
];

function draftFrom(s: HrSettingsResponse): Draft {
  const c = s.attendanceCapture;
  return {
    selfCheckIn: c?.selfCheckIn ?? false,
    locationCheck: c?.locationCheck ?? false,
    radius: String(c?.radiusMetres ?? DEFAULT_RADIUS_METRES),
    outsideAction: c?.outsideAction ?? 'BLOCK',
  };
}

/** Whole metres within the backend limits, else null. */
function radiusOf(text: string): number | null {
  if (!/^\d{1,4}$/.test(text.trim())) return null;
  const m = Number(text);
  return m >= MIN_RADIUS_METRES && m <= MAX_RADIUS_METRES ? m : null;
}

export interface AttendanceCaptureCardProps {
  settings: HrSettingsResponse;
  readOnly: boolean;
}

/**
 * "Attendance" card of HR settings (R1, R3): self check-in, location check, the shop's location
 * and radius, and what happens outside it. Saved on its own, as a partial settings update.
 */
export function AttendanceCaptureCard({ settings, readOnly }: AttendanceCaptureCardProps) {
  const [draft, setDraft] = useState<Draft>(() => draftFrom(settings));
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  /** Accuracy (m) of the location saved in this visit; the coordinates are not kept. */
  const [savedAccuracy, setSavedAccuracy] = useState<number | null>(null);
  const save = useUpdateHrSettingsMutation();

  useEffect(() => setDraft(draftFrom(settings)), [settings]);

  // A first save would also store the default working rules, so those come first.
  const disabled = readOnly || !settings.saved || save.isPending || locating;
  const hasShop = settings.attendanceCapture?.shopLat != null;
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const submit = (extra: AttendanceCaptureChange, onDone: () => void) => {
    const radiusMetres = radiusOf(draft.radius);
    if (draft.locationCheck && radiusMetres == null) {
      setError(`Radius must be a whole number from ${MIN_RADIUS_METRES} to 1,000 metres`);
      return;
    }
    if (draft.locationCheck && !hasShop && extra.shopLat == null) {
      setError('Set the shop location first: press "Use my current location" in the shop.');
      return;
    }
    setError(null);
    save.mutate(
      {
        attendanceCapture: {
          selfCheckIn: draft.selfCheckIn,
          locationCheck: draft.selfCheckIn && draft.locationCheck,
          radiusMetres,
          outsideAction: draft.outsideAction,
          ...extra,
        },
        revision: settings.revision ?? null,
      },
      { onSuccess: onDone, onError: (err) => setError(err.message || 'Could not save') },
    );
  };

  const takeShopLocation = async () => {
    setError(null);
    setLocating(true);
    const fix = await getCurrentPosition();
    setLocating(false);
    if (!fix.ok) {
      setError(fix.message);
      return;
    }
    const accuracy = Math.round(fix.accuracy);
    submit({ shopLat: fix.lat, shopLng: fix.lng }, () => {
      setSavedAccuracy(accuracy);
      useNotify.success(`Shop location saved (±${accuracy} m)`);
    });
  };

  return (
    <Card>
      <CardBody>
        <Stack gap="md">
          <Stack gap="xs">
            <Text variant="heading4" as="h3">
              Attendance
            </Text>
            <Text variant="caption" color="muted">
              Let staff check in and out on My HR. Marking by hand always works.
            </Text>
          </Stack>
          {!settings.saved && !readOnly ? (
            <Text variant="caption" color="secondary">
              Save the working rules first.
            </Text>
          ) : null}

          <Switch
            label="Self check-in"
            checked={draft.selfCheckIn}
            disabled={disabled}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                selfCheckIn: e.target.checked,
                locationCheck: e.target.checked && d.locationCheck,
              }))
            }
          />
          <Switch
            label="Location check (only inside the shop)"
            id="hr-location-check"
            checked={draft.selfCheckIn && draft.locationCheck}
            disabled={disabled || !draft.selfCheckIn}
            onChange={(e) => set('locationCheck', e.target.checked)}
          />

          {draft.selfCheckIn && draft.locationCheck ? (
            <Stack gap="md">
              <Inline gap="sm" align="center" flexWrap>
                {readOnly ? null : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    loading={locating}
                    disabled={disabled}
                    onClick={() => void takeShopLocation()}
                  >
                    Use my current location
                  </Button>
                )}
                <Text variant="caption" color="secondary" role="status">
                  {locating
                    ? 'Getting your location…'
                    : savedAccuracy != null
                    ? `Shop location saved (±${savedAccuracy} m)`
                    : hasShop
                    ? 'Location set'
                    : 'Shop location not set. Stand in the shop and press the button.'}
                </Text>
              </Inline>
              <FormField
                label="Radius (metres)"
                id="hr-radius"
                hint={`How far from the shop counts as inside, ${MIN_RADIUS_METRES}–1,000 m.`}
              >
                <Input
                  id="hr-radius"
                  type="number"
                  inputMode="numeric"
                  min={MIN_RADIUS_METRES}
                  max={MAX_RADIUS_METRES}
                  value={draft.radius}
                  aria-invalid={radiusOf(draft.radius) == null}
                  disabled={disabled}
                  onChange={(e) => set('radius', e.target.value)}
                />
              </FormField>
              <Stack gap="xs">
                <Text variant="label" as="span">
                  If someone is outside the shop
                </Text>
                <SegmentedControl
                  aria-label="If someone is outside the shop"
                  value={draft.outsideAction}
                  options={OUTSIDE_OPTIONS}
                  disabled={disabled}
                  onChange={(v) => set('outsideAction', v)}
                />
              </Stack>
              <Text variant="caption" color="muted">
                Phone locations can be faked. This stops casual misuse, not a determined cheat.
              </Text>
            </Stack>
          ) : null}

          {error ? <Alert variant="danger">{error}</Alert> : null}

          {readOnly ? null : (
            <Inline gap="sm" justify="end">
              <Button
                type="button"
                variant="solid"
                loading={save.isPending}
                disabled={disabled}
                onClick={() => submit({}, () => useNotify.success('Attendance settings saved'))}
              >
                Save attendance
              </Button>
            </Inline>
          )}
        </Stack>
      </CardBody>
    </Card>
  );
}
