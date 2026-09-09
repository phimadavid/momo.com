import type { DayOfWeek } from "../../../generated/prisma";

const DAYS: DayOfWeek[] = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

export function dayOfWeekOf(date: Date): DayOfWeek {
  return DAYS[date.getDay()]!;
}

/**
 * Normalises to a UTC midnight timestamp, matching how `@db.Date` columns
 * (attendance sessions, office-hour bookings) round-trip through Prisma.
 */
export function toDateOnly(date: Date): Date {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
}

export function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function endOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** 1-based week number of `date` within the term, clamped to the term length. */
export function weekOfTerm(termStart: Date, date: Date): number {
  const ms = startOfDay(date).getTime() - startOfDay(termStart).getTime();
  return Math.max(1, Math.floor(ms / (7 * 24 * 60 * 60 * 1000)) + 1);
}

/** True when the date falls on an odd-numbered day of the term rotation. */
export function isOddRotationDay(termStart: Date, date: Date): boolean {
  const ms = startOfDay(date).getTime() - startOfDay(termStart).getTime();
  const dayIndex = Math.floor(ms / (24 * 60 * 60 * 1000));
  return dayIndex % 2 === 0;
}

/** Parses "HH:mm" against a date, producing an absolute timestamp. */
export function atTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const copy = new Date(date);
  copy.setHours(hours ?? 0, minutes ?? 0, 0, 0);
  return copy;
}
