import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuthStore } from '@inventory-platform/session';
import type { ShopMembership } from '@inventory-platform/session/types';
import { Badge, Button, Inline, Stack, Text } from '@inventory-platform/ui-kit';

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
    <Stack
      gap="md"
      padding="md"
      style={{
        borderBottom: '1px solid var(--sk-color-border-default)',
        background: 'var(--sk-color-bg-canvas)',
      }}
    >
      <Stack gap="xs">
        <Text variant="caption" color="secondary" weight="bold">
          Current shop
        </Text>
        <Inline align="center" gap="sm" style={{ minWidth: 0 }}>
          <Text as="span" aria-hidden>
            🏪
          </Text>
          <Text weight="semibold" truncate style={{ flex: 1, minWidth: 0 }}>
            {activeShopName}
          </Text>
          <Badge variant="success">Active</Badge>
        </Inline>
      </Stack>

      {otherShops.length > 0 ? (
        <Stack gap="xs">
          <Text variant="caption" color="secondary" weight="bold">
            Switch shop
          </Text>
          <Stack
            gap="xs"
            style={{
              maxHeight: 160,
              overflowY: 'auto',
              overscrollBehavior: 'contain',
            }}
          >
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
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gridTemplateRows: 'auto auto',
                    gap: '0.1rem 0.5rem',
                    padding: '0.55rem 0.65rem',
                    textAlign: 'left',
                    height: 'auto',
                  }}
                >
                  <Text as="span" weight="semibold" variant="caption">
                    {membership.shopName}
                  </Text>
                  <Text
                    as="span"
                    variant="caption"
                    color="secondary"
                    style={{ gridColumn: 2, gridRow: '1 / span 2', alignSelf: 'center' }}
                  >
                    {membership.role}
                  </Text>
                  <Text
                    as="span"
                    variant="caption"
                    weight="medium"
                    style={{ color: 'var(--sk-color-accent)' }}
                  >
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
