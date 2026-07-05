import { useState, FormEvent, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router';
import { pricingApi } from '../api/pricing.api';
import { useNotify } from '@inventory-platform/session';
import type { PricingRate } from '@inventory-platform/types';
import styles from '././price-edit.module.css';

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

interface LocationState {
  priceToRetail?: number | null;
  maximumRetailPrice?: number | null;
  productName?: string | null;
  rates?: PricingRate[] | null;
  defaultRate?: string | null;
}

export function PriceEditPage() {
  const { pricingId } = useParams<{ pricingId: string }>();
  const location = useLocation();
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

  // Fetch current pricing on mount to get full rates (avoid accidentally removing rates)
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
        // Fallback to location state if fetch fails (e.g. GET not implemented)
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!pricingId) return;

    const ptr = priceToRetail.trim() ? parseFloat(priceToRetail) : undefined;
    const mrp = maximumRetailPrice.trim()
      ? parseFloat(maximumRetailPrice)
      : undefined;

    const hasRates = rates.length > 0;
    const ratesValid = !hasRates || rates.every((r) => r.name.trim() && !isNaN(r.price) && r.price >= 0);
    const systemRates = ['maximumRetailPrice', 'priceToRetail', 'costPrice'];
    const defaultRateValid =
      !defaultRate.trim() ||
      systemRates.includes(defaultRate.trim()) ||
      rates.some((r) => r.name.trim() === defaultRate.trim());

    const sendingRates = hasRates || loadedFromApi;
    if (
      ptr === undefined &&
      mrp === undefined &&
      !sendingRates &&
      !defaultRate.trim()
    ) {
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
      setError('Default rate must be maximumRetailPrice, priceToRetail, costPrice, or a custom rate name');
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
    // Always send full rates array when changing rates—backend replaces entirely; omitted rates are removed
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
      const message =
        err instanceof Error ? err.message : 'Failed to update pricing';
      notifyError(message);
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (!pricingId) {
    return (
      <div className={styles.page}>
        <h2 className={styles.title}>Edit Price</h2>
        <p className={styles.error}>No pricing ID provided.</p>
        <Link to="/dashboard/pricing" className={styles.backLink}>
          ← Back to Pricing
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <h2 className={styles.title}>Edit Price</h2>
        <p className={styles.subtitle}>Loading pricing…</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h2 className={styles.title}>Edit Price</h2>
      {state?.productName && (
        <p className={styles.subtitle}>Product: {state.productName}</p>
      )}
      <p className={styles.pricingIdLabel}>
        Pricing ID: <code className={styles.pricingId}>{pricingId}</code>
      </p>

      <form onSubmit={handleSubmit} className={styles.form}>
        {error && <p className={styles.formError}>{error}</p>}
        <div className={styles.formGroup}>
          <label htmlFor="priceToRetail" className={styles.label}>
            Price to Retailer (PTR)
          </label>
          <input
            id="priceToRetail"
            type="number"
            step="0.01"
            min="0"
            value={priceToRetail}
            onChange={(e) => setPriceToRetail(e.target.value)}
            className={styles.input}
            placeholder="e.g. 29.99"
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="maximumRetailPrice" className={styles.label}>
            Maximum Retail Price (MRP)
          </label>
          <input
            id="maximumRetailPrice"
            type="number"
            step="0.01"
            min="0"
            value={maximumRetailPrice}
            onChange={(e) => setMaximumRetailPrice(e.target.value)}
            className={styles.input}
            placeholder="e.g. 40.00"
          />
        </div>

        <div className={styles.ratesSection}>
          <div className={styles.ratesHeader}>
            <label className={styles.label}>Rates</label>
            <button
              type="button"
              onClick={addRate}
              className={styles.addRateBtn}
            >
              + Add rate
            </button>
          </div>
          <p className={styles.ratesHint}>
            Sending rates replaces the entire list. Include all rates you want to keep; any omitted will be removed.
          </p>
          {rates.map((rate, i) => (
            <div key={i} className={styles.rateRow}>
              <input
                type="text"
                value={rate.name}
                onChange={(e) => updateRate(i, 'name', e.target.value)}
                className={styles.rateNameInput}
                placeholder="Rate name"
              />
              <input
                type="number"
                step="0.01"
                min="0"
                value={rate.price || ''}
                onChange={(e) => updateRate(i, 'price', e.target.value)}
                className={styles.ratePriceInput}
                placeholder="Price"
              />
              <button
                type="button"
                onClick={() => removeRate(i)}
                className={styles.removeRateBtn}
                aria-label="Remove rate"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="defaultRate" className={styles.label}>
            Default rate
          </label>
          <select
            id="defaultRate"
            value={defaultRate}
            onChange={(e) => setDefaultRate(e.target.value)}
            className={styles.input}
          >
            <option value="">— None —</option>
            <option value="maximumRetailPrice">maximumRetailPrice (MRP)</option>
            <option value="priceToRetail">priceToRetail (PTR)</option>
            <option value="costPrice">costPrice</option>
            {rates
              .filter((r) => r.name.trim())
              .map((r) => (
                <option key={r.name} value={r.name}>
                  {r.name}
                </option>
              ))}
          </select>
          <span className={styles.hint}>
            System rates (PTR, MRP) or one of the custom rate names above.
          </span>
        </div>

        <p className={styles.hint}>
          At least one field is required. When changing rates, always send the full list.
        </p>
        <div className={styles.formActions}>
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <Link to="/dashboard/pricing" className={styles.backLink}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
