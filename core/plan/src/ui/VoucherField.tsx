import { useState } from 'react';
import { Button, FormField, Inline, Input, Stack, Tag, Text } from '@inventory-platform/ui-kit';
import type { QuoteResponse } from '@inventory-platform/plan/types';
import { normaliseVoucherCode, voucherRejectionMessage } from '../checkout';
import { useValidateVoucherMutation } from '../queries/hooks';
import { formatRupees } from './planPricing';

interface VoucherFieldProps {
  applied: string[];
  onApply: (code: string) => void;
  onRemove: (code: string) => void;
  /** Rejection from the latest quote, shown under the field. */
  quoteError?: string | null;
  /** Latest quote: the discount a plan voucher gives is read from its lines, never computed. */
  quote?: QuoteResponse;
  disabled?: boolean;
}

/** Checks a code before adding it to the cart; the discount itself comes from the quote. */
export function VoucherField({
  applied,
  onApply,
  onRemove,
  quoteError,
  quote,
  disabled,
}: VoucherFieldProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  /** Plan name per applied plan-target code, from the check response. */
  const [planNames, setPlanNames] = useState<Record<string, string>>({});
  const validate = useValidateVoucherMutation();

  const apply = async () => {
    const code = normaliseVoucherCode(input);
    if (!code) return;
    if (applied.includes(code)) {
      setError('This voucher is already applied.');
      return;
    }
    setError(null);
    try {
      const check = await validate.mutateAsync(code);
      if (!check.valid) {
        setError(voucherRejectionMessage(check.reason));
        return;
      }
      if (check.target === 'PLAN' && check.planName) {
        const planName = check.planName;
        setPlanNames((names) => ({ ...names, [code]: planName }));
      }
      onApply(code);
      setInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not check this voucher');
    }
  };

  return (
    <Stack gap="sm">
      <FormField
        label="Voucher code"
        htmlFor="plan-voucher-code"
        error={error ?? quoteError ?? undefined}
      >
        <Inline gap="sm" align="center">
          <Input
            id="plan-voucher-code"
            value={input}
            placeholder="Enter code"
            autoComplete="off"
            disabled={disabled}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void apply();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => void apply()}
            loading={validate.isPending}
            disabled={disabled || !input.trim()}
          >
            Apply
          </Button>
        </Inline>
      </FormField>
      {applied.length > 0 ? (
        <Stack gap="xs">
          <Inline gap="sm">
            {applied.map((code) => (
              <Tag
                key={code}
                variant="success"
                onRemove={disabled ? undefined : () => onRemove(code)}
                removeLabel={`Remove voucher ${code}`}
              >
                {code}
              </Tag>
            ))}
          </Inline>
          {applied.map((code) => {
            const planName = planNames[code];
            if (!planName) return null;
            const discount = quote?.items.find(
              (item) => item.voucherCode === code && item.discount > 0,
            )?.discount;
            return (
              <Text key={code} variant="caption" color="success">
                {discount != null
                  ? `${formatRupees(discount)} off ${planName}`
                  : `Applies to ${planName}`}
              </Text>
            );
          })}
        </Stack>
      ) : null}
    </Stack>
  );
}
