import { Box, Link, Stack, Text, type BoxProps } from '@inventory-platform/ui-kit';
import styles from './Footer.module.css';

const brandLogoProps = {
  as: 'img',
  src: '/assets/logo/STOCKKART-3x.png',
  alt: 'StockKart',
  className: styles.brandLogo,
} as unknown as BoxProps;

export function Footer() {
  return (
    <Box as="footer" className={styles.footer}>
      <Box className={styles.container}>
        <Box className={styles.footerContent}>
          <Stack gap="sm" className={styles.brandColumn}>
            <Box className={styles.brand}>
              <Box {...brandLogoProps} />
            </Box>
            <Text className={styles.brandDescription}>
              Complete inventory management solution for modern businesses.
            </Text>
          </Stack>

          <Stack gap="sm" className={styles.column}>
            <Text as="h3" variant="heading3" className={styles.columnTitle}>
              Product
            </Text>
            <Link href="#features" className={styles.link}>
              Features
            </Link>
            <Link href="#pricing" className={styles.link}>
              Pricing
            </Link>
            <Link href="#demo" className={styles.link}>
              Demo
            </Link>
          </Stack>

          <Stack gap="sm" className={styles.column}>
            <Text as="h3" variant="heading3" className={styles.columnTitle}>
              Company
            </Text>
            <Link href="#about" className={styles.link}>
              About
            </Link>
            <Link href="#blog" className={styles.link}>
              Blog
            </Link>
            <Link href="#contact" className={styles.link}>
              Contact
            </Link>
          </Stack>

          <Stack gap="sm" className={styles.column}>
            <Text as="h3" variant="heading3" className={styles.columnTitle}>
              Legal
            </Text>
            <Link href="#privacy" className={styles.link}>
              Privacy
            </Link>
            <Link href="#terms" className={styles.link}>
              Terms
            </Link>
            <Link href="#security" className={styles.link}>
              Security
            </Link>
          </Stack>
        </Box>

        <Text className={styles.copyright}>
          © 2025 StockKart. All rights reserved.
        </Text>
      </Box>
    </Box>
  );
}
