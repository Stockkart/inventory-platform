import { useCallback, useEffect, useState } from 'react';
import { Store } from 'lucide-react';
import {
  Alert,
  Box,
  Button,
  CenteredLoader,
  Inline,
  PageHeader,
  Stack,
  Text,
  cn,
  surfaceChrome,
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

function ProfileField({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <Box className={cn(surfaceChrome.profileField, wide && surfaceChrome.profileFieldWide)}>
      <Text as="p" className={surfaceChrome.profileFieldLabel}>
        {label}
      </Text>
      <Text as="p" className={surfaceChrome.profileFieldValue}>
        {value}
      </Text>
    </Box>
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
      <Stack gap="md" className={surfaceChrome.profileShell}>
        <CenteredLoader label="Loading profile…" />
      </Stack>
    );
  }

  if (error || !shop) {
    return (
      <Stack gap="md" className={surfaceChrome.profileShell}>
        <Alert variant="danger">{error ?? 'Shop not found'}</Alert>
      </Stack>
    );
  }

  const contactFields = [
    shop.contactEmail ? { label: 'Email', value: shop.contactEmail } : null,
    shop.contactPhone ? { label: 'Phone', value: shop.contactPhone } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  const businessFields = [
    shop.gstinNo ? { label: 'GSTIN', value: shop.gstinNo } : null,
    shop.panNo ? { label: 'PAN', value: shop.panNo } : null,
    shop.dlNo ? { label: 'DL No', value: shop.dlNo } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <Stack gap="md" className={surfaceChrome.profileShell}>
      <PageHeader description="View and edit your active shop information" />

      {!editing ? (
        <Box className={surfaceChrome.profileCard}>
          <Box className={surfaceChrome.profileHero}>
            <Box className={surfaceChrome.profileHeroMain}>
              <Box as="span" className={surfaceChrome.profileHeroIcon} aria-hidden>
                <Store size={20} strokeWidth={2.1} />
              </Box>
              <Box className={surfaceChrome.profileHeroText}>
                <Text as="h2" className={surfaceChrome.profileHeroTitle}>
                  {shop.name}
                </Text>
                <Text as="p" className={surfaceChrome.profileHeroTagline}>
                  {shop.tagline?.trim() || 'No tagline yet'}
                </Text>
              </Box>
            </Box>
            <Button type="button" variant="solid" size="sm" onClick={handleStartEdit}>
              Edit profile
            </Button>
          </Box>

          <Box className={surfaceChrome.profileBody}>
            {contactFields.length > 0 ? (
              <Box className={surfaceChrome.profileSection}>
                <Text as="p" className={surfaceChrome.profileSectionLabel}>
                  Contact
                </Text>
                <Box className={surfaceChrome.profileFieldGrid}>
                  {contactFields.map((field) => (
                    <ProfileField key={field.label} label={field.label} value={field.value} />
                  ))}
                </Box>
              </Box>
            ) : null}

            {businessFields.length > 0 ? (
              <Box className={surfaceChrome.profileSection}>
                <Text as="p" className={surfaceChrome.profileSectionLabel}>
                  Business details
                </Text>
                <Box className={surfaceChrome.profileFieldGrid}>
                  {businessFields.map((field) => (
                    <ProfileField key={field.label} label={field.label} value={field.value} />
                  ))}
                </Box>
              </Box>
            ) : null}

            {shop.location ? (
              <Box className={surfaceChrome.profileSection}>
                <Text as="p" className={surfaceChrome.profileSectionLabel}>
                  Address
                </Text>
                <Box className={surfaceChrome.profileFieldGrid}>
                  <ProfileField label="Location" value={formatAddress(shop.location)} wide />
                </Box>
              </Box>
            ) : null}
          </Box>
        </Box>
      ) : (
        <Box className={surfaceChrome.profileCard}>
          <Box className={surfaceChrome.profileEditHeader}>
            <Text as="h2" className={surfaceChrome.profileEditTitle}>
              Edit shop
            </Text>
            <Text variant="caption" color="secondary">
              {shop.name}
            </Text>
          </Box>
          <Box className={surfaceChrome.profileEditBody}>
            <Stack gap="md">
              {saveError ? <Alert variant="danger">{saveError}</Alert> : null}
              <ShopProfileForm
                tagline={editTagline}
                onTaglineChange={setEditTagline}
                location={editLocation}
                onLocationChange={setEditLocation}
                disabled={saving}
              />
              <Inline gap="sm" className={surfaceChrome.profileEditActions}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="button" variant="solid" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : 'Save changes'}
                </Button>
              </Inline>
            </Stack>
          </Box>
        </Box>
      )}
    </Stack>
  );
}
