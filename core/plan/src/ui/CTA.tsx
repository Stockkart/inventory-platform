import { useNavigate } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { Box, Button, Stack, Text } from '@inventory-platform/ui-kit';
import styles from './CTA.module.css';

export function CTA() {
  const navigate = useNavigate();
  return (
    <Box as="section" className={styles.cta} padding="xl" width="full">
      <Stack gap="md" align="center" mx="auto" style={{ maxWidth: 800 }}>
        <Text as="h2" variant="heading2" color="inverse" align="center">
          Ready to Transform Your Inventory Management?
        </Text>
        <Text color="inverse" align="center" style={{ opacity: 0.95 }}>
          Join thousands of businesses that trust StockKart to streamline their operations.
        </Text>
        <Button
          variant="solid"
          size="lg"
          className={styles.ctaButton}
          onClick={() => navigate('/plans')}
          rightIcon={<ChevronRight size={20} />}
        >
          Get Started for Free
        </Button>
      </Stack>
    </Box>
  );
}
