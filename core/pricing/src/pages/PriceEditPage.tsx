import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import {
  GeneratedRatesList,
  buildPriceUpdate,
  buildRatesUpdate,
  canEditAnyPriceField,
  canEditPriceField,
  isRuleRate,
  priceDraftFrom,
  sameRateTerms,
  useInventoryLotQuery,
  useUpdateInventoryLotMutation,
  type PriceDraft,
  type PriceField,
  type RateTermsEdit,
} from '@inventory-platform/product';
import { useAuthStore, useNotify, useShopAccessStore } from '@inventory-platform/session';
import type { PricingRate, PricingRateWarning } from '@inventory-platform/pricing/types';
import {
  Alert,
  Box,
  Button,
  Card,
  CardBody,
  CardFooter,
  CenteredLoader,
  Divider,
  FormField,
  Grid,
  IconButton,
  Inline,
  Input,
  PageHeader,
  Select,
  Stack,
  Text,
  type SelectOptionDef,
  surfaceChrome,
} from '@inventory-platform/ui-kit';
import { usePricingQuery, useUpdatePricingMutation } from '../queries/hooks';

export function meta() {
  return [
    { title: 'Edit Price - StockKart' },
    { name: 'description', content: 'Edit pricing for inventory item' },
  ];
}

const PASCAL_TO_CAMEL: Record<string, string> = {
  PriceToRetail: 'priceToRetail',
  MaximumRetailPrice: 'maximumRetailPrice',
  CostPrice: 'costPrice',
};

function normalizeDefaultRate(value: string): string {
  return PASCAL_TO_CAMEL[value] ?? value;
}

const NO_DEFAULT_RATE: SelectOptionDef = { value: '', label: '— None —' };

/** Labels for the built-in default-rate names; other names show as they are. */
const SYSTEM_DEFAULT_RATE_LABELS: Record<string, string> = {
  priceToRetail: 'PTR (Price to Retailer)',
  maximumRetailPrice: 'MRP (Maximum Retail Price)',
  costPrice: 'Cost price',
};

/** Offered when the pricing response has no `defaultRateOptions`. */
const SYSTEM_DEFAULT_RATE_NAMES = Object.keys(SYSTEM_DEFAULT_RATE_LABELS);

interface PageShellProps {
  children: ReactNode;
}

/** Single-value price inputs, in display order. */
const PRICE_INPUTS: {
  field: Exclude<PriceField, 'rates' | 'defaultRate'>;
  label: string;
  hint: string;
  gst?: boolean;
}[] = [
  { field: 'priceToRetail', label: 'PTR', hint: 'Price to retailer' },
  { field: 'maximumRetailPrice', label: 'MRP', hint: 'Maximum retail price' },
  { field: 'costPrice', label: 'PTS', hint: 'Price to stockist (cost)' },
  {
    field: 'saleAdditionalDiscount',
    label: 'Sale add. discount (%)',
    hint: 'Leave empty for none',
  },
  { field: 'sgst', label: 'SGST (%)', hint: 'Lot GST', gst: true },
  { field: 'cgst', label: 'CGST (%)', hint: 'Lot GST', gst: true },
];

interface LocationState {
  productName?: string | null;
}

function PageShell({ children }: PageShellProps) {
  return (
    <Stack gap="md" width="full" maxWidth="sm" mx="auto">
      {children}
    </Stack>
  );
}

/**
 * Edits one lot's prices: PTR, MRP, PTS, GST, sale add. discount, custom rates, rule-rate terms
 * and the default rate. This is the only place prices are edited from product search. The single
 * prices save through `PUT /inventory/{id}`, which applies the product-search grants and GST
 * rules and marks product reads stale. The rates part saves through `PATCH /pricing/{id}`, only
 * when it changed: it takes rule-rate resets and answers with below-cost warnings and the
 * default-rate choices.
 */
