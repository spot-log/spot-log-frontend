import { calculateDDay, calculateProgress, type MemoSort, type SpotLogMemo } from '../../../entities/memo';
import { EmptyState, MemoCard, SegmentedControl, TabBar } from '../../../shared/ui';

export function MyMemosPanel({
  tabItems,
  activeTab,
  sort,
  sortOptions,
  memos,
  onChangeTab,
  onChangeSort,
  onOpenDetail,
  onDelete,
  onRepublish,
  onOpenComposer,
}: {
  tabItems: Array<{ value: 'private' | 'public' | 'expired'; label: string; icon: null }>;
  activeTab: 'private' | 'public' | 'expired';
  sort: MemoSort;
  sortOptions: Array<{ value: MemoSort; label: string }>;
  memos: SpotLogMemo[];
  onChangeTab: (value: 'private' | 'public' | 'expired') => void;
  onChangeSort: (value: MemoSort) => void;
  onOpenDetail: (id: string) => void;
  onDelete: (id: string) => void;
  onRepublish: (id: string) => void;
  onOpenComposer: () => void;
}) {
  return (
    <section className="screen-block">
      <TabBar items={tabItems} value={activeTab} onChange={onChangeTab} />
      <SegmentedControl
        label="정렬 기준"
        value={sort}
        onChange={(value) => onChangeSort(value as MemoSort)}
        options={sortOptions}
      />

      {activeTab === 'expired' ? (
        <p className="helper-note">만료 탭에서는 거리 정렬을 제외하고 공개 여부를 먼저 확인할 수 있습니다.</p>
      ) : null}

      {!memos.length ? (
        <EmptyState
          title="아직 작성한 메모가 없습니다"
          description="첫 메모를 만들면 개인, 공개, 만료 상태별로 바로 관리할 수 있습니다."
          actionLabel="메모 작성"
          onAction={onOpenComposer}
        />
      ) : (
        <div className="stack-list">
          {memos.map((memo) => (
            <MemoCard
              key={memo.id}
              title={memo.title}
              content={memo.content}
              createdAt={memo.createdAt}
              expiresAt={memo.expiresAt}
              visibility={memo.visibility}
              dDay={memo.dDay ?? calculateDDay(memo.expiresAtIso, memo.status)}
              expired={memo.status === 'expired'}
              progress={memo.progress ?? calculateProgress(memo.createdAtIso, memo.expiresAtIso, memo.status)}
              primaryActionLabel={memo.status === 'expired' ? '재공개' : '상세보기'}
              secondaryActionLabel="삭제"
              onPrimaryAction={() => (memo.status === 'expired' ? onRepublish(memo.id) : onOpenDetail(memo.id))}
              onSecondaryAction={() => onDelete(memo.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
