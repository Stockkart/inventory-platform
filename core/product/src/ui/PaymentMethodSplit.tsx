import { useCallback, useEffect, useId, useMemo, useRef } from 'react';
import type { PaymentMethod, PaymentSplit } from '@inventory-platform/contracts';
import {
  Alert,
  Badge,
  Box,
  Button,
  Grid,
  Inline,
  Input,
  Stack,
  Text,
  cn,
  productChrome,
} from '@inventory-platform/ui-kit';
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_META,
  defaultPaymentSplit,
  emptyPaymentSplit,
  formatRupees,
  isCreditMethod,
  isSingleTender,
  roundMoney,
  type Tender,
  validatePaymentSplit,
} from './paymentMethod';

export type PaymentSplitContext = 'sale' | 'purchase';

export interface PaymentMethodSplitValue {
  /** `null` until the user picks one of the 6 chips. */
  method: PaymentMethod | null;
  split: PaymentSplit;
}

export interface PaymentMethodSplitProps {
  /**
   * The bill total the split must sum to. The component handles the math; the
   * parent only needs to pass a fresh total when it changes.
   */
  total: number;
  /** Controlled value (method + per-tender amounts). */
  value: PaymentMethodSplitValue;
  onChange: (next: PaymentMethodSplitValue) => void;
  /**
   * Selling = sale (credit means "customer owes you"); Registration =
   * purchase (credit means "you owe vendor"). Controls copy only.
   */
  context: PaymentSplitContext;
  /** Optional title; defaults to "Payment". */
  title?: string;
  /** Optional intro under the title. */
  intro?: string;
  /** Disable all inputs (e.g. while a submit is in flight). */
  disabled?: boolean;
  /** When true, hide the inline validation message (parent handles errors). */
  hideError?: boolean;
}

const TENDER_BADGE_CLASS: Record<Tender, string> = {
  CASH: productChrome.tenderBadgeCash,
  ONLINE: productChrome.tenderBadgeOnline,
  CREDIT: productChrome.tenderBadgeCredit,
};

function tenderLabel(tender: Tender, context: PaymentSplitContext): string {
  if (tender === 'CASH') return 'Cash';
  if (tender === 'ONLINE') return 'Online';
  return context === 'sale' ? 'Credit (owes you)' : 'Credit (you owe)';
}

function tenderAmount(split: PaymentSplit, tender: Tender): number {
  if (tender === 'CASH') return split.cashAmount;
  if (tender === 'ONLINE') return split.onlineAmount;
  return split.creditAmount;
}

function setTenderAmount(split: PaymentSplit, tender: Tender, amount: number): PaymentSplit {
  if (tender === 'CASH') return { ...split, cashAmount: amount };
  if (tender === 'ONLINE') return { ...split, onlineAmount: amount };
  return { ...split, creditAmount: amount };
}

function parseAmountInput(raw: string): number {
  const trimmed = raw.replace(/,/g, '').trim();
  if (trimmed === '') return 0;
  const n = Number(trimmed);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}

