import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuthStore } from '@inventory-platform/session';
import { shopsApi } from '@inventory-platform/user/shops';
import type { UserRole, OwnerShopSummary } from '@inventory-platform/user/types';
import styles from './request-join-shop.module.css';
import { useNotify } from '@inventory-platform/session';

const AVAILABLE_ROLES: UserRole[] = ['ADMIN', 'MANAGER', 'CASHIER'];

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        `Request sent successfully! You requested to join "${response.shopName}". The shop owner will review your request.`
      );

      // Clear form
      setOwnerEmail('');
      setOwnerShops([]);
      setSelectedShopId('');
      setMessage('');

      // Refresh user data in case they get added immediately
      await fetchCurrentUser();

      // Check if user now has a shop, otherwise stay on page
      const updatedUser = useAuthStore.getState().user;
      if (updatedUser?.shopId) {
        // User was added immediately, redirect to dashboard
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      }
      // Otherwise, user stays on page to see success message
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.message ||
        err?.response?.data?.data?.message ||
        err?.message ||
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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={handleBack}>
          ← Back
        </button>
        <h1 className={styles.title}>Request to Join a Shop</h1>
        <p className={styles.subtitle}>
          Enter the shop owner's email address to send a join request
        </p>
      </div>

      {error && <div className={styles.errorMessage}>{error}</div>}

      {success && <div className={styles.successMessage}>{success}</div>}

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label htmlFor="ownerEmail" className={styles.label}>
            Shop Owner Email *
          </label>
          <div className={styles.emailRow}>
            <input
              id="ownerEmail"
              type="email"
              className={styles.input}
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
            <button
              type="button"
              className={styles.findShopsButton}
              onClick={handleFindShops}
              disabled={isLoading || isFindingShops || !ownerEmail.trim()}
            >
              {isFindingShops ? 'Finding...' : 'Find shops'}
            </button>
          </div>
          <p className={styles.helpText}>
            Enter the email address of the shop owner and click Find shops.
          </p>
        </div>

        {ownerShops.length > 0 && (
          <div className={styles.formGroup}>
            <label htmlFor="shopSelect" className={styles.label}>
              Select Shop *
            </label>
            <select
              id="shopSelect"
              className={styles.select}
              value={selectedShopId}
              onChange={(e) => {
                setSelectedShopId(e.target.value);
                if (error) setError(null);
              }}
              disabled={isLoading}
              required
            >
              <option value="">Choose a shop...</option>
              {ownerShops.map((s) => (
                <option key={s.shopId} value={s.shopId}>
                  {s.shopName}
                </option>
              ))}
            </select>
            <p className={styles.helpText}>
              Select the shop you want to join.
            </p>
          </div>
        )}

        <div className={styles.formGroup}>
          <label htmlFor="role" className={styles.label}>
            Requested Role *
          </label>
          <select
            id="role"
            className={styles.select}
            value={role}
            onChange={(e) => {
              setRole(e.target.value as UserRole);
              if (error) setError(null);
            }}
            disabled={isLoading}
            required
          >
            {AVAILABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <p className={styles.helpText}>
            Select the role you would like to have in the shop.
          </p>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="message" className={styles.label}>
            Message (Optional)
          </label>
          <textarea
            id="message"
            className={styles.textarea}
            placeholder="Add a message to the shop owner (optional)"
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              if (error) setError(null);
            }}
            disabled={isLoading}
            rows={4}
          />
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={handleBack}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={
              isLoading ||
              !ownerEmail.trim() ||
              !selectedShopId ||
              ownerShops.length === 0
            }
          >
            {isLoading ? 'Sending Request...' : 'Send Request'}
          </button>
        </div>
      </form>

      <div className={styles.footer}>
        <button className={styles.logoutButton} onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  );
}
