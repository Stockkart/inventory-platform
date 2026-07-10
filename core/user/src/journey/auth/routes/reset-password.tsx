import { FormKeyboardNavScope } from '@inventory-platform/routing';
import { JourneyMain, JourneyShell, Stack } from '@inventory-platform/ui-kit';
import { JourneyHeader } from '../../ui/JourneyHeader';
import { ResetPasswordForm } from '../forms/ResetPasswordForm';

export function meta() {
  return [
    { title: 'Reset Password - StockKart' },
    { name: 'description', content: 'Set a new password for your StockKart account' },
  ];
}

export default function ResetPasswordPage() {
  return (
    <JourneyShell>
      <JourneyHeader />
      <JourneyMain>
        <FormKeyboardNavScope>
          <Stack width="full" maxWidth="sm">
            <ResetPasswordForm />
          </Stack>
        </FormKeyboardNavScope>
      </JourneyMain>
    </JourneyShell>
  );
}
