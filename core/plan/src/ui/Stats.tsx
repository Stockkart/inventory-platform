import styles from './Stats.module.css';

export function Stats() {
  const stats = [
    { value: '99.9%', label: 'Uptime' },
    { value: '---', label: 'Active Users' },
    { value: '---', label: 'Products Tracked' },
    { value: '24/7', label: 'Support' },
  ];

  return (
    <section className={styles.stats}>
      <div className={styles.container}>
        {stats.map((stat, index) => (
          <div key={index} className={styles.statItem}>
            <div className={styles.statValue}>{stat.value}</div>
            <div className={styles.statLabel}>{stat.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
