import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function IconBase({ children, size = 20, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

export function MapIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3 6.5L9 4L15 6.5L21 4V17.5L15 20L9 17.5L3 20V6.5Z" />
      <path d="M9 4V17.5" />
      <path d="M15 6.5V20" />
    </IconBase>
  );
}

export function NearbyIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none" />
      <path d="M4.9 12a7.1 7.1 0 0 1 7.1-7.1" />
      <path d="M19.1 12A7.1 7.1 0 0 1 12 19.1" />
      <path d="M7.3 12A4.7 4.7 0 0 1 12 7.3" />
      <path d="M16.7 12A4.7 4.7 0 0 1 12 16.7" />
    </IconBase>
  );
}

export function NoteStackIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="5" y="4" width="12" height="14" rx="3" />
      <path d="M9 8H13" />
      <path d="M9 12H13" />
      <path d="M8 20H17.5C18.88 20 20 18.88 20 17.5V8" />
    </IconBase>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 7H10" />
      <path d="M14 7H20" />
      <circle cx="12" cy="7" r="2" />
      <path d="M4 17H7" />
      <path d="M11 17H20" />
      <circle cx="9" cy="17" r="2" />
    </IconBase>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 5V19" />
      <path d="M5 12H19" />
    </IconBase>
  );
}

export function MinusIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 12H19" />
    </IconBase>
  );
}

export function LocateIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3V6" />
      <path d="M12 18V21" />
      <path d="M3 12H6" />
      <path d="M18 12H21" />
      <circle cx="12" cy="12" r="4" />
    </IconBase>
  );
}

export function BookmarkIcon({
  filled = false,
  ...props
}: IconProps & { filled?: boolean }) {
  return (
    <svg
      width={props.size ?? 20}
      height={props.size ?? 20}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      xmlns="http://www.w3.org/2000/svg"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M6 4.5C6 3.67 6.67 3 7.5 3H16.5C17.33 3 18 3.67 18 4.5V21L12 16.8L6 21V4.5Z" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6 6L18 18" />
      <path d="M18 6L6 18" />
    </IconBase>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="4" y="5" width="16" height="15" rx="3" />
      <path d="M8 3V7" />
      <path d="M16 3V7" />
      <path d="M4 9H20" />
    </IconBase>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6 9.5A6 6 0 0 1 18 9.5V13L20 16H4L6 13V9.5Z" />
      <path d="M10 18C10.37 19.16 11.08 20 12 20C12.92 20 13.63 19.16 14 18" />
    </IconBase>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 19C5.87 16.67 8.38 15 12 15C15.62 15 18.13 16.67 19 19" />
    </IconBase>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 7H20" />
      <path d="M9 7V5.5C9 4.67 9.67 4 10.5 4H13.5C14.33 4 15 4.67 15 5.5V7" />
      <path d="M7 7L8 19.5C8.06 20.33 8.75 21 9.58 21H14.42C15.25 21 15.94 20.33 16 19.5L17 7" />
      <path d="M10 11V17" />
      <path d="M14 11V17" />
    </IconBase>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="5" y="10" width="14" height="10" rx="3" />
      <path d="M8 10V7.75A4 4 0 0 1 12 3.75A4 4 0 0 1 16 7.75V10" />
    </IconBase>
  );
}

export function GlobeIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M4 12H20" />
      <path d="M12 4C14.3 6.1 15.6 9 15.6 12C15.6 15 14.3 17.9 12 20" />
      <path d="M12 4C9.7 6.1 8.4 9 8.4 12C8.4 15 9.7 17.9 12 20" />
    </IconBase>
  );
}

export function GoogleIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M21.6 12.23C21.6 11.55 21.54 10.9 21.43 10.27H12V14.11H17.39C17.16 15.35 16.46 16.41 15.4 17.12V19.61H18.61C20.49 17.88 21.6 15.33 21.6 12.23Z"
        fill="#4285F4"
      />
      <path
        d="M12 22C14.7 22 16.96 21.11 18.61 19.61L15.4 17.12C14.51 17.72 13.38 18.07 12 18.07C9.4 18.07 7.2 16.32 6.41 13.96H3.09V16.53C4.73 19.79 8.1 22 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.41 13.96C6.21 13.36 6.09 12.72 6.09 12C6.09 11.28 6.21 10.64 6.41 10.04V7.47H3.09C2.4 8.84 2 10.38 2 12C2 13.62 2.4 15.16 3.09 16.53L6.41 13.96Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.93C13.5 5.93 14.84 6.45 15.9 7.46L18.68 4.68C16.96 3.07 14.7 2 12 2C8.1 2 4.73 4.21 3.09 7.47L6.41 10.04C7.2 7.68 9.4 5.93 12 5.93Z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M9 6L15 12L9 18" />
    </IconBase>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="11" cy="11" r="6" />
      <path d="M20 20L16 16" />
    </IconBase>
  );
}

export function SparkIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3L13.9 8.1L19 10L13.9 11.9L12 17L10.1 11.9L5 10L10.1 8.1L12 3Z" />
    </IconBase>
  );
}

export function ArrowCounterClockwiseIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 8V4H9" />
      <path d="M6.2 14.8A6.5 6.5 0 1 0 6 8" />
    </IconBase>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8V12L15 14" />
    </IconBase>
  );
}
