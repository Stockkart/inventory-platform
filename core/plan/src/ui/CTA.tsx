import { useNavigate } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { Button, MarketingCtaBand } from '@inventory-platform/ui-kit';

export function CTA() {
  const navigate = useNavigate();
  return (
    <MarketingCtaBand
      title="Ready to Transform Your Inventory Management?"
      lead="Join thousands of businesses that trust StockKart to streamline their operations."
      actions={
        <Button
          variant="onBrand"
          size="lg"
          onClick={() => navigate('/plans')}
          rightIcon={<ChevronRight size={20} />}
        >
          Get Started for Free
        </Button>
      }
    />
  );
}
