import { NearbyMemoFeed } from '../../../widgets/nearby-memo-feed';
import { useAppShellContext } from '../../../widgets/app-shell';

export function NearbyPage() {
  const page = useAppShellContext();

  return (
    <NearbyMemoFeed
      currentLocation={page.currentLocation}
      memos={page.nearbyMemos}
      locationPermission={page.locationPermission}
      selectedMemo={page.selectedMemo && page.selectedMemo.visibility === 'public' ? page.selectedMemo : null}
      onSelectMemo={page.setSelectedMemoId}
      onOpenDetail={page.openNearbyDetail}
      onToggleBookmark={page.toggleBookmark}
    />
  );
}
