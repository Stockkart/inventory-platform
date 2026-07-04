export interface ApiErrorOptions {
  status?: number;
  errors?: Record<string, string[]>;
  code?: string;
  details?: unknown;
}

export class ApiError extends Error {
  readonly status?: number;
  readonly errors?: Record<string, string[]>;
  readonly code?: string;
  readonly details?: unknown;

  constructor(message: string, options: ApiErrorOptions = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = options.status;
    this.errors = options.errors;
    this.code = options.code;
    this.details = options.details;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
