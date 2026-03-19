import type { Location } from '@inventory-platform/types';
import { FormField } from './FormField';
import { FormRow } from './FormRow';
import styles from './ShopProfileForm.module.css';

interface ShopProfileFormProps {
  tagline: string;
  onTaglineChange: (value: string) => void;
  location: Location;
  onLocationChange: (value: Location) => void;
  disabled?: boolean;
}

export function ShopProfileForm({
  tagline,
  onTaglineChange,
  location,
  onLocationChange,
  disabled = false,
}: ShopProfileFormProps) {
  return (
    <div className={styles.form}>
      <FormField
        label="Tagline (optional)"
        value={tagline}
        onChange={onTaglineChange}
        placeholder="e.g. Your Trusted Pharmacy"
        disabled={disabled}
      />
      <FormField
        label="Primary address"
        value={location.primaryAddress}
        onChange={(v) => onLocationChange({ ...location, primaryAddress: v })}
        placeholder="Primary address *"
        disabled={disabled}
      />
      <FormField
        label="Secondary address"
        value={location.secondaryAddress ?? ''}
        onChange={(v) =>
          onLocationChange({ ...location, secondaryAddress: v || undefined })
        }
        placeholder="Secondary address"
        disabled={disabled}
      />
      <FormRow>
        <FormField
          label="City"
          value={location.city}
          onChange={(v) => onLocationChange({ ...location, city: v })}
          placeholder="City *"
          disabled={disabled}
        />
        <FormField
          label="State"
          value={location.state}
          onChange={(v) => onLocationChange({ ...location, state: v })}
          placeholder="State *"
          disabled={disabled}
        />
      </FormRow>
      <FormRow>
        <FormField
          label="PIN"
          value={location.pin}
          onChange={(v) => onLocationChange({ ...location, pin: v })}
          placeholder="PIN *"
          disabled={disabled}
        />
        <FormField
          label="Country"
          value={location.country}
          onChange={(v) => onLocationChange({ ...location, country: v })}
          placeholder="Country *"
          disabled={disabled}
        />
      </FormRow>
    </div>
  );
}
