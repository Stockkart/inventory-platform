import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useBlocker } from 'react-router';
import { Plus, X } from 'lucide-react';
import { ApiError, isApiError } from '@inventory-platform/api-client';
import { useNotify } from '@inventory-platform/session';
import {
  Alert,
  Badge,
  Box,
  Button,
  CenteredLoader,
  FormField,
  IconButton,
  Inline,
  Input,
  Select,
  Stack,
  Text,
  surfaceChrome,
} from '@inventory-platform/ui-kit';
import {
  useRateRulesPreviewQuery,
  useRateRulesQuery,
  useUpdateRateRulesMutation,
} from '../../queries/rateRules.queries';
import type {
  RateRule,
  RateRuleBase,
  RateRulePreviewRate,
  RateRuleScheme,
  RateRulesPreviewRequest,
  RateRulesPreviewResponse,
  RateRulesResponse,
} from '../../model/rateRules.types';
import { SchemeInput, type SchemeTypeCart } from '../scheme';
import { gstLabel } from './GeneratedRatesList';
import {
  baseLabel,
  draftFromRules,
  draftsEqual,
  emptyRule,
  schemeText,
  skippedReasonText,
  toPreviewRules,
  toRules,
  type RateRuleDraft,
  type RateRulesDraft,
} from '../../lib/rateRulesDraft';

const UNSAVED_PROMPT = 'You have unsaved rate rules changes. Leave without saving?';
const PREVIEW_DEBOUNCE_MS = 400;

/**
 * Raw inputs for the sample on each rule. They are sent to the preview endpoint as-is; the
 * server works out every rate, so nothing here is derived from them.
 */
const SAMPLE_INPUTS: RateRulesPreviewRequest = {
  maximumRetailPrice: 100,
  priceToRetail: 80,
  sellingPrice: 90,
  costPrice: 60,
  costPriceIncludesTax: false,
  sgst: '2.5',
  cgst: '2.5',
};

function saveErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const fieldErrors = err.errors ? Object.values(err.errors).flat() : [];
    return fieldErrors.join('; ') || err.message || 'Could not save the rate rules';
  }
  return 'Could not save the rate rules';
}

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

interface SectionHeaderProps {
  children?: ReactNode;
}

function SectionHeader({ children }: SectionHeaderProps) {
  return (
    <Box className={surfaceChrome.invoiceSettingsHeader}>
      <Box className={surfaceChrome.invoiceSettingsHeaderText}>
        <Text as="h2" className={surfaceChrome.invoiceSettingsTitle}>
          Rate rules
        </Text>
        <Text as="p" className={surfaceChrome.invoiceSettingsSubtitle}>
          Named rates built from a base price, a discount and an optional scheme. The rates and
          their terms are worked out by the server when stock is registered.
        </Text>
      </Box>
      {children}
    </Box>
  );
}

/** One rule's sample, as the preview endpoint returned it: a rate, or the reason it was skipped. */
interface RuleSampleValue {
  rate?: RateRulePreviewRate;
  skippedReason?: string;
}

/** Looks up each rule's sample by name. Unnamed or unmatched rules have none. */
function sampleLookup(
  data: RateRulesPreviewResponse | undefined,
): (name: string) => RuleSampleValue | undefined {
  return (name) => {
    const key = name.trim();
    if (!data || key === '') return undefined;
    const rate = data.rates.find((r) => r.name === key);
    if (rate) return { rate };
    const skipped = data.skipped.find((r) => r.name === key);
    return skipped ? { skippedReason: skipped.reason } : undefined;
  };
}

function SampleCaption() {
  return (
    <Text as="p" variant="caption" color="secondary" className={surfaceChrome.invoiceToggleHint}>
      Each rule shows its rate for a product with MRP {SAMPLE_INPUTS.maximumRetailPrice}, PTR{' '}
      {SAMPLE_INPUTS.priceToRetail}, selling price {SAMPLE_INPUTS.sellingPrice} and cost{' '}
      {SAMPLE_INPUTS.costPrice}.
    </Text>
  );
}

interface RuleSampleProps {
  sample: RuleSampleValue | undefined;
}

