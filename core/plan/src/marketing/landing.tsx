import { FormKeyboardNavScope } from '@inventory-platform/routing';
import { Box } from '@inventory-platform/ui-kit';
import {
  Header,
  Hero,
  Stats,
  Features,
  Pricing,
  CTA,
  Footer,
} from '../ui';
import styles from './landing.module.css';

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
    <Box className={styles.page}>
      <Header />
      <Box as="main">
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
