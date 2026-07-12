import { useEffect, useState } from 'react';
import { CircleHelp, ExternalLink, Play, X } from 'lucide-react';
import {
  Alert,
  Box,
  Button,
  Drawer,
  IconButton,
  Inline,
  Spinner,
  Text,
  shellChrome,
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
      <Drawer
        open={open}
        side="right"
        labelledBy="contextual-help-title"
        onClose={selectedVideo ? undefined : onClose}
      >
        <Box className={shellChrome.helpPanel}>
          <Box className={shellChrome.helpPanelHeader}>
            <Box className={shellChrome.helpPanelHeaderMain}>
              <Box className={shellChrome.helpPanelIcon} aria-hidden>
                <CircleHelp size={20} strokeWidth={1.75} />
              </Box>
              <Box minWidth="0">
                <Text as="p" className={shellChrome.helpPanelEyebrow}>
                  Page help
                </Text>
                <Text as="h2" id="contextual-help-title" className={shellChrome.helpPanelTitle}>
                  {pageLabel}
                </Text>
              </Box>
            </Box>
            <IconButton label="Close help" onClick={onClose}>
              <X size={18} />
            </IconButton>
          </Box>

          <Box className={shellChrome.helpPanelBody}>
            {loading ? (
              <Inline gap="sm" align="center">
                <Spinner size="sm" aria-hidden />
                <Text color="secondary" variant="caption">
                  Loading tutorials…
                </Text>
              </Inline>
            ) : null}

            {error ? <Alert variant="danger">{error}</Alert> : null}

            {!loading && !error && videos.length === 0 ? (
              <Box className={shellChrome.helpEmpty}>
                <Box className={shellChrome.helpEmptyIcon} aria-hidden>
                  <Play size={18} strokeWidth={1.75} />
                </Box>
                <Text as="p" className={shellChrome.helpEmptyTitle}>
                  No tutorials yet
                </Text>
                <Text as="p" className={shellChrome.helpEmptyHint}>
                  Nothing is mapped to this page. Check the home page overview, or ask an admin to
                  add a tutorial.
                </Text>
              </Box>
            ) : null}

            {!loading && !error && videos.length > 0 ? (
              <Box className={shellChrome.helpVideoList}>
                {videos.map((video) => (
                  <Box key={video.id} className={shellChrome.helpVideoCard}>
                    <Box minWidth="0" flex="1">
                      <Text as="p" className={shellChrome.helpVideoTitle}>
                        {video.title}
                      </Text>
                      {video.description ? (
                        <Text as="p" className={shellChrome.helpVideoDesc}>
                          {video.description}
                        </Text>
                      ) : null}
                    </Box>
                    <Box className={shellChrome.helpVideoActions}>
                      <Button
                        type="button"
                        size="sm"
                        leftIcon={<Play size={15} aria-hidden />}
                        onClick={() => setSelectedVideo(video)}
                      >
                        Watch
                      </Button>
                      <a
                        href={video.youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open ${video.title} on YouTube`}
                        className={shellChrome.helpExternalLink}
                      >
                        <ExternalLink size={15} aria-hidden />
                      </a>
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : null}
          </Box>
        </Box>
      </Drawer>

      <YouTubeHelpModal
        video={selectedVideo}
        open={Boolean(selectedVideo)}
        onClose={() => setSelectedVideo(null)}
      />
    </>
  );
}
