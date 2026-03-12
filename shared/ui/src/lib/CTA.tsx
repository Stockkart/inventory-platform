import { useNavigate } from 'react-router';
import styles from './CTA.module.css';

export function CTA() {
  const navigate = useNavigate();
  return (
    <section className={styles.cta}>
      <div className={styles.container}>
        <h2 className={styles.title}>
          Ready to Transform Your Inventory Management?
        </h2>
        <p className={styles.subtitle}>
          Join thousands of businesses that trust StockKart to streamline their
          operations.
        </p>
        <button className={styles.button} onClick={() => navigate('/plans')}>
          Get Started for Free
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M7.5 15L12.5 10L7.5 5"
              stroke="#1f2937"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </section>
  );
}
