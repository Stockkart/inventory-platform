import type { ComponentPropsWithoutRef } from 'react';
import { Box, Link, Modal, Text } from '@inventory-platform/ui-kit';
import type { TutorialResourceResponse } from '@inventory-platform/shell/types';

type YouTubeHelpModalProps = {
  video: TutorialResourceResponse | null;
  open: boolean;
  onClose: () => void;
  title?: string;
};

type IframeBoxProps = ComponentPropsWithoutRef<'iframe'> & {
  className?: string;
};

function IframeBox({ className, style, ...rest }: IframeBoxProps) {
  return (
    <Box as="iframe" className={className} style={style} {...(rest as Record<string, unknown>)} />
  );
}

export function YouTubeHelpModal({ video, open, onClose, title }: YouTubeHelpModalProps) {
  if (!video) return null;

  const embedSrc = video.youtubeVideoId
    ? `https://www.youtube.com/embed/${video.youtubeVideoId}`
    : null;

  const displayTitle = title ?? video.title;

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <Modal.Header title={displayTitle} onClose={onClose} />
      <Modal.Body>
        {video.description ? (
          <Text color="secondary" style={{ marginBottom: '0.75rem', lineHeight: 1.45 }}>
            {video.description}
          </Text>
        ) : null}
        {embedSrc ? (
          <Box
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '16 / 9',
              background: '#000',
            }}
          >
            <IframeBox
              src={`${embedSrc}?rel=0`}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                border: 0,
              }}
            />
          </Box>
        ) : (
          <Box padding="lg" style={{ textAlign: 'center' }}>
            <Link href={video.youtubeUrl} target="_blank" rel="noopener noreferrer">
              Watch on YouTube
            </Link>
          </Box>
        )}
      </Modal.Body>
    </Modal>
  );
}
