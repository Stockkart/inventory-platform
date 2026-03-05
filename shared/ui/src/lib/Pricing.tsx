import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { plansApi } from '@inventory-platform/api';
import { PlanGrid } from './PlanGrid';
import styles from './Pricing.module.css';

export function Pricing() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Awaited<ReturnType<typeof plansApi.list>>>([]);
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

  const handleGetStarted = () => {
    navigate('/signup');
  };

  if (loading) {
    return (
      <section id="pricing" className={styles.pricing}>
        <div className={styles.container}>
          <div className={styles.header}>
            <p className={styles.subtitle}>Loading plans...</p>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section id="pricing" className={styles.pricing}>
        <div className={styles.container}>
          <div className={styles.header}>
            <p className={styles.subtitle} style={{ color: 'var(--error, #dc2626)' }}>
              {error}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="pricing" className={styles.pricing}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h2 className={styles.title}>Simple, Transparent Pricing</h2>
          <p className={styles.subtitle}>
            Choose the plan that fits your business needs
          </p>
        </header>

        <PlanGrid
          plans={plans}
          onSelectPlan={() => handleGetStarted()}
          ctaLabel="Get Started"
          showTrialBadge
        />
      </div>
    </section>
  );
}
