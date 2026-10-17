import { RotateCcw } from 'lucide-react';
import {
  Alert,
  Box,
  Button,
  CenteredLoader,
  ColumnList,
  Inline,
  Stack,
  Text,
  surfaceChrome,
} from '@inventory-platform/ui-kit';
import { GRID_IDS } from '../../model/gridLayout.types';
import type { GridLayoutChange } from '../../model/gridLayout.types';
import {
  useChangeGridLayoutMutation,
  useGridLayoutQuery,
  useResetGridLayoutMutation,
} from '../../queries/gridLayout.queries';
import { stepMove, layoutColumns } from '../../lib/gridLayoutModel';

/**
 * Profile → Product entry columns: the shop's shared product entry layout, every column at once.
 * Show/hide applies to grid and list view; order and width apply to grid view. Each change saves
 * straight away, like the grid. Owners and admins edit; everyone else sees it read-only.
 */
export function ProductEntryColumnsSection() {
  const gridId = GRID_IDS.PRODUCT_ENTRY;
  const layoutQuery = useGridLayoutQuery(gridId);
  const changeMutation = useChangeGridLayoutMutation(gridId);
  const resetMutation = useResetGridLayoutMutation(gridId);

  if (layoutQuery.isError) {
    return (
      <Alert variant="danger">
        <Inline gap="sm" align="center" justify="between">
          <Text as="span">Could not load the product entry columns.</Text>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void layoutQuery.refetch()}
          >
            Retry
          </Button>
        </Inline>
      </Alert>
    );
  }
  const layout = layoutQuery.data;
  if (!layout) {
    return <CenteredLoader />;
  }

  const canEdit = layout.canEdit;
  const labels = new Map(layout.catalog.map((c) => [c.key, c.label]));
  // Every catalog column, so settings show columns of every billing and pricing mode.
  const columns = layoutColumns(
    layout.columns.map((c) => c.key),
    layout,
  );
  const send = (change: GridLayoutChange | null) => {
    if (change) {
      changeMutation.mutate(change);
    }
  };
  const error = changeMutation.error ?? resetMutation.error;
  const busy = changeMutation.isPending || resetMutation.isPending;

  return (
    <Box className={surfaceChrome.invoiceSettingsCard}>
      <Box className={surfaceChrome.invoiceSettingsHeader}>
        <Box className={surfaceChrome.invoiceSettingsHeaderText}>
          <Text as="h2" className={surfaceChrome.invoiceSettingsTitle}>
            Product entry columns
          </Text>
          <Text as="p" className={surfaceChrome.invoiceSettingsSubtitle}>
            Choose the columns everyone in this shop sees on Product Entry. Hidden columns are
            hidden in grid and list view; order and width apply to grid view. Columns with a lock
            are required and cannot be hidden. Some columns only appear for certain billing or
            pricing modes.
          </Text>
        </Box>
        {canEdit ? (
          <Box className={surfaceChrome.invoiceSettingsHeaderActions}>
            <Button
              type="button"
              variant="outline"
              leftIcon={<RotateCcw size={14} />}
              onClick={() => resetMutation.mutate()}
              disabled={busy}
              loading={resetMutation.isPending}
            >
              Reset to defaults
            </Button>
          </Box>
        ) : null}
      </Box>
      <Stack gap="md" padding="lg">
        {!canEdit ? (
          <Alert variant="info">Only the shop owner or an admin can change these columns.</Alert>
        ) : null}
        {error ? (
          <Alert variant="danger">
            {error.message || 'Could not save the column layout. Please try again.'}
          </Alert>
        ) : null}
        <ColumnList
          columns={columns.map((col) => ({
            key: col.key,
            label: labels.get(col.key) ?? col.key,
            hidden: col.hidden,
            locked: !col.hideable,
            movable: col.reorderable,
            widthPx: col.widthPx,
            minWidthPx: col.minWidthPx,
            maxWidthPx: col.maxWidthPx,
          }))}
          onMove={(key, direction) => send(stepMove(columns, key, direction))}
          onToggleHidden={(key, hidden) => send({ type: 'SET_HIDDEN', key, hidden })}
          onWidthChange={(key, widthPx) => send({ type: 'RESIZE', key, widthPx })}
          disabled={!canEdit}
        />
      </Stack>
    </Box>
  );
}
