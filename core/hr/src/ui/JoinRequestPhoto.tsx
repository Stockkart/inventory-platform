import { useEffect, useState } from 'react';
import { Avatar, cn, hrChrome } from '@inventory-platform/ui-kit';
import { downloadHrBlob } from '../api/download';

/** `downloadHrBlob` prepends the API base (which already ends in `/api/v1`), so drop that prefix. */
export function photoPath(photoUrl: string): string {
  return photoUrl.replace(/^\/api\/v1(?=\/)/, '');
}

export interface JoinRequestPhotoProps {
  /** The requester's name, for the initials fallback. */
  name: string;
  /** `/api/v1/users/{userId}/photo`, or nothing when the account has no photo (R11.5). */
  photoUrl?: string | null;
  /**
   * Sizes both the photo and the initials fallback: `hrChrome.hrJoinDrawerAvatar` (56 px) in the
   * drawer header, `hrChrome.hrJoinRowAvatar` (32 px) on a table row. Without it, 40 px.
   */
  className?: string;
}

/**
 * The requester's photo on a join-request row or detail (R4.2). The URL is Bearer-protected and
 * never public (R11.5), so a plain `<img src>` cannot load it: the bytes are fetched through the
 * session like any HR file and shown from an object URL that is revoked when the row goes away.
 * Without a photo, or when the fetch fails, the initials stand in.
 */
export function JoinRequestPhoto({ name, photoUrl, className }: JoinRequestPhotoProps) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!photoUrl) {
      setSrc(null);
      return;
    }
    let cancelled = false;
    let objectUrl: string | null = null;
    downloadHrBlob(photoPath(photoUrl), undefined, 'photo.jpg')
      .then(({ blob }) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [photoUrl]);

  if (!src) return <Avatar name={name} className={className} />;
  return (
    <img
      src={src}
      // Decorative: the name sits next to it in every place this is used.
      alt=""
      className={cn(hrChrome.hrJoinPhoto, className)}
      data-testid="join-request-photo"
    />
  );
}
