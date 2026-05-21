import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useAuthStore } from '@inventory-platform/store';
import { shopsApi } from '@inventory-platform/api';
import type {
  BusinessProfile,
  FieldDefinition,
  OnboardingStep,
  ShopRegisterFormValues,
  ShopType,
} from '@inventory-platform/types';
import {
  SHOP_REGISTER_EXTRA_FIELD_KEYS,
  getVisibleShopEntityFields,
  isShopFieldRequired,
  shopDetailsStepHint,
  validateShopEntityFields,
} from '@inventory-platform/types';
import styles from './onboarding.module.css';
import { useNotify } from '@inventory-platform/store';

const STEPS: OnboardingStep[] = [
  'name',
  'businessProfile',
  'shopType',
  'tagline',
  // 'businessId',
  'contactPhone',
  'contactEmail',
  'location',
  'businessDetails',
];

const STEP_LABELS: Record<OnboardingStep, string> = {
  name: 'Shop Name',
  businessProfile: 'Business Type',
  shopType: 'Shop Type',
  // businessId: 'Business ID',
  contactPhone: 'Mobile number',
  contactEmail: 'Contact Email',
  location: 'Location Details',
  businessDetails: 'Business Details',
  tagline: 'Tagline',
};

const SHOP_TYPES: { value: ShopType; label: string }[] = [
  { value: 'RETAILER', label: 'Retailer' },
  { value: 'DISTRIBUTOR', label: 'Distributor' },
  { value: 'WHOLESALER', label: 'Wholesaler' },
];

const EXTRA_SHOP_FIELD_LABELS: Record<string, string> = {
  panNo: 'PAN No',
  sgst: 'SGST (%)',
  cgst: 'CGST (%)',
};

