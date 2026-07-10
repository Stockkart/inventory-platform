import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuthStore } from '@inventory-platform/session';
import type { ShopMembership } from '@inventory-platform/session/types';
import { Badge, Box, Button, Inline, Stack, Text } from '@inventory-platform/ui-kit';
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
    shop?.name ?? shops.find((s) => s.shopId === activeShopId)?.shopName ?? 'Current shop';

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
    <Box className={styles.section}>
      <Box className={styles.currentBlock}>
        <Text as="span" className={styles.sectionLabel}>
          Current shop
        </Text>
        <Inline className={styles.currentShop} align="center">
          <Text as="span" className={styles.shopIcon} aria-hidden>
            🏪
          </Text>
          <Text as="span" className={styles.currentShopName}>
            {activeShopName}
          </Text>
          <Badge variant="success" className={styles.activeTag}>
            Active
          </Badge>
        </Inline>
      </Box>

      {otherShops.length > 0 && (
        <Box className={styles.switchBlock}>
          <Text as="span" className={styles.sectionLabel}>
            Switch shop
          </Text>
          <Stack className={styles.shopList} gap="none">
            {otherShops.map((membership) => {
              const isSwitching = switchingId === membership.shopId;
              return (
                <Button
                  key={membership.shopId}
                  type="button"
                  variant="ghost"
                  className={styles.shopOption}
                  onClick={() => void handleSwitch(membership)}
                  disabled={isLoading || isSwitching}
                >
                  <Text as="span" className={styles.shopOptionName}>
                    {membership.shopName}
                  </Text>
                  <Text as="span" className={styles.shopOptionRole}>
                    {membership.role}
                  </Text>
                  <Text as="span" className={styles.switchHint}>
                    {isSwitching ? 'Switching…' : 'Use this shop'}
                  </Text>
                </Button>
              );
            })}
          </Stack>
        </Box>
      )}

      <Inline className={styles.actions} gap="none">
        <Button type="button" variant="ghost" className={styles.actionBtn} onClick={goToShops}>
          Manage shops
        </Button>
        <Button
          type="button"
          variant="solid"
          className={styles.actionBtnPrimary}
          onClick={goToAddShop}
        >
          + Add shop
        </Button>
      </Inline>
    </Box>
  );
}