/** A rule's sample rate exactly as the preview endpoint returns it: price, GST label and terms. */
function RuleSample({ sample }: RuleSampleProps) {
  if (sample?.rate) {
    const label = gstLabel(sample.rate.gstMode);
    return (
      <Stack gap="xs" align="end" textAlign="right">
        <Text as="span" className={surfaceChrome.tabularNums}>
          {sample.rate.price.toFixed(2)}
          {label ? ` ${label}` : ''}
        </Text>
        {sample.rate.termsText ? (
          <Text as="span" variant="caption" color="secondary">
            {sample.rate.termsText}
          </Text>
        ) : null}
      </Stack>
    );
  }
  if (sample?.skippedReason) {
    return (
      <Text as="span" variant="caption" color="secondary">
        Not generated: {skippedReasonText(sample.skippedReason)}
      </Text>
    );
  }
  return null;
}

interface RuleRowProps {
  row: RateRuleDraft;
  index: number;
  baseOptions: RateRuleBase[];
  sample: RuleSampleValue | undefined;
  onChange: (key: string, patch: Partial<RateRuleDraft>) => void;
  onRemove: (key: string) => void;
  disabled: boolean;
}

function RuleRow({ row, index, baseOptions, sample, onChange, onRemove, disabled }: RuleRowProps) {
  const label = row.name.trim() || `rule ${index + 1}`;
  const scheme = row.scheme;
  // Base keys the API no longer offers stay selectable so the row is not silently rewritten.
  const options = baseOptions.includes(row.base) ? baseOptions : [row.base, ...baseOptions];
  const setScheme = (next: RateRuleScheme | null) => onChange(row.key, { scheme: next });
  return (
    <Box
      as="li"
      className={surfaceChrome.rateRulesRow}
      display="flex"
      align="end"
      justify="between"
      gap="sm"
      flexWrap
    >
      <Inline gap="sm" align="start" flexWrap>
        <FormField label="Rate name" required htmlFor={`${row.key}-name`}>
          <Input
            id={`${row.key}-name`}
            value={row.name}
            disabled={disabled}
            onChange={(e) => onChange(row.key, { name: e.target.value })}
          />
        </FormField>
        {baseOptions.length > 1 ? (
          <FormField label="Base" required htmlFor={`${row.key}-base`}>
            <Select
              id={`${row.key}-base`}
              value={row.base}
              disabled={disabled}
              options={options.map((value) => ({ value, label: baseLabel(value) }))}
              onChange={(e) => onChange(row.key, { base: e.target.value as RateRuleBase })}
            />
          </FormField>
        ) : null}
        <FormField label="Discount %" htmlFor={`${row.key}-discount`}>
          <Input
            id={`${row.key}-discount`}
            type="number"
            inputMode="decimal"
            min={0}
            max={100}
            step="any"
            value={row.discount}
            disabled={disabled}
            onChange={(e) => onChange(row.key, { discount: e.target.value })}
          />
        </FormField>
        <FormField label="Scheme" htmlFor={`${row.key}-scheme`}>
          <SchemeInput
            id={`${row.key}-scheme`}
            schemeType={(scheme?.schemeType as SchemeTypeCart | null | undefined) ?? null}
            payFor={scheme?.schemePayFor ?? null}
            free={scheme?.schemeFree ?? null}
            percentage={scheme?.schemePercentage ?? null}
            onCommitUnits={(payFor, free) =>
              setScheme(
                payFor == null && free == null
                  ? null
                  : { schemeType: 'FIXED_UNITS', schemePayFor: payFor, schemeFree: free },
              )
            }
            onCommitPercentage={(percentage) =>
              setScheme(
                percentage == null
                  ? null
                  : { schemeType: 'PERCENTAGE', schemePercentage: percentage },
              )
            }
            disabled={disabled}
          />
        </FormField>
      </Inline>
      <Inline gap="sm" align="center">
        <RuleSample sample={sample} />
        <IconButton
          size="sm"
          label={`Remove ${label}`}
          disabled={disabled}
          onClick={() => onRemove(row.key)}
        >
          <X size={14} />
        </IconButton>
      </Inline>
    </Box>
  );
}

interface ReadOnlyRulesProps {
  rules: RateRule[];
  sampleFor: (name: string) => RuleSampleValue | undefined;
}

