import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from 'react';
import { useId } from 'react';
import { CalendarIcon } from './icons';
import { clamp, cx } from '../lib/ui';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  description?: string;
  icon?: ReactNode;
}

interface BaseFieldProps {
  label: string;
  helperText?: string;
}

interface TextInputProps
  extends BaseFieldProps,
    Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  leadingIcon?: ReactNode;
}

export function TextInput({
  label,
  helperText,
  value,
  onChange,
  leadingIcon,
  className,
  type = 'text',
  ...props
}: TextInputProps) {
  const id = useId();

  return (
    <div className={cx('ui-field', className)}>
      <label className="ui-field__label" htmlFor={id}>
        {label}
      </label>
      <div className={cx('ui-input-shell', Boolean(leadingIcon) && 'ui-input-shell--icon')}>
        {leadingIcon && <span className="ui-input-shell__icon">{leadingIcon}</span>}
        <input
          id={id}
          className="ui-input"
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          {...props}
        />
      </div>
      {helperText && <p className="ui-field__helper">{helperText}</p>}
    </div>
  );
}

export interface TextareaProps
  extends BaseFieldProps,
    Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  value: string;
  maxLength?: number;
  onChange: (value: string) => void;
}

export function CharacterCounter({
  current,
  max,
}: {
  current: number;
  max: number;
}) {
  return (
    <span className="ui-character-counter">
      {current}/{max}
    </span>
  );
}

export function Textarea({
  label,
  helperText,
  value,
  onChange,
  maxLength = 1000,
  className,
  rows = 5,
  ...props
}: TextareaProps) {
  const id = useId();

  return (
    <div className={cx('ui-field', className)}>
      <div className="ui-field__row">
        <label className="ui-field__label" htmlFor={id}>
          {label}
        </label>
        <CharacterCounter current={value.length} max={maxLength} />
      </div>
      <textarea
        id={id}
        className="ui-textarea"
        value={value}
        maxLength={maxLength}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        {...props}
      />
      {helperText && <p className="ui-field__helper">{helperText}</p>}
    </div>
  );
}

export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<SelectOption<T>>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="ui-field">
      <span className="ui-field__label">{label}</span>
      <div className="ui-segmented" role="tablist" aria-label={label}>
        {options.map((option) => {
          const selected = option.value === value;

          return (
            <button
              key={option.value}
              type="button"
              className={cx('ui-segmented__item', selected && 'is-selected')}
              onClick={() => onChange(option.value)}
              role="tab"
              aria-selected={selected}
            >
              {option.icon && <span className="ui-segmented__icon">{option.icon}</span>}
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function RadioButtonGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<SelectOption<T>>;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="ui-field ui-radio-group">
      <legend className="ui-field__label">{label}</legend>
      <div className="ui-radio-group__list" role="radiogroup" aria-label={label}>
        {options.map((option) => {
          const checked = option.value === value;

          return (
            <button
              key={option.value}
              type="button"
              className={cx('ui-radio-card', checked && 'is-selected')}
              role="radio"
              aria-checked={checked}
              onClick={() => onChange(option.value)}
            >
              <span className="ui-radio-card__indicator" aria-hidden="true" />
              <span className="ui-radio-card__body">
                <strong>{option.label}</strong>
                {option.description && <span>{option.description}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function DatePickerField({
  label,
  value,
  onChange,
  min,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
}) {
  const id = useId();

  return (
    <div className="ui-field">
      <label className="ui-field__label" htmlFor={id}>
        {label}
      </label>
      <div className="ui-input-shell ui-input-shell--icon">
        <span className="ui-input-shell__icon">
          <CalendarIcon size={16} />
        </span>
        <input
          id={id}
          className="ui-input"
          type="date"
          value={value}
          min={min}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </div>
  );
}

export function RadiusSelector({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: number;
  options: number[];
  onChange: (value: number) => void;
}) {
  return (
    <div className="ui-field">
      <span className="ui-field__label">{label}</span>
      <div className="ui-radius-selector">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={cx('ui-radius-selector__item', option === value && 'is-selected')}
            onClick={() => onChange(option)}
          >
            {option}m
          </button>
        ))}
      </div>
    </div>
  );
}

export function ToggleSwitch({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="ui-switch-row">
      <div className="ui-switch-row__copy">
        <span className="ui-switch-row__label">{label}</span>
        {description && <span className="ui-switch-row__description">{description}</span>}
      </div>
      <button
        type="button"
        className={cx('ui-switch', checked && 'is-checked')}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
      >
        <span className="ui-switch__thumb" />
      </button>
    </div>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'destructive';
type ButtonSize = 'md' | 'sm';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  leadingIcon,
  trailingIcon,
  className,
  type = 'button',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        'ui-button',
        `ui-button--${variant}`,
        `ui-button--${size}`,
        fullWidth && 'ui-button--full',
        className,
      )}
      {...props}
    >
      {leadingIcon && <span className="ui-button__icon">{leadingIcon}</span>}
      <span>{children}</span>
      {trailingIcon && <span className="ui-button__icon">{trailingIcon}</span>}
    </button>
  );
}

export function IconButton({
  className,
  children,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={cx('ui-icon-button', className)} {...props}>
      {children}
    </button>
  );
}

export function Fab({
  className,
  children,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={cx('ui-fab', className)} {...props}>
      {children}
    </button>
  );
}

export function TextButton({
  className,
  children,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={cx('ui-text-button', className)} {...props}>
      {children}
    </button>
  );
}

type ChipTone = 'private' | 'public' | 'neutral' | 'expired';

export function Chip({
  tone = 'neutral',
  children,
}: {
  tone?: ChipTone;
  children: ReactNode;
}) {
  return <span className={cx('ui-chip', `ui-chip--${tone}`)}>{children}</span>;
}

export function StatusLabel({
  children,
}: {
  children: ReactNode;
}) {
  return <span className="ui-status-label">{children}</span>;
}

export function ExpiryProgress({
  progress,
  expired = false,
  children,
}: {
  progress: number;
  expired?: boolean;
  children: ReactNode;
}) {
  const safeProgress = clamp(progress);
  const opacity = expired ? 0.42 : 0.45 + safeProgress * 0.55;

  return (
    <div className="ui-expiry-progress" style={{ opacity }}>
      <div className="ui-expiry-progress__meter">
        <span
          className="ui-expiry-progress__fill"
          style={{ width: `${safeProgress * 100}%` }}
        />
      </div>
      <div className="ui-expiry-progress__content">{children}</div>
    </div>
  );
}
