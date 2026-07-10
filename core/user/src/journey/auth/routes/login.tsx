import { FormKeyboardNavScope } from '@inventory-platform/routing';
import { Box, Stack } from '@inventory-platform/ui-kit';
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
    <Stack style={{ minHeight: '100vh', paddingTop: '73px' }} bg="canvas">
      <JourneyHeader />
      <Box
        as="main"
        display="flex"
        align="center"
        justify="center"
        padding="lg"
        style={{ flex: 1 }}
      >
        <FormKeyboardNavScope>
          <Stack width="full" maxWidth="sm">
            <LoginForm />
          </Stack>
        </FormKeyboardNavScope>
      </Box>
    </Stack>
  );
}
