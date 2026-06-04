import { buildApiUrl } from '../../../shared/config';
import { ApiError } from '../../memo/api/memos';

export type NotificationSettingsValue = 'ON' | 'OFF';

export interface NotificationSettingsResponse {
  publicMemo: NotificationSettingsValue;
}

export interface UpdateNotificationSettingsRequest {
  publicMemo?: NotificationSettingsValue;
}

export interface NotificationCandidateMemo {
  id: string;
  title: string;
  body: string;
  visibility: 'PUBLIC' | 'PRIVATE';
  placeName?: string | null;
  latitude: number;
  longitude: number;
  triggerRadius: number;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
  authorId: string;
  distanceMeters?: number;
}

function buildQueryString(query?: Record<string, string | number | undefined>) {
  if (!query) {
    return '';
  }

  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }

    params.set(key, String(value));
  });

  const encoded = params.toString();
  return encoded ? `?${encoded}` : '';
}

async function readErrorMessage(response: Response) {
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

  const text = await response.text().catch(() => '');
  return text || 'Request failed.';
}

async function requestJson<T>({
  path,
  method = 'GET',
  accessToken,
  query,
  body,
  signal,
}: {
  path: string;
  method?: 'GET' | 'PATCH' | 'DELETE';
  accessToken: string;
  query?: Record<string, string | number | undefined>;
  body?: unknown;
  signal?: AbortSignal;
}) {
  const response = await fetch(`${buildApiUrl(path)}${buildQueryString(query)}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : undefined),
      Authorization: `Bearer ${accessToken}`,
    },
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }

  if (response.status === 204 || response.status === 205) {
    return null as T;
  }

  const text = await response.text().catch(() => '');

  if (!text.trim()) {
    return null as T;
  }

  return JSON.parse(text) as T;
}

export function fetchNotificationSettings({
  accessToken,
  signal,
}: {
  accessToken: string;
  signal?: AbortSignal;
}) {
  return requestJson<NotificationSettingsResponse>({
    path: '/notifications/settings',
    accessToken,
    signal,
  });
}

export function updateNotificationSettings({
  accessToken,
  body,
  signal,
}: {
  accessToken: string;
  body: UpdateNotificationSettingsRequest;
  signal?: AbortSignal;
}) {
  return requestJson<NotificationSettingsResponse>({
    path: '/notifications/settings',
    method: 'PATCH',
    accessToken,
    body,
    signal,
  });
}

export function fetchNotificationCandidates({
  accessToken,
  latitude,
  longitude,
  signal,
}: {
  accessToken: string;
  latitude: number;
  longitude: number;
  signal?: AbortSignal;
}) {
  return requestJson<NotificationCandidateMemo[]>({
    path: '/notifications/candidates',
    accessToken,
    query: {
      latitude,
      longitude,
    },
    signal,
  });
}

export function deleteCurrentUser({
  accessToken,
  signal,
}: {
  accessToken: string;
  signal?: AbortSignal;
}) {
  return requestJson<{ id: string; deleted: boolean } | null>({
    path: '/users/me',
    method: 'DELETE',
    accessToken,
    signal,
  });
}
