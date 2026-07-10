import { useNavigate } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { Box, Button, Stack, Text } from '@inventory-platform/ui-kit';
import styles from './CTA.module.css';

export function CTA() {
  const navigate = useNavigate();
  return (
    <Box as="section" className={styles.cta}>
      <Stack gap="md" className={styles.container}>
        <Text as="h2" variant="heading2" className={styles.title}>
          Ready to Transform Your Inventory Management?
        </Text>
        <Text className={styles.subtitle}>
          Join thousands of businesses that trust StockKart to streamline their operations.
        </Text>
        <Button
          variant="solid"
          className={styles.button}
          onClick={() => navigate('/plans')}
          rightIcon={<ChevronRight size={20} />}
        >
          Get Started for Free
        </Button>
      </Stack>
    </Box>
  );
}
