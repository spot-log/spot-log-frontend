import type { AuthSession } from '../model/types';

export const AUTH_SESSION_COOKIE_KEY = 'spotlog.auth.session';
const AUTH_SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function parseCookieValue(name: string) {
  if (typeof document === 'undefined') {
    return null;
  }

  const cookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${name}=`));

  if (!cookie) {
    return null;
  }

  return cookie.slice(name.length + 1);
}

export function readAuthSession() {
  if (typeof document === 'undefined') {
    return null;
  }

  const stored = parseCookieValue(AUTH_SESSION_COOKIE_KEY);

  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(decodeURIComponent(stored)) as AuthSession;
  } catch {
    clearAuthSession();
    return null;
  }
}

export function writeAuthSession(session: AuthSession) {
  if (typeof document === 'undefined') {
    return;
  }

  const encoded = encodeURIComponent(JSON.stringify(session));
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';

  document.cookie =
    `${AUTH_SESSION_COOKIE_KEY}=${encoded}; Path=/; Max-Age=${AUTH_SESSION_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}

export function clearAuthSession() {
  if (typeof document === 'undefined') {
    return;
  }

  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${AUTH_SESSION_COOKIE_KEY}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}
