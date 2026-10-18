import { useEffect, useMemo, useState } from 'react';
import { useBlocker } from 'react-router';
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import { ApiError } from '@inventory-platform/api-client';
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
  RateRuleScheme,
  RateRulesPreviewRequest,
  RateRulesResponse,
} from '../../model/rateRules.types';
import { SchemeInput, type SchemeTypeCart } from '../scheme';
import { GeneratedRatesList } from './GeneratedRatesList';
import {
  baseLabel,
  draftFromRules,
  draftsEqual,
  emptyRule,
  moveRule,
  schemeText,
  toPreviewRules,
  toRules,
  type RateRuleDraft,
  type RateRulesDraft,
} from './rateRulesDraft';

const UNSAVED_PROMPT = 'You have unsaved rate rules changes. Leave without saving?';
const PREVIEW_DEBOUNCE_MS = 400;

/**
 * Raw inputs for the sample row. They are sent to the preview endpoint as-is; the
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

function SectionHeader({ children }: { children?: React.ReactNode }) {
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

interface SampleRowsProps {
  request: RateRulesPreviewRequest;
  enabled: boolean;
}

function noop() {
  /* sample rates are read-only */
}

/** Sample rates exactly as the preview endpoint returns them, in the shared rates list. */
function SampleRows({ request, enabled }: SampleRowsProps) {
  const query = useRateRulesPreviewQuery(request, enabled);
  if (!enabled) return null;
  return (
    <Box className={surfaceChrome.invoiceSettingsBlock}>
      <Text as="p" className={surfaceChrome.profileSectionLabel}>
        Sample
      </Text>
      <Text as="p" variant="caption" color="secondary" className={surfaceChrome.invoiceToggleHint}>
        For a product with MRP {SAMPLE_INPUTS.maximumRetailPrice}, PTR {SAMPLE_INPUTS.priceToRetail}
        , selling price {SAMPLE_INPUTS.sellingPrice} and cost {SAMPLE_INPUTS.costPrice}.
      </Text>
      {query.isError ? (
        <Alert variant="warning" className={surfaceChrome.invoiceSettingsAlert}>
          Could not load the sample rates.
        </Alert>
      ) : null}
      <GeneratedRatesList
        rates={query.data?.rates ?? []}
        skipped={query.data?.skipped ?? []}
        canEdit={false}
        onEditTerms={noop}
        onReset={noop}
      />
    </Box>
  );
}

interface RuleRowProps {
  row: RateRuleDraft;
  index: number;
  count: number;
  baseOptions: string[];
  onChange: (key: string, patch: Partial<RateRuleDraft>) => void;
  onMove: (index: number, dir: 'up' | 'down') => void;
  onRemove: (key: string) => void;
  disabled: boolean;
}

function RuleRow({
  row,
  index,
  count,
  baseOptions,
  onChange,
  onMove,
  onRemove,
  disabled,
}: RuleRowProps) {
  const label = row.name.trim() || `rule ${index + 1}`;
  const scheme = row.scheme;
  // Base keys the API no longer offers stay selectable so the row is not silently rewritten.
  const options = baseOptions.includes(row.base) ? baseOptions : [row.base, ...baseOptions];
  const setScheme = (next: RateRuleScheme | null) => onChange(row.key, { scheme: next });
  return (
    <Box as="li" display="flex" align="end" justify="between" gap="sm" py="xs" flexWrap>
      <Inline gap="sm" align="end" flexWrap>
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
              onChange={(e) => onChange(row.key, { base: e.target.value })}
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
      <Inline gap="xs" align="center">
        <IconButton
          size="sm"
          label={`Move ${label} up`}
          disabled={disabled || index === 0}
          onClick={() => onMove(index, 'up')}
        >
          <ArrowUp size={14} />
        </IconButton>
        <IconButton
          size="sm"
          label={`Move ${label} down`}
          disabled={disabled || index === count - 1}
          onClick={() => onMove(index, 'down')}
        >
          <ArrowDown size={14} />
        </IconButton>
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

function ReadOnlyRules({ rules }: { rules: RateRule[] }) {
  if (rules.length === 0) {
    return (
      <Text as="p" variant="caption" color="secondary">
        No rate rules are set up.
      </Text>
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
            gap="sm"
            py="xs"
            borderBottom={index < rules.length - 1}
          >
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
          </Box>
        );
      })}
    </Box>
  );
}

