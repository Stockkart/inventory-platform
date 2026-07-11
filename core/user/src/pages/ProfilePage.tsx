import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  CenteredLoader,
  Grid,
  Inline,
  PageHeader,
  Stack,
  Text,
} from '@inventory-platform/ui-kit';
import { shopsApi } from '../api/shops.api';
import { ShopProfileForm } from '../ui';
import type { Location as LocationType } from '@inventory-platform/user/types';

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

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <Stack gap="xs">
      <Text variant="label" color="secondary">
        {label}
      </Text>
      <Text>{value}</Text>
    </Stack>
  );
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
          : { ...emptyLocation },
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
          : { ...emptyLocation },
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
      setSaveError(err instanceof Error ? err.message : 'Failed to update shop');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Stack gap="md" width="full" maxWidth="sm" mx="auto">
        <CenteredLoader label="Loading profile…" />
      </Stack>
    );
  }

  if (error || !shop) {
    return (
      <Stack gap="md" width="full" maxWidth="sm" mx="auto">
        <Alert variant="danger">{error ?? 'Shop not found'}</Alert>
      </Stack>
    );
  }

  return (
    <Stack gap="md" width="full" maxWidth="sm" mx="auto">
      <PageHeader description="View and edit your active shop information" />

      {!editing ? (
        <Card>
          <CardHeader>
            <Inline justify="between" gap="md" width="full">
              <Text variant="title" weight="semibold">
                {shop.name}
              </Text>
              <Button type="button" variant="outline" size="sm" onClick={handleStartEdit}>
                Edit
              </Button>
            </Inline>
          </CardHeader>
          <CardBody>
            <Stack gap="md">
              <ProfileField label="Shop Name" value={shop.name} />

              <Grid columns={2} gap="md" width="full">
                {shop.contactEmail ? (
                  <ProfileField label="Email" value={shop.contactEmail} />
                ) : null}
                {shop.contactPhone ? (
                  <ProfileField label="Phone" value={shop.contactPhone} />
                ) : null}
              </Grid>

              <Grid columns={2} gap="md" width="full">
                {shop.gstinNo ? <ProfileField label="GSTIN" value={shop.gstinNo} /> : null}
                {shop.panNo ? <ProfileField label="PAN" value={shop.panNo} /> : null}
              </Grid>

              {shop.dlNo ? <ProfileField label="DL No" value={shop.dlNo} /> : null}
              {shop.tagline ? <ProfileField label="Tagline" value={shop.tagline} /> : null}
              {shop.location ? (
                <ProfileField label="Address" value={formatAddress(shop.location)} />
              ) : null}
            </Stack>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody>
            <Stack gap="md">
              <Text variant="title" weight="semibold">
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
              <Inline gap="sm" justify="end">
                <Button type="button" variant="outline" onClick={handleCancelEdit}>
                  Cancel
                </Button>
                <Button type="button" variant="solid" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              </Inline>
            </Stack>
          </CardBody>
        </Card>
      )}
    </Stack>
  );
}
