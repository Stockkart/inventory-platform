import { FormKeyboardNavScope } from '@inventory-platform/routing';
import { Box } from '@inventory-platform/ui-kit';
import { Header, Hero, Stats, Features, Pricing, CTA, Footer } from '../ui';

export function meta() {
  return [
    { title: 'StockKart - Complete Inventory Management Solution' },
    {
      name: 'description',
      content:
        'Streamline your business operations with our comprehensive inventory management platform.',
    },
  ];
}

export default function LandingPage() {
  return (
    <Box
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        paddingTop: 73,
      }}
    >
      <Header />
      <Box as="main" style={{ flex: 1 }}>
        <FormKeyboardNavScope>
          <Hero />
          <Stats />
          <Features />
          <Pricing />
          <CTA />
        </FormKeyboardNavScope>
      </Box>
      <Footer />
    </Box>
  );
}
