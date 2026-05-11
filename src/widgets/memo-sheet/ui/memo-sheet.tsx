import {
  calculateDDay,
  calculateProgress,
  formatDistance,
  type MemoSheetContext,
  type SpotLogMemo,
} from '../../../entities/memo';
import { BottomSheet, MemoCard } from '../../../shared/ui';

export function MemoSheet({
  open,
  memos,
  selectedMemoId,
  context,
  onClose,
  onOpenMap,
  onToggleBookmark,
  onOpenDetailTab,
}: {
  open: boolean;
  memos: SpotLogMemo[];
  selectedMemoId?: string | null;
  context: MemoSheetContext;
  onClose: () => void;
  onOpenMap: (id: string) => void;
  onToggleBookmark: (id: string) => void;
  onOpenDetailTab: (tab: 'nearby' | 'my') => void;
}) {
  const selectedMemo =
    (selectedMemoId ? memos.find((memo) => memo.id === selectedMemoId) : undefined) ?? memos[0] ?? null;
  const orderedMemos =
    selectedMemoId && memos.length > 1
      ? [...memos].sort((left, right) => {
          if (left.id === selectedMemoId) {
            return -1;
          }
          if (right.id === selectedMemoId) {
            return 1;
          }
          return 0;
        })
      : memos;

  function getPrimaryActionLabel(memo: SpotLogMemo) {
    if (memo.visibility === 'private') {
      return '내 메모로 이동';
    }

    return context === 'map' ? '주변 탭으로 이동' : '지도에서 보기';
  }

  function handlePrimaryAction(memo: SpotLogMemo) {
    if (memo.visibility === 'public' && context !== 'map') {
      onOpenMap(memo.id);
      return;
    }

    onOpenDetailTab(memo.visibility === 'public' ? 'nearby' : 'my');
  }

  return (
    <BottomSheet
      open={Boolean(open && selectedMemo)}
      title={
        selectedMemo
          ? memos.length > 1
            ? `${selectedMemo.locationName} 메모 ${memos.length}개`
            : selectedMemo.title
          : undefined
      }
      subtitle={
        selectedMemo ? `${selectedMemo.locationName} · ${formatDistance(selectedMemo.distanceMeters)}` : undefined
      }
      onClose={onClose}
    >
      {selectedMemo ? (
        <div className="memo-sheet-list">
          {orderedMemos.map((memo) => (
            <MemoCard
              key={memo.id}
              title={memo.title}
              content={memo.content}
              createdAt={memo.createdAt}
              expiresAt={memo.expiresAt}
              visibility={memo.visibility}
              dDay={memo.dDay ?? calculateDDay(memo.expiresAtIso, memo.status)}
              progress={memo.progress ?? calculateProgress(memo.createdAtIso, memo.expiresAtIso, memo.status)}
              bookmarked={Boolean(memo.bookmarked)}
              primaryActionLabel={getPrimaryActionLabel(memo)}
              onPrimaryAction={() => handlePrimaryAction(memo)}
              onBookmarkToggle={memo.visibility === 'public' ? () => onToggleBookmark(memo.id) : undefined}
            />
          ))}
        </div>
      ) : null}
    </BottomSheet>
  );
}
