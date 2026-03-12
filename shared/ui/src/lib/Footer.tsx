import styles from './Footer.module.css';

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.footerContent}>
          <div className={styles.brandColumn}>
            <div className={styles.brand}>
              <img
                src="/assets/logo/STOCKKART-3x.png"
                alt="StockKart"
                className={styles.brandLogo}
              />
            </div>
            <p className={styles.brandDescription}>
              Complete inventory management solution for modern businesses.
            </p>
          </div>

          <div className={styles.column}>
            <h3 className={styles.columnTitle}>Product</h3>
            <a href="#features" className={styles.link}>
              Features
            </a>
            <a href="#pricing" className={styles.link}>
              Pricing
            </a>
            <a href="#demo" className={styles.link}>
              Demo
            </a>
          </div>

          <div className={styles.column}>
            <h3 className={styles.columnTitle}>Company</h3>
            <a href="#about" className={styles.link}>
              About
            </a>
            <a href="#blog" className={styles.link}>
              Blog
            </a>
            <a href="#contact" className={styles.link}>
              Contact
            </a>
          </div>

          <div className={styles.column}>
            <h3 className={styles.columnTitle}>Legal</h3>
            <a href="#privacy" className={styles.link}>
              Privacy
            </a>
            <a href="#terms" className={styles.link}>
              Terms
            </a>
            <a href="#security" className={styles.link}>
              Security
            </a>
          </div>
        </div>

        <div className={styles.copyright}>
          © 2025 StockKart. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
