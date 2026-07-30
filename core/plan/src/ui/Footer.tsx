import { MarketingFooter, Link } from '@inventory-platform/ui-kit';

export function Footer() {
  return (
    <MarketingFooter
      brand={<img src="/assets/logo/STOCKKART-3x.png" alt="StockKart" height={40} width={150} />}
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
