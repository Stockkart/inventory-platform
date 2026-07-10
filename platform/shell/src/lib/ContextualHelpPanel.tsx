import { useEffect, useState } from 'react';
import { ExternalLink, Play, X } from 'lucide-react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardBody,
  EmptyState,
  IconButton,
  Inline,
  Link,
  Spinner,
  Stack,
  Text,
} from '@inventory-platform/ui-kit';
import { resourcesApi } from '../api/resources.api';
import type { TutorialResourceResponse } from '@inventory-platform/shell/types';
import { YouTubeHelpModal } from './YouTubeHelpModal';
import styles from './ContextualHelpPanel.module.css';

type ContextualHelpPanelProps = {
  open: boolean;
  onClose: () => void;
  currentPath: string;
  pageLabel: string;
};

export function ContextualHelpPanel({
  open,
  onClose,
  currentPath,
  pageLabel,
}: ContextualHelpPanelProps) {
  const [videos, setVideos] = useState<TutorialResourceResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<TutorialResourceResponse | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    resourcesApi
      .listForRoute(currentPath)
      .then((list) => {
        if (!cancelled) setVideos(list);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Could not load help videos');
          setVideos([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, currentPath]);

  useEffect(() => {
    if (!open) {
      setSelectedVideo(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !selectedVideo) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, selectedVideo]);

  if (!open) return null;

  return (
    <>
      <Box className={styles.backdrop} role="presentation" onClick={onClose} />
      <Box
        as="aside"
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="contextual-help-title"
      >
        <Inline className={styles.header} align="start" justify="between">
          <Stack gap="xs">
            <Text className={styles.kicker}>Help for this page</Text>
            <Text id="contextual-help-title" variant="title" className={styles.title}>
              {pageLabel}
            </Text>
          </Stack>
          <IconButton label="Close help" className={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </IconButton>
        </Inline>

        <Text className={styles.hint}>
          Tutorial videos matched to <Text as="code">{currentPath}</Text>
        </Text>

        {loading ? (
          <Inline className={styles.status} gap="sm">
            <Spinner size="sm" aria-hidden />
            <Text>Loading videos…</Text>
          </Inline>
        ) : null}

        {error ? (
          <Alert variant="danger" className={styles.error}>
            {error}
          </Alert>
        ) : null}

        {!loading && !error && videos.length === 0 ? (
          <EmptyState
            className={styles.empty}
            title="No videos yet"
            description="No videos are mapped to this page yet. Try the StockKart overview from the home page demo, or check back after your admin adds tutorials."
          />
        ) : null}

        <Stack gap="sm" className={styles.list}>
          {videos.map((video) => (
            <Card key={video.id} className={styles.card}>
              <CardBody className={styles.cardBody}>
                <Text variant="heading3" className={styles.cardTitle}>
                  {video.title}
                </Text>
                {video.description ? (
                  <Text className={styles.cardDesc}>{video.description}</Text>
                ) : null}
              </CardBody>
              <Inline className={styles.cardActions} gap="xs">
                <Button
                  type="button"
                  size="sm"
                  className={styles.playBtn}
                  leftIcon={<Play size={16} aria-hidden />}
                  onClick={() => setSelectedVideo(video)}
                >
                  Watch
                </Button>
                <Link
                  className={styles.linkBtn}
                  href={video.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open ${video.title} on YouTube`}
                >
                  <ExternalLink size={16} aria-hidden />
                </Link>
              </Inline>
            </Card>
          ))}
        </Stack>
      </Box>

      <YouTubeHelpModal
        video={selectedVideo}
        open={Boolean(selectedVideo)}
        onClose={() => setSelectedVideo(null)}
      />
    </>
  );
}
