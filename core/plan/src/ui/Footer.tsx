import {
  Box,
  Divider,
  Link,
  Stack,
  Text,
  useMatchMedia,
  type BoxProps,
} from '@inventory-platform/ui-kit';

const brandLogoStyle = {
  height: 40,
  width: 'auto',
  maxWidth: 160,
  objectFit: 'contain' as const,
};

const brandLogoProps = {
  as: 'img',
  src: '/assets/logo/STOCKKART-3x.png',
  alt: 'StockKart',
  style: brandLogoStyle,
} as unknown as BoxProps;

export function Footer() {
  const isNarrow = useMatchMedia('(max-width: 640px)');
  const isMedium = useMatchMedia('(max-width: 968px)');

  const gridColumns = isNarrow ? '1fr' : isMedium ? '1fr 1fr' : '2fr 1fr 1fr 1fr';
  const gridGap = isMedium ? '2rem' : '3rem';

  return (
    <Box as="footer" bg="surface" padding="xl" border width="full">
      <Stack gap="lg" maxWidth="xl" mx="auto">
        <Box
          display="grid"
          style={{
            gridTemplateColumns: gridColumns,
            gap: gridGap,
          }}
        >
          <Stack
            gap="sm"
            style={{
              maxWidth: 300,
              gridColumn: isMedium && !isNarrow ? '1 / -1' : undefined,
            }}
          >
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