function ReadOnlyRules({ rules, sampleFor }: ReadOnlyRulesProps) {
  if (rules.length === 0) {
    return (
      <Box className={surfaceChrome.rateRulesEmpty}>
        <Text weight="medium">No rate rules are set up</Text>
      </Box>
    );
  }
  return (
    <Box
      as="ol"
      className={surfaceChrome.listPlain}
      aria-label="Rate rules in order"
      padding="none"
      margin="none"
    >
      {rules.map((rule, index) => {
        const scheme = schemeText(rule.scheme);
        return (
          <Box
            key={rule.name}
            as="li"
            display="flex"
            align="center"
            justify="between"
            gap="sm"
            py="xs"
            flexWrap
            borderBottom={index < rules.length - 1}
          >
            <Inline gap="sm">
              <Text
                as="span"
                variant="caption"
                color="secondary"
                className={surfaceChrome.tabularNums}
              >
                {index + 1}.
              </Text>
              <Text as="span">{rule.name}</Text>
              <Text as="span" variant="caption" color="secondary">
                {baseLabel(rule.base)}
                {rule.discountPercent != null ? ` less ${rule.discountPercent}%` : ''}
                {scheme ? `, scheme ${scheme}` : ''}
              </Text>
            </Inline>
            <RuleSample sample={sampleFor(rule.name)} />
          </Box>
        );
      })}
    </Box>
  );
}

interface RateRulesEditorProps {
  data: RateRulesResponse;
  /**
   * Refetches the saved rules. Resolves to the fresh rules, or to undefined when the refetch
   * failed (TanStack's refetch resolves with the old cached data on error, so it is checked).
   */
  onReload: () => Promise<RateRulesResponse | undefined>;
}

function RateRulesEditor({ data, onReload }: RateRulesEditorProps) {
  const readOnly = !data.canEdit;
  const [draft, setDraft] = useState<RateRulesDraft>(() => draftFromRules(data.rules));
  const [saved, setSaved] = useState<RateRulesDraft>(draft);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveMutation = useUpdateRateRulesMutation();
  const dirty = !readOnly && !draftsEqual(draft, saved);

  // Unsaved-changes guard: in-app navigation (data router) and tab close / reload.
  const blocker = useBlocker(dirty);
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    if (window.confirm(UNSAVED_PROMPT)) blocker.proceed();
    else blocker.reset();
  }, [blocker]);
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  // Editors preview the draft; read-only viewers preview the saved rules (no `rules`).
  const previewRules = useMemo(() => (readOnly ? null : toPreviewRules(draft)), [readOnly, draft]);
  const request = useMemo<RateRulesPreviewRequest>(
    () => (previewRules ? { ...SAMPLE_INPUTS, rules: previewRules } : SAMPLE_INPUTS),
    [previewRules],
  );
  const debouncedRequest = useDebounced(request, PREVIEW_DEBOUNCE_MS);
  const hasRules = readOnly ? data.rules.length > 0 : (previewRules?.length ?? 0) > 0;
  const preview = useRateRulesPreviewQuery(debouncedRequest, hasRules);
  const sampleFor = sampleLookup(hasRules ? preview.data : undefined);

  const updateRow = (key: string, patch: Partial<RateRuleDraft>) =>
    setDraft((prev) => ({
      rules: prev.rules.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    }));
  const removeRow = (key: string) =>
    setDraft((prev) => ({ rules: prev.rules.filter((row) => row.key !== key) }));
  const addRow = () =>
    setDraft((prev) => ({ rules: [...prev.rules, emptyRule(data.baseOptions[0] ?? '')] }));

  const handleSave = () => {
    if (saveMutation.isPending) return;
    setSaveError(null);
    saveMutation.mutate(
      { rules: toRules(draft) },
      {
        onSuccess: (result) => {
          const next = draftFromRules(result.rules);
          setSaved(next);
          setDraft(next);
          useNotify.success('Rate rules saved');
        },
        onError: (err) => {
          setSaveError(saveErrorMessage(err));
          // Someone else saved first: show their rules, keeping the server's message on screen.
          if (isApiError(err) && err.status === 409) {
            void onReload().then((fresh) => {
              if (!fresh) {
                // Keep the user's edits: resetting to the cached rules would show stale ones.
                setSaveError(
                  `${saveErrorMessage(
                    err,
                  )} The latest rules could not be loaded; your changes are kept.`,
                );
                return;
              }
              const next = draftFromRules(fresh.rules);
              setSaved(next);
              setDraft(next);
            });
          }
        },
      },
    );
  };

  const busy = saveMutation.isPending;

  return (
    <Box className={surfaceChrome.invoiceSettingsCard}>
      <SectionHeader>
        {dirty ? (
          <Box className={surfaceChrome.invoiceSettingsHeaderActions}>
            <Badge variant="warning">Unsaved changes</Badge>
          </Box>
        ) : null}
      </SectionHeader>

      <Box className={surfaceChrome.rateRulesBody}>
        {readOnly ? (
          <Alert variant="info">You can view the rate rules but not change them.</Alert>
        ) : null}
        {saveError ? <Alert variant="danger">{saveError}</Alert> : null}

        <Box className={surfaceChrome.rateRulesBlock}>
          <Text as="p" className={surfaceChrome.profileSectionLabel}>
            Rates in order
          </Text>
          {hasRules ? <SampleCaption /> : null}
          {hasRules && preview.isError ? (
            <Alert variant="warning">Could not load the sample rates.</Alert>
          ) : null}
          {readOnly ? (
            <ReadOnlyRules rules={data.rules} sampleFor={sampleFor} />
          ) : (
            <Stack gap="sm">
              {draft.rules.length === 0 ? (
                <Box className={surfaceChrome.rateRulesEmpty}>
                  <Text weight="medium">No rate rules yet</Text>
                  <Text variant="caption" color="secondary">
                    Add a rule to give each batch registered after you save a named rate.
                  </Text>
                </Box>
              ) : (
                <Box
                  as="ol"
                  className={surfaceChrome.rateRulesList}
                  aria-label="Rate rules in order"
                  padding="none"
                  margin="none"
                >
                  {draft.rules.map((row, index) => (
                    <RuleRow
                      key={row.key}
                      row={row}
                      index={index}
                      baseOptions={data.baseOptions}
                      sample={sampleFor(row.name)}
                      onChange={updateRow}
                      onRemove={removeRow}
                      disabled={busy}
                    />
                  ))}
                </Box>
              )}
              <Inline gap="sm">
                <Button
                  type="button"
                  variant="outline"
                  leftIcon={<Plus size={14} />}
                  onClick={addRow}
                  disabled={busy}
                >
                  Add rule
                </Button>
              </Inline>
            </Stack>
          )}
        </Box>
      </Box>

      {readOnly ? null : (
        <Box className={surfaceChrome.rateRulesFooter}>
          <Text variant="caption" color="secondary">
            Changes apply to products registered after you save.
          </Text>
          <Button
            type="button"
            variant="solid"
            onClick={handleSave}
            disabled={busy || !dirty}
            loading={busy}
          >
            Save rules
          </Button>
        </Box>
      )}
    </Box>
  );
}

