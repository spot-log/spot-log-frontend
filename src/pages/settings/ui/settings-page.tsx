import { SettingsPanel } from '../../../widgets/settings-panel';
import { useAppShellContext } from '../../../widgets/app-shell';

function formatProvider(provider: string) {
  if (!provider.trim()) {
    return 'Unknown';
  }

  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

export function SettingsPage() {
  const page = useAppShellContext();
  const profileName = page.session?.user.nickname?.trim() || '사용자';
  const profileEmail = page.session?.user.email?.trim() || '이메일 정보 없음';
  const profileProvider = formatProvider(page.session?.user.provider ?? '');

  return (
    <SettingsPanel
      profileName={profileName}
      profileEmail={profileEmail}
      profileProvider={profileProvider}
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
      canInstallApp={page.canInstallApp}
      isAppInstalled={page.isAppInstalled}
      onInstallApp={page.handleInstallApp}
    />
  );
}
