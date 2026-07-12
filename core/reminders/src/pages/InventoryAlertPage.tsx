import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useLocation } from 'react-router';
import type { InventoryItem } from '@inventory-platform/product/types';
import { InventoryAlertDetails } from '@inventory-platform/product';
import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  CenteredLoader,
  EmptyState,
  FormField,
  Inline,
  Input,
  Modal,
  PageHeader,
  PaginationBar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Text,
  surfaceChrome,
  cn,
} from '@inventory-platform/ui-kit';
import { useAuthStore, useShopAccessStore } from '@inventory-platform/session';
import { useNotify } from '@inventory-platform/session';
import { resolveInventoryDocumentId } from '../api/inventory-alert.api';
import { mapLowStockItems, type LowStockAlertRow } from '../model/inventory-alert-utils';
import {
  useInventoryItemQuery,
  useLowStockAlertsQuery,
  useUpdateThresholdMutation,
} from '../queries/hooks';

function fillPercent(current: number, threshold: number) {
  if (threshold <= 0) return 0;
  return Math.min(Math.max((current / threshold) * 100, 0), 100);
}

export function InventoryAlertPage() {
  const location = useLocation();
  const { user } = useAuthStore();
  const productSearchAccess = useShopAccessStore((s) =>
    user?.shopId ? s.byShopId[user.shopId]?.productSearch : undefined,
  );
  const inventoryIdFromNotification =
    location.state?.fromNotification === true
      ? (location.state?.inventoryId as string | undefined)
      : undefined;
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [detailItemId, setDetailItemId] = useState<string | null>(null);
  const [detailFallback, setDetailFallback] = useState<InventoryItem | null>(null);
  const [thresholdModal, setThresholdModal] = useState<{
    open: boolean;
    item: InventoryItem | null;
    threshold: number;
  }>({
    open: false,
    item: null,
    threshold: 10,
  });
  const { error: notifyError } = useNotify;

  const { data: lowStockData, isLoading } = useLowStockAlertsQuery(page, size);
  const { data: detailItem, isLoading: detailLoading } = useInventoryItemQuery(detailItemId, {
    retry: false,
  });
  const updateThresholdMutation = useUpdateThresholdMutation({
    onError: (err) =>
      notifyError(err instanceof Error ? err.message : 'Failed to update threshold'),
  });

  const alerts = useMemo(() => mapLowStockItems(lowStockData?.data ?? []), [lowStockData?.data]);
  const totalPages = lowStockData?.page?.totalPages ?? 0;
  const totalItems = lowStockData?.page?.totalItems ?? alerts.length;
  const selected = detailItem ?? detailFallback;

  const criticalCount = useMemo(
    () => alerts.filter((a) => a.status === 'critical').length,
    [alerts],
  );
  const lowCount = alerts.length - criticalCount;

  const openInventoryDetails = (raw: InventoryItem) => {
    const id = resolveInventoryDocumentId(raw);
    if (!id) return;
    setDetailFallback(raw);
    setDetailItemId(id);
  };

  const closeThresholdModal = () => {
    setThresholdModal({ open: false, item: null, threshold: 10 });
  };

  useEffect(() => {
    if (!inventoryIdFromNotification || alerts.length === 0) return;
    const found = alerts.find((a) => a.id === inventoryIdFromNotification);
    if (found) openInventoryDetails(found.raw);
  }, [inventoryIdFromNotification, alerts]);

  const productLabel = thresholdModal.item?.name ?? thresholdModal.item?.barcode ?? 'Unknown';
  const attentionCopy = isLoading
    ? 'Loading alerts…'
    : alerts.length === 0
    ? 'Nothing needs attention right now.'
    : `${alerts.length} item${alerts.length === 1 ? '' : 's'} need attention` +
      (alerts.length > 0 ? ` · ${criticalCount} critical · ${lowCount} low` : '');

  return (
    <Stack gap="md" width="full" maxWidth="xl" mx="auto">
      <PageHeader description={`Monitor products with low stock levels. ${attentionCopy}`} />

      {isLoading ? (
        <CenteredLoader label="Loading low stock alerts…" />
      ) : alerts.length === 0 ? (
        <EmptyState
          title="No low stock alerts"
          description="All tracked products are above their thresholds."
        />
      ) : (
        <Card>
          <CardBody>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Product</TableHeaderCell>
                  <TableHeaderCell>Stock</TableHeaderCell>
                  <TableHeaderCell>Threshold</TableHeaderCell>
                  <TableHeaderCell>Level</TableHeaderCell>
                  <TableHeaderCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {alerts.map((alert: LowStockAlertRow) => {
                  const fillPct = fillPercent(alert.current, alert.threshold);
                  return (
                    <TableRow key={alert.id}>
                      <TableCell>
                        <Badge variant={alert.status === 'critical' ? 'danger' : 'warning'}>
                          {alert.status === 'critical' ? 'Critical' : 'Low'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Box className={surfaceChrome.stockAlertProductCell}>
                          <Text as="p" className={surfaceChrome.stockAlertProductName}>
                            {alert.product}
                          </Text>
                        </Box>
                      </TableCell>
                      <TableCell className={surfaceChrome.stockAlertNumCell}>
                        {alert.current}
                      </TableCell>
                      <TableCell className={surfaceChrome.stockAlertNumCell}>
                        {alert.threshold}
                      </TableCell>
                      <TableCell>
                        <Box className={surfaceChrome.stockAlertTableProgress}>
                          <Box className={surfaceChrome.stockAlertTableProgressTrack}>
                            <Box
                              className={cn(
                                surfaceChrome.progressFill,
                                alert.status === 'critical'
                                  ? surfaceChrome.progressFillCritical
                                  : surfaceChrome.progressFillWarning,
                              )}
                              style={
                                {
                                  ['--sk-progress']: `${fillPct}%`,
                                } as CSSProperties
                              }
                            />
                          </Box>
                          <Text as="span" className={surfaceChrome.stockAlertTablePct}>
                            {Math.round(fillPct)}%
                          </Text>
                        </Box>
                      </TableCell>
                      <TableCell className={surfaceChrome.stockAlertActionsCell}>
                        <Inline gap="xs" justify="end">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => openInventoryDetails(alert.raw)}
                            disabled={detailLoading}
                          >
                            Details
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setThresholdModal({
                                open: true,
                                item: alert.raw,
                                threshold: alert.raw?.thresholdCount ?? alert.threshold ?? 10,
                              })
                            }
                          >
                            Threshold
                          </Button>
                        </Inline>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      )}

      {!isLoading && alerts.length > 0 ? (
        <PaginationBar
          page={page}
          totalPages={Math.max(totalPages, 1)}
          totalItems={totalItems}
          disabled={isLoading}
          onPageChange={setPage}
          pageSize={size}
          pageSizeOptions={[10, 20, 50]}
          onPageSizeChange={(n) => {
            setPage(0);
            setSize(n);
          }}
          aria-label="Low stock alert pages"
        />
      ) : null}

      <InventoryAlertDetails
        open={!!selected}
        item={selected}
        onClose={() => {
          setDetailItemId(null);
          setDetailFallback(null);
        }}
        editable
        productSearchAccess={productSearchAccess}
        onUpdated={(updated) => {
          setDetailFallback(updated);
          setDetailItemId(resolveInventoryDocumentId(updated));
        }}
      />

      <Modal open={thresholdModal.open} onClose={closeThresholdModal} size="sm">
        <Modal.Header title="Set threshold" onClose={closeThresholdModal} />
        <Modal.Body>
          <Stack gap="md">
            <Box className={surfaceChrome.stockAlertModalMeta}>
              <Box className={surfaceChrome.stockAlertModalMetaCard}>
                <Text as="p" className={surfaceChrome.stockAlertLabel}>
                  Product
                </Text>
                <Text as="p" className={surfaceChrome.stockAlertValue}>
                  {productLabel}
                </Text>
              </Box>
              <Box className={surfaceChrome.stockAlertModalMetaCard}>
                <Text as="p" className={surfaceChrome.stockAlertLabel}>
                  Current stock
                </Text>
                <Text as="p" className={surfaceChrome.stockAlertValue}>
                  {thresholdModal.item?.currentCount ?? 0}
                </Text>
              </Box>
              <Box className={surfaceChrome.stockAlertModalMetaCard}>
                <Text as="p" className={surfaceChrome.stockAlertLabel}>
                  Current threshold
                </Text>
                <Text as="p" className={surfaceChrome.stockAlertValue}>
                  {thresholdModal.item?.thresholdCount ?? 10}
                </Text>
              </Box>
            </Box>
            <FormField label="New threshold" htmlFor="stock-alert-threshold">
              <Input
                id="stock-alert-threshold"
                type="number"
                min={1}
                value={String(thresholdModal.threshold)}
                disabled={updateThresholdMutation.isPending}
                onChange={(e) =>
                  setThresholdModal({
                    ...thresholdModal,
                    threshold: Math.max(1, parseInt(e.target.value, 10) || 1),
                  })
                }
              />
            </FormField>
          </Stack>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="outline"
            onClick={closeThresholdModal}
            disabled={updateThresholdMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="solid"
            loading={updateThresholdMutation.isPending}
            onClick={() => {
              const id = resolveInventoryDocumentId(thresholdModal.item);
              if (!id) return;

              void updateThresholdMutation
                .mutateAsync({
                  inventoryId: id,
                  thresholdCount: thresholdModal.threshold,
                })
                .then(closeThresholdModal);
            }}
          >
            Update threshold
          </Button>
        </Modal.Footer>
      </Modal>
    </Stack>
  );
}
