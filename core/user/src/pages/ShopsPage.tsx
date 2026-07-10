import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CenteredLoader,
  Grid,
  Inline,
  PageHeader,
  Stack,
  Text,
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
    <Stack gap="md" width="full" maxWidth="lg" mx="auto">
      <PageHeader title="Your Shops" description="Switch between your shops or add a new one" />

      {error ? <Alert variant="danger">{error}</Alert> : null}

      <Stack gap="lg" width="full">
        <Grid columns={3} gap="md" width="full">
          {shops.map((s) => {
            const isActive = s.shopId === activeShopId;
            return (
              <Card key={s.shopId} selected={isActive}>
                <CardBody>
                  <Stack gap="md">
                    <Inline gap="sm" align="start" width="full">
                      <Text>🏪</Text>
                      <Text variant="title" weight="semibold">
                        {s.shopName}
                      </Text>
                    </Inline>
                    <Inline gap="sm" align="center">
                      <Badge variant="info">{s.role}</Badge>
                      {s.relationship ? <Text color="secondary">{s.relationship}</Text> : null}
                    </Inline>
                    {isActive ? (
                      <Badge variant="info">Current shop</Badge>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleSwitch(s.shopId)}
                        disabled={!!switchingId}
                      >
                        {switchingId === s.shopId ? 'Switching…' : 'Use this shop'}
                      </Button>
                    )}
                  </Stack>
                </CardBody>
              </Card>
            );
          })}
        </Grid>

        <Button type="button" variant="outline" onClick={handleAddShop}>
          + Add another shop
        </Button>
      </Stack>
    </Stack>
  );
}
