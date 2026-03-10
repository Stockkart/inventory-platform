import { useEffect, useState } from 'react';
import styles from './dashboard.inventory-alert.module.css';
import { inventoryApi } from '@inventory-platform/api';
import { InventoryAlertDetails } from '@inventory-platform/ui';
import { useLocation } from 'react-router';

export function meta() {
  return [
    { title: 'Inventory Low Alert - StockKart' },
    { name: 'description', content: 'Monitor products with low stock levels' },
  ];
}

export default function InventoryAlertPage() {
  const location = useLocation();
  const inventoryId =
    location.state?.fromNotification === true
      ? location.state?.inventoryId
      : undefined;
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [selected, setSelected] = useState<any | null>(null);
  const [thresholdModal, setThresholdModal] = useState<{
    open: boolean;
    item: any | null;
    threshold: number;
  }>({
    open: false,
    item: null,
    threshold: 10,
  });
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    InventoryAlertLoad();
  }, [page, size]);

  useEffect(() => {
    if (!inventoryId) return;

    const found = alerts.find((a) => a.id === inventoryId);
    if (found) setSelected(found.raw);
  }, [inventoryId, alerts]);

  async function InventoryAlertLoad() {
    setLoading(true);

    try {
      const res = await inventoryApi.getLowStock(page, size);

      const items = res.data ?? [];

      const mapped = items.map((item) => {
        const current = item.currentCount ?? 0;
        const threshold = item.thresholdCount ?? 10;

        return {
          id: item.id,
          product: item.name ?? item.barcode ?? 'Unknown',
          current,
          threshold,
          status: current <= threshold / 2 ? 'critical' : 'warning',

          raw: item,
        };
      });

      setAlerts(mapped);
      setTotalPages(res.page?.totalPages ?? 0);
      setTotalItems(res.page?.totalItems ?? items.length);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <p>Loading…</p>;

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
          {alerts.map((alert, index) => (
            <div
              key={index}
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
                  onClick={() => setSelected(alert.raw)}
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
        <div className={styles.paginationBar}>
          <button
            className={styles.pageBtn}
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>

          <span className={styles.pageInfo}>
            Page {page + 1} of {totalPages} • {totalItems} items
          </span>

          <button
            className={styles.pageBtn}
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>

          <select
            className={styles.pageSizeSelect}
            value={size}
            onChange={(e) => {
              setPage(0);
              setSize(Number(e.target.value));
            }}
          >
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
            <option value={50}>50 / page</option>
          </select>
        </div>
      </div>
      <InventoryAlertDetails
        open={!!selected}
        item={selected}
        onClose={() => setSelected(null)}
        editable
        onUpdated={(updated) => {
          setAlerts((prev) =>
            prev.map((a) => (a.id === updated.id ? { ...a, raw: updated } : a))
          );
          setSelected(updated);
        }}
      />

      {/* Threshold Configuration Modal */}
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
                      threshold: parseInt(e.target.value) || 1,
                    })
                  }
                  disabled={updating}
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
                  disabled={updating}
                >
                  Cancel
                </button>
                <button
                  className={styles.primaryBtn}
                  onClick={async () => {
                    if (!thresholdModal.item?.id) return;

                    setUpdating(true);
                    try {
                      await inventoryApi.updateThreshold(
                        thresholdModal.item.id,
                        thresholdModal.threshold
                      );
                      // Reload the alerts to reflect the updated threshold
                      await InventoryAlertLoad();
                      setThresholdModal({
                        open: false,
                        item: null,
                        threshold: 10,
                      });
                    } catch (error: any) {
                      console.error('Failed to update threshold:', error);
                      alert(
                        error?.message ||
                          'Failed to update threshold. Please try again.'
                      );
                    } finally {
                      setUpdating(false);
                    }
                  }}
                  disabled={updating}
                >
                  {updating ? 'Updating...' : 'Update Threshold'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
