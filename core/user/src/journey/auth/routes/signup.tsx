import { FormKeyboardNavScope } from '@inventory-platform/routing';
import { Box, Stack } from '@inventory-platform/ui-kit';
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
            <SignupForm />
          </Stack>
        </FormKeyboardNavScope>
      </Box>
    </Stack>
  );
}
