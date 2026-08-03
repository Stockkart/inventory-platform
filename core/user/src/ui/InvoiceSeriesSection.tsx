import { useEffect, useState } from 'react';
import { Hash } from 'lucide-react';
import { useNotify } from '@inventory-platform/session';
import {
  Alert,
  Box,
  Button,
  CenteredLoader,
  FormField,
  Inline,
  Stack,
  Text,
  cn,
  surfaceChrome,
} from '@inventory-platform/ui-kit';
import { shopsApi } from '../api/shops.api';
import { previewNextInvoiceNo, type InvoiceSeriesResponse } from '@inventory-platform/user/types';

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <Box className={surfaceChrome.profileField}>
      <Text as="p" className={surfaceChrome.profileFieldLabel}>
        {label}
      </Text>
      <Text as="p" className={surfaceChrome.profileFieldValue}>
        {value}
      </Text>
    </Box>
  );
}

export function InvoiceSeriesSection() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [series, setSeries] = useState<InvoiceSeriesResponse | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [lastInvoiceNo, setLastInvoiceNo] = useState('');
  const { success: notifySuccess, error: notifyError } = useNotify;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await shopsApi.getInvoiceSeries();
        if (!cancelled) {
          setSeries(data);
          setLoadError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load invoice numbering');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const livePreview = migrating ? previewNextInvoiceNo(lastInvoiceNo) : null;

  const handleSaveMigrate = async () => {
    if (!lastInvoiceNo.trim()) {
      notifyError('Enter your last invoice number');
      return;
    }
    if (!previewNextInvoiceNo(lastInvoiceNo)) {
      notifyError('Invoice number must end with digits (e.g. SL-0152)');
      return;
    }
    setSaving(true);
    try {
      const updated = await shopsApi.updateInvoiceSeries({ lastInvoiceNo: lastInvoiceNo.trim() });
      setSeries(updated);
      setMigrating(false);
      setLastInvoiceNo('');
      notifySuccess('Invoice numbering updated');
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Failed to update invoice numbering');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefault = async () => {
    setSaving(true);
    try {
      const updated = await shopsApi.updateInvoiceSeries({ useStockKartDefault: true });
      setSeries(updated);
      setMigrating(false);
      setLastInvoiceNo('');
      notifySuccess('Reset to StockKart numbering');
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Failed to reset invoice numbering');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box className={cn(surfaceChrome.profileCard, surfaceChrome.profileCardNarrow)}>
        <CenteredLoader label="Loading…" minHeight="10rem" />
      </Box>
    );
  }

  if (loadError) {
    return (
      <Box className={cn(surfaceChrome.profileCard, surfaceChrome.profileCardNarrow)}>
        <Box className={surfaceChrome.profileBody}>
          <Alert variant="danger">{loadError}</Alert>
        </Box>
      </Box>
    );
  }

  if (!series) return null;

  const formatLabel = series.prefix
    ? `${series.prefix} + ${series.padLength} digits`
    : `${series.padLength}-digit number`;
  const sourceLabel =
    series.source === 'MIGRATED' ? 'Continued from previous app' : 'StockKart default';
  const statusLabel = series.locked ? 'Locked for this year' : 'Editable until first invoice';

  return (
    <Box className={cn(surfaceChrome.profileCard, surfaceChrome.profileCardNarrow)}>
      <Box className={surfaceChrome.profileHero}>
        <Box className={surfaceChrome.profileHeroMain}>
          <Box as="span" className={surfaceChrome.profileHeroIcon} aria-hidden>
            <Hash size={20} strokeWidth={2.1} />
          </Box>
          <Box className={surfaceChrome.profileHeroText}>
            <Text as="p" className={surfaceChrome.profileSectionLabel}>
              Next invoice
            </Text>
            <Text as="h2" className={surfaceChrome.profileHeroTitle}>
              {series.nextPreview}
            </Text>
            <Text as="p" className={surfaceChrome.profileHeroTagline}>
              FY {series.currentFy} · resets 1 April
            </Text>
          </Box>
        </Box>
        {series.locked ? (
          <Box as="span" className={surfaceChrome.invoiceDefaultBadge}>
            Locked
          </Box>
        ) : null}
      </Box>

      <Box className={surfaceChrome.profileBody}>
        <Box className={surfaceChrome.profileSection}>
          <Text as="p" className={surfaceChrome.profileSectionLabel}>
            Details
          </Text>
          <Box className={surfaceChrome.profileFieldGrid}>
            <MetaField label="Format" value={formatLabel} />
            <MetaField label="Status" value={statusLabel} />
            <MetaField label="Source" value={sourceLabel} />
          </Box>
        </Box>

        {series.locked ? (
          <Text variant="caption" color="secondary">
            Format stays the same next year; the counter starts again at 1.
          </Text>
        ) : migrating ? (
          <Box className={surfaceChrome.profileSection}>
            <Text as="p" className={surfaceChrome.profileSectionLabel}>
              Continue from previous app
            </Text>
            <Stack gap="sm">
              <FormField
                label="Last invoice number"
                id="lastInvoiceNo"
                placeholder="e.g. SL-0152"
                value={lastInvoiceNo}
                onChange={setLastInvoiceNo}
                disabled={saving}
                hint={livePreview ? `Next will be ${livePreview}` : undefined}
              />
              <Inline gap="sm" className={surfaceChrome.profileEditActions}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setMigrating(false);
                    setLastInvoiceNo('');
                  }}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="solid"
                  onClick={() => void handleSaveMigrate()}
                  disabled={saving}
                  loading={saving}
                >
                  Save
                </Button>
              </Inline>
            </Stack>
          </Box>
        ) : (
          <Inline gap="sm">
            <Button type="button" variant="outline" size="sm" onClick={() => setMigrating(true)}>
              Continue from previous app
            </Button>
            {series.source === 'MIGRATED' ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void handleResetDefault()}
                disabled={saving}
              >
                Use StockKart default
              </Button>
            ) : null}
          </Inline>
        )}
      </Box>
    </Box>
  );
}
