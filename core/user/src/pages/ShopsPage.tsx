import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuthStore } from '@inventory-platform/store';
import { usersApi } from '@inventory-platform/api';
import type { ShopMembership } from '@inventory-platform/types';
import styles from './shops.module.css';

export function meta() {
  return [
    { title: 'Shops - StockKart' },
    { name: 'description', content: 'Manage your shops and switch between them' },
  ];
}

export function ShopsPage() {
  const navigate = useNavigate();
  const { user, switchActiveShop } = useAuthStore();
  const [shops, setShops] = useState<ShopMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const activeShopId = user?.shopId ?? null;

  useEffect(() => {
    const loadShops = async () => {
      setLoading(true);
      setError(null);
      try {
        const list = await usersApi.getMyShops();
        setShops(list);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load shops');
      } finally {
        setLoading(false);
      }
    };

    loadShops();
  }, [user?.userId]);

  const handleSwitch = async (shopId: string) => {
    if (shopId === activeShopId) return;
    setSwitchingId(shopId);
    setError(null);
    try {
      await switchActiveShop(shopId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch shop');
    } finally {
      setSwitchingId(null);
    }
  };

  const handleAddShop = () => {
    navigate('/onboarding', { state: { addShop: true } });
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading shops...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Your Shops</h1>
        <p className={styles.subtitle}>
          Switch between your shops or add a new one
        </p>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.content}>
        <div className={styles.shopGrid}>
          {shops.map((s) => {
            const isActive = s.shopId === activeShopId;
            return (
              <div
                key={s.shopId}
                className={`${styles.shopCard} ${isActive ? styles.active : ''}`}
              >
                <div className={styles.shopCardHeader}>
                  <span className={styles.shopIcon}>🏪</span>
                  <h2 className={styles.shopName}>{s.shopName}</h2>
                </div>
                <div className={styles.shopMeta}>
                  <span className={styles.role}>{s.role}</span>
                  {s.relationship && (
                    <span className={styles.relationship}>{s.relationship}</span>
                  )}
                </div>
                {isActive ? (
                  <span className={styles.activeBadge}>Current shop</span>
                ) : (
                  <button
                    type="button"
                    className={styles.switchBtn}
                    onClick={() => handleSwitch(s.shopId)}
                    disabled={!!switchingId}
                  >
                    {switchingId === s.shopId ? 'Switching…' : 'Use this shop'}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <button type="button" className={styles.addBtn} onClick={handleAddShop}>
          + Add another shop
        </button>
      </div>
    </div>
  );
}
