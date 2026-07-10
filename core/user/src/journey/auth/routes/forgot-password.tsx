import { FormKeyboardNavScope } from '@inventory-platform/routing';
import { JourneyMain, JourneyShell, Stack } from '@inventory-platform/ui-kit';
import { JourneyHeader } from '../../ui/JourneyHeader';
import { ForgotPasswordForm } from '../forms/ForgotPasswordForm';

export function meta() {
  return [
    { title: 'Forgot Password - StockKart' },
    { name: 'description', content: 'Reset your StockKart password' },
  ];
}

export default function ForgotPasswordPage() {
  return (
    <JourneyShell>
      <JourneyHeader />
      <JourneyMain>
        <FormKeyboardNavScope>
          <Stack width="full" maxWidth="sm">
            <ForgotPasswordForm />
          </Stack>
        </FormKeyboardNavScope>
      </JourneyMain>
    </JourneyShell>
  );
}
