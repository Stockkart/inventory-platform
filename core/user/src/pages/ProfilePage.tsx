import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  CenteredLoader,
  Inline,
  PageHeader,
  Stack,
  Text,
} from '@inventory-platform/ui-kit';
import { shopsApi } from '../api/shops.api';
import { ShopProfileForm } from '../ui';
import type { Location as LocationType } from '@inventory-platform/user/types';
import styles from './profile.module.css';

export function meta() {
  return [
    { title: 'Shop Profile - StockKart' },
    { name: 'description', content: 'View and edit your shop information' },
  ];
}

const emptyLocation: LocationType = {
  primaryAddress: '',
  secondaryAddress: '',
  state: '',
  city: '',
  pin: '',
  country: 'IND',
};

function formatAddress(location: LocationType) {
  return [
    location.primaryAddress,
    location.secondaryAddress,
    [location.city, location.state, location.pin].filter(Boolean).join(', '),
    location.country,
  ]
    .filter(Boolean)
    .join(' · ');
}

export function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shop, setShop] = useState<{
    shopId: string;
    name: string;
    contactEmail?: string | null;
    contactPhone?: string | null;
    gstinNo?: string | null;
    panNo?: string | null;
    dlNo?: string | null;
    tagline?: string | null;
    location?: LocationType | null;
  } | null>(null);
  const [editing, setEditing] = useState(false);
  const [editTagline, setEditTagline] = useState('');
  const [editLocation, setEditLocation] = useState<LocationType>(emptyLocation);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadShop = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await shopsApi.getActiveShop();
      setShop(data);
      setEditTagline(data.tagline ?? '');
      setEditLocation(
        data.location
          ? {
              primaryAddress: data.location.primaryAddress ?? '',
              secondaryAddress: data.location.secondaryAddress ?? '',
              state: data.location.state ?? '',
              city: data.location.city ?? '',
              pin: data.location.pin ?? '',
              country: data.location.country ?? 'IND',
            }
          : { ...emptyLocation }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shop');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadShop();
  }, [loadShop]);

  const handleStartEdit = () => {
    if (shop) {
      setEditTagline(shop.tagline ?? '');
      setEditLocation(
        shop.location
          ? {
              primaryAddress: shop.location.primaryAddress ?? '',
              secondaryAddress: shop.location.secondaryAddress ?? '',
              state: shop.location.state ?? '',
              city: shop.location.city ?? '',
              pin: shop.location.pin ?? '',
              country: shop.location.country ?? 'IND',
            }
          : { ...emptyLocation }
      );
    }
    setSaveError(null);
    setEditing(true);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setSaveError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await shopsApi.updateActiveShop({
        tagline: editTagline.trim() || undefined,
        location: {
          primaryAddress: editLocation.primaryAddress.trim(),
          secondaryAddress: editLocation.secondaryAddress?.trim() || undefined,
          state: editLocation.state.trim(),
          city: editLocation.city.trim(),
          pin: editLocation.pin.trim(),
          country: editLocation.country.trim() || 'IND',
        },
      });
      setShop(updated);
      setEditing(false);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'Failed to update shop'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Stack gap="md" className={styles.container}>
        <CenteredLoader label="Loading profile…" />
      </Stack>
    );
  }

  if (error || !shop) {
    return (
      <Stack gap="md" className={styles.container}>
        <Alert variant="danger">{error ?? 'Shop not found'}</Alert>
      </Stack>
    );
  }

  return (
    <Stack gap="md" className={styles.container}>
      <PageHeader
        title="Shop Profile"
        description="View and edit your active shop information"
      />

      {!editing ? (
        <Card className={styles.card}>
          <CardHeader className={styles.cardHeader}>
            <Text variant="title" weight="semibold" className={styles.cardTitle}>
              {shop.name}
            </Text>
            <Button type="button" variant="outline" size="sm" onClick={handleStartEdit}>
              Edit
            </Button>
          </CardHeader>
          <CardBody>
            <Stack gap="md" className={styles.dl}>
              <Stack gap="xs" className={styles.field}>
                <Text variant="label" color="secondary" className={styles.dt}>
                  Shop Name
                </Text>
                <Text className={styles.dd}>{shop.name}</Text>
              </Stack>

              <Box display="grid" className={styles.row2}>
                {shop.contactEmail ? (
                  <Stack gap="xs">
                    <Text variant="label" color="secondary" className={styles.dt}>
                      Email
                    </Text>
                    <Text className={styles.dd}>{shop.contactEmail}</Text>
                  </Stack>
                ) : null}

                {shop.contactPhone ? (
                  <Stack gap="xs">
                    <Text variant="label" color="secondary" className={styles.dt}>
                      Phone
                    </Text>
                    <Text className={styles.dd}>{shop.contactPhone}</Text>
                  </Stack>
                ) : null}
              </Box>

              <Box display="grid" className={styles.row2}>
                {shop.gstinNo ? (
                  <Stack gap="xs">
                    <Text variant="label" color="secondary" className={styles.dt}>
                      GSTIN
                    </Text>
                    <Text className={styles.dd}>{shop.gstinNo}</Text>
                  </Stack>
                ) : null}

                {shop.panNo ? (
                  <Stack gap="xs">
                    <Text variant="label" color="secondary" className={styles.dt}>
                      PAN
                    </Text>
                    <Text className={styles.dd}>{shop.panNo}</Text>
                  </Stack>
                ) : null}
              </Box>

              {shop.dlNo ? (
                <Stack gap="xs" className={styles.field}>
                  <Text variant="label" color="secondary" className={styles.dt}>
                    DL No
                  </Text>
                  <Text className={styles.dd}>{shop.dlNo}</Text>
                </Stack>
              ) : null}

              {shop.tagline ? (
                <Stack gap="xs" className={styles.field}>
                  <Text variant="label" color="secondary" className={styles.dt}>
                    Tagline
                  </Text>
                  <Text className={styles.dd}>{shop.tagline}</Text>
                </Stack>
              ) : null}

              {shop.location ? (
                <Stack gap="xs" className={styles.field}>
                  <Text variant="label" color="secondary" className={styles.dt}>
                    Address
                  </Text>
                  <Text className={styles.dd}>{formatAddress(shop.location)}</Text>
                </Stack>
              ) : null}
            </Stack>
          </CardBody>
        </Card>
      ) : (
        <Card className={styles.card}>
          <CardBody>
            <Text variant="title" weight="semibold" className={styles.cardTitle}>
              Edit shop
            </Text>
            {saveError ? <Alert variant="danger">{saveError}</Alert> : null}
            <ShopProfileForm
              tagline={editTagline}
              onTaglineChange={setEditTagline}
              location={editLocation}
              onLocationChange={setEditLocation}
              disabled={saving}
            />
            <Inline gap="sm" className={styles.actions} justify="end">
              <Button type="button" variant="outline" onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="solid"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </Inline>
          </CardBody>
        </Card>
      )}
    </Stack>
  );
}
