import { Box, Link, MarketingFooter, type BoxProps } from '@inventory-platform/ui-kit';

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
  return (
    <MarketingFooter
      brand={<Box {...brandLogoProps} />}
      tagline="Complete inventory management solution for modern businesses."
      copyright="© 2026 StockKart. All rights reserved."
      meta={
        <>
          <Link href="#privacy">Privacy</Link>
          <Link href="#terms">Terms</Link>
          <Link href="#contact">Contact</Link>
        </>
      }
      columns={[
        {
          title: 'Product',
          links: (
            <>
              <Link href="#features">Features</Link>
              <Link href="#pricing">Pricing</Link>
              <Link href="#demo">Demo</Link>
            </>
          ),
        },
        {
          title: 'Company',
          links: (
            <>
              <Link href="#about">About</Link>
              <Link href="#blog">Blog</Link>
              <Link href="#contact">Contact</Link>
            </>
          ),
        },
        {
          title: 'Legal',
          links: (
            <>
              <Link href="#privacy">Privacy</Link>
              <Link href="#terms">Terms</Link>
              <Link href="#security">Security</Link>
            </>
          ),
        },
      ]}
    />
  );
}
