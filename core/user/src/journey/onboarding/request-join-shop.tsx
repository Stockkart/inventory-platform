import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuthStore } from '@inventory-platform/session';
import { shopsApi } from '@inventory-platform/user/shops';
import type { UserRole, OwnerShopSummary } from '@inventory-platform/user/types';
import {
  Alert,
  Button,
  Card,
  CardBody,
  FormField,
  Inline,
  Input,
  Select,
  Stack,
  Text,
  Textarea,
} from '@inventory-platform/ui-kit';
import { useNotify } from '@inventory-platform/session';

const AVAILABLE_ROLES: UserRole[] = ['ADMIN', 'MANAGER', 'CASHIER'];

const ROLE_OPTIONS = AVAILABLE_ROLES.map((r) => ({ value: r, label: r }));

export function meta() {
  return [
    { title: 'Request to Join Shop - StockKart' },
    { name: 'description', content: 'Request to join an existing shop' },
  ];
}

export default function RequestJoinShopPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, fetchCurrentUser, logout } = useAuthStore();
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerShops, setOwnerShops] = useState<OwnerShopSummary[]>([]);
  const [selectedShopId, setSelectedShopId] = useState('');
  const [role, setRole] = useState<UserRole>('CASHIER');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFindingShops, setIsFindingShops] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { success: notifySuccess, error: notifyError } = useNotify;

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    if (user.shopId) {
      navigate('/dashboard');
      return;
    }

    const intervalId = setInterval(async () => {
      try {
        await fetchCurrentUser();
        const updatedUser = useAuthStore.getState().user;
        if (updatedUser?.shopId) {
          navigate('/dashboard');
        }
      } catch (err) {
        console.error('Failed to check user status:', err);
      }
    }, 5000);

    return () => {
      clearInterval(intervalId);
    };
  }, [isAuthenticated, user, navigate, fetchCurrentUser]);

  if (!isAuthenticated || !user) {
    return null;
  }

  if (user.shopId) {
    return null;
  }

  const handleFindShops = async () => {
    if (!ownerEmail.trim() || !ownerEmail.includes('@')) {
      notifyError('Please enter a valid shop owner email');
      return;
    }
    setError(null);
    setOwnerShops([]);
    setSelectedShopId('');
    setIsFindingShops(true);
    try {
      const shops = await shopsApi.getShopsByOwnerEmail(ownerEmail.trim());
      setOwnerShops(shops);
      if (shops.length === 0) {
        notifyError('No shops found for this email address');
      } else if (shops.length === 1) {
        setSelectedShopId(shops[0].shopId);
      }
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Failed to find shops');
    } finally {
      setIsFindingShops(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);

    if (!ownerEmail.trim()) {
      notifyError('Please enter the shop owner email');
      return;
    }

    if (!ownerEmail.includes('@')) {
      notifyError('Please enter a valid email address');
      return;
    }

    if (!selectedShopId) {
      notifyError('Please find and select a shop first');
      return;
    }

    setIsLoading(true);

    try {
      const response = await shopsApi.requestToJoin({
        ownerEmail: ownerEmail.trim(),
        shopId: selectedShopId,
        role,
        message: message.trim() || undefined,
      });

      notifySuccess(
        `Request sent successfully! You requested to join "${response.shopName}". The shop owner will review your request.`,
      );

      setOwnerEmail('');
      setOwnerShops([]);
      setSelectedShopId('');
      setMessage('');

      await fetchCurrentUser();

      const updatedUser = useAuthStore.getState().user;
      if (updatedUser?.shopId) {
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      }
    } catch (err: unknown) {
      const apiErr = err as {
        response?: { data?: { message?: string; data?: { message?: string } } };
        message?: string;
      };
      const errorMessage =
        apiErr?.response?.data?.message ||
        apiErr?.response?.data?.data?.message ||
        apiErr?.message ||
        'Failed to send request. Please try again.';
      setError(errorMessage);
      notifyError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/shop-selection');
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch {
      navigate('/login');
    }
  };

  const shopOptions = [
    { value: '', label: 'Choose a shop...' },
    ...ownerShops.map((s) => ({ value: s.shopId, label: s.shopName })),
  ];

  return (
    <Stack gap="lg" width="full" maxWidth="sm" mx="auto" padding="lg" minHeight="screen">
      <Stack gap="xs">
        <Button variant="ghost" onClick={handleBack}>
          ← Back
        </Button>
        <Text variant="heading1">Request to Join a Shop</Text>
        <Text color="secondary">
          Enter the shop owner&apos;s email address to send a join request
        </Text>
      </Stack>

      {error ? <Alert variant="danger">{error}</Alert> : null}
      {success ? <Alert variant="success">{success}</Alert> : null}

      <Card>
        <CardBody>
          <Stack gap="md" width="full">
            <FormField
              label="Shop Owner Email *"
              id="ownerEmail"
              hint="Enter the email address of the shop owner and click Find shops."
            >
              <Inline gap="sm" width="full" align="stretch">
                <Input
                  id="ownerEmail"
                  type="email"
                  placeholder="owner@example.com"
                  value={ownerEmail}
                  onChange={(e) => {
                    setOwnerEmail(e.target.value);
                    setOwnerShops([]);
                    setSelectedShopId('');
                    if (error) setError(null);
                  }}
                  disabled={isLoading}
                  required
                />
                <Button
                  variant="outline"
                  onClick={() => void handleFindShops()}
                  disabled={isLoading || isFindingShops || !ownerEmail.trim()}
                  loading={isFindingShops}
                >
                  {isFindingShops ? 'Finding...' : 'Find shops'}
                </Button>
              </Inline>
            </FormField>

            {ownerShops.length > 0 ? (
              <FormField
                label="Select Shop *"
                id="shopSelect"
                hint="Select the shop you want to join."
              >
                <Select
                  id="shopSelect"
                  options={shopOptions}
                  value={selectedShopId}
                  onChange={(e) => {
                    setSelectedShopId(e.target.value);
                    if (error) setError(null);
                  }}
                  disabled={isLoading}
                  required
                />
              </FormField>
            ) : null}

            <FormField
              label="Requested Role *"
              id="role"
              hint="Select the role you would like to have in the shop."
            >
              <Select
                id="role"
                options={ROLE_OPTIONS}
                value={role}
                onChange={(e) => {
                  setRole(e.target.value as UserRole);
                  if (error) setError(null);
                }}
                disabled={isLoading}
                required
              />
            </FormField>

            <FormField label="Message (Optional)" id="message">
              <Textarea
                id="message"
                placeholder="Add a message to the shop owner (optional)"
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  if (error) setError(null);
                }}
                disabled={isLoading}
                rows={4}
              />
            </FormField>

            <Inline gap="sm" justify="end" width="full">
              <Button variant="ghost" onClick={handleBack} disabled={isLoading}>
                Cancel
              </Button>
              <Button
                variant="solid"
                onClick={() => void handleSubmit()}
                disabled={
                  isLoading || !ownerEmail.trim() || !selectedShopId || ownerShops.length === 0
                }
                loading={isLoading}
              >
                {isLoading ? 'Sending Request...' : 'Send Request'}
              </Button>
            </Inline>
          </Stack>
        </CardBody>
      </Card>

      <Stack align="center">
        <Button variant="ghost" onClick={() => void handleLogout()}>
          Logout
        </Button>
      </Stack>
    </Stack>
  );
}
