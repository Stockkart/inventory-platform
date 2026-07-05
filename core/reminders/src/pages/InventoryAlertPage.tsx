import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import type { InventoryItem } from '@inventory-platform/product/types';
import { InventoryAlertDetails } from '@inventory-platform/product';
import {
  Box,
  Button,
  CenteredLoader,
  FormField,
  Inline,
  Modal,
  PageHeader,
  PaginationBar,
  Stack,
  Text,
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
import styles from './inventory-alert.module.css';

export function InventoryAlertPage() {
  const location = useLocation();
  const { user } = useAuthStore();
  const productSearchAccess = useShopAccessStore((s) =>
    user?.shopId ? s.byShopId[user.shopId]?.productSearch : undefined
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
  const { data: detailItem, isLoading: detailLoading } = useInventoryItemQuery(
    detailItemId,
    { retry: false }
  );
  const updateThresholdMutation = useUpdateThresholdMutation({
    onError: (err) =>
      notifyError(
        err instanceof Error ? err.message : 'Failed to update threshold'
      ),
  });

  const alerts = useMemo(
    () => mapLowStockItems(lowStockData?.data ?? []),
    [lowStockData?.data]
  );
  const totalPages = lowStockData?.page?.totalPages ?? 0;
  const totalItems = lowStockData?.page?.totalItems ?? alerts.length;
  const selected = detailItem ?? detailFallback;

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

  const productLabel =
    thresholdModal.item?.name ?? thresholdModal.item?.barcode ?? 'Unknown';

  return (
    <Stack gap="md">
      <PageHeader
        title="Inventory Low Alert"
        description="Monitor products with low stock levels"
      />

      <Text color="secondary" variant="caption">
        {isLoading
          ? 'Loading alerts…'
          : `${alerts.length} item${alerts.length === 1 ? '' : 's'} need attention`}
      </Text>

      {isLoading ? (
        <CenteredLoader label="Loading low stock alerts…" />
      ) : alerts.length === 0 ? (
        <Stack align="center" justify="center" className={styles.emptyState}>
          <Text color="secondary">No low stock alerts right now.</Text>
        </Stack>
      ) : (
        <Stack gap="md" className={styles.alertsList}>
          {alerts.map((alert: LowStockAlertRow) => (
            <Box
              key={alert.id}
              className={`${styles.alertCard} ${styles[alert.status]}`}
            >
              <Box className={styles.alertIcon}>
                {alert.status === 'critical' ? '🔴' : '🟡'}
              </Box>

              <Stack gap="sm" className={styles.alertInfo}>
                <Text variant="heading3" weight="semibold" className={styles.alertProduct}>
                  {alert.product}
                </Text>

                <Inline gap="md" className={styles.alertDetails}>
                  <Text variant="caption">
                    Current Stock:{' '}
                    <Text as="span" weight="semibold">
                      {alert.current}
                    </Text>
                  </Text>
                  <Text variant="caption">
                    Threshold:{' '}
                    <Text as="span" weight="semibold">
                      {alert.threshold}
                    </Text>
                  </Text>
                </Inline>

                <Box className={styles.stockBar}>
                  <Box
                    className={styles.stockFill}
                    style={{
                      width: `${Math.min(
                        (alert.current / alert.threshold) * 100,
                        100
                      )}%`,
                    }}
                  />
                </Box>
              </Stack>

              <Inline gap="sm" className={styles.alertActions}>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => openInventoryDetails(alert.raw)}
                  disabled={detailLoading}
                >
                  View Details
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="solid"
                  onClick={() =>
                    setThresholdModal({
                      open: true,
                      item: alert.raw,
                      threshold:
                        alert.raw?.thresholdCount ?? alert.threshold ?? 10,
                    })
                  }
                >
                  Configure Threshold
                </Button>
              </Inline>
            </Box>
          ))}
        </Stack>
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
        <Modal.Header title="Configure Threshold" onClose={closeThresholdModal} />
        <Modal.Body>
          <Stack gap="md">
            <Text>
              <Text as="span" weight="semibold">
                Product:
              </Text>{' '}
              {productLabel}
            </Text>
            <Text>
              <Text as="span" weight="semibold">
                Current Stock:
              </Text>{' '}
              {thresholdModal.item?.currentCount ?? 0}
            </Text>
            <Text>
              <Text as="span" weight="semibold">
                Current Threshold:
              </Text>{' '}
              {thresholdModal.item?.thresholdCount ?? 10}
            </Text>
            <FormField
              label="New Threshold Count"
              type="number"
              value={String(thresholdModal.threshold)}
              disabled={updateThresholdMutation.isPending}
              onChange={(value) =>
                setThresholdModal({
                  ...thresholdModal,
                  threshold: Math.max(1, parseInt(value, 10) || 1),
                })
              }
            />
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
            Update Threshold
          </Button>
        </Modal.Footer>
      </Modal>
    </Stack>
  );
}
