import { useState, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { uploadApi } from '@inventory-platform/product/api';
import type { UploadStatus } from '@inventory-platform/product/types';
import {
  Alert,
  Box,
  Button,
  Card,
  CardBody,
  Inline,
  Input,
  Label,
  Spinner,
  Stack,
  Text,
  surfaceChrome,
} from '@inventory-platform/ui-kit';

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

  const firstPreviewFile = selectedFiles[0];
  const previewUrl = useMemo(() => {
    if (!firstPreviewFile?.type.startsWith('image/')) return null;
    return URL.createObjectURL(firstPreviewFile);
  }, [firstPreviewFile]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

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
            response.errorMessage || 'Upload token has expired. Please scan the QR code again.',
          );
          setIsValid(false);
        } else if (response.status === 'FAILED') {
          setError(
            response.errorMessage ||
              'Upload token is invalid or has failed. Please scan the QR code again.',
          );
          setIsValid(false);
        } else if (response.status === 'COMPLETED') {
          setError(
            'This upload token has already been used. Please scan the QR code again for a new upload.',
          );
          setIsValid(false);
        } else {
          setError(
            'This upload token is currently in use. Please wait for it to complete or scan a new QR code.',
          );
          setIsValid(false);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to validate upload token';
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
    quality = 0.8,
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
                }),
              );
            },
            file.type,
            quality,
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
            : `Compressing ${i + 1} of ${selectedFiles.length}...`,
        );
        compressed.push(await compressImage(selectedFiles[i]));
      }

      setUploadProgress(
        selectedFiles.length === 1 ? 'Uploading...' : `Uploading ${selectedFiles.length} images...`,
      );
      await uploadApi.uploadImages(token, compressed);
      setUploadSuccess(true);
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to upload image(s). Please try again.';
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

  const shell = (children: ReactNode) => (
    <Box
      display="flex"
      align="center"
      justify="center"
      padding="lg"
      minHeight="screen"
      className={surfaceChrome.mobileUploadShell}
    >
      <Card className={surfaceChrome.maxW500}>
        <CardBody>
          <Stack gap="md">{children}</Stack>
        </CardBody>
      </Card>
    </Box>
  );

  if (isValidating) {
    return shell(
      <Stack gap="sm" align="center" padding="xl">
        <Spinner size="lg" />
        <Text>Validating upload token...</Text>
      </Stack>,
    );
  }

  if (!isValid || !token) {
    const getStatusMessage = () => {
      if (tokenStatus === 'EXPIRED') return 'This upload token has expired.';
      if (tokenStatus === 'FAILED') return 'This upload token has failed.';
      if (tokenStatus === 'COMPLETED') return 'This upload token has already been used.';
      if (tokenStatus === 'UPLOADING' || tokenStatus === 'PROCESSING') {
        return 'This upload token is currently in use.';
      }
      return 'Invalid upload token.';
    };

    return shell(
      <Stack gap="md" align="center" padding="lg">
        <Text variant="heading1">Upload Unavailable</Text>
        <Alert variant="danger">{error || getStatusMessage()}</Alert>
        {tokenStatus ? (
          <Text variant="caption" color="secondary">
            Status:{' '}
            <Text as="span" weight="semibold">
              {tokenStatus}
            </Text>
          </Text>
        ) : null}
        <Text variant="caption" color="secondary">
          Please scan the QR code again to get a new upload link.
        </Text>
      </Stack>,
    );
  }

  return shell(
    <>
      <Stack gap="xs" align="center">
        <Text variant="heading1">Upload Invoice</Text>
        <Text color="secondary">Add one or more photos (multi-page invoice)</Text>
      </Stack>

      {uploadSuccess ? (
        <Alert variant="success">
          <Stack gap="xs">
            <Text weight="semibold">Uploaded successfully! Processing on desktop...</Text>
            <Text variant="caption">
              You can close this page. The desktop app will receive all parsed items.
            </Text>
          </Stack>
        </Alert>
      ) : null}

      {error && !uploadSuccess ? <Alert variant="danger">{error}</Alert> : null}

      {!uploadSuccess ? (
        <Stack gap="md">
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className={surfaceChrome.hiddenInput}
            id="invoice-upload"
            disabled={isUploading}
          />

          {selectedFiles.length > 0 ? (
            <Stack gap="md">
              <Text weight="semibold">
                {selectedFiles.length} image{selectedFiles.length === 1 ? '' : 's'} ready
              </Text>
              <Stack gap="sm" overflow="auto" className={surfaceChrome.maxH160}>
                {selectedFiles.map((file, index) => (
                  <Inline
                    key={`${file.name}-${index}`}
                    gap="sm"
                    align="center"
                    padding="sm"
                    border
                    rounded="md"
                    bg="muted"
                  >
                    <Text truncate className={surfaceChrome.flexMin0}>
                      {file.name}
                    </Text>
                    <Text variant="caption" color="secondary">
                      ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </Text>
                    {!isUploading ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFile(index)}
                        aria-label={`Remove ${file.name}`}
                      >
                        ×
                      </Button>
                    ) : null}
                  </Inline>
                ))}
              </Stack>
              {previewUrl ? (
                <Box border rounded="md" overflow="hidden">
                  <img
                    src={previewUrl}
                    alt="Preview of first page"
                    className={surfaceChrome.previewImageImg}
                  />
                </Box>
              ) : null}
              <Stack gap="sm">
                <Button
                  type="button"
                  variant="solid"
                  fullWidth
                  onClick={handleUpload}
                  disabled={isUploading}
                  loading={isUploading}
                >
                  {isUploading
                    ? uploadProgress || 'Uploading...'
                    : `Upload ${
                        selectedFiles.length > 1 ? `${selectedFiles.length} pages` : 'invoice'
                      }`}
                </Button>
                <Inline gap="sm">
                  <Button
                    type="button"
                    variant="outline"
                    fullWidth
                    onClick={() => openFilePicker(false)}
                    disabled={isUploading}
                  >
                    Add more
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    fullWidth
                    onClick={() => {
                      setSelectedFiles([]);
                      setError(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    disabled={isUploading}
                  >
                    Clear all
                  </Button>
                </Inline>
              </Stack>
            </Stack>
          ) : (
            <Stack gap="sm">
              <Label htmlFor="invoice-upload">
                <Button
                  type="button"
                  variant="outline"
                  fullWidth
                  onClick={() => openFilePicker(false)}
                  disabled={isUploading}
                >
                  Choose from gallery
                </Button>
              </Label>
              <Text variant="caption" color="secondary" align="center">
                Select multiple pages
              </Text>
              <Button
                type="button"
                variant="solid"
                fullWidth
                onClick={() => openFilePicker(true)}
                disabled={isUploading}
              >
                Take photo
              </Button>
            </Stack>
          )}
        </Stack>
      ) : null}
    </>,
  );
}
