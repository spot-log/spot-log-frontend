import { useMemo } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  BottomNavigationBar,
  Chip,
  InAppPopupOverlay,
  MapIcon,
  NearbyIcon,
  NoteStackIcon,
  SettingsIcon,
  TextButton,
  ToastViewport,
} from '../../../shared/ui';
import { CreateMemoModal } from '../../../features/compose-memo';
import { MemoSheet } from '../../memo-sheet';
import { AppShellContextProvider } from '../model/app-shell-context';
import { useAppShell } from '../model/use-app-shell';
import './app-shell.css';

const TAB_PATHS = {
  map: '/map',
  nearby: '/nearby',
  my: '/my-memos',
  settings: '/settings',
} as const;

function getActiveTab(pathname: string) {
  if (pathname.startsWith('/nearby')) {
    return 'nearby' as const;
  }

  if (pathname.startsWith('/my-memos')) {
    return 'my' as const;
  }

  if (pathname.startsWith('/settings')) {
    return 'settings' as const;
  }

  return 'map' as const;
}

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = getActiveTab(location.pathname);
  const page = useAppShell({
    activeTab,
    onLogout: () => navigate('/login', { replace: true }),
    onNavigateTab: (tab) => navigate(TAB_PATHS[tab]),
  });

  const navItems = useMemo(
    () =>
      page.navTabs.map((tab) => ({
        ...tab,
        icon:
          tab.value === 'map' ? (
            <MapIcon size={18} />
          ) : tab.value === 'nearby' ? (
            <NearbyIcon size={18} />
          ) : tab.value === 'my' ? (
            <NoteStackIcon size={18} />
          ) : (
            <SettingsIcon size={18} />
          ),
      })),
    [page.navTabs],
  );

  if (location.pathname === '/main') {
    return <Navigate to="/map" replace />;
  }

  return (
    <AppShellContextProvider value={page}>
      <div className="app-shell">
        <div className="app-shell__frame">
          <div className="status-strip">
            <div className="status-strip__chips">
              <Chip tone={page.notificationPermission === 'granted' ? 'public' : 'neutral'}>
                {page.notificationPermission === 'granted' ? '알림 권한 허용' : '알림 권한 필요'}
              </Chip>
              <Chip tone="public">공개 메모 {page.nearbyMemos.length}개</Chip>
              <Chip tone="private">내 메모 {page.myPrivateMemos.length + page.myPublicMemos.length}개</Chip>
            </div>
            <TextButton onClick={page.handlePreviewOverlay}>알림 보기</TextButton>
          </div>

          <main className={`shell-content ${activeTab === 'map' ? 'shell-content--map' : ''}`}>
            <Outlet />
          </main>

          <footer className="shell-nav">
            <BottomNavigationBar
              items={navItems}
              value={activeTab}
              onChange={(value) => navigate(TAB_PATHS[value])}
            />
          </footer>

          <MemoSheet
            open={
              page.sheetOpen &&
              ((page.sheetContext === 'bookmark' && activeTab === 'settings') ||
                (page.sheetContext === 'my' && activeTab === 'my') ||
                ((page.sheetContext === 'map' || page.sheetContext === 'nearby') &&
                  (activeTab === 'map' || activeTab === 'nearby')))
            }
            memos={page.memoSheetMemos}
            selectedMemoId={page.selectedMemoId}
            context={page.memoSheetContext}
            onClose={() => page.setSheetOpen(false)}
            onOpenMap={page.openMapMemo}
            onToggleBookmark={page.toggleBookmark}
            onEditMemo={page.openMemoEditor}
            onOpenDetailTab={(tab) => {
              navigate(TAB_PATHS[tab]);
              page.setSheetOpen(false);
            }}
          />

          <CreateMemoModal
            open={page.composeOpen}
            mode={page.composeMode}
            draft={page.draft}
            validationMessage={page.draftValidationMessage}
            locations={page.locations}
            selectedLocation={page.selectedLocation}
            isSearchingLocations={page.isSearchingLocations}
            locationSearchMessage={page.locationSearchMessage}
            onClose={page.closeComposeModal}
            onSave={page.handleSaveMemo}
            onChangeDraft={page.updateDraft}
            onSelectLocation={page.selectLocation}
          />

          <InAppPopupOverlay
            open={page.overlayOpen}
            title={page.notificationTarget?.notificationTitle ?? '알림 미리보기'}
            message={
              page.notificationTarget?.message ??
              `'${page.selectedMemo?.title ?? '메모'}'를 확인할 시간입니다.`
            }
            actionLabel="메모 보기"
            onClose={() => page.setOverlayOpen(false)}
            onAction={page.handleOpenNotificationDetail}
          />
        </div>

        <AlertDialog
          open={Boolean(page.deleteMemoId)}
          title="메모를 삭제할까요?"
          description="삭제한 메모는 복구할 수 없습니다. 본인이 만든 메모만 삭제할 수 있도록 백엔드 API를 연결했습니다."
          cancelLabel="취소"
          confirmLabel="삭제"
          destructive
          onCancel={() => page.setDeleteMemoId(null)}
          onConfirm={page.handleDeleteMemo}
        />

        <AlertDialog
          open={page.deleteAccountOpen}
          title="계정을 삭제할까요?"
          description="계정을 삭제하면 작성한 개인 메모와 공개 메모가 모두 삭제되고 로그아웃됩니다."
          cancelLabel="취소"
          confirmLabel="계정 삭제"
          destructive
          onCancel={() => page.setDeleteAccountOpen(false)}
          onConfirm={page.handleDeleteAccountConfirm}
        />

        <ToastViewport toasts={page.toasts} />
      </div>
    </AppShellContextProvider>
  );
}
