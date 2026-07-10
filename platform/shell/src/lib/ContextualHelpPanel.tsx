import { useEffect, useState } from 'react';
import { ExternalLink, Play, X } from 'lucide-react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardBody,
  Drawer,
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

  if (!open) return null;

  return (
    <>
      <Drawer open={open} onClose={selectedVideo ? undefined : onClose}>
        <Stack gap="none" height="full" overflow="auto" padding="lg">
          <Inline align="start" justify="between" gap="md">
            <Stack gap="xs">
              <Text variant="caption" color="muted" weight="semibold">
                Help for this page
              </Text>
              <Text id="contextual-help-title" variant="title">
                {pageLabel}
              </Text>
            </Stack>
            <IconButton label="Close help" onClick={onClose}>
              <X size={20} />
            </IconButton>
          </Inline>

          <Box mt="sm">
            <Text color="secondary" variant="caption">
              Tutorial videos matched to <Text as="code">{currentPath}</Text>
            </Text>
          </Box>

          {loading ? (
            <Inline gap="sm" align="center" mt="md">
              <Spinner size="sm" aria-hidden />
              <Text color="secondary">Loading videos…</Text>
            </Inline>
          ) : null}

          {error ? (
            <Box padding="none" mt="md">
              <Alert variant="danger">{error}</Alert>
            </Box>
          ) : null}

          {!loading && !error && videos.length === 0 ? (
            <Stack gap="none" mt="md">
              <EmptyState
                title="No videos yet"
                description="No videos are mapped to this page yet. Try the StockKart overview from the home page demo, or check back after your admin adds tutorials."
              />
            </Stack>
          ) : null}

          <Stack gap="sm" mt="md" pb="lg">
            {videos.map((video) => (
              <Card key={video.id}>
                <CardBody>
                  <Inline align="start" justify="between" gap="md">
                    <Stack gap="xs" flex="1" minWidth="0">
                      <Text variant="heading3" weight="semibold">
                        {video.title}
                      </Text>
                      {video.description ? (
                        <Text color="secondary" variant="caption">
                          {video.description}
                        </Text>
                      ) : null}
                    </Stack>
                    <Inline gap="xs" align="center">
                      <Button
                        type="button"
                        size="sm"
                        leftIcon={<Play size={16} aria-hidden />}
                        onClick={() => setSelectedVideo(video)}
                      >
                        Watch
                      </Button>
                      <Link
                        href={video.youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open ${video.title} on YouTube`}
                      >
                        <ExternalLink size={16} aria-hidden />
                      </Link>
                    </Inline>
                  </Inline>
                </CardBody>
              </Card>
            ))}
          </Stack>
        </Stack>
      </Drawer>

      <YouTubeHelpModal
        video={selectedVideo}
        open={Boolean(selectedVideo)}
        onClose={() => setSelectedVideo(null)}
      />
    </>
  );
}
