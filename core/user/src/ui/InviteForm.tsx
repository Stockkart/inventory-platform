import { useState, type FormEvent } from 'react';
import { invitationsApi } from '../api/invitations.api';
import { useNotify } from '@inventory-platform/session';
import type { UserRole } from '@inventory-platform/user/types';
import {
  Alert,
  Box,
  Button,
  Input,
  Label,
  Select,
  surfaceChrome,
} from '@inventory-platform/ui-kit';

interface InviteFormProps {
  shopId: string;
  onInviteSent?: () => void;
  onError?: (error: string) => void;
}

const ROLE_OPTIONS = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'CASHIER', label: 'Cashier' },
] as const;

export function InviteForm({ shopId, onInviteSent, onError }: InviteFormProps) {
  const [inviteeEmail, setInviteeEmail] = useState('');
  const [role, setRole] = useState<UserRole>('CASHIER');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { error: notifyError, success: notifySuccess } = useNotify;

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (event?: FormEvent) => {
    event?.preventDefault();
    setError(null);

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
      onInviteSent?.();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to send invitation. Please try again.';
      notifyError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box as="form" onSubmit={(e: FormEvent) => void handleSubmit(e)}>
      {error ? <Alert variant="danger">{error}</Alert> : null}
      <Box className={surfaceChrome.inviteFormBar}>
        <Box className={`${surfaceChrome.inviteFormField} ${surfaceChrome.inviteFormEmail}`}>
          <Label htmlFor="inviteeEmail" className={surfaceChrome.inviteFormLabel}>
            Email
          </Label>
          <Input
            id="inviteeEmail"
            type="email"
            placeholder="user@example.com"
            value={inviteeEmail}
            onChange={(e) => {
              setInviteeEmail(e.target.value);
              if (error) setError(null);
            }}
            disabled={isLoading}
            required
          />
        </Box>

        <Box className={`${surfaceChrome.inviteFormField} ${surfaceChrome.inviteFormRole}`}>
          <Label htmlFor="invite-role" className={surfaceChrome.inviteFormLabel}>
            Role
          </Label>
          <Select
            id="invite-role"
            options={[...ROLE_OPTIONS]}
            value={role}
            onChange={(e) => {
              setRole(e.target.value as UserRole);
              if (error) setError(null);
            }}
            disabled={isLoading}
            required
          />
        </Box>

        <Button type="submit" variant="solid" disabled={isLoading || !inviteeEmail.trim()}>
          {isLoading ? 'Sending…' : 'Send invite'}
        </Button>
      </Box>
    </Box>
  );
}
