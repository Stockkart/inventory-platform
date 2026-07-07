import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuthStore } from '@inventory-platform/session';
import {
  Box,
  Button,
  Card,
  CardBody,
  Stack,
  Text,
} from '@inventory-platform/ui-kit';
import styles from './shop-selection.module.css';

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
  const [selectedOption, setSelectedOption] = useState<
    'onboard' | 'request' | 'view' | null
  >(null);

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
    <Stack className={styles.container} gap="lg">
      <Stack className={styles.header} gap="xs">
        <Text variant="heading1" className={styles.title}>
          Get Started
        </Text>
        <Text color="secondary" className={styles.subtitle}>
          Choose how you&apos;d like to get started with StockKart
        </Text>
      </Stack>

      <Box className={styles.options}>
        {options.map(({ key, icon, title, description }) => (
          <Card
            key={key}
            className={`${styles.optionCard} ${
              selectedOption === key ? styles.selected : ''
            }`}
            onClick={() => handleOptionSelect(key)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleOptionSelect(key);
              }
            }}
          >
            <CardBody>
              <Box className={styles.iconWrapper}>{icon}</Box>
              <Text variant="heading2" className={styles.optionTitle}>
                {title}
              </Text>
              <Text color="secondary" className={styles.optionDescription}>
                {description}
              </Text>
            </CardBody>
          </Card>
        ))}
      </Box>

      {selectedOption ? (
        <Box className={styles.actions}>
          <Button
            variant="solid"
            className={styles.continueButton}
            onClick={handleContinue}
          >
            Continue
          </Button>
        </Box>
      ) : null}

      <Box className={styles.footer}>
        <Button
          variant="ghost"
          className={styles.logoutButton}
          onClick={() => void handleLogout()}
        >
          Logout
        </Button>
      </Box>
    </Stack>
  );
}
