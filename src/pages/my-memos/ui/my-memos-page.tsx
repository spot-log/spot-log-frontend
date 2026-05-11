import { MyMemosPanel } from '../../../widgets/my-memos-panel';
import { useAppShellContext } from '../../../widgets/app-shell';

export function MyMemosPage() {
  const page = useAppShellContext();

  return (
    <MyMemosPanel
      tabItems={page.myTabItems}
      activeTab={page.myTab}
      sort={page.memoSort}
      sortOptions={page.sortOptions}
      memos={page.visibleMyMemos}
      onChangeTab={page.setMyTab}
      onChangeSort={page.setMemoSort}
      onOpenMap={page.openMapMemo}
      onDelete={page.setDeleteMemoId}
      onRepublish={page.handleRepublishMemo}
      onOpenComposer={() => page.setComposeOpen(true)}
    />
  );
}
