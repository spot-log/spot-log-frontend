import type { ButtonHTMLAttributes, CSSProperties } from 'react';
import { clamp, cx } from '../lib/ui';

type PinTone = 'private' | 'public' | 'current';

export function RadiusRing({
  size,
  style,
}: {
  size: number;
  style?: CSSProperties;
}) {
  return (
    <div
      className="ui-radius-ring"
      style={{
        width: size,
        height: size,
        ...style,
      }}
    />
  );
}

export function MapPin({
  tone,
  label,
  progress = 1,
  expired = false,
  active = false,
  style,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone: PinTone;
  label?: string;
  progress?: number;
  expired?: boolean;
  active?: boolean;
  style?: CSSProperties;
}) {
  const safeProgress = clamp(progress);
  const opacity = tone === 'current' ? 1 : expired ? 0.4 : 0.5 + safeProgress * 0.5;

  return (
    <button
      type="button"
      className={cx('ui-map-pin', `ui-map-pin--${tone}`, active && 'is-active')}
      style={{ ...style, opacity }}
      {...props}
    >
      {tone !== 'current' && label && <span className="ui-map-pin__bubble">{label}</span>}
      <span className="ui-map-pin__dot" />
    </button>
  );
}

export function MapTooltip({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <article className="ui-map-tooltip">
      <strong>{title}</strong>
      {subtitle && <span>{subtitle}</span>}
    </article>
  );
}
