import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronRight, Play } from 'lucide-react';
import { resourcesApi } from '@inventory-platform/shell/api';
import type { TutorialResourceResponse } from '@inventory-platform/shell/types';
import { YouTubeHelpModal } from '@inventory-platform/shell';
import { Box, Button, Inline, Stack, Text } from '@inventory-platform/ui-kit';
import styles from './Hero.module.css';

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
    <Box as="section" className={styles.hero}>
      <Box className={styles.backgroundWrapper}>
        {backgrounds.map((src, index) => (
          <Box
            key={index}
            className={`${styles.bgImage} ${index === currentIndex ? styles.bgImageActive : ''}`}
            style={{ backgroundImage: `url(${src})` }}
          />
        ))}
        <Box className={styles.overlay} />
      </Box>

      <Stack
        gap="lg"
        align="center"
        position="relative"
        mx="auto"
        padding="sm"
        style={{ zIndex: 2, maxWidth: 800 }}
      >
        <Text as="h1" variant="heading1" className={styles.title}>
          <Text as="span" className={styles.titleBlue}>
            Powerful Inventory
          </Text>{' '}
          <Text as="span" className={styles.titleTeal}>
            Management
          </Text>
        </Text>
        <Stack gap="none" align="center">
          <Text color="inverse" weight="medium" style={{ fontSize: '1.25rem', lineHeight: 1.6 }}>
            Everything you need to manage your inventory efficiently and scale
          </Text>
          <Text color="inverse" weight="medium" style={{ fontSize: '1.25rem', lineHeight: 1.6 }}>
            your business operations
          </Text>
        </Stack>
        <Inline gap="md" justify="center" flexWrap>
          <Button
            variant="solid"
            size="lg"
            className={styles.primaryBtn}
            onClick={() => navigate('/plans')}
            rightIcon={<ChevronRight size={20} />}
          >
            Start Free Trial
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className={styles.secondaryBtn}
            onClick={() => void handleWatchDemo()}
            disabled={demoLoading}
            leftIcon={<Play size={18} />}
          >
            {demoLoading ? 'Loading…' : 'Watch Demo'}
          </Button>
        </Inline>
      </Stack>

      <YouTubeHelpModal
        video={demoVideo}
        open={demoOpen}
        onClose={() => setDemoOpen(false)}
        title={demoVideo?.title ?? 'StockKart demo'}
      />
    </Box>
  );
}
