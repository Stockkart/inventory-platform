import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import type { InventoryItem } from '@inventory-platform/product/types';
import { InventoryAlertDetails } from '@inventory-platform/product';
import { PaginationBar } from '@inventory-platform/ui-kit';
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
  const [detailFallback, setDetailFallback] = useState<InventoryItem | null>(
    null
  );
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

  useEffect(() => {
    if (!inventoryIdFromNotification || alerts.length === 0) return;
    const found = alerts.find((a) => a.id === inventoryIdFromNotification);
    if (found) openInventoryDetails(found.raw);
  }, [inventoryIdFromNotification, alerts]);

  if (isLoading) return <p>Loading…</p>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>Inventory Low Alert</h2>
        <p className={styles.subtitle}>
          Monitor products with low stock levels
        </p>
      </div>

      <div className={styles.alertsContainer}>
        <div className={styles.alertsHeader}>
          <div className={styles.headerInfo}>
            <span className={styles.alertCount}>
              {alerts.length} items need attention
            </span>
          </div>
        </div>

        <div className={styles.alertsList}>
          {alerts.map((alert: LowStockAlertRow) => (
            <div
              key={alert.id}
              className={`${styles.alertCard} ${styles[alert.status]}`}
            >
              <div className={styles.alertIcon}>
                {alert.status === 'critical' ? '🔴' : '🟡'}
              </div>

              <div className={styles.alertInfo}>
                <h3 className={styles.alertProduct}>{alert.product}</h3>

                <div className={styles.alertDetails}>
                  <span>
                    Current Stock: <strong>{alert.current}</strong>
                  </span>
                  <span>
                    Threshold: <strong>{alert.threshold}</strong>
                  </span>
                </div>

                <div className={styles.stockBar}>
                  <div
                    className={styles.stockFill}
                    style={{
                      width: `${Math.min(
                        (alert.current / alert.threshold) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className={styles.alertActions}>
                <button
                  className={styles.actionBtnSecondary}
                  onClick={() => openInventoryDetails(alert.raw)}
                  disabled={detailLoading}
                >
                  View Details
                </button>
                <button
                  className={styles.actionBtn}
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
                </button>
              </div>
            </div>
          ))}
        </div>
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
      </div>
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

      {thresholdModal.open && (
        <div
          className={styles.modalBackdrop}
          onClick={() =>
            setThresholdModal({ open: false, item: null, threshold: 10 })
          }
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Configure Threshold</h3>
              <button
                className={styles.closeBtn}
                onClick={() =>
                  setThresholdModal({ open: false, item: null, threshold: 10 })
                }
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <p>
                <strong>Product:</strong>{' '}
                {thresholdModal.item?.name ??
                  thresholdModal.item?.barcode ??
                  'Unknown'}
              </p>
              <p>
                <strong>Current Stock:</strong>{' '}
                {thresholdModal.item?.currentCount ?? 0}
              </p>
              <p>
                <strong>Current Threshold:</strong>{' '}
                {thresholdModal.item?.thresholdCount ?? 10}
              </p>

              <div style={{ marginTop: '1.5rem' }}>
                <label className={styles.label} htmlFor="threshold">
                  New Threshold Count
                </label>
                <input
                  id="threshold"
                  type="number"
                  min="1"
                  className={styles.input}
                  value={thresholdModal.threshold}
                  onChange={(e) =>
                    setThresholdModal({
                      ...thresholdModal,
                      threshold: parseInt(e.target.value, 10) || 1,
                    })
                  }
                  disabled={updateThresholdMutation.isPending}
                />
              </div>

              <div className={styles.modalActions}>
                <button
                  className={styles.secondaryBtn}
                  onClick={() =>
                    setThresholdModal({
                      open: false,
                      item: null,
                      threshold: 10,
                    })
                  }
                  disabled={updateThresholdMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  className={styles.primaryBtn}
                  onClick={() => {
                    const id = resolveInventoryDocumentId(thresholdModal.item);
                    if (!id) return;

                    void updateThresholdMutation
                      .mutateAsync({
                        inventoryId: id,
                        thresholdCount: thresholdModal.threshold,
                      })
                      .then(() => {
                        setThresholdModal({
                          open: false,
                          item: null,
                          threshold: 10,
                        });
                      });
                  }}
                  disabled={updateThresholdMutation.isPending}
                >
                  {updateThresholdMutation.isPending
                    ? 'Updating...'
                    : 'Update Threshold'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
