import { buildApiUrl, googleOAuthRedirectUri } from '../../../shared/config';
import type { AuthSession, GoogleCodeExchangeRequest } from '../model/types';

const googleOAuthCodePath = '/auth/google/code';

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

  const errorText = await response.text().catch(() => '');
  return errorText || 'Google login failed.';
}

export async function exchangeGoogleCode(
  code: string,
  options?: {
    redirectUri?: string;
    codeVerifier?: string;
    signal?: AbortSignal;
  },
) {
  const body: GoogleCodeExchangeRequest = {
    code,
    redirectUri: options?.redirectUri ?? googleOAuthRedirectUri,
    ...(options?.codeVerifier ? { codeVerifier: options.codeVerifier } : undefined),
  };

  const response = await fetch(`https://spot-log-frontend.vercel.app/${googleOAuthCodePath}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    credentials: 'include',
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(await readExchangeError(response));
  }

  return (await response.json()) as AuthSession;
}
