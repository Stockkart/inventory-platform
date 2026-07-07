import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useAuthStore } from '@inventory-platform/session';
import type { ShopMembership } from '@inventory-platform/session/types';
import { Box, Button, Text } from '@inventory-platform/ui-kit';
import styles from './ShopSwitcher.module.css';

export function ShopSwitcher() {
  const navigate = useNavigate();
  const { user, shop, switchActiveShop, isLoading } = useAuthStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLElement>(null);

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
    <Box ref={ref} className={styles.wrapper}>
      <Button
        type="button"
        variant="ghost"
        className={styles.trigger}
        onClick={() => setOpen((o) => !o)}
        disabled={isLoading}
        title={shop?.name ?? 'Switch shop'}
      >
        <Text as="span" className={styles.triggerIcon} aria-hidden>
          🏪
        </Text>
        <Text as="span" className={styles.triggerLabel}>
          {shop?.name ?? 'Select shop'}
        </Text>
        <Text
          as="span"
          className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
          aria-hidden
        >
          ▾
        </Text>
      </Button>

      {open && (
        <Box className={styles.dropdown}>
          <Text as="span" className={styles.dropdownHeader}>
            Your shops
          </Text>
          {shops.map((s) => (
            <Button
              key={s.shopId}
              type="button"
              variant="ghost"
              className={`${styles.shopItem} ${
                s.shopId === activeShopId ? styles.active : ''
              }`}
              onClick={() => handleSelect(s)}
              disabled={isLoading}
            >
              <Text as="span" className={styles.shopName}>
                {s.shopName}
              </Text>
              <Text as="span" className={styles.shopRole}>
                {s.role}
              </Text>
            </Button>
          ))}
          <Button
            type="button"
            variant="ghost"
            className={styles.addShop}
            onClick={() => {
              setOpen(false);
              navigate('/onboarding', { state: { addShop: true } });
            }}
          >
            + Add another shop
          </Button>
        </Box>
      )}
    </Box>
  );
}
