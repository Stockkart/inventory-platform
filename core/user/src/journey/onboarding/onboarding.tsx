import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useAuthStore, useVerticalSchemaStore, useNotify } from '@inventory-platform/session';
import { shopsApi } from '@inventory-platform/user/shops';
import { verticalsApi } from '@inventory-platform/session/api';
import type { OnboardingStep } from '@inventory-platform/user/types';
import type { ShopType } from '@inventory-platform/user/types';
import { previewNextInvoiceNo } from '@inventory-platform/user/types';
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
  Select,
  Stack,
  Text,
  cn,
  journeyChrome,
} from '@inventory-platform/ui-kit';
import { CircleHelp } from 'lucide-react';

const STEPS: OnboardingStep[] = [
  'name',
  'vertical',
  'shopType',
  'tagline',
  'contactPhone',
  'contactEmail',
  'location',
  'businessDetails',
  'invoiceNumbering',
];

const STEP_LABELS: Record<OnboardingStep, string> = {
  name: 'Shop Name',
  vertical: 'Business vertical',
  shopType: 'Shop Type',
  contactPhone: 'Mobile number',
  contactEmail: 'Contact Email',
  location: 'Location Details',
  businessDetails: 'Business Details',
  invoiceNumbering: 'Invoice numbering',
  tagline: 'Tagline',
};

