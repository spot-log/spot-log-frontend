import type { AuthSession } from '../model/types';

export const AUTH_SESSION_STORAGE_KEY = 'spotlog.auth.session';

export function readAuthSession() {
  if (typeof window === 'undefined') {
    return null;
  }

  const stored = window.sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY);

  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as AuthSession;
  } catch {
    window.sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
    return null;
  }
}

export function writeAuthSession(session: AuthSession) {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearAuthSession() {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
}
