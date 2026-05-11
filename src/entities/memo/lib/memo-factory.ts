import {
  autoTitle,
  calculateDDay,
  calculateProgress,
  formatDateLabel,
  formatDistance,
  getExpiryIso,
  summarizeContent,
} from '../model/memo.mock';
import type { ComposeDraft, LocationResult, SpotLogMemo } from '../model/memo';

const DEFAULT_CREATED_AT_ISO = '2026-04-03T09:00:00+09:00';
const DEFAULT_REPUBLISHED_EXPIRES_AT_ISO = '2026-05-03T23:59:59+09:00';

export function getComposeValidationMessage(draft: ComposeDraft) {
  const expiryIso = draft.visibility === 'public' ? getExpiryIso(draft.expiryPreset, draft.customDate) : undefined;

  if (draft.content.trim().length === 0) {
    return '본문을 1자 이상 입력해야 저장할 수 있습니다.';
  }

  if (draft.visibility === 'public' && !expiryIso) {
    return '공개 메모는 유효 기간이 필요합니다.';
  }

  return '';
}

export function buildMemoFromDraft({
  draft,
  location,
  createdAtIso = DEFAULT_CREATED_AT_ISO,
}: {
  draft: ComposeDraft;
  location: LocationResult;
  createdAtIso?: string;
}): SpotLogMemo {
  const title = draft.title.trim() || autoTitle(draft.content);
  const expiresAtIso = draft.visibility === 'public' ? getExpiryIso(draft.expiryPreset, draft.customDate) : undefined;

  return {
    id: `memo-${Date.now()}`,
    title,
    content: draft.content.trim(),
    visibility: draft.visibility,
    distance: formatDistance(location.distanceMeters),
    dDay: draft.visibility === 'public' ? calculateDDay(expiresAtIso) : undefined,
    createdAt: formatDateLabel(createdAtIso),
    expiresAt: draft.visibility === 'public' && expiresAtIso ? formatDateLabel(expiresAtIso) : undefined,
    progress: calculateProgress(createdAtIso, expiresAtIso),
    owner: 'me',
    radius: draft.radius,
    summary: summarizeContent(draft.content),
    locationName: location.name,
    coordinate: location.coordinate,
    pin: location.pin,
    distanceMeters: location.distanceMeters,
    createdAtIso,
    expiresAtIso,
  };
}

export function buildRepublishedMemo(sourceMemo: SpotLogMemo): SpotLogMemo {
  return {
    ...sourceMemo,
    id: `republished-${Date.now()}`,
    title: sourceMemo.title,
    status: 'active',
    createdAt: formatDateLabel(DEFAULT_CREATED_AT_ISO),
    expiresAt: formatDateLabel(DEFAULT_REPUBLISHED_EXPIRES_AT_ISO),
    createdAtIso: DEFAULT_CREATED_AT_ISO,
    expiresAtIso: DEFAULT_REPUBLISHED_EXPIRES_AT_ISO,
    dDay: calculateDDay(DEFAULT_REPUBLISHED_EXPIRES_AT_ISO),
    progress: calculateProgress(DEFAULT_CREATED_AT_ISO, DEFAULT_REPUBLISHED_EXPIRES_AT_ISO),
  };
}