export function PriceEditPage() {
  const { pricingId } = useParams<{ pricingId: string }>();
  const [searchParams] = useSearchParams();
  const lotId = searchParams.get('lot');
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;
  const { success: notifySuccess, error: notifyError } = useNotify;

  const shopId = useAuthStore((s) => s.user?.shopId ?? null);
  const access = useShopAccessStore((s) =>
    shopId ? s.byShopId[shopId]?.productSearch : undefined,
  );
  const canEditRateRules = useShopAccessStore((s) =>
    shopId ? s.byShopId[shopId]?.modules?.rateRulesEdit ?? false : false,
  );

  const lotQuery = useInventoryLotQuery(lotId);
  const updateLot = useUpdateInventoryLotMutation();
  const lot = lotQuery.data ?? null;
  const pricingQuery = usePricingQuery(pricingId);
  const updatePricing = useUpdatePricingMutation();
  const pricing = pricingQuery.data ?? null;

  const [draft, setDraft] = useState<PriceDraft | null>(null);
  const [rates, setRates] = useState<PricingRate[]>([]);
  const [resetNames, setResetNames] = useState<string[]>([]);
  const [defaultRate, setDefaultRate] = useState('');
  const [warnings, setWarnings] = useState<PricingRateWarning[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (lot) setDraft(priceDraftFrom(lot));
  }, [lot]);

  /** Rates and default rate as last loaded or saved; a reset puts a rate's terms back to these. */
  const savedRates = useMemo(() => pricing?.rates ?? [], [pricing]);
  const savedDefaultRate = normalizeDefaultRate(pricing?.defaultRate ?? '');
  useEffect(() => {
    if (pricing) {
      setRates(pricing.rates ?? []);
      setDefaultRate(normalizeDefaultRate(pricing.defaultRate ?? ''));
      setResetNames([]);
    }
  }, [pricing]);

  // Which rates may be the default is the server's call (`defaultRateOptions`); a rate added
  // here is offered once saved. The current value stays listed so it is not silently rewritten.
  const allowedDefaultRates = useMemo(() => {
    const names = pricing?.defaultRateOptions ?? SYSTEM_DEFAULT_RATE_NAMES;
    return defaultRate && !names.includes(defaultRate) ? [...names, defaultRate] : names;
  }, [pricing, defaultRate]);
  const defaultRateOptions = useMemo(
    (): SelectOptionDef[] => [
      NO_DEFAULT_RATE,
      ...allowedDefaultRates.map((name) => ({
        value: name,
        label: SYSTEM_DEFAULT_RATE_LABELS[name] ?? name,
      })),
    ],
    [allowedDefaultRates],
  );

  // Rule rates whose terms were changed here and not saved yet.
  const pendingEdit = useMemo(
    () =>
      rates
        .filter(
          (r) =>
            isRuleRate(r) &&
            !resetNames.includes(r.name) &&
            !sameRateTerms(
              r,
              savedRates.find((saved) => saved.name === r.name),
            ),
        )
        .map((r) => r.name),
    [rates, savedRates, resetNames],
  );

  const canEdit = (field: PriceField) => canEditPriceField(field, access);
  const update = (patch: Partial<PriceDraft>) =>
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));

  const editRateTerms = (name: string, terms: RateTermsEdit) => {
    setRates((prev) =>
      prev.map((r) =>
        r.name === name
          ? { ...r, discountPercent: terms.discountPercent, scheme: terms.scheme }
          : r,
      ),
    );
  };

  const resetRateToRule = (name: string) => {
    const saved = savedRates.find((r) => r.name === name);
    setRates((prev) =>
      prev.map((r) =>
        r.name === name
          ? { ...r, discountPercent: saved?.discountPercent, scheme: saved?.scheme }
          : r,
      ),
    );
    setResetNames((prev) => (prev.includes(name) ? prev : [...prev, name]));
  };

  const goBack = () => navigate(-1);

  if (!lotId || !pricingId) {
    return (
      <PageShell>
        <Alert variant="warning">
          Open Edit price from Product search, Scan &amp; Sell or Pricing to edit a product&apos;s
          prices.
        </Alert>
        <Button type="button" variant="ghost" onClick={() => navigate('/dashboard/pricing')}>
          Go to Pricing
        </Button>
      </PageShell>
    );
  }

  const loadError = lotQuery.error ?? pricingQuery.error;
  if (loadError) {
    return (
      <PageShell>
        <Alert variant="danger">
          {loadError instanceof Error ? loadError.message : 'Could not load the product'}
        </Alert>
        <Button type="button" variant="ghost" onClick={goBack}>
          Back
        </Button>
      </PageShell>
    );
  }

  if (!lot || !draft || !pricing) {
    return (
      <PageShell>
        <Card>
          <CardBody>
            <CenteredLoader label="Loading pricing…" />
          </CardBody>
        </Card>
      </PageShell>
    );
  }

  const isBasic = lot.billingMode === 'BASIC';
  const mayEditAny = canEditAnyPriceField(access) || canEditRateRules;
  const saving = updateLot.isPending || updatePricing.isPending;

  const handleSubmit = async () => {
    const prices = buildPriceUpdate(lot, draft);
    const ratesPart = buildRatesUpdate(
      { rates: savedRates, defaultRate: savedDefaultRate },
      { rates, defaultRate, resetNames },
      allowedDefaultRates,
    );
    const found = [...prices.errors, ...ratesPart.errors];
    setErrors(found);
    if (found.length > 0) return;
    const pricesChanged = Object.keys(prices.payload).length > 0;
    if (!pricesChanged && !ratesPart.payload) {
      notifySuccess('Nothing to save');
      return;
    }
    try {
      // Prices first: a new PTR or MRP regenerates rule rates, and the rates write that follows
      // then answers with the final rates and their warnings.
      if (pricesChanged) {
        await updateLot.mutateAsync({ inventoryId: lotId, payload: prices.payload });
      }
      if (ratesPart.payload) {
        const saved = await updatePricing.mutateAsync({ pricingId, data: ratesPart.payload });
        setWarnings(saved.warnings ?? []);
      } else {
        setWarnings([]);
        // The prices write may have repriced rule rates; reload them.
        void pricingQuery.refetch();
      }
      notifySuccess('Prices updated');
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Failed to update prices');
    }
  };

  const ruleRates = rates.filter(isRuleRate);
  const legacyRateCount = rates.length - ruleRates.length;
  const productTitle = lot.name?.trim() || state?.productName?.trim() || 'Pricing';

  return (
    <PageShell>
      <PageHeader description="Update the prices, GST, discount and rate tiers for this product." />

      <Card>
        <CardBody>
          <Stack gap="lg">
            <Text as="h2" weight="semibold">
              {productTitle}
            </Text>

            {!mayEditAny ? (
              <Alert variant="info">You can view these prices but not change them.</Alert>
            ) : null}
            {errors.length > 0 ? <Alert variant="danger">{errors.join('. ')}</Alert> : null}

            <Divider />

            <Box className={surfaceChrome.priceEditSection}>
              <Text as="h3" className={surfaceChrome.priceEditSectionTitle}>
                Prices and tax
              </Text>
              <Grid columns={2} gap="md" width="full">
                {PRICE_INPUTS.filter((input) => !(input.gst && isBasic)).map((input) => (
                  <FormField
                    key={input.field}
                    label={input.label}
                    htmlFor={input.field}
                    hint={input.hint}
                  >
                    <Input
                      id={input.field}
                      type="number"
                      step="0.01"
                      min="0"
                      value={draft[input.field]}
                      onChange={(e) => update({ [input.field]: e.target.value })}
                      disabled={!canEdit(input.field)}
                      placeholder="0.00"
                    />
                  </FormField>
                ))}
              </Grid>
            </Box>

            <Divider />

            <Box className={surfaceChrome.priceEditSection}>
              <Box className={surfaceChrome.priceEditSectionHead}>
                <Text as="h3" className={surfaceChrome.priceEditSectionTitle}>
                  Custom rates
                </Text>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canEdit('rates')}
                  onClick={() => setRates((prev) => [...prev, { name: '', price: 0 }])}
                >
                  Add rate
                </Button>
              </Box>
              <Text as="p" className={surfaceChrome.priceEditHint}>
                Saving replaces the full rate list—keep every rate you still need.
              </Text>

              {ruleRates.length > 0 ? (
                <GeneratedRatesList
                  rates={ruleRates}
                  warnings={warnings}
                  canEdit={canEditRateRules}
                  pendingReset={resetNames}
                  pendingEdit={pendingEdit}
                  onEditTerms={editRateTerms}
                  onReset={resetRateToRule}
                />
              ) : null}

              {rates.length === 0 ? (
                <Box className={surfaceChrome.priceEditEmptyRates}>
                  No custom rates yet. Add one if this product uses named price tiers.
                </Box>
              ) : legacyRateCount === 0 ? null : (
                <Stack gap="sm">
                  <Box className={surfaceChrome.priceEditRateHead} aria-hidden>
                    <Text as="span">Name</Text>
                    <Text as="span">Price</Text>
                    <Box as="span" />
                  </Box>
                  {rates.map((rate, i) =>
                    isRuleRate(rate) ? null : (
                      <Box key={i} className={surfaceChrome.priceEditRateRow}>
                        <Input
                          type="text"
                          value={rate.name}
                          disabled={!canEdit('rates')}
                          onChange={(e) =>
                            setRates((prev) =>
                              prev.map((r, j) => (j === i ? { ...r, name: e.target.value } : r)),
                            )
                          }
                          placeholder="e.g. RATE-A"
                          aria-label={`Rate ${i + 1} name`}
                        />
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={rate.price || ''}
                          disabled={!canEdit('rates')}
                          onChange={(e) =>
                            setRates((prev) =>
                              prev.map((r, j) =>
                                j === i ? { ...r, price: Number(e.target.value) || 0 } : r,
                              ),
                            )
                          }
                          className={surfaceChrome.priceEditRatePrice}
                          placeholder="0.00"
                          aria-label={`Rate ${i + 1} price`}
                        />
                        <IconButton
                          type="button"
                          size="sm"
                          disabled={!canEdit('rates')}
                          onClick={() => setRates((prev) => prev.filter((_, j) => j !== i))}
                          label={`Remove rate ${rate.name || i + 1}`}
                        >
                          ×
                        </IconButton>
                      </Box>
                    ),
                  )}
                </Stack>
              )}
            </Box>

            <Divider />

            <Box className={surfaceChrome.priceEditSection}>
              <Text as="h3" className={surfaceChrome.priceEditSectionTitle}>
                Default rate
              </Text>
              <FormField
                label="Applied by default"
                htmlFor="defaultRate"
                hint="Choose PTR, MRP, cost, or a saved rate. A rate added above is offered after you save."
              >
                <Select
                  id="defaultRate"
                  value={defaultRate}
                  disabled={!canEdit('defaultRate')}
                  onChange={(e) => setDefaultRate(e.target.value)}
                  options={defaultRateOptions}
                />
              </FormField>
            </Box>
          </Stack>
        </CardBody>
        <CardFooter>
          <Inline gap="sm" align="center">
            <Button
              type="button"
              variant="solid"
              disabled={!mayEditAny || saving}
              onClick={() => void handleSubmit()}
            >
              {saving ? 'Saving…' : 'Save'}
            </Button>
            <Button type="button" variant="ghost" onClick={goBack}>
              Back
            </Button>
          </Inline>
        </CardFooter>
      </Card>
    </PageShell>
  );
}
