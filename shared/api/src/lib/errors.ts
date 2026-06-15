type ApiErrorPayload = {
  message?: string;
  error?: string;
  data?: {
    message?: string;
    errors?: Record<string, string[]>;
  };
  errors?: Record<string, string[]>;
};

/** Flatten backend validation errors into a user-facing message. */
export function formatApiErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.'
): string {
  if (!(error instanceof Error)) {
    return fallback;
  }

  const withMeta = error as Error & {
    errors?: Record<string, string[]>;
  };

  const fromAttachedErrors = flattenErrorMap(withMeta.errors);
  if (fromAttachedErrors) {
    return fromAttachedErrors;
  }

  const message = error.message?.trim();
  if (message && message !== 'Validation failed') {
    return message;
  }

  return fallback;
}

export function flattenErrorMap(
  errors?: Record<string, string[]>
): string | null {
  if (!errors) {
    return null;
  }
  const parts: string[] = [];
  for (const messages of Object.values(errors)) {
    for (const msg of messages ?? []) {
      const trimmed = msg?.trim();
      if (trimmed) {
        parts.push(trimmed);
      }
    }
  }
  return parts.length > 0 ? parts.join('; ') : null;
}

export function parseApiErrorPayload(data: unknown): {
  message: string;
  errors?: Record<string, string[]>;
} {
  const payload = (data ?? {}) as ApiErrorPayload;
  const errors = payload.data?.errors ?? payload.errors;
  const flattened = flattenErrorMap(errors);
  const message =
    flattened ||
    payload.data?.message?.trim() ||
    payload.error?.trim() ||
    payload.message?.trim() ||
    'Validation failed';

  return { message, errors };
}
