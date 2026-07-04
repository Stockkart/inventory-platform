import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useAuthStore } from '@inventory-platform/session';
import type { ShopMembership } from '@inventory-platform/types';
import styles from './ShopSwitcher.module.css';

export function ShopSwitcher() {
  const navigate = useNavigate();
  const { user, shop, switchActiveShop, isLoading } = useAuthStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const shops = user?.shops ?? [];
  const hasShops = shops.length >= 1 || !!user?.shopId;
  const activeShopId = user?.shopId ?? null;

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  if (!hasShops) return null;

  const handleSelect = async (s: ShopMembership) => {
    if (s.shopId === activeShopId) {
      setOpen(false);
      return;
    }
    try {
      await switchActiveShop(s.shopId);
      setOpen(false);
    } catch {
      // Error shown via store; keep dropdown open so user can retry
    }
  };

  return (
    <div ref={ref} className={styles.wrapper}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((o) => !o)}
        disabled={isLoading}
        title={shop?.name ?? 'Switch shop'}
      >
        <span className={styles.triggerIcon}>🏪</span>
        <span className={styles.triggerLabel}>
          {shop?.name ?? 'Select shop'}
        </span>
        <span className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}>
          ▾
        </span>
      </button>

      {open && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>Your shops</div>
          {shops.map((s) => (
            <button
              key={s.shopId}
              type="button"
              className={`${styles.shopItem} ${
                s.shopId === activeShopId ? styles.active : ''
              }`}
              onClick={() => handleSelect(s)}
              disabled={isLoading}
            >
              <span className={styles.shopName}>{s.shopName}</span>
              <span className={styles.shopRole}>{s.role}</span>
            </button>
          ))}
          <button
            type="button"
            className={styles.addShop}
            onClick={() => {
              setOpen(false);
              navigate('/onboarding', { state: { addShop: true } });
            }}
          >
            + Add another shop
          </button>
        </div>
      )}
    </div>
  );
}
