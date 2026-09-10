/** Presentation helpers shared by the teacher screens. */

/** "08:15" → "08:15 AM" */
export function clock(time: string | null): string {
  if (!time) return "—";
  const [rawHours, rawMinutes] = time.split(":");
  const hours = Number(rawHours);
  if (Number.isNaN(hours)) return time;
  const suffix = hours >= 12 ? "PM" : "AM";
  const display = hours % 12 === 0 ? 12 : hours % 12;
  return `${String(display).padStart(2, "0")}:${rawMinutes ?? "00"} ${suffix}`;
}

/** A wall-clock time from a Date, e.g. "08:22 AM". */
export function clockOf(date: Date | null | undefined): string {
  if (!date) return "—";
  return clock(
    `${String(date.getHours()).padStart(2, "0")}:${String(
      date.getMinutes(),
    ).padStart(2, "0")}`,
  );
}

/** Compact elapsed time, e.g. "2h ago". */
export function timeAgo(date: Date | null | undefined): string {
  if (!date) return "—";
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** Initials for the avatar fallback. */
export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

/** Deterministic avatar tint so each person keeps the same colour. */
export function avatarTone(seed: string): string {
  const tones = [
    "bg-blue-100 text-blue-700",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
    "bg-violet-100 text-violet-700",
    "bg-rose-100 text-rose-700",
    "bg-teal-100 text-teal-700",
  ];
  let hash = 0;
  for (const character of seed)
    hash = (hash * 31 + character.charCodeAt(0)) | 0;
  return tones[Math.abs(hash) % tones.length]!;
}

/** File size for the submission rows, e.g. "4.2 MB". */
export function fileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

/** "LAB_REPORT" → "Lab report" */
export function humanise(value: string): string {
  const text = value.replaceAll("_", " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function weekdayName(date: Date): string {
  return WEEKDAYS[date.getDay()]!;
}

export function longDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}
