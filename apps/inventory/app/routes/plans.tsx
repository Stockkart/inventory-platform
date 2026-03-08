import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { plansApi } from '@inventory-platform/api';
import { PlanGrid, Header, Footer } from '@inventory-platform/ui';
import { useAuthStore } from '@inventory-platform/store';
import styles from './plans.module.css';

export function meta() {
  return [
    { title: 'Plans & Pricing - StockKart' },
    {
      name: 'description',
      content: 'View all plans and choose the right one for your business.',
    },
  ];
}

export default function PlansPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [plans, setPlans] = useState<Awaited<ReturnType<typeof plansApi.list>>>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const data = await plansApi.list();
        setPlans(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load plans');
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  const handleSelectPlan = (plan: { id: string }) => {
    if (isAuthenticated) {
      navigate(`/dashboard/plan-payment?planId=${plan.id}`);
    } else {
      navigate('/signup');
    }
  };

  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <header className={styles.header}>
            <Link to="/" className={styles.backLink}>
              ← Back to home
            </Link>
            <h1 className={styles.title}>All Plans & Pricing</h1>
            <p className={styles.subtitle}>
              Choose the plan that fits your business needs
            </p>
          </header>

          {loading && (
            <p className={styles.loading}>Loading plans...</p>
          )}

          {error && (
            <p className={styles.error} style={{ color: 'var(--error)' }}>
              {error}
            </p>
          )}

          {!loading && !error && plans.length > 0 && (
            <PlanGrid
              plans={plans}
              onSelectPlan={handleSelectPlan}
              ctaLabel={isAuthenticated ? 'Select Plan' : 'Get Started'}
              showTrialBadge
            />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
