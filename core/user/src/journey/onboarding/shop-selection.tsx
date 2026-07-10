import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuthStore } from '@inventory-platform/session';
import { Button, Card, CardBody, Grid, Stack, Text } from '@inventory-platform/ui-kit';

export function meta() {
  return [
    { title: 'Shop Selection - StockKart' },
    {
      name: 'description',
      content: 'Choose how to get started with your shop',
    },
  ];
}

export default function ShopSelectionPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, fetchCurrentUser, logout } = useAuthStore();
  const [selectedOption, setSelectedOption] = useState<'onboard' | 'request' | 'view' | null>(null);

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
      } catch (error) {
        console.error('Failed to check user status:', error);
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

  const handleOptionSelect = (option: 'onboard' | 'request' | 'view') => {
    setSelectedOption(option);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch {
      navigate('/login');
    }
  };

  const handleContinue = () => {
    if (selectedOption === 'onboard') {
      navigate('/onboarding');
    } else if (selectedOption === 'request') {
      navigate('/request-join-shop');
    } else if (selectedOption === 'view') {
      navigate('/my-requests-invitations');
    }
  };

  const options: {
    key: 'onboard' | 'request' | 'view';
    icon: string;
    title: string;
    description: string;
  }[] = [
    {
      key: 'onboard',
      icon: '🏪',
      title: 'Onboard a New Shop',
      description:
        "Create and register your own shop. You'll be the owner and can invite others to join.",
    },
    {
      key: 'request',
      icon: '👥',
      title: 'Request to Join a Shop',
      description:
        'Request to join an existing shop. The shop owner will review and approve your request.',
    },
    {
      key: 'view',
      icon: '📬',
      title: 'My requests & invitations',
      description:
        "View invitations you've received to join shops and the status of join requests you've sent.",
    },
  ];

  return (
    <Stack
      gap="lg"
      width="full"
      maxWidth="lg"
      mx="auto"
      padding="xl"
      minHeight="screen"
      justify="center"
    >
      <Stack gap="xs" align="center">
        <Text variant="heading1">Get Started</Text>
        <Text color="secondary" align="center">
          Choose how you&apos;d like to get started with StockKart
        </Text>
      </Stack>

      <Grid columns={3} gap="md" width="full">
        {options.map(({ key, icon, title, description }) => (
          <Card
            key={key}
            onClick={() => handleOptionSelect(key)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleOptionSelect(key);
              }
            }}
            selected={selectedOption === key}
          >
            <CardBody>
              <Stack gap="md" align="center">
                <Text>{icon}</Text>
                <Text variant="heading2" weight="semibold" align="center">
                  {title}
                </Text>
                <Text color="secondary" align="center">
                  {description}
                </Text>
              </Stack>
            </CardBody>
          </Card>
        ))}
      </Grid>

      {selectedOption ? (
        <Stack align="center">
          <Button variant="solid" onClick={handleContinue}>
            Continue
          </Button>
        </Stack>
      ) : null}

      <Stack align="center">
        <Button variant="ghost" onClick={() => void handleLogout()}>
          Logout
        </Button>
      </Stack>
    </Stack>
  );
}
