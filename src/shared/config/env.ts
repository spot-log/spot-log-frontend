function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

const defaultApiBaseUrl = 'http://localhost:3000';
const defaultGoogleRedirectUri =
  typeof window === 'undefined'
    ? 'http://localhost:5173/oauth/google/callback'
    : `${window.location.origin}/oauth/google/callback`;

export const apiBaseUrl = trimTrailingSlash(import.meta.env.VITE_API_BASE_URL ?? defaultApiBaseUrl);
export const googleOAuthClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';
export const googleOAuthRedirectUri = import.meta.env.VITE_GOOGLE_REDIRECT_URI ?? defaultGoogleRedirectUri;
export const kakaoMapAppKey = import.meta.env.VITE_KAKAO_MAP_APP_KEY ?? '';

export function buildApiUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${apiBaseUrl}${normalizedPath}`;
}
