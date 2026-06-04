import { useAppShellContext } from '../../../widgets/app-shell';
import { MapView } from '../../../widgets/map-view';

export function MapPage() {
  const page = useAppShellContext();

  return (
    <MapView
      currentLocation={page.currentLocation}
      publicMemos={page.publicMemos}
      myMemos={page.memos.filter((memo) => memo.owner === 'me' && memo.status !== 'expired')}
      selectedMemo={page.mapMemo}
      onSelectMemo={(id) => {
        page.setSelectedMemoId(id);
        page.setSheetContext('map');
        page.setSheetOpen(true);
      }}
      onOpenComposer={page.openComposeModal}
      onLocateCurrentPosition={() => page.requestCurrentLocation()}
    />
  );
}
