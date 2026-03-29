import { FormKeyboardNavScope, Header, LoginForm } from '@inventory-platform/ui';
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
      <Header />
      <main className={styles.main}>
        <FormKeyboardNavScope className={styles.container}>
          <LoginForm />
        </FormKeyboardNavScope>
      </main>
    </div>
  );
}