function chunkFields<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function ShopRegisterFieldInput({
  field,
  value,
  onChange,
  disabled,
  labelClassName,
  inputClassName,
}: {
  field: FieldDefinition;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  disabled: boolean;
  labelClassName: string;
  inputClassName: string;
}) {
  const label = field.label?.trim() || field.key;
  return (
    <div className={styles.formGroup}>
      <label htmlFor={field.key} className={labelClassName}>
        {label}
        {isShopFieldRequired(field) ? ' *' : ''}
      </label>
      <input
        type="text"
        id={field.key}
        name={field.key}
        className={inputClassName}
        placeholder={`Enter ${label}`}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}

function ShopRegisterExtraFieldInput({
  fieldKey,
  value,
  onChange,
  disabled,
  labelClassName,
  inputClassName,
}: {
  fieldKey: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  disabled: boolean;
  labelClassName: string;
  inputClassName: string;
}) {
  const label = EXTRA_SHOP_FIELD_LABELS[fieldKey] ?? fieldKey;
  return (
    <div className={styles.formGroup}>
      <label htmlFor={fieldKey} className={labelClassName}>
        {label}
      </label>
      <input
        type="text"
        id={fieldKey}
        name={fieldKey}
        className={inputClassName}
        placeholder={`Enter ${label}`}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}

export function meta() {
  return [
    { title: 'Onboarding - StockKart' },
    { name: 'description', content: 'Complete your shop registration' },
  ];
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const addShop = (location.state as { addShop?: boolean })?.addShop ?? false;
  const { user, isAuthenticated, fetchCurrentUser, logout } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { error: notifyError } = useNotify;
  const [profileCatalog, setProfileCatalog] = useState<BusinessProfile[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    businessProfileId: 'pharmacy',
    shopType: '' as ShopType | '',
    // businessId: 'Pharmacy',
    location: {
      primaryAddress: '',
      secondaryAddress: '',
      state: '',
      city: '',
      pin: '',
      country: 'IND',
    },
    contactEmail: user?.email || '',
    contactPhone: '',
    gstinNo: '',
    fssai: '',
    dlNo: '',
    panNo: '',
    sgst: '',
    cgst: '',
    tagline: '',
  });

  useEffect(() => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // If user already has a shopId and is not adding another shop, redirect to dashboard
    if (user?.shopId && !addShop) {
      navigate('/dashboard');
    }

    // Update email if user email is available
    if (user?.email && !formData.contactEmail) {
      setFormData((prev) => ({ ...prev, contactEmail: user.email || '' }));
    }
  }, [isAuthenticated, user, navigate, formData.contactEmail]);

  useEffect(() => {
    shopsApi
      .listBusinessProfiles()
      .then((profiles) => {
        setProfileCatalog(profiles);
        if (
          profiles.length > 0 &&
          !profiles.some((p) => p.id === formData.businessProfileId)
        ) {
          setFormData((prev) => ({ ...prev, businessProfileId: profiles[0].id }));
        }
      })
      .catch(() => {
        setProfileCatalog([]);
      });
  }, []);

  const selectedProfile = useMemo(
    () => profileCatalog.find((p) => p.id === formData.businessProfileId) ?? null,
    [profileCatalog, formData.businessProfileId]
  );

  const visibleShopFields = useMemo(
    () => getVisibleShopEntityFields(selectedProfile),
    [selectedProfile]
  );

  const shopRegisterFormValues = useMemo<ShopRegisterFormValues>(
    () => ({
      dlNo: formData.dlNo,
      gstinNo: formData.gstinNo,
      fssai: formData.fssai,
      panNo: formData.panNo,
      sgst: formData.sgst,
      cgst: formData.cgst,
    }),
    [
      formData.dlNo,
      formData.gstinNo,
      formData.fssai,
      formData.panNo,
      formData.sgst,
      formData.cgst,
    ]
  );

  const extraShopFieldKeys = useMemo(
    () =>
      SHOP_REGISTER_EXTRA_FIELD_KEYS.filter(
        (key) => !visibleShopFields.some((f) => f.key === key)
      ),
    [visibleShopFields]
  );

  const validateSelectedProfileShopFields = (): boolean => {
    const message = validateShopEntityFields(
      selectedProfile,
      shopRegisterFormValues
    );
    if (message) {
      notifyError(message);
      return false;
    }
    return true;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const step = STEPS[currentStep];

    if (step === 'name') {
      setFormData({ ...formData, name: value });
    } else if (step === 'businessProfile' || name === 'businessProfileId') {
      setFormData({ ...formData, businessProfileId: value });
      // } else if (step === 'businessId') {
      //   // Business ID is fixed, don't allow changes
      //   return;
    } else if (step === 'contactPhone') {
      setFormData({ ...formData, contactPhone: value });
    } else if (step === 'contactEmail') {
      setFormData({ ...formData, contactEmail: value });
    } else if (step === 'location') {
      const locationField = name.replace('location.', '');
      setFormData({
        ...formData,
        location: { ...formData.location, [locationField]: value },
      });
    } else if (step === 'businessDetails') {
      setFormData({ ...formData, [name]: value });
    } else if (step === 'tagline') {
      setFormData({ ...formData, tagline: value });
    } else if (step === 'shopType' || name === 'shopType') {
      setFormData({ ...formData, shopType: value as ShopType });
    }

    if (error) {
      setError(null);
    }
  };

  const getCurrentValue = (fieldName?: string): string => {
    const step = STEPS[currentStep];
    if (step === 'name') return formData.name;
    if (step === 'businessProfile') return formData.businessProfileId;
    if (step === 'shopType') return formData.shopType;
    // if (step === 'businessId') return formData.businessId;
    if (step === 'contactPhone') return formData.contactPhone;
    if (step === 'contactEmail') return formData.contactEmail;
    if (step === 'tagline') return formData.tagline;
    if (step === 'location' && fieldName) {
      return (
        formData.location[fieldName as keyof typeof formData.location] || ''
      );
    }
    if (step === 'businessDetails' && fieldName) {
      return (formData[fieldName as keyof typeof formData] as string) || '';
    }
    return '';
  };

  const handleContinue = () => {
    const step = STEPS[currentStep];

    if (step === 'businessProfile') {
      if (!formData.businessProfileId?.trim()) {
        notifyError('Please select a business type');
        return;
      }
    } else if (step === 'shopType') {
      if (!formData.shopType || !['RETAILER', 'DISTRIBUTOR', 'WHOLESALER'].includes(formData.shopType)) {
        notifyError('Please select a shop type');
        return;
      }
    } else if (step === 'location') {
      if (!formData.location.primaryAddress.trim()) {
        notifyError('Please enter primary address');
        return;
      }
      if (!formData.location.city.trim()) {
        notifyError('Please enter city');
        return;
      }
      if (!formData.location.state.trim()) {
        notifyError('Please enter state');
        return;
      }
      if (!formData.location.pin.trim()) {
        notifyError('Please enter PIN code');
        return;
      }
      if (!formData.location.country.trim()) {
        notifyError('Please enter country');
        return;
      }
      // } else if (step === 'businessId') {
      //   // Business ID is fixed, skip validation and move to next step
      //   setCurrentStep(currentStep + 1);
      //   setError(null);
      //   return;
    } else if (step === 'businessDetails') {
      if (!validateSelectedProfileShopFields()) {
        return;
      }
      if (currentStep === STEPS.length - 1) {
        handleSubmit();
      } else {
        setCurrentStep(currentStep + 1);
        setError(null);
      }
      return;
    } else if (step === 'tagline') {
      // Tagline is optional
      if (currentStep === STEPS.length - 1) {
        handleSubmit();
      } else {
        setCurrentStep(currentStep + 1);
        setError(null);
      }
      return;
    } else {
      // Validate other steps
      const value = getCurrentValue().trim();
      if (!value) {
        notifyError(`Please enter ${STEP_LABELS[step].toLowerCase()}`);
        return;
      }
    }

    // If it's the last step, submit the form
    if (currentStep === STEPS.length - 1) {
      handleSubmit();
    } else {
      setCurrentStep(currentStep + 1);
      setError(null);
    }
  };

  const handleBack = () => {
    if (currentStep === 0) {
      navigate('/login');
    } else {
      setCurrentStep(currentStep - 1);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    setError(null);

    if (!validateSelectedProfileShopFields()) {
      return;
    }

    const profileId = formData.businessProfileId?.trim() || 'pharmacy';
    setIsLoading(true);

    try {
      const response = await shopsApi.register({
        name: formData.name,
        businessId: profileId,
        businessProfileId: profileId,
        location: {
          primaryAddress: formData.location.primaryAddress,
          secondaryAddress: formData.location.secondaryAddress || undefined,
          state: formData.location.state,
          city: formData.location.city,
          pin: formData.location.pin,
          country: formData.location.country,
        },
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone,
        shopType: formData.shopType || undefined,
        gstinNo: formData.gstinNo || undefined,
        fssai: formData.fssai || undefined,
        dlNo: formData.dlNo || undefined,
        panNo: formData.panNo || undefined,
        sgst: formData.sgst || undefined,
        cgst: formData.cgst || undefined,
        tagline: formData.tagline || undefined,
      });

      // Check if registration was successful - response should have shopId
      if (response && response.shopId) {
        // Update user's shopId in the store by fetching current user
        await fetchCurrentUser();

        // Redirect to dashboard immediately after success
        navigate('/dashboard');
      } else {
        throw new Error('Shop registration failed - invalid response');
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to register shop. Please try again.';
      notifyError(errorMessage);
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch {
      navigate('/login');
    }
  };

  // Show loading state if checking auth
  if (!isAuthenticated && !user) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <div>Loading...</div>
      </div>
    );
  }

  // Redirect if user already has shop (unless adding another shop)
  if (user?.shopId && !addShop) {
    return null;
  }

  return (
    <div className={styles.onboardingContainer}>
      <div className={styles.sidebar}>
        <div className={styles.userInfo}>
          <div className={styles.userAvatar}>
            {user?.name?.[0]?.toUpperCase() ||
              user?.email?.[0]?.toUpperCase() ||
              'U'}
          </div>
          <div className={styles.userName}>
            {user?.name || user?.email || 'User'}
          </div>
        </div>
        <div className={styles.sidebarContent}>
          <h2 className={styles.sidebarTitle}>Onboarding: Shop Registration</h2>
          <div className={styles.steps}>
            {STEPS.map((step, index) => (
              <div
                key={step}
                className={`${styles.step} ${
                  index === currentStep ? styles.stepActive : ''
                } ${index < currentStep ? styles.stepCompleted : ''}`}
              >
                <span className={styles.stepNumber}>
                  {index < currentStep ? '✓' : index + 1}
                </span>
                <span className={styles.stepLabel}>{STEP_LABELS[step]}</span>
              </div>
            ))}
          </div>
        </div>
        <div className={styles.sidebarFooter}>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            Logout
          </button>
          <button className={styles.helpBtn}>?</button>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.contentHeader}>
          <button onClick={handleBack} className={styles.backBtn}>
            ← Back
          </button>
          <div className={styles.logo}>
            <span className={styles.logoText}>StockKart</span>
          </div>
        </div>

        <div className={styles.formWrapper}>
          <h1 className={styles.title}>Verify your Contact Details</h1>
          <p className={styles.subtitle}>
            We require this to verify your identity. Your details will remain
            safe.
          </p>

          {error && <div className={styles.errorMessage}>{error}</div>}

          <div className={styles.form}>
            {STEPS[currentStep] === 'location' ? (
              <>
                <div className={styles.formGroup}>
                  <label htmlFor="primaryAddress" className={styles.label}>
                    Primary Address *
                  </label>
                  <input
                    type="text"
                    id="primaryAddress"
                    name="location.primaryAddress"
                    className={styles.input}
                    placeholder="Shop No. 12, Main Market Road"
                    value={getCurrentValue('primaryAddress')}
                    onChange={handleChange}
                    disabled={isLoading}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="secondaryAddress" className={styles.label}>
                    Secondary Address
                  </label>
                  <input
                    type="text"
                    id="secondaryAddress"
                    name="location.secondaryAddress"
                    className={styles.input}
                    placeholder="Near Community Hospital"
                    value={getCurrentValue('secondaryAddress')}
                    onChange={handleChange}
                    disabled={isLoading}
                  />
                </div>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="city" className={styles.label}>
                      City *
                    </label>
                    <input
                      type="text"
                      id="city"
                      name="location.city"
                      className={styles.input}
                      placeholder="Mumbai"
                      value={getCurrentValue('city')}
                      onChange={handleChange}
                      disabled={isLoading}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="state" className={styles.label}>
                      State *
                    </label>
                    <input
                      type="text"
                      id="state"
                      name="location.state"
                      className={styles.input}
                      placeholder="Maharashtra"
                      value={getCurrentValue('state')}
                      onChange={handleChange}
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="pin" className={styles.label}>
                      PIN Code *
                    </label>
                    <input
                      type="text"
                      id="pin"
                      name="location.pin"
                      className={styles.input}
                      placeholder="400001"
                      value={getCurrentValue('pin')}
                      onChange={handleChange}
                      disabled={isLoading}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="country" className={styles.label}>
                      Country *
                    </label>
                    <input
                      type="text"
                      id="country"
                      name="location.country"
                      className={styles.input}
                      placeholder="IND"
                      value={getCurrentValue('country')}
                      onChange={handleChange}
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </>
            ) : STEPS[currentStep] === 'businessDetails' ? (
              <>
                <p
                  className={styles.subtitle}
                  style={{ marginBottom: '1.5rem', fontSize: '0.9rem' }}
                >
                  {shopDetailsStepHint(selectedProfile)}
                </p>
                {chunkFields(visibleShopFields, 2).map((row, rowIndex) => (
                  <div key={`shop-field-row-${rowIndex}`} className={styles.formRow}>
                    {row.map((field) => (
                      <ShopRegisterFieldInput
                        key={field.key}
                        field={field}
                        value={getCurrentValue(field.key)}
                        onChange={handleChange}
                        disabled={isLoading}
                        labelClassName={styles.label}
                        inputClassName={styles.input}
                      />
                    ))}
                  </div>
                ))}
                {extraShopFieldKeys.length > 0 && (
                  <div className={styles.formRow}>
                    {extraShopFieldKeys.map((key) => (
                      <ShopRegisterExtraFieldInput
                        key={key}
                        fieldKey={key}
                        value={getCurrentValue(key)}
                        onChange={handleChange}
                        disabled={isLoading}
                        labelClassName={styles.label}
                        inputClassName={styles.input}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : STEPS[currentStep] === 'businessProfile' ? (
              <div className={styles.formGroup}>
                <label htmlFor="businessProfileId" className={styles.label}>
                  Business Type *
                </label>
                <select
                  id="businessProfileId"
                  name="businessProfileId"
                  className={styles.input}
                  value={getCurrentValue()}
                  onChange={handleChange}
                  disabled={isLoading}
                >
                  {profileCatalog.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : STEPS[currentStep] === 'shopType' ? (
              <div className={styles.formGroup}>
                <label className={styles.label}>Shop Type *</label>
                <div
                  className={styles.radioGroup}
                  role="radiogroup"
                  aria-label="Shop type"
                >
                  {SHOP_TYPES.map(({ value, label }) => (
                    <label
                      key={value}
                      className={`${styles.radioOption} ${getCurrentValue() === value ? styles.radioOptionSelected : ''}`}
                    >
                      <input
                        type="radio"
                        name="shopType"
                        value={value}
                        checked={getCurrentValue() === value}
                        onChange={handleChange}
                        disabled={isLoading}
                        className={styles.radioInput}
                      />
                      <span className={styles.radioLabel}>{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : STEPS[currentStep] === 'tagline' ? (
              <>
                <p
                  className={styles.subtitle}
                  style={{ marginBottom: '1.5rem', fontSize: '0.9rem' }}
                >
                  Add a tagline for your shop. This field is optional.
                </p>
                <div className={styles.formGroup}>
                  <label htmlFor="tagline" className={styles.label}>
                    Tagline
                  </label>
                  <input
                    type="text"
                    id="tagline"
                    name="tagline"
                    className={styles.input}
                    placeholder="Enter shop tagline (e.g., Your Trusted Pharmacy)"
                    value={getCurrentValue('tagline')}
                    onChange={handleChange}
                    disabled={isLoading}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleContinue();
                      }
                    }}
                    autoFocus
                  />
                </div>
              </>
            ) : (
              <div className={styles.formGroup}>
                <label htmlFor="currentInput" className={styles.label}>
                  {STEP_LABELS[STEPS[currentStep]]} *
                </label>
                <input
                  type={
                    STEPS[currentStep] === 'contactEmail'
                      ? 'email'
                      : STEPS[currentStep] === 'contactPhone'
                      ? 'tel'
                      : 'text'
                  }
                  id="currentInput"
                  className={styles.input}
                  placeholder={
                    STEPS[currentStep] === 'name'
                      ? 'Enter shop name'
                      : // : STEPS[currentStep] === 'businessId'
                      // ? 'Enter business ID'
                      STEPS[currentStep] === 'contactPhone'
                      ? '+91 1234 567890'
                      : 'Enter contact email'
                  }
                  value={getCurrentValue()}
                  onChange={handleChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleContinue();
                    }
                  }}
                  autoFocus
                  // disabled={isLoading || STEPS[currentStep] === 'businessId'}
                  // readOnly={STEPS[currentStep] === 'businessId'}
                />
              </div>
            )}

            <div className={styles.formActions}>
              <button
                type="button"
                onClick={handleContinue}
                className={styles.continueButton}
                disabled={isLoading}
              >
                {isLoading
                  ? 'Registering...'
                  : currentStep === STEPS.length - 1
                  ? 'Complete'
                  : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
