import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router';
import { authApi } from '@inventory-platform/api';
import styles from './LoginForm.module.css';

export function ResetPasswordForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset link. Please request a new password reset.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('Invalid or missing reset link. Please request a new password reset.');
      return;
    }

    if (!newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      await authApi.resetPassword({
        token,
        newPassword,
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
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
    const { name, value } = e.target;
    if (name === 'newPassword') setNewPassword(value);
    else setConfirmPassword(value);
    if (error) setError(null);
  };

  if (!token) {
    return (
      <div className={styles.formContainer}>
        <div className={styles.header}>
          <h1 className={styles.title}>Invalid Reset Link</h1>
          <p className={styles.subtitle}>
            This password reset link is invalid or has expired. Please request a
            new one.
          </p>
        </div>
        {error && <div className={styles.errorMessage}>{error}</div>}
        <div className={styles.footer}>
          <p className={styles.footerText}>
            <Link to="/forgot-password" className={styles.link}>
              Request a new reset link
            </Link>
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className={styles.formContainer}>
        <div className={styles.header}>
          <h1 className={styles.title}>Password Reset</h1>
          <p className={styles.subtitle}>
            Your password has been reset successfully. Redirecting you to sign
            in...
          </p>
        </div>
        <div className={styles.footer}>
          <p className={styles.footerText}>
            <Link to="/login" className={styles.link}>
              Sign in now
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.formContainer}>
      <div className={styles.header}>
        <h1 className={styles.title}>Reset Password</h1>
        <p className={styles.subtitle}>
          Enter your new password below
        </p>
      </div>

      {error && <div className={styles.errorMessage}>{error}</div>}

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label htmlFor="newPassword" className={styles.label}>
            New Password
          </label>
          <input
            type="password"
            id="newPassword"
            name="newPassword"
            className={styles.input}
            placeholder="Enter new password (min 8 characters)"
            value={newPassword}
            onChange={handleChange}
            disabled={isLoading}
            minLength={8}
            autoFocus
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="confirmPassword" className={styles.label}>
            Confirm Password
          </label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            className={styles.input}
            placeholder="Confirm your new password"
            value={confirmPassword}
            onChange={handleChange}
            disabled={isLoading}
            minLength={8}
          />
        </div>

        <button
          type="submit"
          className={styles.submitButton}
          disabled={isLoading}
        >
          {isLoading ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>

      <div className={styles.footer}>
        <p className={styles.footerText}>
          <Link to="/login" className={styles.link}>
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
