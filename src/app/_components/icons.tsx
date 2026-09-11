/**
 * Small inline icon set, so the marketing and auth pages stay dependency-free.
 * Each icon inherits `currentColor` and sizes from its class.
 */
type IconProps = { className?: string };

const base = "size-5";

export function CheckIcon({ className = base }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="m4.5 10.5 3.5 3.5 7.5-8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ArrowRightIcon({ className = base }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M4 10h11m0 0-4.5-4.5M15 10l-4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ClipboardIcon({ className = base }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="4.5"
        y="5"
        width="15"
        height="16"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M9 5a3 3 0 0 1 6 0"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="m8.5 13 2 2 4-4.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TimerIcon({ className = base }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="13.5"
        r="7.5"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M12 10v3.8l2.4 1.7M9.5 2.5h5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CalendarCheckIcon({ className = base }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="3.5"
        y="5"
        width="17"
        height="16"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M3.5 10h17M8 3v4m8-4v4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="m9 15 2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AlertIcon({ className = base }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 4.5 21 20H3l9-15.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M12 10v4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="17" r="1" fill="currentColor" />
    </svg>
  );
}

export function BookIcon({ className = base }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M19 18v3H6.5A2.5 2.5 0 0 1 4 18.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ChartIcon({ className = base }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M4 20V10m5 10V4m5 16v-7m5 7V8"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LockIcon({ className = base }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="4.5"
        y="10"
        width="15"
        height="11"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M8 10V7.5a4 4 0 0 1 8 0V10"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SearchIcon({ className = base }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="m13.5 13.5 3 3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BellIcon({ className = base }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M6.5 10a5.5 5.5 0 0 1 11 0c0 3.5 1.5 5 1.5 5H5s1.5-1.5 1.5-5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M10 18a2 2 0 0 0 4 0"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function HelpIcon({ className = base }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M9.8 9.5a2.3 2.3 0 1 1 3 2.2c-.5.2-.8.7-.8 1.3v.4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <circle cx="12" cy="16.4" r="0.9" fill="currentColor" />
    </svg>
  );
}

export function PlusCircleIcon({ className = base }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 8.5v7M8.5 12h7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function DownloadIcon({ className = base }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 4v10m0 0 3.5-3.5M12 14l-3.5-3.5M5 17.5v1A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-1"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MegaphoneIcon({ className = base }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M4 10.5v3a1.5 1.5 0 0 0 1.5 1.5H8l7 4V6.5l-7 4H5.5A1.5 1.5 0 0 0 4 12Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M18 9.5a3.5 3.5 0 0 1 0 5M8 15v3.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ClockIcon({ className = base }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 7.5V12l3 1.8"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CheckCircleIcon({ className = base }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="m8.5 12.2 2.3 2.3 4.7-5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function UsersIcon({ className = base }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle cx="9.5" cy="9" r="3.2" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M4 19c0-2.8 2.5-4.5 5.5-4.5S15 16.2 15 19"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M16 6.6a3 3 0 0 1 0 5.3M17.5 18.4c0-2-.7-3.3-2-4.1"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function InboxIcon({ className = base }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="3.5"
        y="4.5"
        width="17"
        height="15"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="m7.5 12 2.5 2.2 6-5.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function GridIcon({ className = base }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="4"
        y="4"
        width="6.5"
        height="6.5"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <rect
        x="13.5"
        y="4"
        width="6.5"
        height="6.5"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <rect
        x="4"
        y="13.5"
        width="6.5"
        height="6.5"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <rect
        x="13.5"
        y="13.5"
        width="6.5"
        height="6.5"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export function CapIcon({ className = base }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="m12 4.5 8.5 4-8.5 4-8.5-4 8.5-4Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 10.8v4.4c0 1.6 2.5 2.8 5.5 2.8s5.5-1.2 5.5-2.8v-4.4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function StarIcon({ className = base }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="m12 4.8 2.3 4.7 5.2.75-3.75 3.65.9 5.2-4.65-2.45-4.65 2.45.9-5.2L4.5 10.25l5.2-.75L12 4.8Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ChatIcon({ className = base }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M4.5 6.5A2.5 2.5 0 0 1 7 4h10a2.5 2.5 0 0 1 2.5 2.5v7A2.5 2.5 0 0 1 17 16H9l-4.5 3.5v-13Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SettingsIcon({ className = base }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="2.8" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 3.5v2m0 13v2M20.5 12h-2m-13 0h-2m14-6-1.4 1.4M7.9 16.1 6.5 17.5m12 0-1.4-1.4M7.9 7.9 6.5 6.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SlidersIcon({ className = base }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M5 8h14M5 16h14"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <circle cx="10" cy="8" r="2.2" fill="currentColor" />
      <circle cx="15" cy="16" r="2.2" fill="currentColor" />
    </svg>
  );
}

export function ChevronRightIcon({ className = base }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="m8 5 5 5-5 5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ChevronDownIcon({ className = base }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="m5 8 5 5 5-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MailIcon({ className = base }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="3.5"
        y="5.5"
        width="17"
        height="13"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="m4.5 8 7.5 5 7.5-5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CalendarIcon({ className = base }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="3.5"
        y="5"
        width="17"
        height="16"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M3.5 10h17M8 3v4m8-4v4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SwitchIcon({ className = base }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M4 8h12m0 0-3-3m3 3-3 3M20 16H8m0 0 3-3m-3 3 3 3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TrendUpIcon({ className = base }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="m4 16 5-5 3.5 3.5L20 7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 7h5v5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PlayIcon({ className = base }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M10.25 8.75v6.5L15.5 12l-5.25-3.25Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TrophyIcon({ className = base }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M8 4h8v5a4 4 0 0 1-8 0V4ZM8 6H5v1.5A3.5 3.5 0 0 0 8.5 11M16 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5M12 13v4m-3.5 3h7M10 17h4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FileIcon({ className = base }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M14 3.5H7.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8L14 3.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M14 3.5V8h4.5M9 12.5h6M9 16h4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function UserCheckIcon({ className = base }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle cx="10" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M3.5 19.5c.8-3 3.4-5 6.5-5 1.2 0 2.3.3 3.2.8M15 17.5l2 2 3.5-4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Stroked icon helper for the media and lesson icons below. */
function StrokeIcon({ className, d }: { className: string; d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d={d}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PlayFillIcon({ className = base }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M8 5.2v13.6a.8.8 0 0 0 1.2.7l10.6-6.8a.8.8 0 0 0 0-1.4L9.2 4.5A.8.8 0 0 0 8 5.2Z" />
    </svg>
  );
}

export function PauseIcon({ className = base }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <rect x="6.5" y="5" width="3.8" height="14" rx="1" />
      <rect x="13.7" y="5" width="3.8" height="14" rx="1" />
    </svg>
  );
}

export function BackTenIcon({ className = base }: IconProps) {
  return (
    <StrokeIcon
      className={className}
      d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3L4.5 9m0-4.5V9H9M10 10v5m2.5-2.5a1.5 2.5 0 1 0 3 0 1.5 2.5 0 1 0-3 0"
    />
  );
}

export function ForwardTenIcon({ className = base }: IconProps) {
  return (
    <StrokeIcon
      className={className}
      d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3L19.5 9m0-4.5V9H15M9 10v5m2.5-2.5a1.5 2.5 0 1 0 3 0 1.5 2.5 0 1 0-3 0"
    />
  );
}

export function VolumeIcon({ className = base }: IconProps) {
  return (
    <StrokeIcon
      className={className}
      d="M4 9.5h3.2L11.5 6v12l-4.3-3.5H4v-5ZM15 9.5a3.5 3.5 0 0 1 0 5M17.5 7a7 7 0 0 1 0 10"
    />
  );
}

export function VolumeOffIcon({ className = base }: IconProps) {
  return (
    <StrokeIcon
      className={className}
      d="M4 9.5h3.2L11.5 6v12l-4.3-3.5H4v-5ZM15.5 9.5l5 5m0-5-5 5"
    />
  );
}

export function CaptionsIcon({ className = base }: IconProps) {
  return (
    <StrokeIcon
      className={className}
      d="M5 5.5h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2ZM10.5 10.3a2.2 2.2 0 1 0 0 3.4M16.5 10.3a2.2 2.2 0 1 0 0 3.4"
    />
  );
}

export function NotePenIcon({ className = base }: IconProps) {
  return (
    <StrokeIcon
      className={className}
      d="M4.5 19.5h4L19 9a2.1 2.1 0 0 0-3-3L5.5 16.5v3ZM14 8l3 3"
    />
  );
}

export function ExpandIcon({ className = base }: IconProps) {
  return (
    <StrokeIcon
      className={className}
      d="M4.5 9V4.5H9M19.5 9V4.5H15M4.5 15v4.5H9M19.5 15v4.5H15"
    />
  );
}

export function ListIcon({ className = base }: IconProps) {
  return (
    <StrokeIcon
      className={className}
      d="M9 6.5h11M9 12h11M9 17.5h11M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01"
    />
  );
}

export function BookmarkIcon({ className = base }: IconProps) {
  return <StrokeIcon className={className} d="M7 4h10v16l-5-3.5L7 20V4Z" />;
}

export function FlaskIcon({ className = base }: IconProps) {
  return (
    <StrokeIcon
      className={className}
      d="M9.5 3.5h5M10.5 3.5V9l-5.3 9.2A1.5 1.5 0 0 0 6.5 20.5h11a1.5 1.5 0 0 0 1.3-2.3L13.5 9V3.5M7.6 14.5h8.8"
    />
  );
}

export function BookOpenIcon({ className = base }: IconProps) {
  return (
    <StrokeIcon
      className={className}
      d="M12 6.5C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.5m0-13c2-1.5 5-2 8-1.5v13c-3-.5-6 0-8 1.5m0-13v13"
    />
  );
}
