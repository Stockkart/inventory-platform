import { useState, useEffect, useMemo, type ReactNode } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router';
import { pricingApi } from '../api/pricing.api';
import { useNotify } from '@inventory-platform/session';
import type { PricingRate } from '@inventory-platform/pricing/types';
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

const SYSTEM_DEFAULT_RATE_OPTIONS: readonly SelectOptionDef[] = [
  { value: '', label: '— None —' },
  { value: 'priceToRetail', label: 'PTR (Price to Retailer)' },
  { value: 'maximumRetailPrice', label: 'MRP (Maximum Retail Price)' },
  { value: 'costPrice', label: 'Cost price' },
];

interface LocationState {
  priceToRetail?: number | null;
  maximumRetailPrice?: number | null;
  productName?: string | null;
  rates?: PricingRate[] | null;
  defaultRate?: string | null;
}

function PageShell({ children }: { children: ReactNode }) {
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

  const [priceToRetail, setPriceToRetail] = useState<string>('');
  const [maximumRetailPrice, setMaximumRetailPrice] = useState<string>('');
  const [rates, setRates] = useState<PricingRate[]>([]);
  const [defaultRate, setDefaultRate] = useState<string>('');
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
        setDefaultRate(normalizeDefaultRate(pricing.defaultRate ?? ''));
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

  const defaultRateOptions = useMemo((): SelectOptionDef[] => {
    const custom = rates
      .filter((r) => r.name.trim())
      .map((r) => ({ value: r.name, label: r.name }));
    return [...SYSTEM_DEFAULT_RATE_OPTIONS, ...custom];
  }, [rates]);

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
    const systemRates = ['maximumRetailPrice', 'priceToRetail', 'costPrice'];
    const defaultRateValid =
      !defaultRate.trim() ||
      systemRates.includes(defaultRate.trim()) ||
      rates.some((r) => r.name.trim() === defaultRate.trim());

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
      setError(
        'Default rate must be maximumRetailPrice, priceToRetail, costPrice, or a custom rate name',
      );
      return;
    }

    const payload: {
      priceToRetail?: number;
      maximumRetailPrice?: number;
      rates?: PricingRate[];
      defaultRate?: string;
    } = {};
    if (ptr !== undefined) payload.priceToRetail = ptr;
    if (mrp !== undefined) payload.maximumRetailPrice = mrp;
    if (hasRates || loadedFromApi) {
      payload.rates = rates
        .filter((r) => r.name.trim())
        .map((r) => ({ name: r.name.trim(), price: r.price }));
    }
    if (defaultRate.trim()) payload.defaultRate = defaultRate.trim();

    setSaving(true);
    setError(null);
    try {
      await pricingApi.update(pricingId, payload);
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
              <div className={surfaceChrome.priceEditSectionHead}>
                <Text as="h3" className={surfaceChrome.priceEditSectionTitle}>
                  Custom rates
                </Text>
                <Button type="button" variant="outline" size="sm" onClick={addRate}>
                  Add rate
                </Button>
              </div>
              <Text as="p" className={surfaceChrome.priceEditHint}>
                Saving replaces the full rate list—keep every rate you still need.
              </Text>

              {rates.length === 0 ? (
                <div className={surfaceChrome.priceEditEmptyRates}>
                  No custom rates yet. Add one if this product uses named price tiers.
                </div>
              ) : (
                <Stack gap="sm">
                  <div className={surfaceChrome.priceEditRateHead} aria-hidden>
                    <span>Name</span>
                    <span>Price</span>
                    <span />
                  </div>
                  {rates.map((rate, i) => (
                    <div key={i} className={surfaceChrome.priceEditRateRow}>
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
                    </div>
                  ))}
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
                hint="Choose PTR, MRP, cost, or a custom rate name above."
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
