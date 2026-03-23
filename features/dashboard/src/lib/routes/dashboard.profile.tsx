import { useCallback, useEffect, useState } from 'react';
import { shopsApi } from '@inventory-platform/api';
import { ShopProfileForm } from '@inventory-platform/ui';
import type { Location as LocationType } from '@inventory-platform/types';
import styles from './dashboard.profile.module.css';

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

export default function ProfilePage() {
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
      <div className={styles.container}>
        <div className={styles.loading}>Loading profile…</div>
      </div>
    );
  }

  if (error || !shop) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error ?? 'Shop not found'}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Shop Profile</h1>
        <p className={styles.subtitle}>
          View and edit your active shop information
        </p>
      </div>

      {!editing ? (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>{shop.name}</h2>
            <button
              type="button"
              className={styles.editBtn}
              onClick={handleStartEdit}
            >
              Edit
            </button>
          </div>
          <dl className={styles.dl}>
            <div className={styles.field}>
              <div className={styles.dt}>Shop Name</div>
              <div className={styles.dd}>{shop.name}</div>
            </div>
            <div className={styles.row2}>
              {shop.contactEmail && (
                <div>
                  <div className={styles.dt}>Email</div>
                  <div className={styles.dd}>{shop.contactEmail}</div>
                </div>
              )}

              {shop.contactPhone && (
                <div>
                  <div className={styles.dt}>Phone</div>
                  <div className={styles.dd}>{shop.contactPhone}</div>
                </div>
              )}
            </div>

            <div className={styles.row2}>
              {shop.gstinNo && (
                <div>
                  <div className={styles.dt}>GSTIN</div>
                  <div className={styles.dd}>{shop.gstinNo}</div>
                </div>
              )}

              {shop.panNo && (
                <div>
                  <div className={styles.dt}>PAN</div>
                  <div className={styles.dd}>{shop.panNo}</div>
                </div>
              )}
            </div>

            {shop.dlNo && (
              <div className={styles.field}>
                <div className={styles.dt}>DL No</div>
                <div className={styles.dd}>{shop.dlNo}</div>
              </div>
            )}

            {shop.tagline && (
              <div className={styles.field}>
                <dt className={styles.dt}>Tagline</dt>
                <dd className={styles.dd}>{shop.tagline}</dd>
              </div>
            )}

            {shop.location && (
              <div className={styles.field}>
                <dt className={styles.dt}>Address</dt>
                <dd className={styles.dd}>
                  {[
                    shop.location.primaryAddress,
                    shop.location.secondaryAddress,
                    [shop.location.city, shop.location.state, shop.location.pin]
                      .filter(Boolean)
                      .join(', '),
                    shop.location.country,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </dd>
              </div>
            )}
          </dl>
        </div>
      ) : (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Edit shop</h2>
          {saveError && <div className={styles.saveError}>{saveError}</div>}
          <ShopProfileForm
            tagline={editTagline}
            onTaglineChange={setEditTagline}
            location={editLocation}
            onLocationChange={setEditLocation}
            disabled={saving}
          />
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={handleCancelEdit}
            >
              Cancel
            </button>
            <button
              type="button"
              className={styles.saveBtn}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
