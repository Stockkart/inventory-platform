import { useState, useEffect, useMemo, type ReactNode } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router';
import { pricingApi } from '../api/pricing.api';
import { useAuthStore, useNotify, useShopAccessStore } from '@inventory-platform/session';
import {
  GeneratedRatesList,
  isRuleRate,
  sameRateTerms,
  type RateTermsEdit,
} from '@inventory-platform/product';
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

/** Offered when the API gave no list (the page fell back to the navigation state). */
const SYSTEM_DEFAULT_RATE_NAMES = Object.keys(SYSTEM_DEFAULT_RATE_LABELS);

interface PageShellProps {
  children: ReactNode;
}

interface LocationState {
  priceToRetail?: number | null;
  maximumRetailPrice?: number | null;
  productName?: string | null;
  rates?: PricingRate[] | null;
  defaultRate?: string | null;
}

function PageShell({ children }: PageShellProps) {
  return (
    <Stack gap="md" width="full" maxWidth="sm" mx="auto">
      {children}
    </Stack>
  );
}

export function PriceEditPage() {
  const { pricingId } = useParams<{ pricingId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;
  const { success: notifySuccess, error: notifyError } = useNotify;
  const { user } = useAuthStore();
  const canEditRateRules = useShopAccessStore((s) => {
    const access = user?.shopId ? s.byShopId[user.shopId] : undefined;
    return access?.modules?.rateRulesEdit ?? false;
  });

  const [priceToRetail, setPriceToRetail] = useState<string>('');
  const [maximumRetailPrice, setMaximumRetailPrice] = useState<string>('');
  const [rates, setRates] = useState<PricingRate[]>([]);
  /** Rates as last loaded or saved; a reset puts a rate's terms back to these. */
  const [savedRates, setSavedRates] = useState<PricingRate[]>([]);
  const [resetNames, setResetNames] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<PricingRateWarning[]>([]);
  const [defaultRate, setDefaultRate] = useState<string>('');
  /** Names the API says `defaultRate` may take (`defaultRateOptions`); null until loaded. */
  const [defaultRateNames, setDefaultRateNames] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedFromApi, setLoadedFromApi] = useState(false);

  useEffect(() => {
    if (!pricingId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    pricingApi
      .getById(pricingId)
      .then((pricing) => {
        if (cancelled) return;
        setLoadedFromApi(true);
        if (pricing.priceToRetail != null) {
          setPriceToRetail(String(pricing.priceToRetail));
        }
        if (pricing.maximumRetailPrice != null) {
          setMaximumRetailPrice(String(pricing.maximumRetailPrice));
        }
        setRates(pricing.rates ?? []);
        setSavedRates(pricing.rates ?? []);
        setDefaultRate(normalizeDefaultRate(pricing.defaultRate ?? ''));
        setDefaultRateNames(pricing.defaultRateOptions ?? null);
      })
      .catch(() => {
        if (cancelled) return;
        if (state?.priceToRetail != null) {
          setPriceToRetail(String(state.priceToRetail));
        }
        if (state?.maximumRetailPrice != null) {
          setMaximumRetailPrice(String(state.maximumRetailPrice));
        }
        setRates(state?.rates ?? []);
        setDefaultRate(normalizeDefaultRate(state?.defaultRate ?? ''));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pricingId]);

  // Which rates may be the default is the server's call (`defaultRateOptions`); a rate added
  // here is offered once saved. The current value stays listed so it is not silently rewritten.
  const allowedDefaultRates = useMemo(() => {
    const names = defaultRateNames ?? SYSTEM_DEFAULT_RATE_NAMES;
    return defaultRate && !names.includes(defaultRate) ? [...names, defaultRate] : names;
  }, [defaultRateNames, defaultRate]);
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

  const addRate = () => {
    setRates((prev) => [...prev, { name: '', price: 0 }]);
  };

  const updateRate = (index: number, field: 'name' | 'price', value: string | number) => {
    setRates((prev) => {
      const next = [...prev];
      if (field === 'name') {
        next[index] = { ...next[index], name: String(value) };
      } else {
        next[index] = { ...next[index], price: Number(value) || 0 };
      }
      return next;
    });
  };

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

  const removeRate = (index: number) => {
    setRates((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!pricingId) return;

    const ptr = priceToRetail.trim() ? parseFloat(priceToRetail) : undefined;
    const mrp = maximumRetailPrice.trim() ? parseFloat(maximumRetailPrice) : undefined;

    const hasRates = rates.length > 0;
    const ratesValid =
      !hasRates || rates.every((r) => r.name.trim() && !isNaN(r.price) && r.price >= 0);
    const defaultRateValid = !defaultRate.trim() || allowedDefaultRates.includes(defaultRate);

    const sendingRates = hasRates || loadedFromApi;
    if (ptr === undefined && mrp === undefined && !sendingRates && !defaultRate.trim()) {
      setError('Provide at least one of PTR, MRP, rates, or default rate');
      return;
    }
    if (ptr !== undefined && (isNaN(ptr) || ptr < 0)) {
      setError('Price to Retail must be a valid positive number');
      return;
    }
    if (mrp !== undefined && (isNaN(mrp) || mrp < 0)) {
      setError('MRP must be a valid positive number');
      return;
    }
    if (!ratesValid) {
      setError('Each rate must have a name and a valid price ≥ 0');
      return;
    }
    if (!defaultRateValid) {
      setError('Choose a default rate from the list');
      return;
    }

    const payload: {
      priceToRetail?: number;
      maximumRetailPrice?: number;
      rates?: PricingRate[];
      defaultRate?: string;
      resetRates?: string[];
    } = {};
    if (ptr !== undefined) payload.priceToRetail = ptr;
    if (mrp !== undefined) payload.maximumRetailPrice = mrp;
    if (hasRates || loadedFromApi) {
      payload.rates = rates
        .filter((r) => r.name.trim())
        // A rule rate goes back as it is (current price, new terms); the server reprices it.
        .map((r) => (isRuleRate(r) ? r : { name: r.name.trim(), price: r.price }));
    }
    if (defaultRate.trim()) payload.defaultRate = defaultRate.trim();
    if (resetNames.length > 0) payload.resetRates = resetNames;

    setSaving(true);
    setError(null);
    try {
      const saved = await pricingApi.update(pricingId, payload);
      if (saved.rates) {
        setRates(saved.rates);
        setSavedRates(saved.rates);
      }
      if (saved.defaultRateOptions) setDefaultRateNames(saved.defaultRateOptions);
      if (saved.defaultRate != null) setDefaultRate(normalizeDefaultRate(saved.defaultRate));
      setResetNames([]);
      setWarnings(saved.warnings ?? []);
      notifySuccess('Pricing updated successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update pricing';
      notifyError(message);
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (!pricingId) {
    return (
      <PageShell>
        <Alert variant="danger">No pricing ID provided.</Alert>
        <Button type="button" variant="ghost" onClick={() => navigate('/dashboard/pricing')}>
          Back to Pricing
        </Button>
      </PageShell>
    );
  }

  if (loading) {
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

  const ruleRates = rates.filter(isRuleRate);
  const legacyRateCount = rates.length - ruleRates.length;
  const productTitle = state?.productName?.trim() || null;

  return (
    <PageShell>
      <PageHeader description="Update PTR, MRP, and custom rate tiers for this product." />

      <Card>
        <CardBody>
          <Stack gap="lg">
            <Text as="h2" weight="semibold">
              {productTitle ?? 'Pricing'}
            </Text>

            {error ? <Alert variant="danger">{error}</Alert> : null}

            <Divider />

            <Box className={surfaceChrome.priceEditSection}>
              <Text as="h3" className={surfaceChrome.priceEditSectionTitle}>
                Base prices
              </Text>
              <Grid columns={2} gap="md" width="full">
                <FormField label="PTR" htmlFor="priceToRetail" hint="Price to retailer">
                  <Input
                    id="priceToRetail"
                    type="number"
                    step="0.01"
                    min="0"
                    value={priceToRetail}
                    onChange={(e) => setPriceToRetail(e.target.value)}
                    placeholder="0.00"
                  />
                </FormField>
                <FormField label="MRP" htmlFor="maximumRetailPrice" hint="Maximum retail price">
                  <Input
                    id="maximumRetailPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={maximumRetailPrice}
                    onChange={(e) => setMaximumRetailPrice(e.target.value)}
                    placeholder="0.00"
                  />
                </FormField>
              </Grid>
            </Box>

            <Divider />

            <Box className={surfaceChrome.priceEditSection}>
              <Box className={surfaceChrome.priceEditSectionHead}>
                <Text as="h3" className={surfaceChrome.priceEditSectionTitle}>
                  Custom rates
                </Text>
                <Button type="button" variant="outline" size="sm" onClick={addRate}>
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
                          onChange={(e) => updateRate(i, 'name', e.target.value)}
                          placeholder="e.g. RATE-A"
                          aria-label={`Rate ${i + 1} name`}
                        />
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={rate.price || ''}
                          onChange={(e) => updateRate(i, 'price', e.target.value)}
                          className={surfaceChrome.priceEditRatePrice}
                          placeholder="0.00"
                          aria-label={`Rate ${i + 1} price`}
                        />
                        <IconButton
                          type="button"
                          size="sm"
                          onClick={() => removeRate(i)}
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
              disabled={saving}
              onClick={() => void handleSubmit()}
            >
              {saving ? 'Saving…' : 'Save'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => navigate('/dashboard/pricing')}>
              Cancel
            </Button>
          </Inline>
        </CardFooter>
      </Card>
    </PageShell>
  );
}
