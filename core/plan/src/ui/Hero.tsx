import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronRight, Play } from 'lucide-react';
import { resourcesApi } from '@inventory-platform/shell/api';
import type { TutorialResourceResponse } from '@inventory-platform/shell/types';
import { YouTubeHelpModal } from '@inventory-platform/shell';
import { Box, Button, Inline, Stack, Text, useMatchMedia } from '@inventory-platform/ui-kit';

const backgrounds = [
  '/assets/logo/inventory-pic.png',
  '/assets/logo/inventory-pic2.png',
  '/assets/logo/inventory-pic3.png',
];

const DEMO_VIDEO_KEY = 'stockkart-overview';

const primaryBtnStyle = {
  background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
  color: 'white',
  border: 'none',
} as const;

const secondaryBtnStyle = {
  background: 'transparent',
  color: '#ffffff',
  border: '0.2px solid rgba(255, 255, 255, 0.35)',
  backdropFilter: 'blur(4px)',
} as const;

export function Hero() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [demoVideo, setDemoVideo] = useState<TutorialResourceResponse | null>(null);
  const [demoOpen, setDemoOpen] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const navigate = useNavigate();
  const isMobile = useMatchMedia('(max-width: 768px)');

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
    <Box
      as="section"
      display="flex"
      align="center"
      justify="center"
      width="full"
      overflow="hidden"
      position="relative"
      style={{
        minHeight: '90vh',
        textAlign: 'center',
        marginTop: 'calc(var(--header-height) * -0.2)',
        padding: isMobile ? '2rem 1rem' : undefined,
      }}
    >
      <Box position="absolute" overflow="hidden" style={{ inset: 0, zIndex: 0 }}>
        {backgrounds.map((src, index) => (
          <Box
            key={index}
            position="absolute"
            style={{
              inset: 0,
              backgroundImage: `url(${src})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              opacity: index === currentIndex ? 1 : 0,
              transition: 'opacity 1s ease-in-out',
            }}
          />
        ))}
        <Box
          position="absolute"
          style={{
            inset: 0,
            background: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(2px)',
          }}
        />
      </Box>

      <Stack
        gap="lg"
        align="center"
        position="relative"
        mx="auto"
        padding="sm"
        style={{ zIndex: 2, maxWidth: 800 }}
      >
        <Text
          as="h1"
          variant="heading1"
          weight="bold"
          style={{
            fontSize: isMobile ? '2.5rem' : '3.5rem',
            lineHeight: 1.2,
            marginBottom: '1.5rem',
          }}
        >
          <Text as="span" style={{ color: '#f4f6f8' }}>
            Powerful Inventory
          </Text>{' '}
          <Text as="span" style={{ color: '#f6f8f8' }}>
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
            style={primaryBtnStyle}
            onClick={() => navigate('/plans')}
            rightIcon={<ChevronRight size={20} />}
          >
            Start Free Trial
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            style={secondaryBtnStyle}
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
