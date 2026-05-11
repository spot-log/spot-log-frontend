import { googleOAuthClientId, googleOAuthRedirectUri } from '../../../shared/config';

const googleAuthorizationBaseUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
const defaultGoogleScopes = ['openid', 'email', 'profile'];

function createSearchParams(searchText: string) {
  if (!searchText) {
    return new URLSearchParams();
  }

  const normalized = searchText.startsWith('?') ? searchText.slice(1) : searchText;
  return new URLSearchParams(normalized);
}

export function buildGoogleAuthorizationUrl(options?: {
  state?: string;
  scopes?: string[];
  accessType?: 'offline' | 'online';
  prompt?: 'consent' | 'select_account' | 'none';
}) {
  if (!googleOAuthClientId) {
    throw new Error('VITE_GOOGLE_CLIENT_ID is not configured.');
  }

  const params = new URLSearchParams({
    client_id: googleOAuthClientId,
    redirect_uri: googleOAuthRedirectUri,
    response_type: 'code',
    scope: (options?.scopes ?? defaultGoogleScopes).join(' '),
    access_type: options?.accessType ?? 'offline',
  });

  if (options?.state) {
    params.set('state', options.state);
  }

  if (options?.prompt) {
    params.set('prompt', options.prompt);
  }

  return `${googleAuthorizationBaseUrl}?${params.toString()}`;
}

export function readGoogleAuthorizationCode(searchText: string) {
  const search = createSearchParams(searchText);
  return search.get('code');
}

export function readGoogleAuthorizationError(searchText: string) {
  const search = createSearchParams(searchText);
  return search.get('error');
}

export function redirectToGoogleAuthorization(options?: Parameters<typeof buildGoogleAuthorizationUrl>[0]) {
  window.location.assign(buildGoogleAuthorizationUrl(options));
}
