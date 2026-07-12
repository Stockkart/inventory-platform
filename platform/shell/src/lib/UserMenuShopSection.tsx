import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronRight, Store } from 'lucide-react';
import { useAuthStore } from '@inventory-platform/session';
import type { ShopMembership } from '@inventory-platform/session/types';
import { Badge, Box, Button, Stack, Text, shellChrome } from '@inventory-platform/ui-kit';

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
    <Box className={shellChrome.shopSection}>
      <Stack gap="xs">
        <Text as="p" className={shellChrome.shopSectionLabel}>
          Current shop
        </Text>
        <Box className={shellChrome.shopCurrentCard}>
          <Box as="span" className={shellChrome.shopCurrentIcon} aria-hidden>
            <Store size={14} strokeWidth={2.25} />
          </Box>
          <Text as="p" className={shellChrome.shopCurrentName} title={activeShopName}>
            {activeShopName}
          </Text>
          <Badge variant="success">Active</Badge>
        </Box>
      </Stack>

      {otherShops.length > 0 ? (
        <Stack gap="xs">
          <Text as="p" className={shellChrome.shopSectionLabel}>
            Switch shop
          </Text>
          <Box className={shellChrome.shopSwitchList}>
            {otherShops.map((membership) => {
              const isSwitching = switchingId === membership.shopId;
              return (
                <Button
                  key={membership.shopId}
                  type="button"
                  variant="outline"
                  fullWidth
                  onClick={() => void handleSwitch(membership)}
                  disabled={isLoading || isSwitching}
                  className={shellChrome.shopSwitchBtn}
                  aria-label={
                    isSwitching
                      ? `Switching to ${membership.shopName}`
                      : `Switch to ${membership.shopName}`
                  }
                >
                  <Box as="span" className={shellChrome.shopSwitchBtnMain}>
                    <Text as="span" className={shellChrome.shopSwitchBtnName}>
                      {membership.shopName}
                    </Text>
                    <Text as="span" className={shellChrome.shopSwitchBtnRole}>
                      {membership.role}
                    </Text>
                  </Box>
                  <Box as="span" className={shellChrome.shopSwitchBtnMeta}>
                    {isSwitching ? (
                      'Switching…'
                    ) : (
                      <ChevronRight size={15} strokeWidth={2} aria-hidden />
                    )}
                  </Box>
                </Button>
              );
            })}
          </Box>
        </Stack>
      ) : null}

      <Box className={shellChrome.shopActions}>
        <Button type="button" variant="outline" fullWidth size="sm" onClick={goToShops}>
          Manage shops
        </Button>
        <Button type="button" variant="solid" fullWidth size="sm" onClick={goToAddShop}>
          + Add shop
        </Button>
      </Box>
    </Box>
  );
}
