import { calculateProgress, formatDistance } from '../model/memo.mock';
import type { LocationResult, SpotLogMemo } from '../model/memo';
import type { ApiMemo } from '../api/memos';

const CENTER_PIN = { left: 50, top: 52 };
const MAX_PIN_OFFSET = 38;
const MAP_RANGE_METERS = 600;
const EARTH_RADIUS_METERS = 6371000;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function formatCoordinateAddress(latitude: number, longitude: number) {
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

function formatDateLabel(isoText?: string | null) {
  if (!isoText) {
    return undefined;
  }

  const date = new Date(isoText);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}.${month}.${day}`;
}

function summarizeContent(content: string, maxLength = 30) {
  const normalized = content.trim();
  return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength)}...`;
}

function normalizeTitle(memo: ApiMemo) {
  const title = memo.title?.trim();

  if (title) {
    return title;
  }

  const body = memo.body.trim();
  return body ? body.slice(0, 10) : '메모';
}

function normalizeLocationName(memo: ApiMemo) {
  const placeName = memo.placeName?.trim();

  if (placeName) {
    return placeName;
  }

  return formatCoordinateAddress(memo.latitude, memo.longitude);
}

function normalizeVisibility(value: ApiMemo['visibility']): SpotLogMemo['visibility'] {
  return value === 'PRIVATE' ? 'private' : 'public';
}

function normalizeStatus(value: ApiMemo['status']): SpotLogMemo['status'] {
  return value === 'EXPIRED' ? 'expired' : 'active';
}

export function calculateDistanceMeters(
  origin: { lat: number; lng: number },
  target: { lat: number; lng: number },
) {
  const latDelta = toRadians(target.lat - origin.lat);
  const lngDelta = toRadians(target.lng - origin.lng);
  const originLat = toRadians(origin.lat);
  const targetLat = toRadians(target.lat);

  const a =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(originLat) * Math.cos(targetLat) * Math.sin(lngDelta / 2) * Math.sin(lngDelta / 2);

  return Math.round(EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function projectCoordinateToPin(
  coordinate: { lat: number; lng: number },
  origin?: { lat: number; lng: number } | null,
) {
  if (!origin) {
    return {
      left: `${CENTER_PIN.left}%`,
      top: `${CENTER_PIN.top}%`,
    };
  }

  const avgLatitude = toRadians((origin.lat + coordinate.lat) / 2);
  const metersPerLatDegree = 111320;
  const metersPerLngDegree = 111320 * Math.cos(avgLatitude);
  const deltaX = (coordinate.lng - origin.lng) * metersPerLngDegree;
  const deltaY = (origin.lat - coordinate.lat) * metersPerLatDegree;
  const left = clamp(CENTER_PIN.left + (deltaX / MAP_RANGE_METERS) * MAX_PIN_OFFSET, 8, 92);
  const top = clamp(CENTER_PIN.top + (deltaY / MAP_RANGE_METERS) * MAX_PIN_OFFSET, 8, 92);

  return {
    left: `${left}%`,
    top: `${top}%`,
  };
}

export function buildCurrentLocationResult(
  coordinate: { lat: number; lng: number },
  options?: {
    name?: string;
    address?: string;
  },
): LocationResult {
  return {
    id: 'current-location',
    name: options?.name?.trim() || '현재 위치',
    address: options?.address?.trim() || formatCoordinateAddress(coordinate.lat, coordinate.lng),
    distanceMeters: 0,
    coordinate,
    pin: {
      left: `${CENTER_PIN.left}%`,
      top: `${CENTER_PIN.top}%`,
    },
  };
}

export function mapApiMemoToSpotLogMemo({
  memo,
  currentCoordinate,
  currentUserId,
  bookmarked = false,
  owner,
}: {
  memo: ApiMemo;
  currentCoordinate?: { lat: number; lng: number } | null;
  currentUserId?: string;
  bookmarked?: boolean;
  owner?: SpotLogMemo['owner'];
}): SpotLogMemo {
  const distanceMeters =
    memo.distanceMeters ??
    (currentCoordinate
      ? calculateDistanceMeters(currentCoordinate, {
          lat: memo.latitude,
          lng: memo.longitude,
        })
      : 0);
  const coordinate = {
    lat: memo.latitude,
    lng: memo.longitude,
  };
  const visibility = normalizeVisibility(memo.visibility);
  const status = normalizeStatus(memo.status);

  return {
    id: memo.id,
    title: normalizeTitle(memo),
    content: memo.body,
    visibility,
    distance: currentCoordinate ? formatDistance(distanceMeters) : '거리 확인 필요',
    createdAt: formatDateLabel(memo.createdAt) ?? memo.createdAt,
    expiresAt: formatDateLabel(memo.expiresAt),
    status,
    progress:
      visibility === 'public'
        ? calculateProgress(memo.createdAt, memo.expiresAt ?? undefined, status)
        : undefined,
    bookmarked,
    author: undefined,
    owner: owner ?? (memo.authorId && currentUserId && memo.authorId === currentUserId ? 'me' : 'others'),
    distanceMeters,
    radius: memo.triggerRadius,
    summary: summarizeContent(memo.body),
    locationName: normalizeLocationName(memo),
    coordinate,
    pin: projectCoordinateToPin(coordinate, currentCoordinate),
    createdAtIso: memo.createdAt,
    expiresAtIso: memo.expiresAt ?? undefined,
  };
}
