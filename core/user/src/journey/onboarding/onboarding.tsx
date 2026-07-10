import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useAuthStore, useVerticalSchemaStore, useNotify } from '@inventory-platform/session';
import { shopsApi } from '@inventory-platform/user/shops';
import { verticalsApi } from '@inventory-platform/session/api';
import type { OnboardingStep } from '@inventory-platform/user/types';
import type { ShopType } from '@inventory-platform/user/types';
import type { VerticalSchemaFieldDef, VerticalSummary } from '@inventory-platform/schema/types';
import {
  VerticalSchemaFieldInput,
  fieldLabel,
  getShopOnboardingFields,
} from '@inventory-platform/schema';
import {
  Alert,
  Avatar,
  Box,
  Button,
  CenteredLoader,
  FormField,
  FormRow,
  IconButton,
  Inline,
  Select,
  Stack,
  Text,
} from '@inventory-platform/ui-kit';
import styles from './onboarding.module.css';

const STEPS: OnboardingStep[] = [
  'name',
  'vertical',
  'shopType',
  'tagline',
  'contactPhone',
  'contactEmail',
  'location',
  'businessDetails',
];

const STEP_LABELS: Record<OnboardingStep, string> = {
  name: 'Shop Name',
  vertical: 'Business vertical',
  shopType: 'Shop Type',
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
  const fetchVerticalSchema = useVerticalSchemaStore((s) => s.fetchVerticalSchema);
  const [verticals, setVerticals] = useState<VerticalSummary[]>([]);
  const [verticalSchemaFields, setVerticalSchemaFields] = useState<VerticalSchemaFieldDef[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    verticalId: 'medical',
    shopType: '' as ShopType | '',
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
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (user?.shopId && !addShop) {
      navigate('/dashboard');
    }
    if (user?.email && !formData.contactEmail) {
      setFormData((prev) => ({ ...prev, contactEmail: user.email || '' }));
    }
  }, [isAuthenticated, user, navigate, formData.contactEmail, addShop]);

  useEffect(() => {
    void verticalsApi
      .listActive()
      .then(setVerticals)
      .catch(() => setVerticals([]));
  }, []);

  useEffect(() => {
    if (!formData.verticalId) {
      setVerticalSchemaFields([]);
      return;
    }
    void fetchVerticalSchema(formData.verticalId, 'regular').then((schema) => {
      setVerticalSchemaFields(getShopOnboardingFields(schema?.entities));
    });
  }, [formData.verticalId, fetchVerticalSchema]);

  const clearError = () => {
    if (error) setError(null);
  };

  const updateLocationField = (field: string, value: string) => {
    setFormData({
      ...formData,
      location: { ...formData.location, [field]: value },
    });
    clearError();
  };

  const updateBusinessField = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    clearError();
  };

  const getCurrentValue = (fieldName?: string): string => {
    const step = STEPS[currentStep];
    if (step === 'name') return formData.name;
    if (step === 'vertical') return formData.verticalId;
    if (step === 'shopType') return formData.shopType;
    if (step === 'contactPhone') return formData.contactPhone;
    if (step === 'contactEmail') return formData.contactEmail;
    if (step === 'tagline') return formData.tagline;
    if (step === 'location' && fieldName) {
      return formData.location[fieldName as keyof typeof formData.location] || '';
    }
    if (step === 'businessDetails' && fieldName) {
      return (formData[fieldName as keyof typeof formData] as string) || '';
    }
    return '';
  };

  const handleContinue = () => {
    const step = STEPS[currentStep];

    if (step === 'vertical') {
      if (!formData.verticalId?.trim()) {
        notifyError('Please select a business vertical');
        return;
      }
    } else if (step === 'shopType') {
      if (
        !formData.shopType ||
        !['RETAILER', 'DISTRIBUTOR', 'WHOLESALER'].includes(formData.shopType)
      ) {
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
    } else if (step === 'businessDetails') {
      if (currentStep === STEPS.length - 1) {
        void handleSubmit();
      } else {
        setCurrentStep(currentStep + 1);
        setError(null);
      }
      return;
    } else if (step === 'tagline') {
      if (currentStep === STEPS.length - 1) {
        void handleSubmit();
      } else {
        setCurrentStep(currentStep + 1);
        setError(null);
      }
      return;
    } else {
      const value = getCurrentValue().trim();
      if (!value) {
        notifyError(`Please enter ${STEP_LABELS[step].toLowerCase()}`);
        return;
      }
    }

    if (currentStep === STEPS.length - 1) {
      void handleSubmit();
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
      for (const field of verticalSchemaFields) {
        if (!field.required) {
          continue;
        }
        const value = String((formData as Record<string, unknown>)[field.key] ?? '').trim();
        if (!value) {
          notifyError(`${fieldLabel(field)} is required`);
          setIsLoading(false);
          return;
        }
      }

      const response = await shopsApi.register({
        name: formData.name,
        businessId: formData.verticalId,
        verticalId: formData.verticalId,
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

      if (response && response.shopId) {
        await fetchCurrentUser();
        navigate('/dashboard');
      } else {
        throw new Error('Shop registration failed - invalid response');
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to register shop. Please try again.';
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

  const verticalOptions = (
    verticals.length > 0
      ? verticals
      : [{ verticalId: 'medical', version: '1.0.0', status: 'ACTIVE' as const }]
  ).map((v) => ({ value: v.verticalId, label: v.verticalId }));

  const userDisplayName = user?.name || user?.email || 'User';

  if (!isAuthenticated && !user) {
    return <CenteredLoader label="Loading..." minHeight="100vh" />;
  }

  if (user?.shopId && !addShop) {
    return null;
  }

  const renderStepContent = () => {
    const step = STEPS[currentStep];

    if (step === 'location') {
      return (
        <>
          <FormField
            label="Primary Address *"
            id="primaryAddress"
            placeholder="Shop No. 12, Main Market Road"
            value={getCurrentValue('primaryAddress')}
            onChange={(v) => updateLocationField('primaryAddress', v)}
            disabled={isLoading}
          />
          <FormField
            label="Secondary Address"
            id="secondaryAddress"
            placeholder="Near Community Hospital"
            value={getCurrentValue('secondaryAddress')}
            onChange={(v) => updateLocationField('secondaryAddress', v)}
            disabled={isLoading}
          />
          <FormRow>
            <FormField
              label="City *"
              id="city"
              placeholder="Mumbai"
              value={getCurrentValue('city')}
              onChange={(v) => updateLocationField('city', v)}
              disabled={isLoading}
            />
            <FormField
              label="State *"
              id="state"
              placeholder="Maharashtra"
              value={getCurrentValue('state')}
              onChange={(v) => updateLocationField('state', v)}
              disabled={isLoading}
            />
          </FormRow>
          <FormRow>
            <FormField
              label="PIN Code *"
              id="pin"
              placeholder="400001"
              value={getCurrentValue('pin')}
              onChange={(v) => updateLocationField('pin', v)}
              disabled={isLoading}
            />
            <FormField
              label="Country *"
              id="country"
              placeholder="IND"
              value={getCurrentValue('country')}
              onChange={(v) => updateLocationField('country', v)}
              disabled={isLoading}
            />
          </FormRow>
        </>
      );
    }

    if (step === 'vertical') {
      return (
        <FormField label="Business vertical *" id="verticalId" required>
          <Select
            id="verticalId"
            className={styles.input}
            options={verticalOptions}
            value={formData.verticalId}
            onChange={(e) => {
              setFormData({ ...formData, verticalId: e.target.value });
              clearError();
            }}
            disabled={isLoading}
            required
          />
        </FormField>
      );
    }

    if (step === 'businessDetails') {
      return (
        <>
          <Text
            color="secondary"
            className={styles.subtitle}
            style={{ marginBottom: '1.5rem', fontSize: '0.9rem' }}
          >
            {verticalSchemaFields.some((f) => f.required)
              ? 'Fill required vertical fields below. Tax details are optional.'
              : 'Tax and compliance details are optional. You can skip or fill them later.'}
          </Text>
          {verticalSchemaFields.length > 0 ? (
            <FormRow>
              {verticalSchemaFields.map((field) => (
                <VerticalSchemaFieldInput
                  key={field.key}
                  field={field}
                  value={getCurrentValue(field.key)}
                  onChange={(value: string) => setFormData({ ...formData, [field.key]: value })}
                  disabled={isLoading}
                  idPrefix="onboard-shop"
                  inputClassName={styles.input}
                  labelClassName={styles.label}
                />
              ))}
            </FormRow>
          ) : null}
          <FormRow>
            <FormField
              label="GSTIN No"
              id="gstinNo"
              placeholder="Enter the GSTIN No"
              value={getCurrentValue('gstinNo')}
              onChange={(v) => updateBusinessField('gstinNo', v)}
              disabled={isLoading}
            />
            <FormField
              label="PAN No"
              id="panNo"
              placeholder="Enter the PAN No"
              value={getCurrentValue('panNo')}
              onChange={(v) => updateBusinessField('panNo', v)}
              disabled={isLoading}
            />
          </FormRow>
          <FormRow>
            <FormField
              label="SGST (%)"
              id="sgst"
              placeholder="Enter the SGST (%)"
              value={getCurrentValue('sgst')}
              onChange={(v) => updateBusinessField('sgst', v)}
              disabled={isLoading}
            />
            <FormField
              label="CGST (%)"
              id="cgst"
              placeholder="Enter the CGST (%)"
              value={getCurrentValue('cgst')}
              onChange={(v) => updateBusinessField('cgst', v)}
              disabled={isLoading}
            />
          </FormRow>
        </>
      );
    }

    if (step === 'shopType') {
      return (
        <FormField label="Shop Type *" id="shopType" required>
          <Box className={styles.radioGroup} role="radiogroup" aria-label="Shop type">
            {SHOP_TYPES.map(({ value, label }) => (
              <Button
                variant="ghost"
                key={value}
                className={`${styles.radioOption} ${
                  formData.shopType === value ? styles.radioOptionSelected : ''
                }`}
                onClick={() => {
                  setFormData({ ...formData, shopType: value });
                  clearError();
                }}
                disabled={isLoading}
                role="radio"
                aria-checked={formData.shopType === value}
              >
                <Text as="span" className={styles.radioLabel}>
                  {label}
                </Text>
              </Button>
            ))}
          </Box>
        </FormField>
      );
    }

    if (step === 'tagline') {
      return (
        <>
          <Text
            color="secondary"
            className={styles.subtitle}
            style={{ marginBottom: '1.5rem', fontSize: '0.9rem' }}
          >
            Add a tagline for your shop. This field is optional.
          </Text>
          <FormField
            label="Tagline"
            id="tagline"
            placeholder="Enter shop tagline (e.g., Your Trusted Pharmacy)"
            value={getCurrentValue('tagline')}
            onChange={(v) => {
              setFormData({ ...formData, tagline: v });
              clearError();
            }}
            disabled={isLoading}
          />
        </>
      );
    }

    const inputType = step === 'contactEmail' ? 'email' : step === 'contactPhone' ? 'tel' : 'text';

    const placeholder =
      step === 'name'
        ? 'Enter shop name'
        : step === 'contactPhone'
        ? '+91 1234 567890'
        : 'Enter contact email';

    return (
      <FormField
        label={`${STEP_LABELS[step]} *`}
        id="currentInput"
        type={inputType}
        placeholder={placeholder}
        value={getCurrentValue()}
        onChange={(v) => {
          if (step === 'name') {
            setFormData({ ...formData, name: v });
          } else if (step === 'contactPhone') {
            setFormData({ ...formData, contactPhone: v });
          } else if (step === 'contactEmail') {
            setFormData({ ...formData, contactEmail: v });
          }
          clearError();
        }}
        disabled={isLoading}
      />
    );
  };

  return (
    <Box className={styles.onboardingContainer}>
      <Stack className={styles.sidebar} gap="md">
        <Stack className={styles.userInfo} gap="sm" align="center">
          <Avatar name={userDisplayName} className={styles.userAvatar} />
          <Text className={styles.userName}>{userDisplayName}</Text>
        </Stack>
        <Stack className={styles.sidebarContent} gap="md">
          <Text variant="heading2" className={styles.sidebarTitle}>
            Onboarding: Shop Registration
          </Text>
          <Stack className={styles.steps} gap="xs">
            {STEPS.map((step, index) => (
              <Inline
                key={step}
                className={`${styles.step} ${index === currentStep ? styles.stepActive : ''} ${
                  index < currentStep ? styles.stepCompleted : ''
                }`}
                gap="sm"
              >
                <Text as="span" className={styles.stepNumber}>
                  {index < currentStep ? '✓' : index + 1}
                </Text>
                <Text as="span" className={styles.stepLabel}>
                  {STEP_LABELS[step]}
                </Text>
              </Inline>
            ))}
          </Stack>
        </Stack>
        <Inline className={styles.sidebarFooter} gap="sm">
          <Button variant="ghost" onClick={() => void handleLogout()} className={styles.logoutBtn}>
            Logout
          </Button>
          <IconButton label="Help" className={styles.helpBtn}>
            ?
          </IconButton>
        </Inline>
      </Stack>

      <Stack className={styles.content} gap="md">
        <Inline className={styles.contentHeader} justify="between" width="full">
          <Button variant="ghost" onClick={handleBack} className={styles.backBtn}>
            ← Back
          </Button>
          <Box className={styles.logo}>
            <Text as="span" className={styles.logoText}>
              StockKart
            </Text>
          </Box>
        </Inline>

        <Stack className={styles.formWrapper} gap="md">
          <Text variant="heading1" className={styles.title}>
            Verify your Contact Details
          </Text>
          <Text color="secondary" className={styles.subtitle}>
            We require this to verify your identity. Your details will remain safe.
          </Text>

          {error ? (
            <Alert variant="danger" className={styles.errorMessage}>
              {error}
            </Alert>
          ) : null}

          <Stack className={styles.form} gap="md">
            {renderStepContent()}

            <Box className={styles.formActions}>
              <Button
                variant="solid"
                onClick={handleContinue}
                className={styles.continueButton}
                disabled={isLoading}
                loading={isLoading}
              >
                {isLoading
                  ? 'Registering...'
                  : currentStep === STEPS.length - 1
                  ? 'Complete'
                  : 'Continue'}
              </Button>
            </Box>
          </Stack>
        </Stack>
      </Stack>
    </Box>
  );
}
