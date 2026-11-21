/**
 * Size rules for invoice photos sent to OCR (desktop upload and the phone QR upload).
 *
 * The browser shrinks every photo before upload, so the original may be large (modern phone
 * cameras save 10–20 MB JPEGs). What is sent must fit the server's limits: 2 MB per image and
 * 10 MB per upload (`ImageValidator.MAX_INVOICE_IMAGE_BYTES` and
 * `spring.servlet.multipart.max-request-size` in inventory-api). Output is always JPEG: a PNG
 * ignores the quality setting and can stay several MB.
 */

const MB = 1024 * 1024;

/** Most pages in one upload (server: `ImageValidator.MAX_INVOICE_IMAGES`). */
export const MAX_INVOICE_IMAGES = 20;
/** Largest original photo we try to shrink in the browser. */
export const MAX_PICKED_IMAGE_BYTES = 25 * MB;
/** Largest image sent, after shrinking (server rejects bigger with 400). */
export const MAX_INVOICE_IMAGE_BYTES = 2 * MB;
/** Largest upload, all pages together (server rejects bigger with 413). */
export const MAX_INVOICE_UPLOAD_BYTES = 10 * MB;

const MIN_QUALITY = 0.5;
const MIN_LONG_SIDE = 800;

/** One encoding attempt: output size in pixels and JPEG quality. */
export type JpegAttempt = { width: number; height: number; quality: number };

/** `width × height` scaled down (never up) so the longer side is at most `maxSide`. */
export function fitWithin(
  width: number,
  height: number,
  maxSide: number,
): { width: number; height: number } {
  const longSide = Math.max(width, height);
  if (longSide <= maxSide) {
    return { width, height };
  }
  const ratio = maxSide / longSide;
  return { width: Math.round(width * ratio), height: Math.round(height * ratio) };
}

/**
 * The attempt after one that came out too big: lower the quality first (0.1 at a time, down to
 * 0.5), then shrink the picture by a fifth. `null` when nothing smaller is worth trying.
 */
export function nextJpegAttempt(previous: JpegAttempt): JpegAttempt | null {
  if (previous.quality > MIN_QUALITY + 1e-9) {
    return {
      ...previous,
      quality: Math.max(MIN_QUALITY, Math.round((previous.quality - 0.1) * 10) / 10),
    };
  }
  const longSide = Math.max(previous.width, previous.height);
  if (longSide <= MIN_LONG_SIDE) {
    return null;
  }
  const next = fitWithin(
    previous.width,
    previous.height,
    Math.max(MIN_LONG_SIDE, Math.round(longSide * 0.8)),
  );
  return { ...next, quality: MIN_QUALITY };
}

function formatMb(bytes: number): string {
  return `${(bytes / MB).toFixed(1)} MB`;
}

/** Why this picked file cannot be used, or `null` if it can. */
export function pickedImageProblem(
  file: { type: string; size: number },
  label: string,
): string | null {
  if (!file.type.startsWith('image/')) {
    return `${label}: must be an image file`;
  }
  if (file.size > MAX_PICKED_IMAGE_BYTES) {
    return `${label} is ${formatMb(file.size)}; photos up to ${formatMb(
      MAX_PICKED_IMAGE_BYTES,
    )} can be used`;
  }
  return null;
}

/** Why these shrunk files cannot be sent together, or `null` if they can. */
export function uploadProblem(files: ReadonlyArray<{ size: number }>): string | null {
  if (files.length > MAX_INVOICE_IMAGES) {
    return `You can upload at most ${MAX_INVOICE_IMAGES} images`;
  }
  const total = files.reduce((sum, f) => sum + f.size, 0);
  if (total > MAX_INVOICE_UPLOAD_BYTES) {
    return `These images add up to ${formatMb(total)}; the limit is ${formatMb(
      MAX_INVOICE_UPLOAD_BYTES,
    )} per upload. Please upload fewer pages at a time.`;
  }
  return null;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('This photo could not be read. Please take it again or use a JPEG or PNG.'));
    };
    img.src = url;
  });
}

function encodeJpeg(img: HTMLImageElement, attempt: JpegAttempt): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = attempt.width;
  canvas.height = attempt.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return Promise.reject(new Error('Failed to get canvas context'));
  }
  // white behind transparent PNG areas (JPEG has no transparency; they would turn black)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, attempt.width, attempt.height);
  ctx.drawImage(img, 0, 0, attempt.width, attempt.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Failed to compress image'))),
      'image/jpeg',
      attempt.quality,
    );
  });
}

/**
 * Shrinks a photo to a JPEG of at most `maxSide` px on its longer side and at most
 * {@link MAX_INVOICE_IMAGE_BYTES}, lowering quality and then size until it fits.
 */
export async function compressInvoiceImage(
  file: File,
  { maxSide, quality }: { maxSide: number; quality: number },
): Promise<File> {
  const img = await loadImage(file);
  let attempt: JpegAttempt | null = {
    ...fitWithin(img.naturalWidth, img.naturalHeight, maxSide),
    quality,
  };
  while (attempt) {
    const blob = await encodeJpeg(img, attempt);
    if (blob.size <= MAX_INVOICE_IMAGE_BYTES) {
      const name = (file.name || 'invoice').replace(/\.[^.]*$/, '') + '.jpg';
      return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() });
    }
    attempt = nextJpegAttempt(attempt);
  }
  throw new Error(
    `${file.name || 'This image'} could not be made smaller than ${formatMb(
      MAX_INVOICE_IMAGE_BYTES,
    )}`,
  );
}
