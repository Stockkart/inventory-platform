import { FormKeyboardNavScope } from '@inventory-platform/routing';
import { JourneyMain, JourneyShell, Stack } from '@inventory-platform/ui-kit';
import { JourneyHeader } from '../../ui/JourneyHeader';
import { LoginForm } from '../forms/LoginForm';

export function meta() {
  return [
    { title: 'Login - StockKart' },
    { name: 'description', content: 'Sign in to your StockKart account' },
  ];
}

export default function LoginPage() {
  return (
    <JourneyShell>
      <JourneyHeader />
      <JourneyMain>
        <FormKeyboardNavScope>
          <Stack width="full" maxWidth="sm">
            <LoginForm />
          </Stack>
        </FormKeyboardNavScope>
      </JourneyMain>
    </JourneyShell>
  );
}