function RateRulesEditor({ data }: { data: RateRulesResponse }) {
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

  const updateRow = (key: string, patch: Partial<RateRuleDraft>) =>
    setDraft((prev) => ({
      rules: prev.rules.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    }));
  const moveRow = (index: number, dir: 'up' | 'down') =>
    setDraft((prev) => ({ rules: moveRule(prev.rules, index, dir) }));
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
        onError: (err) => setSaveError(saveErrorMessage(err)),
      },
    );
  };

  const busy = saveMutation.isPending;

  return (
    <Box className={surfaceChrome.invoiceSettingsCard}>
      <SectionHeader>
        {readOnly ? null : (
          <Box className={surfaceChrome.invoiceSettingsHeaderActions}>
            {dirty ? <Badge variant="warning">Unsaved changes</Badge> : null}
            <Button
              type="button"
              variant="solid"
              onClick={handleSave}
              disabled={busy || !dirty}
              loading={busy}
            >
              Save
            </Button>
          </Box>
        )}
      </SectionHeader>

      {readOnly ? (
        <Alert variant="info" className={surfaceChrome.invoiceSettingsAlert}>
          You can view the rate rules but not change them.
        </Alert>
      ) : null}
      {saveError ? (
        <Alert variant="danger" className={surfaceChrome.invoiceSettingsAlert}>
          {saveError}
        </Alert>
      ) : null}

      <Box className={surfaceChrome.invoiceSettingsBlock}>
        <Text as="p" className={surfaceChrome.profileSectionLabel}>
          Rates in order
        </Text>
        {readOnly ? (
          <ReadOnlyRules rules={data.rules} />
        ) : (
          <Stack gap="sm">
            {draft.rules.length === 0 ? (
              <Text as="p" variant="caption" color="secondary">
                No rate rules yet. Add one to start.
              </Text>
            ) : (
              <Box
                as="ol"
                className={surfaceChrome.listPlain}
                aria-label="Rate rules in order"
                padding="none"
                margin="none"
              >
                {draft.rules.map((row, index) => (
                  <RuleRow
                    key={row.key}
                    row={row}
                    index={index}
                    count={draft.rules.length}
                    baseOptions={data.baseOptions}
                    onChange={updateRow}
                    onMove={moveRow}
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

      <SampleRows request={debouncedRequest} enabled={hasRules} />

      {readOnly ? null : (
        <Box className={surfaceChrome.invoiceSettingsFooterBar}>
          <Text variant="caption" color="secondary">
            Changes apply to products registered after you save.
          </Text>
          <Button type="button" variant="solid" onClick={handleSave} disabled={busy || !dirty}>
            {busy ? 'Saving…' : 'Save rules'}
          </Button>
        </Box>
      )}
    </Box>
  );
}

/**
 * Profile → "Rate rules" tab. Renders nothing when rate rules are disabled for the
 * shop's vertical (`enabled: false`, e.g. cafe); read-only when the user lacks the edit grant. The base picker follows
 * the API's `baseOptions`, never the shop type.
 */
export function RateRulesSection() {
  const query = useRateRulesQuery();

  if (query.isError) {
    return (
      <Box className={surfaceChrome.invoiceSettingsCard}>
        <SectionHeader />
        <Alert variant="danger" className={surfaceChrome.invoiceSettingsAlert}>
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

  return <RateRulesEditor data={query.data} />;
}
