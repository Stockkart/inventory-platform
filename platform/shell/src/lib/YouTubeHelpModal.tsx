import type { ComponentPropsWithoutRef } from 'react';
import { Box, Link, Modal, Text, shellChrome } from '@inventory-platform/ui-kit';
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

function IframeBox({ className, ...rest }: IframeBoxProps) {
  return <Box as="iframe" className={className} {...(rest as Record<string, unknown>)} />;
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
          <Box mb="sm">
            <Text color="secondary">{video.description}</Text>
          </Box>
        ) : null}
        {embedSrc ? (
          <Box className={shellChrome.videoFrame}>
            <IframeBox
              src={`${embedSrc}?rel=0`}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className={shellChrome.videoIframe}
            />
          </Box>
        ) : (
          <Box padding="lg" textAlign="center">
            <Link href={video.youtubeUrl} target="_blank" rel="noopener noreferrer">
              Watch on YouTube
            </Link>
          </Box>
        )}
      </Modal.Body>
    </Modal>
  );
}
