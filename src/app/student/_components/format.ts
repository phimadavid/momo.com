import { clockOf, weekdayName } from "~/app/_components/format";

/** Presentation helpers specific to the student screens. */

const GRADE_NAMES: Record<number, string> = {
  9: "Freshman",
  10: "Sophomore",
  11: "Junior",
  12: "Senior",
};

export function gradeLevelName(gradeLevel: number): string {
  return GRADE_NAMES[gradeLevel] ?? `Grade ${gradeLevel}`;
}

/** Video position, e.g. 1452 → "24:12". */
export function mmss(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** Compact duration, e.g. "18m" or "1h 05m". */
export function shortDuration(totalSeconds: number): string {
  const minutes = Math.ceil(totalSeconds / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}

/** Scores and points without a trailing ".0". */
export function points(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/** "Oct 24" */
export function shortDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** "Dr. Aris Chen" */
export function teacherFullName(user: {
  title: string | null;
  name: string | null;
}): string {
  return [user.title, user.name].filter(Boolean).join(" ") || "Staff";
}

/** "Dr. Chen" */
export function teacherShortName(user: {
  title: string | null;
  name: string | null;
}): string {
  const surname = user.name?.split(" ").slice(-1)[0];
  return [user.title, surname].filter(Boolean).join(" ") || "Staff";
}

/** Whole calendar days from `from` to `to`, ignoring the time of day. */
export function daysBetween(from: Date, to: Date): number {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

export type DueUrgency = "overdue" | "today" | "tomorrow" | "later";

export function dueUrgency(dueAt: Date, now: Date): DueUrgency {
  if (dueAt < now) return "overdue";
  const days = daysBetween(now, dueAt);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return "later";
}

/** Relative due date — "Today 11:59 PM", "Tomorrow", "Friday", "Oct 28". */
export function dueLabel(dueAt: Date, now: Date): string {
  const urgency = dueUrgency(dueAt, now);
  if (urgency === "overdue") return "Overdue";
  if (urgency === "today") return `Today ${clockOf(dueAt)}`;
  if (urgency === "tomorrow") return "Tomorrow";
  if (daysBetween(now, dueAt) < 7) return weekdayName(dueAt);
  return shortDate(dueAt);
}

type CourseTone = { bar: string; text: string; badge: string };

/** Static class names per `Course.colorToken`, so Tailwind can see them. */
const COURSE_TONES: Record<string, CourseTone> = {
  emerald: {
    bar: "bg-teal-600",
    text: "text-teal-700",
    badge: "bg-teal-50 text-teal-700",
  },
  orange: {
    bar: "bg-orange-600",
    text: "text-orange-700",
    badge: "bg-orange-50 text-orange-700",
  },
  amber: {
    bar: "bg-amber-500",
    text: "text-amber-700",
    badge: "bg-amber-50 text-amber-700",
  },
  indigo: {
    bar: "bg-navy",
    text: "text-navy",
    badge: "bg-indigo-50 text-indigo-700",
  },
  blue: {
    bar: "bg-brand",
    text: "text-brand",
    badge: "bg-brand-soft text-brand",
  },
};

export function courseTone(token: string | null | undefined): CourseTone {
  return COURSE_TONES[token ?? ""] ?? COURSE_TONES.blue!;
}
