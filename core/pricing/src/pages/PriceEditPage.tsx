import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import {
  buildPriceUpdate,
  canEditAnyPriceField,
  canEditPriceField,
  priceDraftFrom,
  useInventoryLotQuery,
  useUpdateInventoryLotMutation,
  type PriceDraft,
  type PriceField,
} from '@inventory-platform/product';
import { useAuthStore, useNotify, useShopAccessStore } from '@inventory-platform/session';
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

function PageShell({ children }: { children: ReactNode }) {
  return (
    <Stack gap="md" width="full" maxWidth="sm" mx="auto">
      {children}
    </Stack>
  );
}

/**
 * Edits one lot's prices: PTR, MRP, PTS, GST, sale add. discount, custom rates and the default
 * rate. This is the only place prices are edited from product search. It saves through
 * `PUT /inventory/{id}`, which applies the product-search grants and GST rules, and marks
 * product reads stale so product search and scan-sell show the new prices.
 */
export function PriceEditPage() {
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
  const lotQuery = useInventoryLotQuery(lotId);
  const updateLot = useUpdateInventoryLotMutation();
  const lot = lotQuery.data ?? null;

  const [draft, setDraft] = useState<PriceDraft | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (lot) {
      const loaded = priceDraftFrom(lot);
      setDraft({ ...loaded, defaultRate: normalizeDefaultRate(loaded.defaultRate) });
    }
  }, [lot]);

  const defaultRateOptions = useMemo((): SelectOptionDef[] => {
    const custom = (draft?.rates ?? [])
      .filter((r) => r.name.trim())
      .map((r) => ({ value: r.name, label: r.name }));
    return [...SYSTEM_DEFAULT_RATE_OPTIONS, ...custom];
  }, [draft?.rates]);

  const canEdit = (field: PriceField) => canEditPriceField(field, access);
  const update = (patch: Partial<PriceDraft>) =>
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));

  const goBack = () => navigate(-1);

  if (!lotId) {
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

  if (lotQuery.isError) {
    return (
      <PageShell>
        <Alert variant="danger">
          {lotQuery.error instanceof Error ? lotQuery.error.message : 'Could not load the product'}
        </Alert>
        <Button type="button" variant="ghost" onClick={goBack}>
          Back
        </Button>
      </PageShell>
    );
  }

  if (!lot || !draft) {
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
  const mayEditAny = canEditAnyPriceField(access);

  const handleSubmit = () => {
    const { payload, errors: found } = buildPriceUpdate(lot, draft);
    setErrors(found);
    if (found.length > 0) return;
    if (Object.keys(payload).length === 0) {
      notifySuccess('Nothing to save');
      return;
    }
    updateLot.mutate(
      { inventoryId: lotId, payload },
      {
        onSuccess: () => notifySuccess('Prices updated'),
        onError: (err) =>
          notifyError(err instanceof Error ? err.message : 'Failed to update prices'),
      },
    );
  };

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
                  onClick={() => update({ rates: [...draft.rates, { name: '', price: 0 }] })}
                >
                  Add rate
                </Button>
              </Box>
              <Text as="p" className={surfaceChrome.priceEditHint}>
                Saving replaces the full rate list—keep every rate you still need.
              </Text>

              {draft.rates.length === 0 ? (
                <Box className={surfaceChrome.priceEditEmptyRates}>
                  No custom rates yet. Add one if this product uses named price tiers.
                </Box>
              ) : (
                <Stack gap="sm">
                  <Box className={surfaceChrome.priceEditRateHead} aria-hidden>
                    <Text as="span">Name</Text>
                    <Text as="span">Price</Text>
                    <Box as="span" />
                  </Box>
                  {draft.rates.map((rate, i) => (
                    <Box key={i} className={surfaceChrome.priceEditRateRow}>
                      <Input
                        type="text"
                        value={rate.name}
                        disabled={!canEdit('rates')}
                        onChange={(e) =>
                          update({
                            rates: draft.rates.map((r, j) =>
                              j === i ? { ...r, name: e.target.value } : r,
                            ),
                          })
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
                          update({
                            rates: draft.rates.map((r, j) =>
                              j === i ? { ...r, price: Number(e.target.value) || 0 } : r,
                            ),
                          })
                        }
                        className={surfaceChrome.priceEditRatePrice}
                        placeholder="0.00"
                        aria-label={`Rate ${i + 1} price`}
                      />
                      <IconButton
                        type="button"
                        size="sm"
                        disabled={!canEdit('rates')}
                        onClick={() => update({ rates: draft.rates.filter((_, j) => j !== i) })}
                        label={`Remove rate ${rate.name || i + 1}`}
                      >
                        ×
                      </IconButton>
                    </Box>
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
                  value={draft.defaultRate}
                  disabled={!canEdit('defaultRate')}
                  onChange={(e) => update({ defaultRate: e.target.value })}
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
              disabled={!mayEditAny || updateLot.isPending}
              onClick={handleSubmit}
            >
              {updateLot.isPending ? 'Saving…' : 'Save'}
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
