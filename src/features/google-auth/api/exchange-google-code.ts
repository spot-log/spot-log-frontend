import { buildApiUrl } from '../../../shared/config';
import type { AuthSession } from '../model/types';

const googleOAuthCallbackPath = '/auth/google/callback';

function buildGoogleCallbackUrl(search: string | URLSearchParams) {
  const normalizedSearch = typeof search === 'string' ? search : search.toString();

  if (!normalizedSearch) {
    return buildApiUrl(googleOAuthCallbackPath);
  }

  return `${buildApiUrl(googleOAuthCallbackPath)}${
    normalizedSearch.startsWith('?') ? normalizedSearch : `?${normalizedSearch}`
  }`;
}

async function readExchangeError(response: Response) {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    const payload = (await response.json().catch(() => null)) as
      | { message?: string | string[] }
      | null;

    if (typeof payload?.message === 'string' && payload.message.trim()) {
      return payload.message;
    }

    if (Array.isArray(payload?.message) && payload.message.length > 0) {
      return payload.message.join(', ');
    }
  }

  const errorText = await response.text();
  return errorText || 'Google login failed.';
}

export async function exchangeGoogleCode(
  search: string | URLSearchParams,
  options?: {
    signal?: AbortSignal;
  },
) {
  const response = await fetch(buildGoogleCallbackUrl(search), {
    method: 'GET',
    credentials: 'include',
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(await readExchangeError(response));
  }

  return (await response.json()) as AuthSession;
}
