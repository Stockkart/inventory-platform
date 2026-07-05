import { FormKeyboardNavScope } from '@inventory-platform/routing';
import { JourneyHeader } from '../../ui/JourneyHeader';
import { SignupForm } from '../forms/SignupForm';
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
      <JourneyHeader />
      <main className={styles.main}>
        <FormKeyboardNavScope className={styles.container}>
          <SignupForm />
        </FormKeyboardNavScope>
      </main>
    </div>
  );
}
