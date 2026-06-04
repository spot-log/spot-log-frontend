import { formatDistance, type SpotLogMemo } from '../../../entities/memo';
import {
  BookmarkListItem,
  Button,
  DestructiveListItem,
  EmptyState,
  ProfileSection,
  StatusLabel,
  TextButton,
  ToggleSwitch,
} from '../../../shared/ui';

export function SettingsPanel({
  profileName,
  profileEmail,
  profileProvider,
  memoCount,
  bookmarkCount,
  privateAlerts,
  publicAlerts,
  bookmarks,
  onTogglePrivateAlerts,
  onTogglePublicAlerts,
  onToggleBookmark,
  onOpenBookmarkDetail,
  onLogout,
  onOpenDeleteAccount,
  onPreviewOverlay,
}: {
  profileName: string;
  profileEmail: string;
  profileProvider: string;
  memoCount: number;
  bookmarkCount: number;
  privateAlerts: boolean;
  publicAlerts: boolean;
  bookmarks: SpotLogMemo[];
  onTogglePrivateAlerts: (next: boolean) => void;
  onTogglePublicAlerts: (next: boolean) => void;
  onToggleBookmark: (id: string) => void;
  onOpenBookmarkDetail: (id: string) => void;
  onLogout: () => void;
  onOpenDeleteAccount: () => void;
  onPreviewOverlay: () => void;
}) {
  return (
    <section className="screen-block">
      <ProfileSection
        name={profileName}
        email={profileEmail}
        provider={profileProvider}
        memoCount={memoCount}
        bookmarkCount={bookmarkCount}
      />

      <div className="panel-card">
        <div className="panel-card__header">
          <div>
            <strong>알림 설정</strong>
            <p>개인 메모는 기본 ON, 공개 메모는 기본 OFF 상태를 가정합니다.</p>
          </div>
          <TextButton onClick={onPreviewOverlay}>알림 보기</TextButton>
        </div>

        <div className="stack-list">
          <ToggleSwitch
            label="개인 메모 알림"
            description="반경 진입 시 즉시 표시"
            checked={privateAlerts}
            onChange={onTogglePrivateAlerts}
          />
          <ToggleSwitch
            label="공개 메모 알림"
            description="권한 허용 후 반경 진입 시에만 표시"
            checked={publicAlerts}
            onChange={onTogglePublicAlerts}
          />
        </div>
      </div>

      <div className="panel-card">
        <div className="panel-card__header">
          <div>
            <strong>북마크한 메모</strong>
            <p>만료된 공개 메모는 목록에서 자동 제외되는 흐름을 기준으로 구성했습니다.</p>
          </div>
          <StatusLabel>{bookmarkCount}개</StatusLabel>
        </div>

        {bookmarks.length ? (
          <div className="stack-list">
            {bookmarks.map((memo) => (
              <BookmarkListItem
                key={memo.id}
                title={memo.title}
                author={memo.author ?? '익명'}
                distance={formatDistance(memo.distanceMeters)}
                expiresAt={`${memo.expiresAt ?? '만료일 미정'}까지`}
                bookmarked
                onOpenDetail={() => onOpenBookmarkDetail(memo.id)}
                onToggleBookmark={() => onToggleBookmark(memo.id)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="북마크한 메모가 없습니다"
            description="주변 공개 메모를 저장하면 설정 페이지에서 따로 관리할 수 있습니다."
          />
        )}
      </div>

      <div className="stack-list">
        <Button variant="secondary" fullWidth onClick={onLogout}>
          로그아웃
        </Button>
        <DestructiveListItem
          title="계정 삭제"
          description="계정을 삭제하면 작성한 개인 메모와 공개 메모가 모두 제거됩니다."
          onClick={onOpenDeleteAccount}
        />
      </div>
    </section>
  );
}