/**
 * Profile → "Rate rules" tab. Renders nothing when rate rules are disabled for the
 * shop's vertical (`enabled: false`, e.g. cafe; the registry also hides the tab); read-only
 * when the user lacks the edit grant. The base picker follows the API's `baseOptions`, never
 * the shop type. A save refused with 403 reloads the rules (now read-only); one refused with
 * 409 shows the server's message and loads the rules someone else saved (if that reload fails,
 * the draft is kept and the error says so).
 */
export function RateRulesSection() {
  const query = useRateRulesQuery();

  // A failed refetch keeps the editor (and any unsaved edits) on the rules already loaded.
  if (query.isError && !query.data) {
    return (
      <Box className={surfaceChrome.invoiceSettingsCard}>
        <SectionHeader />
        <Box className={surfaceChrome.rateRulesBody}>
          <Alert variant="danger">
            <Inline gap="sm" align="center" justify="between">
              <Text as="span">Could not load the rate rules.</Text>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void query.refetch()}
                loading={query.isFetching}
              >
                Retry
              </Button>
            </Inline>
          </Alert>
        </Box>
      </Box>
    );
  }

  if (!query.data) {
    return (
      <Box className={surfaceChrome.invoiceSettingsCard}>
        <CenteredLoader label="Loading rate rules…" />
      </Box>
    );
  }

  if (!query.data.enabled) return null;

  const reload = async () => {
    const result = await query.refetch();
    return result.isError ? undefined : result.data;
  };

  return <RateRulesEditor data={query.data} onReload={reload} />;
}
