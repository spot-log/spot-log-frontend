import { ChevronRightIcon, GoogleIcon, TrashIcon, UserIcon } from './icons';
import { Button } from './primitives';

export function SocialLoginButton({
  onClick,
  disabled,
}: {
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      variant="secondary"
      className="ui-social-login"
      onClick={onClick}
      disabled={disabled}
      leadingIcon={<GoogleIcon size={18} />}
    >
      Google로 로그인
    </Button>
  );
}

export function ProfileSection({
  name,
  email,
  provider,
  memoCount,
  bookmarkCount,
}: {
  name: string;
  email: string;
  provider: string;
  memoCount: number;
  bookmarkCount: number;
}) {
  return (
    <section className="ui-profile-section">
      <div className="ui-profile-section__hero">
        <div className="ui-profile-section__avatar" aria-hidden="true">
          <UserIcon size={24} />
        </div>
        <div>
          <h3>{name}</h3>
          <p>{email}</p>
        </div>
      </div>
      <dl className="ui-profile-section__meta">
        <div>
          <dt>연동 계정</dt>
          <dd>{provider}</dd>
        </div>
        <div>
          <dt>작성 메모</dt>
          <dd>{memoCount}개</dd>
        </div>
        <div>
          <dt>북마크</dt>
          <dd>{bookmarkCount}개</dd>
        </div>
      </dl>
    </section>
  );
}

export function DestructiveListItem({
  title,
  description,
  onClick,
}: {
  title: string;
  description: string;
  onClick?: () => void;
}) {
  return (
    <button type="button" className="ui-destructive-list-item" onClick={onClick}>
      <span className="ui-destructive-list-item__icon" aria-hidden="true">
        <TrashIcon size={18} />
      </span>
      <span className="ui-destructive-list-item__copy">
        <strong>{title}</strong>
        <span>{description}</span>
      </span>
      <ChevronRightIcon size={18} />
    </button>
  );
}
