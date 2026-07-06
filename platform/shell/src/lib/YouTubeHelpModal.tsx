import { Box, Link, Modal, Text } from '@inventory-platform/ui-kit';
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
  if (!video) return null;

  const embedSrc = video.youtubeVideoId
    ? `https://www.youtube.com/embed/${video.youtubeVideoId}`
    : null;

  const displayTitle = title ?? video.title;

  return (
    <Modal open={open} onClose={onClose} size="lg" className={styles.modal}>
      <Modal.Header title={displayTitle} onClose={onClose} />
      <Modal.Body>
        {video.description ? (
          <Text className={styles.description}>{video.description}</Text>
        ) : null}
        {embedSrc ? (
          <Box className={styles.playerWrap}>
            <iframe
              className={styles.player}
              src={`${embedSrc}?rel=0`}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </Box>
        ) : (
          <Box className={styles.fallback}>
            <Link href={video.youtubeUrl} target="_blank" rel="noopener noreferrer">
              Watch on YouTube
            </Link>
          </Box>
        )}
      </Modal.Body>
    </Modal>
  );
}
