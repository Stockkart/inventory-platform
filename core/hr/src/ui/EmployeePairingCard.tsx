import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Alert,
  Button,
  Card,
  CardBody,
  ConfirmDialog,
  Inline,
  Stack,
  Text,
} from '@inventory-platform/ui-kit';
import { useNotify } from '@inventory-platform/session';
import { pairingQrPayload } from '@inventory-platform/attendance-protocol';
import {
  PAIRING_CODE_TTL_MINUTES,
  formatClock,
  formatDate,
  type EmployeeResponse,
  type PairingCodeResponse,
  type PairingStateResponse,
} from '@inventory-platform/hr/types';
import { useHrAccess } from '../access/useHrAccess';
import { useCreatePairingCodeMutation, usePairingQuery, useUnpairMutation } from '../queries/hooks';

/** While a code is on screen, re-read the pairing this often to notice the phone pairing. */
const PAIRED_POLL_MS = 10_000;

const IST_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** ISO instant → the calendar date (`yyyy-MM-dd`) it falls on in Indian time. */
function istDate(instant: string): string {
  const d = new Date(instant);
  return Number.isNaN(d.getTime()) ? instant.slice(0, 10) : IST_DATE.format(d);
}

/**
 * The Paired line of R2.2: "Paired · Redmi Note 11 · since 3 Apr 2025 · last punch today 09:12",
 * ending "no punches yet" when the phone has not punched. Exported for tests.
 */
export function pairedLine(state: PairingStateResponse, now: Date = new Date()): string {
  const parts = ['Paired', state.phoneModel || 'Unknown phone'];
  if (state.pairedAt) parts.push(`since ${formatDate(istDate(state.pairedAt))}`);
  if (!state.lastPunchAt) {
    parts.push('no punches yet');
  } else {
    const day = istDate(state.lastPunchAt);
    const when =
      day === IST_DATE.format(now)
        ? `today ${formatClock(state.lastPunchAt)}`
        : `${formatDate(day)} ${formatClock(state.lastPunchAt)}`;
    parts.push(`last punch ${when}`);
  }
  return parts.join(' · ');
}

/** `ABCDEFGH` → `ABCD-EFGH`: the 8 characters in two groups so they are easier to read out. */
export function groupedCode(code: string): string {
  return code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}

/** Whole seconds until `expiresAt`, never negative. */
export function secondsLeft(expiresAt: string, now: Date = new Date()): number {
  const end = new Date(expiresAt).getTime();
  if (Number.isNaN(end)) return 0;
  return Math.max(0, Math.floor((end - now.getTime()) / 1000));
}

/** 870 → "14:30". */
export function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Ticks once a second while `active`, giving the current time. */
function useClock(active: boolean): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!active) return;
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, [active]);
  return now;
}

export interface PairingPanelProps {
  /** The pairing as the server last answered; undefined while loading. */
  state: PairingStateResponse | undefined;
  loading: boolean;
  error: Error | null;
  /** Re-read the pairing (used while a code is shown, to notice the phone pairing). */
  refetch: () => unknown;
  /** "Pair a phone": asks the server for a fresh code (R2.3). */
  createCode: () => Promise<PairingCodeResponse>;
  creating: boolean;
  /** "Unpair phone" (R2.12); omitted when the viewer may not unpair (My HR). */
  unpair?: () => Promise<unknown>;
  unpairing?: boolean;
  /** False for an exited employee: the state is shown but no new code can be made. */
  canPair: boolean;
  /** Second-person wording on My HR ("your phone") vs. third-person on an employee's page. */
  self?: boolean;
}

/**
 * The Attendance app section (R2.2–R2.3, R2.10, R2.12): the pairing state, "Pair a phone" with
 * the QR code, the 8 characters and a 15-minute countdown, and "Unpair phone". The pairing code's
 * plaintext lives only in this component's state while it is on screen.
 */
