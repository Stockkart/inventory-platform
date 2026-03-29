import {
  FormKeyboardNavScope,
  Header,
  SignupForm,
} from '@inventory-platform/ui';
import styles from './signup.module.css';

export function meta() {
  return [
    { title: 'Sign Up - StockKart' },
    { name: 'description', content: 'Create your StockKart account' },
  ];
}

export default function SignupPage() {
  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        <FormKeyboardNavScope className={styles.container}>
          <SignupForm />
        </FormKeyboardNavScope>
      </main>
    </div>
  );
}
