import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuthStore } from '@inventory-platform/session';
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

  // Periodically check if user has been added to a shop
  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    // If user already has a shop, redirect to dashboard
    if (user.shopId) {
      navigate('/dashboard');
      return;
    }

    // Set up interval to check for shop updates every 5 seconds
    const intervalId = setInterval(async () => {
      try {
        await fetchCurrentUser();
        const updatedUser = useAuthStore.getState().user;
        if (updatedUser?.shopId) {
          navigate('/dashboard');
        }
      } catch (error) {
        // Silently fail - don't show errors for background checks
        console.error('Failed to check user status:', error);
      }
    }, 5000); // Check every 5 seconds

    return () => {
      clearInterval(intervalId);
    };
  }, [isAuthenticated, user, navigate, fetchCurrentUser]);

  // Redirect if not authenticated
  if (!isAuthenticated || !user) {
    return null; // Will redirect via layout
  }

  // Redirect if user already has shop
  if (user.shopId) {
    return null; // Will redirect via layout
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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Get Started</h1>
        <p className={styles.subtitle}>
          Choose how you'd like to get started with StockKart
        </p>
      </div>

      <div className={styles.options}>
        <div
          className={`${styles.optionCard} ${
            selectedOption === 'onboard' ? styles.selected : ''
          }`}
          onClick={() => handleOptionSelect('onboard')}
        >
          <div className={styles.iconWrapper}>🏪</div>
          <h2 className={styles.optionTitle}>Onboard a New Shop</h2>
          <p className={styles.optionDescription}>
            Create and register your own shop. You'll be the owner and can
            invite others to join.
          </p>
        </div>

        <div
          className={`${styles.optionCard} ${
            selectedOption === 'request' ? styles.selected : ''
          }`}
          onClick={() => handleOptionSelect('request')}
        >
          <div className={styles.iconWrapper}>👥</div>
          <h2 className={styles.optionTitle}>Request to Join a Shop</h2>
          <p className={styles.optionDescription}>
            Request to join an existing shop. The shop owner will review and
            approve your request.
          </p>
        </div>

        <div
          className={`${styles.optionCard} ${
            selectedOption === 'view' ? styles.selected : ''
          }`}
          onClick={() => handleOptionSelect('view')}
        >
          <div className={styles.iconWrapper}>📬</div>
          <h2 className={styles.optionTitle}>My requests & invitations</h2>
          <p className={styles.optionDescription}>
            View invitations you've received to join shops and the status of
            join requests you've sent.
          </p>
        </div>
      </div>

      {selectedOption && (
        <div className={styles.actions}>
          <button className={styles.continueButton} onClick={handleContinue}>
            Continue
          </button>
        </div>
      )}

      <div className={styles.footer}>
        <button type="button" className={styles.logoutButton} onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  );
}
