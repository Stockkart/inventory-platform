import { useState } from 'react';
import { invitationsApi } from '../api/invitations.api';
import { useNotify } from '@inventory-platform/session';
import type { UserRole } from '@inventory-platform/user/types';
import { Alert, Button, FormField, Select, Stack, Text } from '@inventory-platform/ui-kit';
import styles from './InviteForm.module.css';
const { error: notifyError, success: notifySuccess } = useNotify;

interface InviteFormProps {
  shopId: string;
  onInviteSent?: () => void;
  onError?: (error: string) => void;
}

const AVAILABLE_ROLES: UserRole[] = ['ADMIN', 'MANAGER', 'CASHIER'];

const ROLE_OPTIONS = AVAILABLE_ROLES.map((r) => ({ value: r, label: r }));

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

  const handleSubmit = async () => {
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
      const errorMessage = err?.message || 'Failed to send invitation. Please try again.';
      notifyError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Stack className={styles.formContainer} gap="md">
      <Stack className={styles.header} gap="xs">
        <Text variant="title" className={styles.title}>
          Send Invitation
        </Text>
        <Text color="secondary" className={styles.subtitle}>
          Invite a user to join your shop
        </Text>
      </Stack>

      {error ? (
        <Alert variant="danger" className={styles.errorMessage}>
          {error}
        </Alert>
      ) : null}

      {success ? (
        <Alert variant="success" className={styles.successMessage}>
          {success}
        </Alert>
      ) : null}

      <Stack className={styles.form} gap="md">
        <FormField
          label="Email Address"
          id="inviteeEmail"
          type="email"
          placeholder="user@example.com"
          value={inviteeEmail}
          onChange={(v) => {
            setInviteeEmail(v);
            if (error) setError(null);
            if (success) setSuccess(null);
          }}
          disabled={isLoading}
          required
        />

        <FormField label="Role" id="role" required>
          <Select
            id="role"
            className={styles.select}
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

        <Button
          variant="solid"
          className={styles.submitButton}
          onClick={handleSubmit}
          disabled={isLoading || !inviteeEmail.trim()}
        >
          {isLoading ? 'Sending...' : 'Send Invitation'}
        </Button>
      </Stack>
    </Stack>
  );
}