const STEP_COPY: Record<OnboardingStep, { title: string; subtitle: string }> = {
  name: {
    title: 'Name your shop',
    subtitle: 'This is how your business will appear across StockKart.',
  },
  vertical: {
    title: 'Choose your vertical',
    subtitle: 'Pick the business category that best matches your shop.',
  },
  shopType: {
    title: 'Select shop type',
    subtitle: 'Tell us how you sell so we can tailor the experience.',
  },
  tagline: {
    title: 'Add a tagline',
    subtitle: 'A short line that captures what makes your shop special. Optional.',
  },
  contactPhone: {
    title: 'Add a mobile number',
    subtitle: 'We use this to verify your identity. Your details stay private.',
  },
  contactEmail: {
    title: 'Confirm contact email',
    subtitle: 'We’ll use this for important account and shop updates.',
  },
  location: {
    title: 'Where is your shop?',
    subtitle: 'Add the address customers and partners will associate with you.',
  },
  businessDetails: {
    title: 'Business details',
    subtitle: 'Add tax and compliance info now, or skip and fill them later.',
  },
  invoiceNumbering: {
    title: 'Invoice numbering',
    subtitle:
      'Already issuing invoices this financial year from another app? Continue that series — or start fresh with StockKart.',
  },
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
  const [compactLayout, setCompactLayout] = useState(false);
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
    contactPhone: user?.phone || '',
    gstinNo: '',
    fssai: '',
    dlNo: '',
    panNo: '',
    sgst: '',
    cgst: '',
    tagline: '',
    continueFromPreviousApp: false,
    lastInvoiceNo: '',
  });

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const update = () => setCompactLayout(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

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
    if (user?.phone && !formData.contactPhone) {
      setFormData((prev) => ({ ...prev, contactPhone: user.phone || '' }));
    }
  }, [isAuthenticated, user, navigate, formData.contactEmail, formData.contactPhone, addShop]);

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
    // Shop fields like dlNo use showIn: ["onboarding"] — regular mode drops them server-side.
    void fetchVerticalSchema(formData.verticalId, 'onboarding').then((schema) => {
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
    } else if (step === 'invoiceNumbering') {
      if (formData.continueFromPreviousApp) {
        const last = formData.lastInvoiceNo.trim();
        if (!last) {
          notifyError('Enter your last invoice number from the previous app');
          return;
        }
        if (!previewNextInvoiceNo(last)) {
          notifyError('Invoice number must end with digits (e.g. SL-0152)');
          return;
        }
      }
      void handleSubmit();
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
        if (formData.continueFromPreviousApp && formData.lastInvoiceNo.trim()) {
          try {
            await shopsApi.updateInvoiceSeries({
              lastInvoiceNo: formData.lastInvoiceNo.trim(),
            });
          } catch (seriesErr) {
            notifyError(
              seriesErr instanceof Error
                ? seriesErr.message
                : 'Shop created, but invoice numbering could not be saved. Set it in Profile.',
            );
          }
        }
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
            label="Primary Address"
            id="primaryAddress"
            placeholder="Shop No. 12, Main Market Road"
            value={getCurrentValue('primaryAddress')}
            onChange={(v) => updateLocationField('primaryAddress', v)}
            disabled={isLoading}
            required
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
              label="City"
              id="city"
              placeholder="Mumbai"
              value={getCurrentValue('city')}
              onChange={(v) => updateLocationField('city', v)}
              disabled={isLoading}
              required
            />
            <FormField
              label="State"
              id="state"
              placeholder="Maharashtra"
              value={getCurrentValue('state')}
              onChange={(v) => updateLocationField('state', v)}
              disabled={isLoading}
              required
            />
          </FormRow>
          <FormRow>
            <FormField
              label="PIN Code"
              id="pin"
              placeholder="400001"
              value={getCurrentValue('pin')}
              onChange={(v) => updateLocationField('pin', v)}
              disabled={isLoading}
              required
            />
            <FormField
              label="Country"
              id="country"
              placeholder="IND"
              value={getCurrentValue('country')}
              onChange={(v) => updateLocationField('country', v)}
              disabled={isLoading}
              required
            />
          </FormRow>
        </>
      );
    }

    if (step === 'vertical') {
      return (
        <FormField label="Business vertical" id="verticalId" required>
          <Select
            id="verticalId"
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
          <Text color="secondary" variant="caption">
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

    if (step === 'invoiceNumbering') {
      const nextPreview = formData.continueFromPreviousApp
        ? previewNextInvoiceNo(formData.lastInvoiceNo)
        : 'INV-00001';
      return (
        <>
          <Text color="secondary" variant="caption">
            Were you already issuing invoices this financial year from another app?
          </Text>
          <Stack gap="sm" width="full">
            <Button
              variant="outline"
              className={cn(
                journeyChrome.onboardingShopTypeBtn,
                !formData.continueFromPreviousApp && journeyChrome.onboardingShopTypeBtnActive,
              )}
              onClick={() => {
                setFormData({
                  ...formData,
                  continueFromPreviousApp: false,
                  lastInvoiceNo: '',
                });
                clearError();
              }}
              disabled={isLoading}
              role="radio"
              aria-checked={!formData.continueFromPreviousApp}
              fullWidth
            >
              No — start with StockKart (INV-00001)
            </Button>
            <Button
              variant="outline"
              className={cn(
                journeyChrome.onboardingShopTypeBtn,
                formData.continueFromPreviousApp && journeyChrome.onboardingShopTypeBtnActive,
              )}
              onClick={() => {
                setFormData({ ...formData, continueFromPreviousApp: true });
                clearError();
              }}
              disabled={isLoading}
              role="radio"
              aria-checked={formData.continueFromPreviousApp}
              fullWidth
            >
              Yes — continue from previous app
            </Button>
          </Stack>
          {formData.continueFromPreviousApp ? (
            <>
              <FormField
                label="Last invoice number"
                id="lastInvoiceNo"
                placeholder="e.g. SL-0152 or INV/PH/000149"
                value={formData.lastInvoiceNo}
                onChange={(v) => setFormData({ ...formData, lastInvoiceNo: v })}
                disabled={isLoading}
                required
              />
              {nextPreview ? (
                <Text color="secondary" variant="caption">
                  Next invoice will be {nextPreview}
                </Text>
              ) : null}
            </>
          ) : (
            <Text color="secondary" variant="caption">
              Next invoice will be INV-00001
            </Text>
          )}
        </>
      );
    }

    if (step === 'shopType') {
      return (
        <FormField label="Shop Type" id="shopType" required>
          <Stack gap="sm" width="full">
            {SHOP_TYPES.map(({ value, label }) => (
              <Button
                variant="outline"
                key={value}
                className={cn(
                  journeyChrome.onboardingShopTypeBtn,
                  formData.shopType === value && journeyChrome.onboardingShopTypeBtnActive,
                )}
                onClick={() => {
                  setFormData({ ...formData, shopType: value });
                  clearError();
                }}
                disabled={isLoading}
                role="radio"
                aria-checked={formData.shopType === value}
                fullWidth
              >
                {label}
              </Button>
            ))}
          </Stack>
        </FormField>
      );
    }

    if (step === 'tagline') {
      return (
        <>
          <Text color="secondary" variant="caption">
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
        label={STEP_LABELS[step]}
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
        required
      />
    );
  };

  const stepKey = STEPS[currentStep];
  const stepCopy = STEP_COPY[stepKey];
  const progressPct = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <Box className={journeyChrome.onboardingLayout}>
      <Box
        className={
          compactLayout ? journeyChrome.onboardingSidebarCompact : journeyChrome.onboardingSidebar
        }
      >
        <Box className={journeyChrome.onboardingProfile}>
          <Avatar name={userDisplayName} />
          <Text as="p" className={journeyChrome.onboardingUserName}>
            {userDisplayName}
          </Text>
        </Box>

        <Box>
          <Text as="p" className={journeyChrome.onboardingSidebarTitle}>
            Shop registration
          </Text>
          <Text as="p" className={journeyChrome.onboardingProgressMeta}>
            Step {currentStep + 1} of {STEPS.length}
          </Text>
          <Box className={journeyChrome.onboardingProgressTrack} aria-hidden>
            <Box
              className={journeyChrome.onboardingProgressFill}
              style={{ width: `${progressPct}%` }}
            />
          </Box>
        </Box>

        <Box className={journeyChrome.onboardingStepList} as="nav" aria-label="Registration steps">
          {STEPS.map((step, index) => {
            const done = index < currentStep;
            const active = index === currentStep;
            return (
              <Box
                key={step}
                className={cn(
                  journeyChrome.onboardingStep,
                  active && journeyChrome.onboardingStepActive,
                  done && journeyChrome.onboardingStepDone,
                  !done && !active && journeyChrome.stepMuted,
                )}
              >
                <Text as="span" className={journeyChrome.onboardingStepIndex}>
                  {done ? '✓' : index + 1}
                </Text>
                <Text as="span" className={journeyChrome.onboardingStepLabel}>
                  {STEP_LABELS[step]}
                </Text>
              </Box>
            );
          })}
        </Box>

        <Box className={journeyChrome.onboardingSidebarFooter}>
          <Button variant="ghost" onClick={() => void handleLogout()}>
            Logout
          </Button>
          <IconButton label="Help">
            <CircleHelp size={18} strokeWidth={1.75} />
          </IconButton>
        </Box>
      </Box>

      <Box as="main" className={journeyChrome.onboardingMain}>
        <Box className={journeyChrome.onboardingMainInner}>
          <Button variant="ghost" onClick={handleBack} className={journeyChrome.onboardingBack}>
            ← Back
          </Button>

          <Box className={journeyChrome.onboardingPanel}>
            <Box className={journeyChrome.onboardingPanelBody}>
              <Box className={journeyChrome.onboardingPanelHeader}>
                <Text as="h1" className={journeyChrome.onboardingPanelTitle}>
                  {stepCopy.title}
                </Text>
                <Text as="p" className={journeyChrome.onboardingPanelSubtitle}>
                  {stepCopy.subtitle}
                </Text>
              </Box>

              {error ? <Alert variant="danger">{error}</Alert> : null}

              <Box className={journeyChrome.onboardingForm}>
                {renderStepContent()}

                <Button
                  variant="solid"
                  onClick={handleContinue}
                  disabled={isLoading}
                  loading={isLoading}
                  fullWidth
                  className={journeyChrome.onboardingContinue}
                >
                  {isLoading
                    ? 'Registering…'
                    : currentStep === STEPS.length - 1
                    ? 'Complete'
                    : 'Continue'}
                </Button>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
