import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { uploadApi } from '@inventory-platform/product/api';
import type { UploadStatus } from '@inventory-platform/product/types';
import styles from './mobile-upload.module.css';

const MAX_INVOICE_IMAGES = 20;
const MAX_INVOICE_IMAGE_BYTES = 10 * 1024 * 1024;

export function meta() {
  return [
    { title: 'Upload Invoice - StockKart' },
    {
      name: 'description',
      content: 'Upload invoice image from mobile device',
    },
  ];
}

export default function MobileUploadPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [tokenStatus, setTokenStatus] = useState<UploadStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError('No upload token provided');
        setIsValidating(false);
        return;
      }

      try {
        const response = await uploadApi.validateUploadToken(token);
        setTokenStatus(response.status);

        if (response.status === 'PENDING') {
          setIsValid(true);
          setError(null);
        } else if (response.status === 'EXPIRED') {
          setError(
            response.errorMessage ||
              'Upload token has expired. Please scan the QR code again.'
          );
          setIsValid(false);
        } else if (response.status === 'FAILED') {
          setError(
            response.errorMessage ||
              'Upload token is invalid or has failed. Please scan the QR code again.'
          );
          setIsValid(false);
        } else if (response.status === 'COMPLETED') {
          setError(
            'This upload token has already been used. Please scan the QR code again for a new upload.'
          );
          setIsValid(false);
        } else {
          setError(
            'This upload token is currently in use. Please wait for it to complete or scan a new QR code.'
          );
          setIsValid(false);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Failed to validate upload token';
        setError(errorMessage);
        setIsValid(false);
        setTokenStatus(null);
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const compressImage = async (
    file: File,
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.8
  ): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'));
                return;
              }
              resolve(
                new File([blob], file.name, {
                  type: file.type,
                  lastModified: Date.now(),
                })
              );
            },
            file.type,
            quality
          );
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const validateFile = (file: File, label: string): boolean => {
    if (!file.type.startsWith('image/')) {
      setError(`${label}: must be an image`);
      return false;
    }
    if (file.size > MAX_INVOICE_IMAGE_BYTES) {
      setError(`${label}: must be less than 10 MB`);
      return false;
    }
    return true;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files ? Array.from(e.target.files) : [];
    if (picked.length === 0) return;

    const valid: File[] = [];
    for (let i = 0; i < picked.length; i++) {
      const file = picked[i];
      if (validateFile(file, file.name || `Image ${i + 1}`)) {
        valid.push(file);
      }
    }
    if (valid.length === 0) return;

    setSelectedFiles((prev) => {
      const merged = [...prev, ...valid];
      if (merged.length > MAX_INVOICE_IMAGES) {
        setError(`You can upload at most ${MAX_INVOICE_IMAGES} images`);
        return prev;
      }
      return merged;
    });
    setError(null);
    setUploadSuccess(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || !token) {
      setError('Please select at least one image');
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadSuccess(false);

    try {
      const compressed: File[] = [];
      for (let i = 0; i < selectedFiles.length; i++) {
        setUploadProgress(
          selectedFiles.length === 1
            ? 'Compressing...'
            : `Compressing ${i + 1} of ${selectedFiles.length}...`
        );
        compressed.push(await compressImage(selectedFiles[i]));
      }

      setUploadProgress(
        selectedFiles.length === 1
          ? 'Uploading...'
          : `Uploading ${selectedFiles.length} images...`
      );
      await uploadApi.uploadImages(token, compressed);
      setUploadSuccess(true);
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to upload image(s). Please try again.';
      setError(errorMessage);
    } finally {
      setIsUploading(false);
      setUploadProgress('');
    }
  };

  const openFilePicker = (capture?: boolean) => {
    if (!fileInputRef.current) return;
    if (capture) {
      fileInputRef.current.setAttribute('capture', 'environment');
    } else {
      fileInputRef.current.removeAttribute('capture');
    }
    fileInputRef.current.click();
  };

  if (isValidating) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Validating upload token...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isValid || !token) {
    const getStatusMessage = () => {
      if (tokenStatus === 'EXPIRED') {
        return 'This upload token has expired.';
      } else if (tokenStatus === 'FAILED') {
        return 'This upload token has failed.';
      } else if (tokenStatus === 'COMPLETED') {
        return 'This upload token has already been used.';
      } else if (tokenStatus === 'UPLOADING' || tokenStatus === 'PROCESSING') {
        return 'This upload token is currently in use.';
      }
      return 'Invalid upload token.';
    };

    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.errorContainer}>
            <div className={styles.errorIcon}>❌</div>
            <h1>Upload Unavailable</h1>
            <p className={styles.errorMessage}>
              {error || getStatusMessage()}
            </p>
            {tokenStatus && (
              <p className={styles.statusInfo}>
                Status: <strong>{tokenStatus}</strong>
              </p>
            )}
            <p className={styles.helpText}>
              Please scan the QR code again to get a new upload link.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>📄 Upload Invoice</h1>
          <p className={styles.subtitle}>
            Add one or more photos (multi-page invoice)
          </p>
        </div>

        {uploadSuccess && (
          <div className={styles.successMessage}>
            <div className={styles.successIcon}>✅</div>
            <p>Uploaded successfully! Processing on desktop...</p>
            <p className={styles.successSubtext}>
              You can close this page. The desktop app will receive all parsed
              items.
            </p>
          </div>
        )}

        {error && !uploadSuccess && (
          <div className={styles.errorMessage}>{error}</div>
        )}

        {!uploadSuccess && (
          <div className={styles.uploadSection}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className={styles.fileInput}
              id="invoice-upload"
              disabled={isUploading}
            />

            {selectedFiles.length > 0 ? (
              <div className={styles.filePreview}>
                <p className={styles.fileListTitle}>
                  {selectedFiles.length} image
                  {selectedFiles.length === 1 ? '' : 's'} ready
                </p>
                <ul className={styles.fileList}>
                  {selectedFiles.map((file, index) => (
                    <li
                      key={`${file.name}-${index}`}
                      className={styles.fileListItem}
                    >
                      <span className={styles.fileName}>{file.name}</span>
                      <span className={styles.fileSize}>
                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                      {!isUploading && (
                        <button
                          type="button"
                          className={styles.fileRemoveBtn}
                          onClick={() => handleRemoveFile(index)}
                          aria-label={`Remove ${file.name}`}
                        >
                          ×
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
                {selectedFiles[0]?.type.startsWith('image/') && (
                  <div className={styles.imagePreview}>
                    <img
                      src={URL.createObjectURL(selectedFiles[0])}
                      alt="Preview of first page"
                      className={styles.previewImage}
                    />
                  </div>
                )}
                <div className={styles.uploadActions}>
                  <button
                    type="button"
                    className={styles.uploadBtn}
                    onClick={handleUpload}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <span className={styles.spinnerSmall}></span>
                        {uploadProgress || 'Uploading...'}
                      </>
                    ) : (
                      <>
                        <span>📤</span>
                        Upload{' '}
                        {selectedFiles.length > 1 ? `${selectedFiles.length} pages` : 'invoice'}
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className={styles.changeFileBtn}
                    onClick={() => openFilePicker(false)}
                    disabled={isUploading}
                  >
                    Add more
                  </button>
                  <button
                    type="button"
                    className={styles.changeFileBtn}
                    onClick={() => {
                      setSelectedFiles([]);
                      setError(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    disabled={isUploading}
                  >
                    Clear all
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.uploadOptions}>
                <label htmlFor="invoice-upload" className={styles.uploadLabel}>
                  <div className={styles.uploadIcon}>📁</div>
                  <span>Choose from gallery</span>
                  <span className={styles.uploadHint}>Select multiple pages</span>
                </label>
                <button
                  type="button"
                  className={styles.cameraBtn}
                  onClick={() => openFilePicker(true)}
                  disabled={isUploading}
                >
                  <span className={styles.cameraIcon}>📷</span>
                  <span>Take photo</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
