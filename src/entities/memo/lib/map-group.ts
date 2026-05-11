import type { SpotLogMemo } from '../model/memo';

export interface MemoLocationGroup {
  key: string;
  locationName: string;
  pin: SpotLogMemo['pin'];
  distanceMeters: number;
  representative: SpotLogMemo;
  memos: SpotLogMemo[];
  label: string;
  tone: 'private' | 'public';
}

const MAP_PIN_LABEL_MAX = 14;

function sortByCreatedAtAsc(left: SpotLogMemo, right: SpotLogMemo) {
  return new Date(left.createdAtIso).getTime() - new Date(right.createdAtIso).getTime();
}

function truncatePinLabel(title: string, suffix = '') {
  const availableLength = MAP_PIN_LABEL_MAX - suffix.length;

  if (availableLength <= 3) {
    return `${title.slice(0, MAP_PIN_LABEL_MAX - 3)}...`;
  }

  if (title.length + suffix.length <= MAP_PIN_LABEL_MAX) {
    return `${title}${suffix}`;
  }

  return `${title.slice(0, availableLength - 3)}...${suffix}`;
}

export function getMemoLocationKey(memo: SpotLogMemo) {
  return `${memo.coordinate.lat}|${memo.coordinate.lng}|${memo.locationName}`;
}

export function groupMemosByLocation(
  memos: SpotLogMemo[],
  selectedMemoId?: string | null,
): MemoLocationGroup[] {
  const groups = new Map<string, SpotLogMemo[]>();

  memos.forEach((memo) => {
    const key = getMemoLocationKey(memo);
    const group = groups.get(key);

    if (group) {
      group.push(memo);
      return;
    }

    groups.set(key, [memo]);
  });

  return Array.from(groups.entries()).map(([key, groupedMemos]) => {
    const selectedMemo =
      selectedMemoId ? groupedMemos.find((memo) => memo.id === selectedMemoId) : undefined;
    const representative = selectedMemo ?? [...groupedMemos].sort(sortByCreatedAtAsc)[0];
    const tone: 'private' | 'public' = groupedMemos.every(
      (memo) => memo.visibility === 'private',
    )
      ? 'private'
      : 'public';

    return {
      key,
      locationName: representative.locationName,
      pin: representative.pin,
      distanceMeters: representative.distanceMeters,
      representative,
      memos: groupedMemos,
      label:
        groupedMemos.length > 1
          ? truncatePinLabel(representative.title, ` 외 ${groupedMemos.length - 1}개`)
          : truncatePinLabel(representative.title),
      tone,
    };
  });
}

export function findLocationGroupByMemoId(
  memos: SpotLogMemo[],
  memoId?: string | null,
): MemoLocationGroup | null {
  const groups = groupMemosByLocation(memos, memoId);

  if (!groups.length) {
    return null;
  }

  if (!memoId) {
    return groups[0];
  }

  return groups.find((group) => group.memos.some((memo) => memo.id === memoId)) ?? groups[0];
}
