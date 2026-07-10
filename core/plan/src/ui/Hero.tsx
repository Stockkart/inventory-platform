import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronRight, Play } from 'lucide-react';
import { resourcesApi } from '@inventory-platform/shell/api';
import type { TutorialResourceResponse } from '@inventory-platform/shell/types';
import { YouTubeHelpModal } from '@inventory-platform/shell';
import { Button, MarketingHero } from '@inventory-platform/ui-kit';

const backgrounds = [
  '/assets/logo/inventory-pic.png',
  '/assets/logo/inventory-pic2.png',
  '/assets/logo/inventory-pic3.png',
];

const DEMO_VIDEO_KEY = 'stockkart-overview';

export function Hero() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [demoVideo, setDemoVideo] = useState<TutorialResourceResponse | null>(null);
  const [demoOpen, setDemoOpen] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const id = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % backgrounds.length);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  const handleWatchDemo = async () => {
    if (demoVideo) {
      setDemoOpen(true);
      return;
    }
    setDemoLoading(true);
    try {
      const video = await resourcesApi.getByKey(DEMO_VIDEO_KEY);
      setDemoVideo(video);
      setDemoOpen(true);
    } catch {
      try {
        const fallback = await resourcesApi.getByKey('demo');
        setDemoVideo(fallback);
        setDemoOpen(true);
      } catch {
        window.open('https://www.youtube.com', '_blank', 'noopener,noreferrer');
      }
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <>
      <MarketingHero
        backgrounds={backgrounds}
        activeIndex={currentIndex}
        headline="Inventory that scales with your business"
        support="Everything you need to manage stock, sales, and operations in one place."
        actions={
          <>
            <Button
              variant="brand"
              size="lg"
              onClick={() => navigate('/plans')}
              rightIcon={<ChevronRight size={20} />}
            >
              Start Free Trial
            </Button>
            <Button
              type="button"
              variant="inverseOutline"
              size="lg"
              onClick={() => void handleWatchDemo()}
              disabled={demoLoading}
              leftIcon={<Play size={18} />}
            >
              {demoLoading ? 'Loading…' : 'Watch Demo'}
            </Button>
          </>
        }
      />
      <YouTubeHelpModal
        video={demoVideo}
        open={demoOpen}
        onClose={() => setDemoOpen(false)}
        title={demoVideo?.title ?? 'StockKart demo'}
      />
    </>
  );
}
