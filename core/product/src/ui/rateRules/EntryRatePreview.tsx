import { useEffect, useState } from 'react';
import { Box, Text, surfaceChrome } from '@inventory-platform/ui-kit';
import { useRateRulesPreviewQuery } from '../../queries/rateRules.queries';
import type { RateRulesPreviewRequest } from '../../model/rateRules.types';
import { GeneratedRatesList } from './GeneratedRatesList';

const PREVIEW_DEBOUNCE_MS = 400;

function noop() {
  /* a new batch's generated rates are read-only */
}

function hasBase(request: RateRulesPreviewRequest): boolean {
  return (
    request.sellingPrice != null ||
    request.priceToRetail != null ||
    request.maximumRetailPrice != null ||
    request.costPrice != null
  );
}

/**
 * Rates the shop's rules will generate for the batch being entered, straight from the preview
 * endpoint. Read-only: terms can only be overridden on a saved batch (price edit page).
 */
export function EntryRatePreview({ request }: { request: RateRulesPreviewRequest }) {
  const key = JSON.stringify(request);
  const [debounced, setDebounced] = useState(request);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(JSON.parse(key)), PREVIEW_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [key]);

  const query = useRateRulesPreviewQuery(debounced, hasBase(debounced));
  const rates = query.data?.rates ?? [];
  const skipped = query.data?.skipped ?? [];
  if (rates.length === 0 && skipped.length === 0 && !query.isError) return null;

  return (
    <Box>
      <Text as="span" weight="semibold">
        Generated rates
      </Text>
      <Text as="p" variant="caption" color="secondary" className={surfaceChrome.priceEditHint}>
        Worked out by the server from the prices above when the batch is saved.
      </Text>
      {query.isError ? (
        <Text as="p" variant="caption" color="danger">
          Could not load the generated rates.
        </Text>
      ) : null}
      <GeneratedRatesList
        rates={rates}
        skipped={skipped}
        canEdit={false}
        onEditTerms={noop}
        onReset={noop}
      />
    </Box>
  );
}