export function PairingPanel({
  state,
  loading,
  error,
  refetch,
  createCode,
  creating,
  unpair,
  unpairing = false,
  canPair,
  self = false,
}: PairingPanelProps) {
  const [code, setCode] = useState<PairingCodeResponse | null>(null);
  // `pairedAt` when the code was made: a different value later means the new phone has paired.
  const pairedAtBefore = useRef<string | null>(null);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [unpairOpen, setUnpairOpen] = useState(false);
  const now = useClock(code != null);
  const left = code ? secondsLeft(code.expiresAt, now) : 0;
  const expired = code != null && left === 0;
  const paired = state?.state === 'PAIRED';

  // While the code is valid, re-read the pairing so the card shows Paired as soon as it happens.
  useEffect(() => {
    if (!code || expired) return;
    const id = window.setInterval(() => void refetch(), PAIRED_POLL_MS);
    return () => window.clearInterval(id);
  }, [code, expired, refetch]);

  useEffect(() => {
    if (!code || !paired) return;
    if ((state?.pairedAt ?? null) !== pairedAtBefore.current) {
      setCode(null);
      useNotify.success(self ? 'Your phone is paired' : 'Phone paired');
    }
  }, [code, paired, state?.pairedAt, self]);

  const makeCode = async () => {
    setReplaceOpen(false);
    pairedAtBefore.current = state?.pairedAt ?? null;
    try {
      setCode(await createCode());
    } catch (err) {
      useNotify.error(err instanceof Error && err.message ? err.message : 'Could not make a code');
    }
  };

  const onPairClick = () => {
    if (paired) setReplaceOpen(true);
    else void makeCode();
  };

  const doUnpair = async () => {
    if (!unpair) return;
    try {
      await unpair();
      setUnpairOpen(false);
      setCode(null);
      useNotify.success('Phone unpaired');
    } catch (err) {
      setUnpairOpen(false);
      useNotify.error(err instanceof Error && err.message ? err.message : 'Could not unpair');
    }
  };

  const phone = self ? 'your phone' : 'the phone';
  const pending = state?.pendingCode && !code ? state.pendingCode : null;

  return (
    <Card>
      <CardBody>
        <Stack gap="sm" as="section" aria-labelledby="hr-pairing-heading">
          <Inline gap="sm" justify="between" flexWrap>
            <Stack gap="xs">
              <Text variant="heading4" as="h3" id="hr-pairing-heading">
                Attendance app
              </Text>
              <Text variant="caption" color="muted">
                {self
                  ? 'Pair your own phone to check in with your fingerprint or face.'
                  : 'A paired phone checks the worker in with their fingerprint or face.'}
              </Text>
            </Stack>
            {canPair && !loading && !error ? (
              <Inline gap="sm" flexWrap>
                {paired && unpair ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setUnpairOpen(true)}
                    disabled={unpairing || creating}
                  >
                    Unpair phone
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant={paired ? 'outline' : 'solid'}
                  size="sm"
                  onClick={onPairClick}
                  loading={creating}
                  disabled={unpairing}
                >
                  Pair a phone
                </Button>
              </Inline>
            ) : null}
          </Inline>

          {error ? <Alert variant="danger">{error.message}</Alert> : null}
          {loading ? (
            <Text color="muted">Loading…</Text>
          ) : state ? (
            <Text role="status">{paired ? pairedLine(state, now) : 'Not paired'}</Text>
          ) : null}

          {pending && secondsLeft(pending.expiresAt, now) > 0 ? (
            <Text variant="caption" color="muted">
              A pairing code made earlier is still valid until {formatClock(pending.expiresAt)}.
              "Pair a phone" makes a new one and cancels it.
            </Text>
          ) : null}

          {code ? (
            !expired ? (
              <Stack gap="sm" aria-label="Pairing code">
                <Text color="secondary">
                  {`On ${phone}, open the Attendance app and scan this code or type the ${code.code.length} characters.`}
                </Text>
                <Inline gap="lg" align="center" flexWrap>
                  <QRCodeSVG
                    value={pairingQrPayload(code.code)}
                    size={192}
                    aria-label="QR code for pairing"
                    role="img"
                  />
                  <Stack gap="xs">
                    <Text variant="caption" color="muted">
                      Code
                    </Text>
                    <Text
                      as="code"
                      variant="heading3"
                      weight="semibold"
                      style={{ fontFamily: 'monospace', letterSpacing: '0.1em' }}
                      data-testid="pairing-code"
                    >
                      {groupedCode(code.code)}
                    </Text>
                    <Text variant="caption" color="muted" role="timer">
                      Expires in {formatCountdown(left)}
                    </Text>
                  </Stack>
                </Inline>
                {paired ? (
                  <Text variant="caption" color="muted">
                    The old phone stays paired until the new one finishes pairing.
                  </Text>
                ) : null}
              </Stack>
            ) : (
              <Alert variant="warning">
                This code has expired after {PAIRING_CODE_TTL_MINUTES} minutes. Tap "Pair a phone"
                for a new one.
              </Alert>
            )
          ) : null}
        </Stack>
      </CardBody>

      <ConfirmDialog
        open={replaceOpen}
        title="Replace the old phone?"
        message={
          <Text>
            {state?.phoneModel ? `${state.phoneModel} is` : 'A phone is'} already paired. It stays
            paired until the new phone finishes pairing, then it is unpaired and its punches are
            refused.
          </Text>
        }
        confirmLabel="Replace"
        cancelLabel="Keep the old phone"
        loading={creating}
        onConfirm={makeCode}
        onCancel={() => setReplaceOpen(false)}
      />
      <ConfirmDialog
        open={unpairOpen}
        title="Unpair this phone?"
        message={
          <Text>
            {state?.phoneModel ? `${state.phoneModel} will` : 'The phone will'} no longer be able to
            check in. The next punch from it is refused and the app returns to its pairing screen.
          </Text>
        }
        confirmLabel="Unpair"
        cancelLabel="Keep it paired"
        loading={unpairing}
        onConfirm={doUnpair}
        onCancel={() => setUnpairOpen(false)}
      />
    </Card>
  );
}

export interface EmployeePairingCardProps {
  employee: EmployeeResponse;
}

/**
 * Attendance app section of an employee's page (R2.1): shown to ADD_EDIT_EMPLOYEES only, nothing
 * at all for anyone else. Pairing, replacing and unpairing go through the manager endpoints.
 */
export function EmployeePairingCard({ employee }: EmployeePairingCardProps) {
  const { can } = useHrAccess();
  const allowed = can('ADD_EDIT_EMPLOYEES');
  const pairing = usePairingQuery(employee.id, allowed);
  const create = useCreatePairingCodeMutation();
  const unpair = useUnpairMutation();
  if (!allowed) return null;

  return (
    <PairingPanel
      state={pairing.data}
      loading={pairing.isLoading}
      error={pairing.error}
      refetch={pairing.refetch}
      createCode={() => create.mutateAsync(employee.id)}
      creating={create.isPending}
      unpair={() => unpair.mutateAsync(employee.id)}
      unpairing={unpair.isPending}
      // An exited employee cannot be paired (the server refuses the claim, R2.14).
      canPair={employee.status !== 'EXITED'}
    />
  );
}
