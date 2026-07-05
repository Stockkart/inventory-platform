import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { TutorialResourceResponse } from '@inventory-platform/shell/types';
import styles from './YouTubeHelpModal.module.css';

type YouTubeHelpModalProps = {
  video: TutorialResourceResponse | null;
  open: boolean;
  onClose: () => void;
  title?: string;
};

export function YouTubeHelpModal({
  video,
  open,
  onClose,
  title,
}: YouTubeHelpModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !video) return null;

  const embedSrc = video.youtubeVideoId
    ? `https://www.youtube.com/embed/${video.youtubeVideoId}`
    : null;

  return (
    <div
      className={styles.backdrop}
      role="presentation"
      onClick={onClose}
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="youtube-help-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 id="youtube-help-title" className={styles.title}>
            {title ?? video.title}
          </h2>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close video"
          >
            <X size={20} />
          </button>
        </div>
        {video.description ? (
          <p className={styles.description}>{video.description}</p>
        ) : null}
        {embedSrc ? (
          <div className={styles.playerWrap}>
            <iframe
              className={styles.player}
              src={`${embedSrc}?rel=0`}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <p className={styles.fallback}>
            <a href={video.youtubeUrl} target="_blank" rel="noopener noreferrer">
              Watch on YouTube
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
