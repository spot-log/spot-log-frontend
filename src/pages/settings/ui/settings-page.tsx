import { SettingsPanel } from '../../../widgets/settings-panel';
import { useAppShellContext } from '../../../widgets/app-shell';

export function SettingsPage() {
  const page = useAppShellContext();

  return (
    <SettingsPanel
      memoCount={page.myPrivateMemos.length + page.myPublicMemos.length + page.myExpiredMemos.length}
      bookmarkCount={page.bookmarkedMemos.length}
      privateAlerts={page.privateAlerts}
      publicAlerts={page.publicAlerts}
      bookmarks={page.bookmarkedMemos}
      onTogglePrivateAlerts={page.handleTogglePrivateAlerts}
      onTogglePublicAlerts={page.handleTogglePublicAlerts}
      onToggleBookmark={page.toggleBookmark}
      onOpenBookmarkDetail={page.openBookmarkDetail}
      onLogout={page.handleLogout}
      onOpenDeleteAccount={() => page.setDeleteAccountOpen(true)}
      onPreviewOverlay={page.handlePreviewOverlay}
    />
  );
}
