import { useState } from 'react';
import { invitationsApi } from '../api/invitations.api';
import { useNotify } from '@inventory-platform/session';
import type { UserRole } from '@inventory-platform/types';
import styles from './InviteForm.module.css';
const { error: notifyError, success: notifySuccess } = useNotify;

interface InviteFormProps {
  shopId: string;
  onInviteSent?: () => void;
  onError?: (error: string) => void;
}

const AVAILABLE_ROLES: UserRole[] = ['ADMIN', 'MANAGER', 'CASHIER'];

export function InviteForm({ shopId, onInviteSent, onError }: InviteFormProps) {
  const [inviteeEmail, setInviteeEmail] = useState('');
  const [role, setRole] = useState<UserRole>('CASHIER');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!inviteeEmail.trim()) {
      notifyError('Email is required');
      return;
    }

    if (!validateEmail(inviteeEmail)) {
      notifyError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      const response = await invitationsApi.sendInvitation(shopId, {
        inviteeEmail: inviteeEmail.trim(),
        role,
      });

      notifySuccess(response.message || 'Invitation sent successfully!');
      setInviteeEmail('');
      setRole('CASHIER');

      if (onInviteSent) {
        onInviteSent();
      }
    } catch (err: any) {
      const errorMessage =
        err?.message || 'Failed to send invitation. Please try again.';
      notifyError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.formContainer}>
      <div className={styles.header}>
        <h2 className={styles.title}>Send Invitation</h2>
        <p className={styles.subtitle}>Invite a user to join your shop</p>
      </div>

      {error && <div className={styles.errorMessage}>{error}</div>}

      {success && <div className={styles.successMessage}>{success}</div>}

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label htmlFor="inviteeEmail" className={styles.label}>
            Email Address
          </label>
          <input
            id="inviteeEmail"
            type="email"
            className={styles.input}
            placeholder="user@example.com"
            value={inviteeEmail}
            onChange={(e) => {
              setInviteeEmail(e.target.value);
              if (error) setError(null);
              if (success) setSuccess(null);
            }}
            disabled={isLoading}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="role" className={styles.label}>
            Role
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
        </div>

        <button
          type="submit"
          className={styles.submitButton}
          disabled={isLoading || !inviteeEmail.trim()}
        >
          {isLoading ? 'Sending...' : 'Send Invitation'}
        </button>
      </form>
    </div>
  );
}
