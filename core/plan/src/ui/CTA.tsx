import { useNavigate } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { Box, Button, Stack, Text } from '@inventory-platform/ui-kit';

export function CTA() {
  const navigate = useNavigate();
  return (
    <Box
      as="section"
      padding="xl"
      width="full"
      style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)' }}
    >
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
          style={{
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
          }}
          onClick={() => navigate('/plans')}
          rightIcon={<ChevronRight size={20} />}
        >
          Get Started for Free
        </Button>
      </Stack>
    </Box>
  );
}
