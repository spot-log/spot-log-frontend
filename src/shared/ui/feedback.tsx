import type { ReactNode } from 'react';
import { BellIcon } from './icons';
import { Button } from './primitives';
import { cx } from '../lib/ui';

export interface ToastMessage {
  id: number;
  title: string;
  message: string;
  tone?: 'success' | 'danger' | 'neutral';
}

export function PushNotification({
  appName,
  title,
  message,
  time,
}: {
  appName: string;
  title: string;
  message: string;
  time: string;
}) {
  return (
    <article className="ui-push-notification">
      <div className="ui-push-notification__top">
        <span>{appName}</span>
        <span>{time}</span>
      </div>
      <strong>{title}</strong>
      <p>{message}</p>
    </article>
  );
}

export function InAppPopupOverlay({
  open,
  title,
  message,
  actionLabel,
  onAction,
  onClose,
  contained = false,
  icon,
}: {
  open: boolean;
  title: string;
  message: string;
  actionLabel: string;
  onAction: () => void;
  onClose: () => void;
  contained?: boolean;
  icon?: ReactNode;
}) {
  if (!open) {
    return null;
  }

  return (
    <div
      className={cx('ui-scrim', contained && 'ui-scrim--contained')}
      role="presentation"
      onClick={onClose}
    >
      <section className="ui-popup-overlay" onClick={(event) => event.stopPropagation()}>
        <div className="ui-popup-overlay__icon">{icon ?? <BellIcon size={18} />}</div>
        <div className="ui-popup-overlay__copy">
          <h3>{title}</h3>
          <p>{message}</p>
        </div>
        <div className="ui-popup-overlay__actions">
          <Button variant="secondary" onClick={onClose} fullWidth>
            닫기
          </Button>
          <Button onClick={onAction} fullWidth>
            {actionLabel}
          </Button>
        </div>
      </section>
    </div>
  );
}

export function Toast({
  title,
  message,
  tone = 'neutral',
}: {
  title: string;
  message: string;
  tone?: 'success' | 'danger' | 'neutral';
}) {
  return (
    <article className={cx('ui-toast', `ui-toast--${tone}`)}>
      <strong>{title}</strong>
      <p>{message}</p>
    </article>
  );
}

export function ToastViewport({
  toasts,
}: {
  toasts: ToastMessage[];
}) {
  if (!toasts.length) {
    return null;
  }

  return (
    <div className="ui-toast-viewport" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          title={toast.title}
          message={toast.message}
          tone={toast.tone}
        />
      ))}
    </div>
  );
}
