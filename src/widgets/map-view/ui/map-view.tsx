import { Fab, IconButton, KakaoMapCanvas, LocateIcon, PlusIcon } from '../../../shared/ui';
import { groupMemosByLocation, type LocationResult, type SpotLogMemo } from '../../../entities/memo';

function resolveMapCenter({
  currentLocation,
  selectedMemo,
  groupedMemos,
}: {
  currentLocation: LocationResult | null;
  selectedMemo: SpotLogMemo | null;
  groupedMemos: ReturnType<typeof groupMemosByLocation>;
}) {
  return (
    selectedMemo?.coordinate ??
    currentLocation?.coordinate ??
    groupedMemos[0]?.representative.coordinate ?? {
      lat: 37.5665,
      lng: 126.978,
    }
  );
}

export function MapView({
  currentLocation,
  publicMemos,
  myMemos,
  selectedMemo,
  onSelectMemo,
  onOpenComposer,
  onLocateCurrentPosition,
}: {
  currentLocation: LocationResult | null;
  publicMemos: SpotLogMemo[];
  myMemos: SpotLogMemo[];
  selectedMemo: SpotLogMemo | null;
  onSelectMemo: (id: string) => void;
  onOpenComposer: () => void;
  onLocateCurrentPosition: () => void;
}) {
  const groupedMemos = groupMemosByLocation([...publicMemos, ...myMemos], selectedMemo?.id);
  const mapCenter = resolveMapCenter({
    currentLocation,
    selectedMemo,
    groupedMemos,
  });

  return (
    <section className="screen-block screen-block--map">
      <div className="map-summary">
        <article>
          <span>현재 위치</span>
          <strong>{currentLocation?.address ?? '위치 확인 필요'}</strong>
        </article>
        <article>
          <span>공개 메모</span>
          <strong>{publicMemos.length}개</strong>
        </article>
        <article>
          <span>내 메모</span>
          <strong>{myMemos.length}개</strong>
        </article>
      </div>

      {!currentLocation ? (
        <p className="helper-note">현재 위치 권한이 없으면 지도는 기본 위치로 열리고, 주변 메모 탐색은 제한됩니다.</p>
      ) : null}

      <div className="memo-map memo-map--kakao">
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
              tone: group.tone,
              label: group.locationName,
              subtitle:
                group.memos.length > 1
                  ? `${group.memos.length}개의 메모`
                  : group.representative.title,
            })),
          ]}
          selectedMarkerId={selectedMemo?.id}
          onMarkerClick={onSelectMemo}
          circle={
            currentLocation
              ? {
                  center: currentLocation.coordinate,
                  radius: 500,
                }
              : null
          }
          level={4}
        />

        <div className="map-stage__controls">
          <IconButton aria-label="현재 위치 새로고침" onClick={onLocateCurrentPosition}>
            <LocateIcon size={18} />
          </IconButton>
        </div>

        <Fab
          aria-label="메모 작성"
          style={{ position: 'absolute', right: 14, bottom: 14 }}
          onClick={onOpenComposer}
        >
          <PlusIcon size={22} />
        </Fab>
      </div>
    </section>
  );
}
