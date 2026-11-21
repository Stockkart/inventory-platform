import { isAxiosError } from 'axios';
import { ApiError } from './ApiError';

type ErrorBody = {
  message?: string;
  error?: string;
  data?: { message?: string };
};

/**
 * Turn a failed `responseType: 'blob'` request into an ApiError that carries the
 * server's message.
 *
 * With `responseType: 'blob'`, axios hands back the JSON error body as a Blob, so
 * the caller would only see "Request failed with status code 503". This reads the
 * Blob and picks the message the same way the shared client does
 * (`data.message`, then `error`, then `message`). Anything that is not an HTTP
 * error, or whose body is not JSON, is returned unchanged.
 */
export async function toBlobRequestError(error: unknown): Promise<unknown> {
  if (!isAxiosError(error) || !error.response) return error;

  const { status, data } = error.response;
  let body: ErrorBody | undefined;
  try {
    if (data instanceof Blob) body = JSON.parse(await data.text()) as ErrorBody;
    else if (typeof data === 'string') body = JSON.parse(data) as ErrorBody;
    else body = data as ErrorBody | undefined;
  } catch {
    return error;
  }

  const message = body?.data?.message || body?.error || body?.message;
  if (!message) return error;
  return new ApiError(message, { status });
}
