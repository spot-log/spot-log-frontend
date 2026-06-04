import type {
  ComposeDraft,
  ExpiryPreset,
  LocationResult,
  MemoSort,
  MyMemoTab,
  RadiusValue,
  SpotLogMemo,
  SpotLogTab,
} from './memo';

function getNow() {
  return new Date();
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const DEFAULT_PUBLIC_EXPIRY_DAYS = 30;

export const bottomTabs: Array<{ value: SpotLogTab; label: string }> = [
  { value: 'map', label: '지도' },
  { value: 'nearby', label: '주변 메모' },
  { value: 'my', label: '내 메모' },
  { value: 'settings', label: '설정' },
];

export const memoTabs: Array<{ value: MyMemoTab; label: string }> = [
  { value: 'private', label: '개인' },
  { value: 'public', label: '공개' },
  { value: 'expired', label: '만료됨' },
];

export const expiryOptions: Array<{
  value: ExpiryPreset;
  label: string;
  description?: string;
}> = [
  { value: '1d', label: '1일', description: '하루 동안 공개' },
  { value: '1w', label: '1주', description: '일주일 동안 공개' },
  { value: '1m', label: '1개월', description: '기본 공개 기간' },
  { value: '3m', label: '3개월', description: '오래 유지할 공개 메모' },
  { value: 'custom', label: '직접 입력', description: '원하는 날짜 선택' },
];

export const radiusOptions: RadiusValue[] = [50, 100, 200, 500];

export const memoSortOptions: Array<{ value: MemoSort; label: string }> = [
  { value: 'recent', label: '최근 작성순' },
  { value: 'expiring', label: '만료 임박순' },
  { value: 'distance', label: '거리 가까운 순' },
];

export const CURRENT_LOCATION: LocationResult = {
  id: 'current-location',
  name: '현재 위치',
  address: '',
  distanceMeters: 0,
  coordinate: { lat: 0, lng: 0 },
  pin: { left: '50%', top: '52%' },
};

export const LOCATION_RESULTS: LocationResult[] = [];

export function summarizeContent(content: string, max = 30) {
  const normalized = content.trim();
  return normalized.length <= max ? normalized : `${normalized.slice(0, max)}...`;
}

export function autoTitle(content: string) {
  const normalized = content.trim();
  return normalized ? normalized.slice(0, 10) : '메모';
}

export function formatDistance(distanceMeters: number) {
  if (distanceMeters >= 1000) {
    return `${(distanceMeters / 1000).toFixed(1)}km`;
  }

  return `${distanceMeters}m`;
}

export function formatDateLabel(iso: string) {
  const date = new Date(iso);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}.${month}.${day}`;
}

export function calculateDDay(expiresAtIso?: string, status?: SpotLogMemo['status']) {
  if (!expiresAtIso || status === 'expired') {
    return undefined;
  }

  const diff = new Date(expiresAtIso).getTime() - getNow().getTime();
  const days = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  return `D-${days}`;
}

export function calculateProgress(
  createdAtIso: string,
  expiresAtIso?: string,
  status?: SpotLogMemo['status'],
) {
  if (!expiresAtIso || status === 'expired') {
    return status === 'expired' ? 0.08 : 1;
  }

  const createdTime = new Date(createdAtIso).getTime();
  const expiresTime = new Date(expiresAtIso).getTime();
  const total = expiresTime - createdTime;
  const remaining = expiresTime - getNow().getTime();

  if (total <= 0) {
    return 0.08;
  }

  return Math.min(1, Math.max(0.08, remaining / total));
}

export function getExpiryIso(preset: ComposeDraft['expiryPreset'], customDate: string) {
  if (preset === 'custom') {
    return customDate ? `${customDate}T23:59:59+09:00` : undefined;
  }

  const date = getNow();

  if (preset === '1d') {
    date.setDate(date.getDate() + 1);
  } else if (preset === '1w') {
    date.setDate(date.getDate() + 7);
  } else if (preset === '1m') {
    date.setDate(date.getDate() + DEFAULT_PUBLIC_EXPIRY_DAYS);
  } else if (preset === '3m') {
    date.setDate(date.getDate() + DEFAULT_PUBLIC_EXPIRY_DAYS * 3);
  }

  return `${date.toISOString().slice(0, 10)}T23:59:59+09:00`;
}

export function createInitialDraft(currentLocation?: Pick<LocationResult, 'id' | 'name'>): ComposeDraft {
  const defaultExpiryDate = new Date();
  defaultExpiryDate.setDate(defaultExpiryDate.getDate() + DEFAULT_PUBLIC_EXPIRY_DAYS);

  return {
    title: '',
    content: '이 위치에서 확인해야 할 내용을 메모로 남겨보세요.',
    placeQuery: currentLocation?.name ?? '',
    selectedLocationId: currentLocation?.id ?? '',
    visibility: 'public',
    expiryPreset: '1m',
    customDate: formatDateInput(defaultExpiryDate),
    radius: 100,
  };
}

export function sortMemos(source: SpotLogMemo[], sort: MemoSort) {
  return [...source].sort((left, right) => {
    if (sort === 'recent') {
      return new Date(right.createdAtIso).getTime() - new Date(left.createdAtIso).getTime();
    }

    if (sort === 'distance') {
      return left.distanceMeters - right.distanceMeters;
    }

    const leftExpiry = left.expiresAtIso ? new Date(left.expiresAtIso).getTime() : Number.POSITIVE_INFINITY;
    const rightExpiry = right.expiresAtIso ? new Date(right.expiresAtIso).getTime() : Number.POSITIVE_INFINITY;
    return leftExpiry - rightExpiry;
  });
}

export function createMySortOptions(tab: SpotLogMemo['status'] | 'private' | 'public') {
  if (tab === 'expired') {
    return memoSortOptions.filter((option) => option.value !== 'distance');
  }

  return memoSortOptions;
}

export const seedMemos: SpotLogMemo[] = [];
