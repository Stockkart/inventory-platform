import { useEffect, useState } from 'react';
import { ExternalLink, Loader2, Play, X } from 'lucide-react';
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
  const [selectedVideo, setSelectedVideo] = useState<TutorialResourceResponse | null>(
    null
  );

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
          setError(
            e instanceof Error ? e.message : 'Could not load help videos'
          );
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
      <div
        className={styles.backdrop}
        role="presentation"
        onClick={onClose}
      />
      <aside
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="contextual-help-title"
      >
        <div className={styles.header}>
          <div>
            <p className={styles.kicker}>Help for this page</p>
            <h2 id="contextual-help-title" className={styles.title}>
              {pageLabel}
            </h2>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close help"
          >
            <X size={20} />
          </button>
        </div>

        <p className={styles.hint}>
          Tutorial videos matched to <code>{currentPath}</code>
        </p>

        {loading ? (
          <div className={styles.status}>
            <Loader2 size={20} className={styles.spinner} aria-hidden />
            Loading videos…
          </div>
        ) : null}

        {error ? <p className={styles.error}>{error}</p> : null}

        {!loading && !error && videos.length === 0 ? (
          <p className={styles.empty}>
            No videos are mapped to this page yet. Try the StockKart overview
            from the home page demo, or check back after your admin adds
            tutorials.
          </p>
        ) : null}

        <ul className={styles.list}>
          {videos.map((video) => (
            <li key={video.id} className={styles.card}>
              <div className={styles.cardBody}>
                <h3 className={styles.cardTitle}>{video.title}</h3>
                {video.description ? (
                  <p className={styles.cardDesc}>{video.description}</p>
                ) : null}
              </div>
              <div className={styles.cardActions}>
                <button
                  type="button"
                  className={styles.playBtn}
                  onClick={() => setSelectedVideo(video)}
                >
                  <Play size={16} aria-hidden />
                  Watch
                </button>
                <a
                  className={styles.linkBtn}
                  href={video.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open ${video.title} on YouTube`}
                >
                  <ExternalLink size={16} aria-hidden />
                </a>
              </div>
            </li>
          ))}
        </ul>
      </aside>

      <YouTubeHelpModal
        video={selectedVideo}
        open={Boolean(selectedVideo)}
        onClose={() => setSelectedVideo(null)}
      />
    </>
  );
}
