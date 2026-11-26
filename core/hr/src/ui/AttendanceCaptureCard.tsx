import { useEffect, useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router';
import {
  Alert,
  Button,
  Card,
  CardBody,
  FormField,
  Inline,
  Input,
  Link,
  SegmentedControl,
  Stack,
  Switch,
  Text,
} from '@inventory-platform/ui-kit';
import { useNotify } from '@inventory-platform/session';
import {
  ATTENDANCE_APP_PRIVACY_PATH,
  DEFAULT_RADIUS_METRES,
  MAX_RADIUS_METRES,
  MIN_RADIUS_METRES,
  PAIRED_EMPLOYEES_PATH,
  type AttendanceCaptureChange,
  type HrSettingsResponse,
  type OutsideAction,
} from '@inventory-platform/hr/types';
import { useUpdateHrSettingsMutation } from '../queries/hooks';
import { getCurrentPosition } from './currentPosition';

interface Draft {
  selfCheckIn: boolean;
  biometricApp: boolean;
  locationCheck: boolean;
  radius: string;
  outsideAction: OutsideAction;
}

const OUTSIDE_OPTIONS: { value: OutsideAction; label: string }[] = [
  { value: 'BLOCK', label: 'Block' },
  { value: 'FLAG', label: 'Allow and flag' },
];

/** R1.6: shown while the app is on and Location check is off; it never blocks saving. */
export const BIOMETRIC_NO_LOCATION_WARNING =
  'Workers can check in from anywhere. Turn on Location check to limit check-in to the shop.';

function draftFrom(s: HrSettingsResponse): Draft {
  const c = s.attendanceCapture;
  return {
    selfCheckIn: c?.selfCheckIn ?? false,
    biometricApp: c?.biometricApp ?? false,
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

/** "1 employee has a paired phone" / "N employees have a paired phone" (R1.9). */
function pairedCountText(count: number): string {
  return count === 1 ? '1 employee has a paired phone' : `${count} employees have a paired phone`;
}

export interface AttendanceCaptureCardProps {
  settings: HrSettingsResponse;
  readOnly: boolean;
}

/**
 * "Attendance" card of HR settings (R1, R3; HR-module R1): self check-in, biometric app
 * check-in, location check, the shop's location and radius, and what happens outside it. Saved
 * on its own, as a partial settings update.
 */
export function AttendanceCaptureCard({ settings, readOnly }: AttendanceCaptureCardProps) {
  const [draft, setDraft] = useState<Draft>(() => draftFrom(settings));
  const [locating, setLocating] = useState(false);
  /** Accuracy (m) of the location saved in this visit; the coordinates are not kept. */
  const [savedAccuracy, setSavedAccuracy] = useState<number | null>(null);
  const save = useUpdateHrSettingsMutation();
  const navigate = useNavigate();

  useEffect(() => setDraft(draftFrom(settings)), [settings]);

  // A first save would also store the default working rules, so those come first.
  const disabled = readOnly || !settings.saved || save.isPending || locating;
  const hasShop = settings.attendanceCapture?.shopLat != null;
  // The location check limits both My HR check-in and app punches (D5), so it is available
  // while either is on; it is saved as off when neither is.
  const anyCheckIn = draft.selfCheckIn || draft.biometricApp;
  const locationOn = anyCheckIn && draft.locationCheck;
  const pairedCount = settings.pairedEmployeeCount ?? 0;
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  /** Turning a check-in switch off clears Location check once neither check-in is on. */
  const setCheckIn = (key: 'selfCheckIn' | 'biometricApp', on: boolean) =>
    setDraft((d) => {
      const next = { ...d, [key]: on };
      return { ...next, locationCheck: (next.selfCheckIn || next.biometricApp) && d.locationCheck };
    });

  const submit = (extra: AttendanceCaptureChange, onDone: () => void) => {
    const radiusMetres = radiusOf(draft.radius);
    if (locationOn && radiusMetres == null) {
      useNotify.error(`Radius must be a whole number from ${MIN_RADIUS_METRES} to 1,000 metres`);
      return;
    }
    if (locationOn && !hasShop && extra.shopLat == null) {
      useNotify.error('Set the shop location first: press "Use my current location" in the shop.');
      return;
    }
    save.mutate(
      {
        attendanceCapture: {
          selfCheckIn: draft.selfCheckIn,
          biometricApp: draft.biometricApp,
          locationCheck: locationOn,
          radiusMetres,
          outsideAction: draft.outsideAction,
          ...extra,
        },
        revision: settings.revision ?? null,
      },
      { onSuccess: onDone, onError: (err) => useNotify.error(err.message || 'Could not save') },
    );
  };

  const takeShopLocation = async () => {
    setLocating(true);
    const fix = await getCurrentPosition();
    setLocating(false);
    if (!fix.ok) {
      useNotify.error(fix.message);
      return;
    }
    const accuracy = Math.round(fix.accuracy);
    submit({ shopLat: fix.lat, shopLng: fix.lng }, () => {
      setSavedAccuracy(accuracy);
      useNotify.success(`Shop location saved (±${accuracy} m)`);
    });
  };

  /** In-app navigation on a real link, so the address is visible and can be opened in a new tab. */
  const go = (path: string) => (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    navigate(path);
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
              Let staff check in and out on My HR or with the Attendance app. Marking by hand always
              works.
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
            onChange={(e) => setCheckIn('selfCheckIn', e.target.checked)}
          />
          <Switch
            label="Location check (only inside the shop)"
            id="hr-location-check"
            checked={locationOn}
            disabled={disabled || !anyCheckIn}
            onChange={(e) => set('locationCheck', e.target.checked)}
          />
          <Stack gap="xs">
            <Switch
              label="Biometric app check-in"
              id="hr-biometric-app"
              checked={draft.biometricApp}
              disabled={disabled}
              onChange={(e) => setCheckIn('biometricApp', e.target.checked)}
            />
            <Text variant="caption" color="muted">
              Workers check in on the Attendance app with their phone’s fingerprint or face. Pair
              each phone from the employee’s page.{' '}
              <Link href={ATTENDANCE_APP_PRIVACY_PATH} onClick={go(ATTENDANCE_APP_PRIVACY_PATH)}>
                What the app records
              </Link>
            </Text>
            {draft.biometricApp && !locationOn ? (
              <Alert variant="warning" role="status">
                {BIOMETRIC_NO_LOCATION_WARNING}
              </Alert>
            ) : null}
            <Text variant="caption" color="secondary">
              <Link href={PAIRED_EMPLOYEES_PATH} onClick={go(PAIRED_EMPLOYEES_PATH)}>
                {pairedCountText(pairedCount)}
              </Link>
            </Text>
          </Stack>

          {locationOn ? (
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
