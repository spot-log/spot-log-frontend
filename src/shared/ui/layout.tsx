import type { ReactNode } from 'react';
import { Button } from './primitives';
import { CloseIcon } from './icons';
import { cx } from '../lib/ui';

interface NavigationItem<T extends string> {
  value: T;
  label: string;
  icon: ReactNode;
}

export function BottomNavigationBar<T extends string>({
  items,
  value,
  onChange,
}: {
  items: Array<NavigationItem<T>>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <nav className="ui-bottom-nav" aria-label="주요 메뉴">
      {items.map((item) => {
        const selected = item.value === value;

        return (
          <button
            key={item.value}
            type="button"
            className={cx('ui-bottom-nav__item', selected && 'is-selected')}
            onClick={() => onChange(item.value)}
          >
            <span className="ui-bottom-nav__icon">{item.icon}</span>
            <span className="ui-bottom-nav__label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export function TabBar<T extends string>({
  items,
  value,
  onChange,
}: {
  items: Array<NavigationItem<T>>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="ui-tab-bar" role="tablist" aria-label="메모 탭">
      {items.map((item) => {
        const selected = item.value === value;

        return (
          <button
            key={item.value}
            type="button"
            className={cx('ui-tab-bar__item', selected && 'is-selected')}
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(item.value)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

interface LayerProps {
  open: boolean;
  title?: string;
  subtitle?: string;
  footer?: ReactNode;
  children: ReactNode;
  contained?: boolean;
  onClose?: () => void;
  showCloseButton?: boolean;
}

export function BottomSheet({
  open,
  title,
  subtitle,
  footer,
  children,
  contained = false,
  onClose,
}: LayerProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className={cx('ui-scrim', contained && 'ui-scrim--contained')}
      onClick={onClose}
      role="presentation"
    >
      <section
        className={cx('ui-bottom-sheet', contained && 'ui-bottom-sheet--contained')}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="ui-sheet-handle" />
        {title || subtitle ? (
          <header className="ui-layer-header">
            {title ? <h3>{title}</h3> : null}
            {subtitle ? <p>{subtitle}</p> : null}
          </header>
        ) : null}
        <div className="ui-layer-body">{children}</div>
        {footer ? <footer className="ui-layer-footer">{footer}</footer> : null}
      </section>
    </div>
  );
}

export function FullScreenModal({
  open,
  title,
  subtitle,
  footer,
  children,
  contained = false,
  onClose,
  showCloseButton = true,
}: LayerProps) {
  if (!open) {
    return null;
  }

  return (
    <div className={cx('ui-modal-shell', contained && 'ui-modal-shell--contained')}>
      <section className={cx('ui-modal', contained && 'ui-modal--contained')}>
        <header className="ui-modal__header">
          {showCloseButton ? (
            <button
              type="button"
              className="ui-modal__close"
              onClick={onClose}
              aria-label="닫기"
            >
              <CloseIcon size={18} />
            </button>
          ) : (
            <div className="ui-modal__spacer" />
          )}
          <div className="ui-modal__title">
            {title ? <h3>{title}</h3> : null}
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <div className="ui-modal__spacer" />
        </header>
        <div className="ui-modal__body">{children}</div>
        {footer ? <footer className="ui-modal__footer">{footer}</footer> : null}
      </section>
    </div>
  );
}

export function AlertDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="ui-scrim" role="presentation" onClick={onCancel}>
      <section
        className="ui-alert-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="alert-title"
        aria-describedby="alert-description"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="ui-alert-dialog__copy">
          <h3 id="alert-title">{title}</h3>
          <p id="alert-description">{description}</p>
        </div>
        <div className="ui-alert-dialog__actions">
          <Button variant="secondary" onClick={onCancel} fullWidth>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'primary'}
            onClick={onConfirm}
            fullWidth
          >
            {confirmLabel}
          </Button>
        </div>
      </section>
    </div>
  );
}
