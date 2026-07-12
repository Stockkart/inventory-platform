import { FormKeyboardNavScope } from '@inventory-platform/routing';
import { JourneyMain, JourneyShell, Stack } from '@inventory-platform/ui-kit';
import { JourneyHeader } from '../../ui/JourneyHeader';
import { SignupForm } from '../forms/SignupForm';

export function meta() {
  return [
    { title: 'Sign Up - StockKart' },
    { name: 'description', content: 'Create your StockKart account' },
  ];
}

export default function SignupPage() {
  return (
    <JourneyShell>
      <JourneyHeader />
      <JourneyMain>
        <FormKeyboardNavScope>
          <Stack width="full" maxWidth="sm">
            <SignupForm />
          </Stack>
        </FormKeyboardNavScope>
      </JourneyMain>
    </JourneyShell>
  );
}
