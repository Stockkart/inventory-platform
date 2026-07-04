import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuthStore } from '@inventory-platform/session';
import type { ShopMembership } from '@inventory-platform/types';
import styles from './UserMenuShopSection.module.css';

export interface UserMenuShopSectionProps {
  onClose?: () => void;
}

export function UserMenuShopSection({ onClose }: UserMenuShopSectionProps) {
  const navigate = useNavigate();
  const { user, shop, switchActiveShop, isLoading } = useAuthStore();
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const shops = user?.shops ?? [];
  const activeShopId = user?.shopId ?? null;
  const activeShopName =
    shop?.name ??
    shops.find((s) => s.shopId === activeShopId)?.shopName ??
    'Current shop';

  const otherShops = shops.filter((s) => s.shopId !== activeShopId);

  const handleSwitch = async (membership: ShopMembership) => {
    if (membership.shopId === activeShopId || isLoading) {
      return;
    }
    setSwitchingId(membership.shopId);
    try {
      await switchActiveShop(membership.shopId);
      onClose?.();
    } catch {
      // Error surfaced via auth store
    } finally {
      setSwitchingId(null);
    }
  };

  const goToShops = () => {
    onClose?.();
    navigate('/dashboard/shops');
  };

  const goToAddShop = () => {
    onClose?.();
    navigate('/onboarding', { state: { addShop: true } });
  };

  return (
    <div className={styles.section}>
      <div className={styles.currentBlock}>
        <span className={styles.sectionLabel}>Current shop</span>
        <div className={styles.currentShop}>
          <span className={styles.shopIcon} aria-hidden>
            🏪
          </span>
          <span className={styles.currentShopName}>{activeShopName}</span>
          <span className={styles.activeTag}>Active</span>
        </div>
      </div>

      {otherShops.length > 0 && (
        <div className={styles.switchBlock}>
          <span className={styles.sectionLabel}>Switch shop</span>
          <div className={styles.shopList}>
            {otherShops.map((membership) => {
              const isSwitching = switchingId === membership.shopId;
              return (
                <button
                  key={membership.shopId}
                  type="button"
                  className={styles.shopOption}
                  onClick={() => void handleSwitch(membership)}
                  disabled={isLoading || isSwitching}
                >
                  <span className={styles.shopOptionName}>
                    {membership.shopName}
                  </span>
                  <span className={styles.shopOptionRole}>{membership.role}</span>
                  <span className={styles.switchHint}>
                    {isSwitching ? 'Switching…' : 'Use this shop'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.actionBtn}
          onClick={goToShops}
        >
          Manage shops
        </button>
        <button
          type="button"
          className={styles.actionBtnPrimary}
          onClick={goToAddShop}
        >
          + Add shop
        </button>
      </div>
    </div>
  );
}
