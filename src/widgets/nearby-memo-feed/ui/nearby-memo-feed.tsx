import {
  calculateDDay,
  calculateProgress,
  findLocationGroupByMemoId,
  formatDistance,
  getMemoLocationKey,
  groupMemosByLocation,
  type LocationResult,
  type PermissionState,
  type SpotLogMemo,
} from '../../../entities/memo';
import { EmptyState, KakaoMapCanvas, MemoCard, StatusLabel } from '../../../shared/ui';

function resolveNearbyMapCenter({
  currentLocation,
  focusMemo,
  groupedMemos,
}: {
  currentLocation: LocationResult | null;
  focusMemo: SpotLogMemo | null;
  groupedMemos: ReturnType<typeof groupMemosByLocation>;
}) {
  return (
    focusMemo?.coordinate ??
    currentLocation?.coordinate ??
    groupedMemos[0]?.representative.coordinate ?? {
      lat: 37.5665,
      lng: 126.978,
    }
  );
}

export function NearbyMemoFeed({
  currentLocation,
  memos,
  locationPermission,
  selectedMemo,
  onSelectMemo,
  onOpenDetail,
  onToggleBookmark,
}: {
  currentLocation: LocationResult | null;
  memos: SpotLogMemo[];
  locationPermission: PermissionState;
  selectedMemo: SpotLogMemo | null;
  onSelectMemo: (id: string) => void;
  onOpenDetail: (id: string) => void;
  onToggleBookmark: (id: string) => void;
}) {
  const focusMemo = selectedMemo && memos.some((memo) => memo.id === selectedMemo.id) ? selectedMemo : null;
  const groupedMemos = groupMemosByLocation(memos, focusMemo?.id);
  const focusGroup = focusMemo ? findLocationGroupByMemoId(memos, focusMemo.id) : null;
  const mapCenter = resolveNearbyMapCenter({
    currentLocation,
    focusMemo,
    groupedMemos,
  });
  const orderedMemos = focusGroup
    ? [
        ...memos.filter((memo) => getMemoLocationKey(memo) === focusGroup.key),
        ...memos.filter((memo) => getMemoLocationKey(memo) !== focusGroup.key),
      ]
    : memos;

  return (
    <section className="screen-block">
      {locationPermission !== 'granted' ? (
        <p className="helper-note">
          위치 권한이 없으면 내 주변 500m 공개 메모를 불러올 수 없습니다.
        </p>
      ) : null}

      {!memos.length ? (
        <EmptyState
          title="주변 공개 메모가 없습니다"
          description={
            currentLocation
              ? '현재 위치 기준 500m 안에 공개 메모가 없으면 이 화면은 비어 있습니다.'
              : '현재 위치를 확인하면 주변 공개 메모를 조회할 수 있습니다.'
          }
        />
      ) : (
        <div className="stack-list">
          <div className="panel-card">
            <div className="panel-card__header">
              <div>
                <strong>500m 내 공개 메모</strong>
                <p>핀을 누르면 같은 위치의 메모를 먼저 확인할 수 있습니다.</p>
              </div>
              <StatusLabel>{memos.length}개</StatusLabel>
            </div>

            <div className="memo-map memo-map--compact memo-map--kakao">
              <KakaoMapCanvas
                active
                className="memo-map__canvas"
                center={mapCenter}
                markers={[
                  ...(currentLocation
                    ? [
                        {
                          id: currentLocation.id,
                          position: currentLocation.coordinate,
                          tone: 'current' as const,
                          label: '현재 위치',
                          subtitle: currentLocation.address,
                        },
                      ]
                    : []),
                  ...groupedMemos.map((group) => ({
                    id: group.representative.id,
                    position: group.representative.coordinate,
                    tone: 'public' as const,
                    label: group.locationName,
                    subtitle:
                      group.memos.length > 1
                        ? `${group.memos.length}개의 메모`
                        : group.representative.title,
                  })),
                ]}
                selectedMarkerId={focusMemo?.id}
                onMarkerClick={onSelectMemo}
                circle={
                  currentLocation
                    ? {
                        center: currentLocation.coordinate,
                        radius: 500,
                      }
                    : null
                }
                level={5}
              />
            </div>
          </div>

          <div className="stack-list">
            {orderedMemos.map((memo) => {
              const isFocused = focusGroup ? getMemoLocationKey(memo) === focusGroup.key : false;

              return (
                <div key={memo.id} className={`nearby-entry ${isFocused ? 'is-focused' : ''}`}>
                  <div className="nearby-entry__meta">
                    <div>
                      <strong>{memo.locationName}</strong>
                      <span>{formatDistance(memo.distanceMeters)}</span>
                    </div>
                  </div>

                  <MemoCard
                    title={memo.title}
                    content={memo.content}
                    createdAt={memo.createdAt}
                    expiresAt={memo.expiresAt}
                    visibility="public"
                    dDay={memo.dDay ?? calculateDDay(memo.expiresAtIso, memo.status)}
                    progress={memo.progress ?? calculateProgress(memo.createdAtIso, memo.expiresAtIso, memo.status)}
                    bookmarked={Boolean(memo.bookmarked)}
                    onBookmarkToggle={() => onToggleBookmark(memo.id)}
                    primaryActionLabel="상세 보기"
                    onPrimaryAction={() => onOpenDetail(memo.id)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
