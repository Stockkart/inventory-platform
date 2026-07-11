import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  CenteredLoader,
  Inline,
  PageHeader,
  Stack,
  Text,
  cn,
  surfaceChrome,
} from '@inventory-platform/ui-kit';
import { useAuthStore } from '@inventory-platform/session';
import { usersApi } from '@inventory-platform/session/api';
import type { ShopMembership } from '@inventory-platform/session/types';

export function meta() {
  return [
    { title: 'Shops - StockKart' },
    { name: 'description', content: 'Manage your shops and switch between them' },
  ];
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/** One label only — role and relationship often both say OWNER. */
function membershipLabel(shop: ShopMembership): string {
  const role = shop.role?.trim();
  const relationship = shop.relationship;

  if (relationship === 'OWNER') return 'Owner';
  if (relationship === 'INVITED') {
    if (role && role.toUpperCase() !== 'INVITED' && role.toUpperCase() !== 'OWNER') {
      return titleCase(role);
    }
    return 'Invited';
  }
  if (role) return titleCase(role);
  return 'Member';
}

function membershipBadgeVariant(shop: ShopMembership): 'info' | 'success' | 'neutral' | 'warning' {
  if (shop.relationship === 'OWNER' || shop.role?.toUpperCase() === 'OWNER') return 'info';
  if (shop.relationship === 'INVITED') return 'warning';
  return 'neutral';
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
      <Stack gap="md" width="full" maxWidth="lg" mx="auto">
        <CenteredLoader label="Loading shops…" />
      </Stack>
    );
  }

  return (
    <Stack gap="lg" width="full" maxWidth="lg" mx="auto">
      <PageHeader description="Switch between your shops or add a new one" />

      {error ? <Alert variant="danger">{error}</Alert> : null}

      <Box display="grid" gap="md" width="full" className={surfaceChrome.autoGrid280}>
        {shops.map((s) => {
          const isActive = s.shopId === activeShopId;
          const isSwitching = switchingId === s.shopId;
          return (
            <Card key={s.shopId} selected={isActive} className={surfaceChrome.shopTile}>
              <CardBody className={surfaceChrome.shopTileBody}>
                <Inline gap="md" align="start" width="full">
                  <Box
                    className={cn(
                      surfaceChrome.shopTileIcon,
                      isActive && surfaceChrome.shopTileActiveIcon,
                    )}
                    aria-hidden
                  >
                    🏪
                  </Box>
                  <Box className={surfaceChrome.shopTileMeta}>
                    <Text variant="heading4" weight="semibold" truncate>
                      {s.shopName}
                    </Text>
                    <Badge variant={membershipBadgeVariant(s)}>{membershipLabel(s)}</Badge>
                  </Box>
                </Inline>

                <Box className={surfaceChrome.shopTileFooter}>
                  {isActive ? (
                    <Badge variant="success">Current shop</Badge>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={surfaceChrome.shopTileAction}
                      onClick={() => void handleSwitch(s.shopId)}
                      disabled={!!switchingId}
                      loading={isSwitching}
                    >
                      {isSwitching ? 'Switching…' : 'Switch to shop'}
                    </Button>
                  )}
                </Box>
              </CardBody>
            </Card>
          );
        })}

        <button type="button" onClick={handleAddShop} className={surfaceChrome.shopTileAdd}>
          <span className={surfaceChrome.shopTileAddIcon} aria-hidden>
            +
          </span>
          <Text as="span" weight="semibold">
            Add another shop
          </Text>
        </button>
      </Box>
    </Stack>
  );
}
