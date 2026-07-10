import { Box, Divider, Link, Stack, Text, type BoxProps } from '@inventory-platform/ui-kit';
import styles from './Footer.module.css';

const brandLogoProps = {
  as: 'img',
  src: '/assets/logo/STOCKKART-3x.png',
  alt: 'StockKart',
  className: styles.brandLogo,
} as unknown as BoxProps;

export function Footer() {
  return (
    <Box as="footer" bg="surface" padding="xl" border width="full">
      <Stack gap="lg" maxWidth="xl" mx="auto">
        <Box className={styles.footerGrid}>
          <Stack gap="sm" className={styles.brandColumn} style={{ maxWidth: 300 }}>
            <Box {...brandLogoProps} />
            <Text color="secondary">
              Complete inventory management solution for modern businesses.
            </Text>
          </Stack>

          <Stack gap="sm">
            <Text as="h3" variant="heading3" weight="semibold">
              Product
            </Text>
            <Link href="#features">Features</Link>
            <Link href="#pricing">Pricing</Link>
            <Link href="#demo">Demo</Link>
          </Stack>

          <Stack gap="sm">
            <Text as="h3" variant="heading3" weight="semibold">
              Company
            </Text>
            <Link href="#about">About</Link>
            <Link href="#blog">Blog</Link>
            <Link href="#contact">Contact</Link>
          </Stack>

          <Stack gap="sm">
            <Text as="h3" variant="heading3" weight="semibold">
              Legal
            </Text>
            <Link href="#privacy">Privacy</Link>
            <Link href="#terms">Terms</Link>
            <Link href="#security">Security</Link>
          </Stack>
        </Box>

        <Divider />
        <Text color="secondary" align="center">
          © 2025 StockKart. All rights reserved.
        </Text>
      </Stack>
    </Box>
  );
}
