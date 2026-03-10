import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useAuthStore } from '@inventory-platform/store';
import { shopsApi } from '@inventory-platform/api';
import type { OnboardingStep, ShopType } from '@inventory-platform/types';
import styles from './onboarding.module.css';
import { useNotify } from '@inventory-platform/store';

const STEPS: OnboardingStep[] = [
  'name',
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
  const [formData, setFormData] = useState({
    name: '',
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const step = STEPS[currentStep];

    if (step === 'name') {
      setFormData({ ...formData, name: value });
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

    // Validate shopType step
    if (step === 'shopType') {
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
      // Business details are all optional, skip validation and move to next step or submit
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
    setIsLoading(true);

    try {
      const response = await shopsApi.register({
        name: formData.name,
        businessId: 'pharmacy',
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
                  These fields are optional. You can skip this step or fill them
                  later.
                </p>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="gstinNo" className={styles.label}>
                      GSTIN No
                    </label>
                    <input
                      type="text"
                      id="gstinNo"
                      name="gstinNo"
                      className={styles.input}
                      placeholder="Enter the GSTIN No"
                      value={getCurrentValue('gstinNo')}
                      onChange={handleChange}
                      disabled={isLoading}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="fssai" className={styles.label}>
                      FSSAI
                    </label>
                    <input
                      type="text"
                      id="fssai"
                      name="fssai"
                      className={styles.input}
                      placeholder="Enter the FSSAI"
                      value={getCurrentValue('fssai')}
                      onChange={handleChange}
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="dlNo" className={styles.label}>
                      Drug License No (DL No)
                    </label>
                    <input
                      type="text"
                      id="dlNo"
                      name="dlNo"
                      className={styles.input}
                      placeholder="Enter the DL No"
                      value={getCurrentValue('dlNo')}
                      onChange={handleChange}
                      disabled={isLoading}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="panNo" className={styles.label}>
                      PAN No
                    </label>
                    <input
                      type="text"
                      id="panNo"
                      name="panNo"
                      className={styles.input}
                      placeholder="Enter the PAN No"
                      value={getCurrentValue('panNo')}
                      onChange={handleChange}
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="sgst" className={styles.label}>
                      SGST (%)
                    </label>
                    <input
                      type="text"
                      id="sgst"
                      name="sgst"
                      className={styles.input}
                      placeholder="Enter the SGST (%)"
                      value={getCurrentValue('sgst')}
                      onChange={handleChange}
                      disabled={isLoading}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="cgst" className={styles.label}>
                      CGST (%)
                    </label>
                    <input
                      type="text"
                      id="cgst"
                      name="cgst"
                      className={styles.input}
                      placeholder="Enter the CGST (%)"
                      value={getCurrentValue('cgst')}
                      onChange={handleChange}
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </>
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
