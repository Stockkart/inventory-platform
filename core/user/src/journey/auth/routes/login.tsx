import { FormKeyboardNavScope } from '@inventory-platform/routing';
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
    <div className={styles.page}>
      <JourneyHeader />
      <main className={styles.main}>
        <FormKeyboardNavScope className={styles.container}>
          <LoginForm />
        </FormKeyboardNavScope>
      </main>
    </div>
  );
}
