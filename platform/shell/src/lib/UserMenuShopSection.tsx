import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuthStore } from '@inventory-platform/session';
import type { ShopMembership } from '@inventory-platform/session/types';
import { Badge, Box, Button, Inline, Stack, Text, shellChrome } from '@inventory-platform/ui-kit';

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
    <Stack gap="md" padding="md" className={shellChrome.shopSection}>
      <Stack gap="xs">
        <Text variant="caption" color="secondary" weight="bold">
          Current shop
        </Text>
        <Inline align="center" gap="sm" minWidth="0">
          <Text as="span" aria-hidden>
            🏪
          </Text>
          <Box flex="1" minWidth="0">
            <Text weight="semibold" truncate>
              {activeShopName}
            </Text>
          </Box>
          <Badge variant="success">Active</Badge>
        </Inline>
      </Stack>

      {otherShops.length > 0 ? (
        <Stack gap="xs">
          <Text variant="caption" color="secondary" weight="bold">
            Switch shop
          </Text>
          <Stack gap="xs" overflowY="auto" className={shellChrome.shopSwitchList}>
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
                >
                  <Text as="span" weight="semibold" variant="caption">
                    {membership.shopName}
                  </Text>
                  <Text
                    as="span"
                    variant="caption"
                    color="secondary"
                    className={shellChrome.shopSwitchBtnRole}
                  >
                    {membership.role}
                  </Text>
                  <Text as="span" variant="caption" weight="medium" color="primary">
                    {isSwitching ? 'Switching…' : 'Use this shop'}
                  </Text>
                </Button>
              );
            })}
          </Stack>
        </Stack>
      ) : null}

      <Inline gap="sm">
        <Button type="button" variant="outline" fullWidth size="sm" onClick={goToShops}>
          Manage shops
        </Button>
        <Button type="button" variant="solid" fullWidth size="sm" onClick={goToAddShop}>
          + Add shop
        </Button>
      </Inline>
    </Stack>
  );
}
