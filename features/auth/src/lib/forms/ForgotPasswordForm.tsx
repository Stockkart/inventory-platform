import { useState } from 'react';
import { Link } from 'react-router';
import { authApi } from '@inventory-platform/api';
import styles from './LoginForm.module.css';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authApi.forgotPassword({ email: email.trim() });
      setSuccess(response.message);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (error || success) {
      setError(null);
      setSuccess(null);
    }
  };

  return (
    <div className={styles.formContainer}>
      <div className={styles.header}>
        <h1 className={styles.title}>Forgot Password</h1>
        <p className={styles.subtitle}>
          Enter your email and we&apos;ll send you a link to reset your
          password
        </p>
      </div>

      {error && <div className={styles.errorMessage}>{error}</div>}
      {success && (
        <div
          className={styles.successMessage}
          style={{
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            color: '#16a34a',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            fontSize: '0.9rem',
          }}
        >
          {success}
        </div>
      )}

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label htmlFor="email" className={styles.label}>
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            className={styles.input}
            placeholder="Enter your email"
            value={email}
            onChange={handleChange}
            disabled={isLoading}
            autoFocus
          />
        </div>

        <button
          type="submit"
          className={styles.submitButton}
          disabled={isLoading}
        >
          {isLoading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>

      <div className={styles.footer}>
        <p className={styles.footerText}>
          Remember your password?{' '}
          <Link to="/login" className={styles.link}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