export function PaymentMethodSplit({
  total,
  value,
  onChange,
  context,
  title,
  intro,
  disabled,
  hideError,
}: PaymentMethodSplitProps) {
  const reactId = useId();
  const safeTotal = roundMoney(total);
  const method = value.method;
  const meta = method ? PAYMENT_METHOD_META[method] : null;
  const validation = useMemo(
    () => validatePaymentSplit(method, value.split, safeTotal),
    [method, value.split, safeTotal],
  );

  const lastTotalRef = useRef<number>(safeTotal);
  useEffect(() => {
    if (lastTotalRef.current === safeTotal) return;
    const prevTotal = lastTotalRef.current;
    lastTotalRef.current = safeTotal;
    if (!method) return;
    if (isSingleTender(method)) {
      const next = defaultPaymentSplit(method, safeTotal);
      if (
        next.cashAmount !== value.split.cashAmount ||
        next.onlineAmount !== value.split.onlineAmount ||
        next.creditAmount !== value.split.creditAmount
      ) {
        onChange({ method, split: next });
      }
      return;
    }
    const currentSum = roundMoney(
      value.split.cashAmount + value.split.onlineAmount + value.split.creditAmount,
    );
    if (currentSum === 0 || prevTotal === 0 || currentSum === safeTotal) {
      onChange({ method, split: defaultPaymentSplit(method, safeTotal) });
      return;
    }
    const ratio = safeTotal / currentSum;
    const scaled: PaymentSplit = {
      cashAmount: roundMoney(value.split.cashAmount * ratio),
      onlineAmount: roundMoney(value.split.onlineAmount * ratio),
      creditAmount: roundMoney(value.split.creditAmount * ratio),
    };
    const drift = roundMoney(
      safeTotal - (scaled.cashAmount + scaled.onlineAmount + scaled.creditAmount),
    );
    if (drift !== 0) {
      const credit = PAYMENT_METHOD_META[method].creditTender;
      if (credit) {
        scaled.creditAmount = roundMoney(scaled.creditAmount + drift);
      } else if (scaled.cashAmount > 0) {
        scaled.cashAmount = roundMoney(scaled.cashAmount + drift);
      } else {
        scaled.onlineAmount = roundMoney(scaled.onlineAmount + drift);
      }
    }
    onChange({ method, split: scaled });
    // We intentionally only react to total changes here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeTotal]);

  const handleMethodChange = useCallback(
    (next: PaymentMethod) => {
      if (next === method) return;
      onChange({ method: next, split: defaultPaymentSplit(next, safeTotal) });
    },
    [method, onChange, safeTotal],
  );

  const handleLegChange = useCallback(
    (tender: Tender, raw: string) => {
      if (!method) return;
      const parsed = parseAmountInput(raw);
      const amount = Number.isFinite(parsed) ? roundMoney(parsed) : 0;
      if (isSingleTender(method)) {
        onChange({
          method,
          split: setTenderAmount(emptyPaymentSplit(), tender, amount),
        });
        return;
      }
      const tenders = PAYMENT_METHOD_META[method].tenders;
      const otherTender = tenders.find((t) => t !== tender);
      let next: PaymentSplit = setTenderAmount(
        emptyPaymentSplit(),
        tender,
        Math.min(amount, safeTotal),
      );
      if (otherTender) {
        next = setTenderAmount(
          next,
          otherTender,
          roundMoney(
            Math.max(0, safeTotal - next.cashAmount - next.onlineAmount - next.creditAmount),
          ),
        );
      }
      onChange({ method, split: next });
    },
    [method, onChange, safeTotal],
  );

  const showError = !validation.ok && !hideError && method != null && safeTotal > 0;
  const showSplitInputs = method != null && !isSingleTender(method);
  const summaryTenders: readonly Tender[] = meta?.tenders ?? [];
  const creditHighlight = method != null && isCreditMethod(method) && value.split.creditAmount > 0;

  return (
    <Stack
      gap="sm"
      padding="md"
      border
      rounded="lg"
      bg="elevated"
      aria-describedby={`${reactId}-summary`}
    >
      <Stack gap="xs">
        <Inline gap="xs" align="center">
          <Text variant="heading4" weight="semibold">
            {title ?? 'Payment'}
          </Text>
          <Text aria-hidden className={productChrome.requiredMark}>
            *
          </Text>
        </Inline>
        {intro != null && intro !== '' ? (
          <Text variant="caption" color="secondary">
            {intro}
          </Text>
        ) : null}
      </Stack>

      <Inline justify="between" align="end">
        <Text variant="caption" color="secondary" className={productChrome.sectionLabel}>
          Bill total
        </Text>
        <Text weight="semibold" className={productChrome.tabularNums}>
          {formatRupees(safeTotal)}
        </Text>
      </Inline>

      <Inline gap="xs" flexWrap role="radiogroup" aria-label="Payment method" aria-required="true">
        {PAYMENT_METHODS.map((m) => {
          const mMeta = PAYMENT_METHOD_META[m];
          const active = m === method;
          return (
            <Button
              key={m}
              type="button"
              role="radio"
              aria-checked={active}
              variant={active ? 'solid' : 'outline'}
              size="sm"
              onClick={() => handleMethodChange(m)}
              disabled={disabled}
            >
              {mMeta.label}
            </Button>
          );
        })}
      </Inline>

      {method == null ? (
        <Box padding="sm" border rounded="md" className={productChrome.paymentPickHint}>
          <Text variant="caption" color="secondary">
            Pick a payment method to continue.
          </Text>
        </Box>
      ) : showSplitInputs ? (
        <Grid columns={meta?.tenders.length === 2 ? 2 : 1} gap="sm">
          {meta!.tenders.map((tender) => {
            const inputId = `${reactId}-${tender.toLowerCase()}`;
            return (
              <Stack key={tender} gap="xs">
                <Badge variant="neutral">
                  <Text
                    as="span"
                    className={cn(productChrome.tenderBadge, TENDER_BADGE_CLASS[tender])}
                  >
                    {tender === 'CASH' ? 'Cash' : tender === 'ONLINE' ? 'Online' : 'Credit'}
                  </Text>
                </Badge>
                <Box position="relative" width="full">
                  <Text aria-hidden className={productChrome.tenderPrefix}>
                    ₹
                  </Text>
                  <Input
                    id={inputId}
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    className={productChrome.tenderInput}
                    value={
                      tenderAmount(value.split, tender) === 0
                        ? ''
                        : String(tenderAmount(value.split, tender))
                    }
                    onChange={(ev) => handleLegChange(tender, ev.target.value)}
                    placeholder="0.00"
                    disabled={disabled || safeTotal <= 0}
                    aria-label={tenderLabel(tender, context)}
                  />
                </Box>
              </Stack>
            );
          })}
        </Grid>
      ) : null}

      {method != null ? (
        <Stack
          id={`${reactId}-summary`}
          gap="xs"
          padding="sm"
          border
          rounded="md"
          bg="muted"
          aria-live="polite"
          className={creditHighlight ? productChrome.paymentCreditSummary : undefined}
        >
          {summaryTenders.map((tender) => (
            <Inline key={tender} justify="between" align="end">
              <Text variant="caption" color="secondary">
                {tender === 'CREDIT'
                  ? context === 'sale'
                    ? 'On credit · owes you'
                    : 'On credit · you owe'
                  : tenderLabel(tender, context)}
              </Text>
              <Text
                weight="semibold"
                className={
                  creditHighlight && tender === 'CREDIT'
                    ? productChrome.tenderCreditHighlight
                    : productChrome.tabularNums
                }
              >
                {formatRupees(tenderAmount(value.split, tender))}
              </Text>
            </Inline>
          ))}
        </Stack>
      ) : null}

      {showError && validation.message ? (
        <Alert variant="danger">{validation.message}</Alert>
      ) : null}
    </Stack>
  );
}
