import { FormKeyboardNavScope } from '@inventory-platform/routing';
import { Box } from '@inventory-platform/ui-kit';
import { JourneyHeader } from '../../ui/JourneyHeader';
import { LoginForm } from '../forms/LoginForm';
import styles from './login.module.css';

export function meta() {
  return [
    { title: 'Login - StockKart' },
    { name: 'description', content: 'Sign in to your StockKart account' },
  ];
}

export default function LoginPage() {
  return (
    <Box className={styles.page}>
      <JourneyHeader />
      <Box as="main" className={styles.main}>
        <FormKeyboardNavScope className={styles.container}>
          <LoginForm />
        </FormKeyboardNavScope>
      </Box>
    </Box>
  );
}
