import { useState } from 'react';
import { invitationsApi } from '../api/invitations.api';
import { useNotify } from '@inventory-platform/session';
import type { UserRole } from '@inventory-platform/user/types';
import { Alert, Button, FormField, Select, Stack, Text } from '@inventory-platform/ui-kit';
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
    <Stack gap="md" width="full">
      <Stack gap="xs">
        <Text variant="title" weight="semibold">
          Send Invitation
        </Text>
        <Text color="secondary">Invite a user to join your shop</Text>
      </Stack>

      {error ? <Alert variant="danger">{error}</Alert> : null}
      {success ? <Alert variant="success">{success}</Alert> : null}

      <Stack gap="md" width="full">
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

        <Button variant="solid" onClick={handleSubmit} disabled={isLoading || !inviteeEmail.trim()}>
          {isLoading ? 'Sending...' : 'Send Invitation'}
        </Button>
      </Stack>
    </Stack>
  );
}
