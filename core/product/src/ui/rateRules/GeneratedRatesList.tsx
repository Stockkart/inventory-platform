import { useEffect, useState } from 'react';
import type { PricingRate } from '@inventory-platform/contracts';
import {
  Badge,
  Box,
  Button,
  FormField,
  Inline,
  Input,
  Stack,
  Text,
  surfaceChrome,
} from '@inventory-platform/ui-kit';
import type { RateRuleScheme } from '../../model/rateRules.types';
import { SchemeInput, type SchemeTypeCart } from '../scheme';
import { skippedReasonText } from './rateRulesDraft';

/** A rule that produced no rate, or a kept override left below cost. Server-owned shape. */
export interface SkippedRateRule {
  name: string;
  reason: string;
}

/** Terms an override changes. The price is never sent as an edit; the server reprices. */
export interface RateTermsEdit {
  discountPercent: number | null;
  scheme: RateRuleScheme | null;
}

export interface GeneratedRatesListProps {
  rates: PricingRate[];
  /** Rules that made no rate (preview / create). */
  skipped?: SkippedRateRule[];
  /** Rates left below cost by a save (PATCH response). */
  warnings?: SkippedRateRule[];
  /** From `rateRulesEdit`. Without it the list is read-only. */
  canEdit: boolean;
  /** Names queued to reset to their rule on the next save. */
  pendingReset?: string[];
  onEditTerms: (name: string, terms: RateTermsEdit) => void;
  onReset: (name: string) => void;
}

/** True for a rate the server derived from a rule (legacy hand-typed rates have no base). */
export function isRuleRate(rate: PricingRate): boolean {
  return rate.base != null;
}

function gstLabel(gstMode: string | null | undefined): string | null {
  if (gstMode === 'INCLUSIVE') return 'incl. GST';
  if (gstMode === 'EXCLUSIVE') return '+ GST';
  return null;
}

function RateTermsEditor({
  rate,
  onEditTerms,
}: {
  rate: PricingRate;
  onEditTerms: GeneratedRatesListProps['onEditTerms'];
}) {
  const serverDiscount = rate.discountPercent == null ? '' : String(rate.discountPercent);
  const [discount, setDiscount] = useState(serverDiscount);
  useEffect(() => setDiscount(serverDiscount), [serverDiscount]);
  const scheme = rate.scheme ?? null;
  const [schemeKey, setSchemeKey] = useState(0);
  const idBase = `rate-terms-${rate.name}`;

  const commitDiscount = () => {
    const trimmed = discount.trim();
    const parsed = Number(trimmed);
    // The server treats a blank term as unchanged, so a blank or bad entry goes back to the saved one.
    if (trimmed === '' || Number.isNaN(parsed) || parsed < 0 || parsed > 100) {
      setDiscount(serverDiscount);
      return;
    }
    if (trimmed === serverDiscount) return;
    onEditTerms(rate.name, { discountPercent: parsed, scheme });
  };

  const commitScheme = (next: RateRuleScheme) =>
    onEditTerms(rate.name, { discountPercent: rate.discountPercent ?? null, scheme: next });

  // Clearing is refused (the server would keep the old scheme): show the saved scheme again.
  const refuseClear = () => setSchemeKey((k) => k + 1);

  return (
    <Inline gap="sm" align="end">
      <FormField label="Discount %" htmlFor={`${idBase}-discount`}>
        <Input
          id={`${idBase}-discount`}
          type="number"
          inputMode="decimal"
          min={0}
          max={100}
          step="any"
          value={discount}
          onChange={(e) => setDiscount(e.target.value)}
          onBlur={commitDiscount}
        />
      </FormField>
      <FormField label="Scheme" htmlFor={`${idBase}-scheme`}>
        <SchemeInput
          key={schemeKey}
          id={`${idBase}-scheme`}
          schemeType={(scheme?.schemeType as SchemeTypeCart | null | undefined) ?? null}
          payFor={scheme?.schemePayFor ?? null}
          free={scheme?.schemeFree ?? null}
          percentage={scheme?.schemePercentage ?? null}
          onCommitUnits={(payFor, free) => {
            if (payFor == null && free == null) return refuseClear();
            commitScheme({ schemeType: 'FIXED_UNITS', schemePayFor: payFor, schemeFree: free });
          }}
          onCommitPercentage={(percentage) => {
            if (percentage == null) return refuseClear();
            commitScheme({ schemeType: 'PERCENTAGE', schemePercentage: percentage });
          }}
          disabled={false}
        />
        {scheme ? (
          <Text as="span" variant="caption" color="secondary">
            Schemes can&apos;t be removed by override; reset to rule instead.
          </Text>
        ) : null}
      </FormField>
    </Inline>
  );
}

/**
 * Rule-generated rates exactly as the API returns them: price, terms text, GST label and an
 * "overridden" marker. With `canEdit` a rate's discount % and scheme (never its price) can be
 * changed or reset to the rule. Nothing here works out a price.
 */
export function GeneratedRatesList({
  rates,
  skipped = [],
  warnings = [],
  canEdit,
  pendingReset = [],
  onEditTerms,
  onReset,
}: GeneratedRatesListProps) {
  return (
    <Box
      as="ul"
      className={surfaceChrome.listPlain}
      aria-label="Generated rates"
      padding="none"
      margin="none"
    >
      {rates.map((rate) => {
        const label = gstLabel(rate.gstMode);
        return (
          <Box key={rate.name} as="li" py="xs">
            <Stack gap="xs">
              <Box display="flex" align="center" justify="between" gap="sm">
                <Inline gap="xs" align="center">
                  <Text as="span" weight="semibold">
                    {rate.name}
                  </Text>
                  {rate.manual ? <Badge variant="warning">overridden</Badge> : null}
                </Inline>
                <Text as="span" className={surfaceChrome.tabularNums}>
                  {rate.price.toFixed(2)}
                  {label ? ` ${label}` : ''}
                </Text>
              </Box>
              {rate.termsText ? (
                <Text as="span" variant="caption" color="secondary">
                  {rate.termsText}
                </Text>
              ) : null}
              {canEdit ? (
                <Inline gap="sm" align="end">
                  <RateTermsEditor rate={rate} onEditTerms={onEditTerms} />
                  {rate.manual ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      aria-label={`Reset ${rate.name} to rule`}
                      onClick={() => onReset(rate.name)}
                    >
                      Reset to rule
                    </Button>
                  ) : null}
                </Inline>
              ) : null}
              {pendingReset.includes(rate.name) ? (
                <Text as="span" variant="caption" color="secondary">
                  Will reset to the rule when you save.
                </Text>
              ) : null}
            </Stack>
          </Box>
        );
      })}
      {skipped.map((item) => (
        <Box key={`skipped-${item.name}`} as="li" py="xs">
          <Text as="span" variant="caption" color="secondary">
            {item.name} not generated: {skippedReasonText(item.reason)}
          </Text>
        </Box>
      ))}
      {warnings.map((item) => (
        <Box key={`warning-${item.name}`} as="li" py="xs">
          <Text as="span" variant="caption" color="danger">
            {item.name} is {skippedReasonText(item.reason)}
          </Text>
        </Box>
      ))}
    </Box>
  );
}
