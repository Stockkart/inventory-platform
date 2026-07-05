import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Play } from 'lucide-react';
import { resourcesApi } from '@inventory-platform/api';
import type { TutorialResourceResponse } from '@inventory-platform/types';
import { YouTubeHelpModal } from '@inventory-platform/shell';
import styles from './Hero.module.css';

// Use public assets - these will be served from /assets/logo/ in the public folder
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
    <section className={styles.hero}>
      {/* Background slider */}
      <div className={styles.backgroundWrapper}>
        {backgrounds.map((src, index) => (
          <div
            key={index}
            className={`${styles.bgImage} ${
              index === currentIndex ? styles.bgImageActive : ''
            }`}
            style={{ backgroundImage: `url(${src})` }}
          />
        ))}
        <div className={styles.overlay} />
      </div>

      {/* Content */}
      <div className={styles.container}>
        <h1 className={styles.title}>
          <span className={styles.titleBlue}>Powerful Inventory</span>{' '}
          <span className={styles.titleTeal}>Management</span>
        </h1>
        <p className={styles.description}>
          Everything you need to manage your inventory efficiently and scale{' '}
          <br />
          your business operations
        </p>
        <div className={styles.ctaButtons}>
          <button
            className={styles.primaryBtn}
            onClick={() => navigate('/plans')}
          >
            Start Free Trial
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M7.5 15L12.5 10L7.5 5"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => void handleWatchDemo()}
            disabled={demoLoading}
          >
            <Play size={18} style={{ marginRight: '8px', paddingTop: '3px' }} />
            {demoLoading ? 'Loading…' : 'Watch Demo'}
          </button>
        </div>
      </div>

      <YouTubeHelpModal
        video={demoVideo}
        open={demoOpen}
        onClose={() => setDemoOpen(false)}
        title={demoVideo?.title ?? 'StockKart demo'}
      />
    </section>
  );
}
