import { buildApiUrl } from '../../../shared/config';
import type { RadiusValue } from '../model/memo';

export type ApiVisibility = 'PUBLIC' | 'PRIVATE';
export type ApiMemoStatus = 'ACTIVE' | 'EXPIRED';

export interface ApiMemo {
  id: string;
  authorId?: string;
  visibility: ApiVisibility;
  status: ApiMemoStatus;
  title: string | null;
  body: string;
  placeName: string | null;
  latitude: number;
  longitude: number;
  triggerRadius: RadiusValue;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  distanceMeters?: number;
}

export interface CreateMemoRequest {
  title?: string;
  body: string;
  visibility: ApiVisibility;
  latitude: number;
  longitude: number;
  placeName?: string;
  triggerRadius: RadiusValue;
  expiresAt?: string;
}

export interface UpdateMemoRequest {
  title?: string;
  body?: string;
  visibility?: ApiVisibility;
  latitude?: number;
  longitude?: number;
  placeName?: string;
  triggerRadius?: RadiusValue;
  expiresAt?: string;
}

export interface RepublishMemoRequest {
  durationDays: number;
}

export interface BookmarkMutationResponse {
  memoId: string;
  bookmarked?: boolean;
  removed?: boolean;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type RequestMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';
type ResponseBodyMode = 'required' | 'optional' | 'none';

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

async function readJsonBody<T>(response: Response, mode: ResponseBodyMode) {
  if (mode === 'none' || response.status === 204 || response.status === 205) {
    return null;
  }

  const text = await response.text().catch(() => '');

  if (!text.trim()) {
    if (mode === 'required') {
      throw new ApiError('Response body is empty.', response.status);
    }

    return null;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    if (mode === 'required') {
      throw new ApiError('Response body is not valid JSON.', response.status);
    }

    return null;
  }
}

function requestJson<T>(options: {
  path: string;
  method?: RequestMethod;
  accessToken?: string;
  query?: Record<string, string | number | undefined>;
  body?: unknown;
  signal?: AbortSignal;
  responseBody?: 'required';
}): Promise<T>;
function requestJson<T>(options: {
  path: string;
  method?: RequestMethod;
  accessToken?: string;
  query?: Record<string, string | number | undefined>;
  body?: unknown;
  signal?: AbortSignal;
  responseBody: 'optional';
}): Promise<T | null>;
function requestJson(options: {
  path: string;
  method?: RequestMethod;
  accessToken?: string;
  query?: Record<string, string | number | undefined>;
  body?: unknown;
  signal?: AbortSignal;
  responseBody: 'none';
}): Promise<void>;
async function requestJson<T>({
  path,
  method = 'GET',
  accessToken,
  query,
  body,
  signal,
  responseBody = 'required',
}: {
  path: string;
  method?: RequestMethod;
  accessToken?: string;
  query?: Record<string, string | number | undefined>;
  body?: unknown;
  signal?: AbortSignal;
  responseBody?: ResponseBodyMode;
}) {
  const response = await fetch(`${buildApiUrl(path)}${buildQueryString(query)}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : undefined),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }

  return readJsonBody<T>(response, responseBody);
}

export function fetchMyMemos({
  accessToken,
  query,
  signal,
}: {
  accessToken: string;
  query?: {
    tab?: 'private' | 'public' | 'expired';
    sort?: 'recent' | 'expiresSoon' | 'distance';
    latitude?: number;
    longitude?: number;
  };
  signal?: AbortSignal;
}) {
  return requestJson<ApiMemo[]>({
    path: '/memos/me',
    accessToken,
    query,
    signal,
  });
}

export function fetchBookmarkedMemos({
  accessToken,
  signal,
}: {
  accessToken: string;
  signal?: AbortSignal;
}) {
  return requestJson<ApiMemo[]>({
    path: '/memos/me/bookmarks',
    accessToken,
    signal,
  });
}

export function fetchNearbyPublicMemos({
  latitude,
  longitude,
  radius = 500,
  signal,
}: {
  latitude: number;
  longitude: number;
  radius?: number;
  signal?: AbortSignal;
}) {
  return requestJson<ApiMemo[]>({
    path: '/memos/nearby',
    query: {
      latitude,
      longitude,
      radius,
    },
    signal,
  });
}

export function fetchMemo({
  accessToken,
  memoId,
  signal,
}: {
  accessToken: string;
  memoId: string;
  signal?: AbortSignal;
}) {
  return requestJson<ApiMemo>({
    path: `/memos/${memoId}`,
    accessToken,
    signal,
  });
}

export function createMemo({
  accessToken,
  body,
  signal,
}: {
  accessToken: string;
  body: CreateMemoRequest;
  signal?: AbortSignal;
}) {
  return requestJson<ApiMemo>({
    path: '/memos',
    method: 'POST',
    accessToken,
    body,
    signal,
    responseBody: 'optional',
  });
}

export function updateMemo({
  accessToken,
  memoId,
  body,
  signal,
}: {
  accessToken: string;
  memoId: string;
  body: UpdateMemoRequest;
  signal?: AbortSignal;
}) {
  return requestJson<ApiMemo>({
    path: `/memos/${memoId}`,
    method: 'PATCH',
    accessToken,
    body,
    signal,
    responseBody: 'optional',
  });
}

export function deleteMemo({
  accessToken,
  memoId,
  signal,
}: {
  accessToken: string;
  memoId: string;
  signal?: AbortSignal;
}) {
  return requestJson({
    path: `/memos/${memoId}`,
    method: 'DELETE',
    accessToken,
    signal,
    responseBody: 'none',
  });
}

export function republishMemo({
  accessToken,
  memoId,
  body,
  signal,
}: {
  accessToken: string;
  memoId: string;
  body: RepublishMemoRequest;
  signal?: AbortSignal;
}) {
  return requestJson<ApiMemo>({
    path: `/memos/${memoId}/republish`,
    method: 'POST',
    accessToken,
    body,
    signal,
    responseBody: 'optional',
  });
}

export function addBookmark({
  accessToken,
  memoId,
  signal,
}: {
  accessToken: string;
  memoId: string;
  signal?: AbortSignal;
}) {
  return requestJson<BookmarkMutationResponse>({
    path: `/memos/${memoId}/bookmark`,
    method: 'POST',
    accessToken,
    signal,
    responseBody: 'optional',
  });
}

export function removeBookmark({
  accessToken,
  memoId,
  signal,
}: {
  accessToken: string;
  memoId: string;
  signal?: AbortSignal;
}) {
  return requestJson<BookmarkMutationResponse>({
    path: `/memos/${memoId}/bookmark`,
    method: 'DELETE',
    accessToken,
    signal,
    responseBody: 'optional',
  });
}
