import { useState } from 'react';
import { Button, FormField, Inline, Input, Stack, Tag } from '@inventory-platform/ui-kit';
import { normaliseVoucherCode, voucherRejectionMessage } from '../checkout';
import { useValidateVoucherMutation } from '../queries/hooks';

interface VoucherFieldProps {
  applied: string[];
  onApply: (code: string) => void;
  onRemove: (code: string) => void;
  /** Rejection from the latest quote, shown under the field. */
  quoteError?: string | null;
  disabled?: boolean;
}

/** Checks a code before adding it to the cart; the discount itself comes from the quote. */
export function VoucherField({
  applied,
  onApply,
  onRemove,
  quoteError,
  disabled,
}: VoucherFieldProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
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
      ) : null}
    </Stack>
  );
}
