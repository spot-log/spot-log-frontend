import type { ReactNode } from 'react';
import { BookmarkIcon, ClockIcon, SparkIcon } from './icons';
import { Button, Chip, ExpiryProgress, IconButton, StatusLabel, TextButton } from './primitives';

type MemoVisibility = 'private' | 'public';

function visibilityTone(visibility: MemoVisibility) {
  return visibility === 'private' ? 'private' : 'public';
}

function visibilityLabel(visibility: MemoVisibility) {
  return visibility === 'private' ? '개인 메모' : '공개 메모';
}

interface MemoListItemProps {
  title: string;
  distance: string;
  dDay?: string;
  visibility: MemoVisibility;
  expired?: boolean;
  progress?: number;
  extra?: ReactNode;
}

export function MemoListItem({
  title,
  distance,
  dDay,
  visibility,
  expired = false,
  progress = 1,
  extra,
}: MemoListItemProps) {
  return (
    <ExpiryProgress progress={progress} expired={expired}>
      <article className="ui-list-item">
        <div className="ui-list-item__copy">
          <div className="ui-list-item__chips">
            <Chip tone={visibilityTone(visibility)}>{visibilityLabel(visibility)}</Chip>
            {expired ? (
              <Chip tone="expired">만료됨</Chip>
            ) : (
              dDay && <Chip tone="neutral">{dDay}</Chip>
            )}
          </div>
          <strong>{title}</strong>
          <p>{distance}</p>
        </div>
        {extra}
      </article>
    </ExpiryProgress>
  );
}

interface MemoCardProps {
  title: string;
  content: string;
  createdAt: string;
  expiresAt?: string;
  visibility: MemoVisibility;
  dDay?: string;
  expired?: boolean;
  progress?: number;
  bookmarked?: boolean;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  onBookmarkToggle?: () => void;
}

export function MemoCard({
  title,
  content,
  createdAt,
  expiresAt,
  visibility,
  dDay,
  expired = false,
  progress = 1,
  bookmarked = false,
  primaryActionLabel,
  secondaryActionLabel,
  onPrimaryAction,
  onSecondaryAction,
  onBookmarkToggle,
}: MemoCardProps) {
  return (
    <ExpiryProgress progress={progress} expired={expired}>
      <article className="ui-memo-card">
        <div className="ui-memo-card__top">
          <div className="ui-memo-card__chips">
            <Chip tone={visibilityTone(visibility)}>{visibilityLabel(visibility)}</Chip>
            {expired ? (
              <StatusLabel>만료됨</StatusLabel>
            ) : (
              dDay && <Chip tone="neutral">{dDay}</Chip>
            )}
          </div>
          {onBookmarkToggle ? (
            <IconButton aria-label="북마크 토글" onClick={onBookmarkToggle}>
              <BookmarkIcon filled={bookmarked} size={18} />
            </IconButton>
          ) : null}
        </div>
        <div className="ui-memo-card__body">
          <h3>{title}</h3>
          <p>{content}</p>
        </div>
        <dl className="ui-memo-card__meta">
          <div>
            <dt>작성일</dt>
            <dd>{createdAt}</dd>
          </div>
          {expiresAt ? (
            <div>
              <dt>만료일</dt>
              <dd>{expiresAt}</dd>
            </div>
          ) : null}
        </dl>
        {primaryActionLabel || secondaryActionLabel ? (
          <div className="ui-memo-card__actions">
            {secondaryActionLabel ? (
              <Button variant="secondary" onClick={onSecondaryAction} fullWidth>
                {secondaryActionLabel}
              </Button>
            ) : null}
            {primaryActionLabel ? (
              <Button
                variant={expired ? 'primary' : 'secondary'}
                onClick={onPrimaryAction}
                fullWidth
              >
                {primaryActionLabel}
              </Button>
            ) : null}
          </div>
        ) : null}
      </article>
    </ExpiryProgress>
  );
}

export function BookmarkListItem({
  title,
  author,
  distance,
  expiresAt,
  bookmarked = true,
  onOpenDetail,
  onToggleBookmark,
}: {
  title: string;
  author: string;
  distance: string;
  expiresAt: string;
  bookmarked?: boolean;
  onOpenDetail?: () => void;
  onToggleBookmark?: () => void;
}) {
  return (
    <article className="ui-bookmark-item">
      <div className="ui-bookmark-item__copy">
        <strong>{title}</strong>
        <p>
          {author} · {distance}
        </p>
        <span>
          <ClockIcon size={14} /> {expiresAt}
        </span>
      </div>
      {onOpenDetail || onToggleBookmark ? (
        <div className="ui-bookmark-item__actions">
          {onOpenDetail ? <TextButton onClick={onOpenDetail}>상세</TextButton> : null}
          {onToggleBookmark ? (
            <IconButton aria-label="북마크 해제" onClick={onToggleBookmark}>
              <BookmarkIcon filled={bookmarked} size={18} />
            </IconButton>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <article className="ui-empty-state">
      <div className="ui-empty-state__icon">
        <SparkIcon size={20} />
      </div>
      <strong>{title}</strong>
      <p>{description}</p>
      {actionLabel && onAction ? <TextButton onClick={onAction}>{actionLabel}</TextButton> : null}
    </article>
  );
}
