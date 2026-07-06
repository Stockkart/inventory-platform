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
      <Stack gap="md" className={styles.container}>
        <CenteredLoader label="Loading shops…" />
      </Stack>
    );
  }

  return (
    <Stack gap="md" className={styles.container}>
      <PageHeader
        title="Your Shops"
        description="Switch between your shops or add a new one"
      />

      {error ? <Alert variant="danger">{error}</Alert> : null}

      <Stack gap="lg" className={styles.content}>
        <Grid className={styles.shopGrid}>
          {shops.map((s) => {
            const isActive = s.shopId === activeShopId;
            return (
              <Card
                key={s.shopId}
                className={`${styles.shopCard} ${isActive ? styles.active : ''}`}
              >
                <CardBody>
                  <Inline gap="sm" className={styles.shopCardHeader}>
                    <Text className={styles.shopIcon}>🏪</Text>
                    <Text variant="title" weight="semibold" className={styles.shopName}>
                      {s.shopName}
                    </Text>
                  </Inline>
                  <Inline gap="sm" className={styles.shopMeta}>
                    <Badge variant="info" className={styles.role}>
                      {s.role}
                    </Badge>
                    {s.relationship ? (
                      <Text color="secondary" className={styles.relationship}>
                        {s.relationship}
                      </Text>
                    ) : null}
                  </Inline>
                  {isActive ? (
                    <Badge variant="info" className={styles.activeBadge}>
                      Current shop
                    </Badge>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={styles.switchBtn}
                      onClick={() => handleSwitch(s.shopId)}
                      disabled={!!switchingId}
                    >
                      {switchingId === s.shopId ? 'Switching…' : 'Use this shop'}
                    </Button>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </Grid>

        <Button
          type="button"
          variant="outline"
          className={styles.addBtn}
          onClick={handleAddShop}
        >
          + Add another shop
        </Button>
      </Stack>
    </Stack>
  );
}
