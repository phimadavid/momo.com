import { type Metadata } from "next";

import {
  AlertIcon,
  CalendarIcon,
  ClipboardIcon,
  ClockIcon,
  PlusCircleIcon,
} from "~/app/_components/icons";
import { api } from "~/trpc/server";
import { clock, longDate } from "../_components/format";
import { PageHeader } from "../_components/page-header";
import { Card, CardHeader, EmptyState, Pill } from "../_components/ui";

export const metadata: Metadata = { title: "Calendar · Momo Smart" };
export const dynamic = "force-dynamic";

const HORIZON_DAYS = 30;

type Entry = {
  id: string;
  title: string;
  detail: string | null;
  at: Date;
  kind:
    | "CLASS"
    | "EXAM"
    | "ASSIGNMENT_DUE"
    | "OFFICE_HOURS"
    | "SCHOOL_EVENT"
    | "ADMIN_DEADLINE";
};

const KIND_STYLE: Record<
  Entry["kind"],
  {
    label: string;
    tone: "blue" | "green" | "amber" | "rose" | "slate" | "violet";
  }
> = {
  CLASS: { label: "Class", tone: "blue" },
  EXAM: { label: "Exam", tone: "violet" },
  ASSIGNMENT_DUE: { label: "Due", tone: "amber" },
  OFFICE_HOURS: { label: "Office hours", tone: "green" },
  SCHOOL_EVENT: { label: "School", tone: "slate" },
  ADMIN_DEADLINE: { label: "Deadline", tone: "rose" },
};

const dayKey = (date: Date) => date.toDateString();

export default async function CalendarPage() {
  const now = new Date();
  const horizon = new Date(now.getTime() + HORIZON_DAYS * 24 * 60 * 60 * 1000);

  const [agenda, timetable] = await Promise.all([
    api.calendar.agenda({ from: now, to: horizon }),
    api.calendar.timetable({ date: now }),
  ]);

  const entries: Entry[] = [
    ...agenda.events.map((event) => ({
      id: event.id,
      title: event.title,
      detail:
        [
          event.section &&
            `${event.section.course.name} — ${event.section.code}`,
          event.location,
        ]
          .filter(Boolean)
          .join(" • ") || event.description,
      at: event.startAt,
      kind: event.type,
    })),
    ...agenda.deadlines.map((deadline) => ({
      id: `due-${deadline.id}`,
      title: deadline.title,
      detail: `${deadline.section.course.name} — ${deadline.section.code} • ${deadline.pointsPossible} pts`,
      at: deadline.dueAt,
      kind: "ASSIGNMENT_DUE" as const,
    })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime());

  // Group into day buckets for the agenda rail.
  const days = new Map<string, Entry[]>();
  for (const entry of entries) {
    const key = dayKey(entry.at);
    days.set(key, [...(days.get(key) ?? []), entry]);
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        title="Calendar"
        subtitle={`${entries.length} item${entries.length === 1 ? "" : "s"} scheduled over the next ${HORIZON_DAYS} days.`}
        action={
          <button
            type="button"
            className="bg-navy hover:bg-navy-deep inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition"
          >
            <PlusCircleIcon className="size-4" />
            New Event
          </button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader
            icon={<CalendarIcon className="size-[18px]" />}
            title="Upcoming agenda"
            subtitle="Exams, deadlines and school events across your sections"
          />

          {days.size === 0 ? (
            <EmptyState>Nothing scheduled in the next 30 days.</EmptyState>
          ) : (
            <div className="divide-line divide-y">
              {[...days.entries()].map(([key, dayEntries]) => {
                const date = dayEntries[0]!.at;
                const isToday = dayKey(now) === key;

                return (
                  <div key={key} className="flex gap-4 px-5 py-4">
                    <div className="w-24 shrink-0">
                      <p
                        className={`text-xs font-bold ${isToday ? "text-brand" : "text-ink"}`}
                      >
                        {isToday ? "Today" : longDate(date).split(",")[0]}
                      </p>
                      <p className="text-muted text-xs">
                        {date.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>

                    <ul className="min-w-0 flex-1 space-y-2">
                      {dayEntries.map((entry) => {
                        const style = KIND_STYLE[entry.kind];
                        return (
                          <li
                            key={entry.id}
                            className="border-line bg-canvas flex items-start justify-between gap-3 rounded-xl border px-3.5 py-2.5"
                          >
                            <div className="min-w-0">
                              <p className="text-ink truncate text-sm font-semibold">
                                {entry.title}
                              </p>
                              {entry.detail && (
                                <p className="text-muted mt-0.5 truncate text-xs">
                                  {entry.detail}
                                </p>
                              )}
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <span className="text-muted text-xs font-semibold whitespace-nowrap">
                                {entry.at.toLocaleTimeString("en-US", {
                                  hour: "numeric",
                                  minute: "2-digit",
                                })}
                              </span>
                              <Pill tone={style.tone}>{style.label}</Pill>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader
              icon={<ClockIcon className="size-[18px]" />}
              title="Today's timetable"
              subtitle={longDate(now)}
            />
            {timetable.length === 0 ? (
              <EmptyState>No classes meet today.</EmptyState>
            ) : (
              <ul className="divide-line divide-y">
                {timetable.map((meeting) => (
                  <li
                    key={meeting.id}
                    className="flex items-start gap-3 px-5 py-3.5"
                  >
                    <span className="bg-brand-soft text-brand mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-extrabold">
                      {meeting.section.period}
                    </span>
                    <div className="min-w-0">
                      <p className="text-ink truncate text-sm font-bold">
                        {meeting.section.course.name}
                      </p>
                      <p className="text-muted mt-0.5 text-xs">
                        {clock(meeting.startTime)} – {clock(meeting.endTime)}
                        {(meeting.room ?? meeting.section.room) &&
                          ` • ${meeting.room ?? meeting.section.room}`}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader
              icon={<AlertIcon className="size-[18px]" />}
              title="Deadlines"
              subtitle="Administrative items needing your submission"
            />
            {(() => {
              const admin = entries.filter(
                (entry) => entry.kind === "ADMIN_DEADLINE",
              );
              return admin.length === 0 ? (
                <EmptyState>No administrative deadlines.</EmptyState>
              ) : (
                <ul className="divide-line divide-y">
                  {admin.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex items-start gap-3 px-5 py-3.5"
                    >
                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                        <ClipboardIcon className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-ink text-sm font-bold">
                          {entry.title}
                        </p>
                        <p className="text-muted mt-0.5 text-xs">
                          {entry.at.toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "short",
                            day: "numeric",
                          })}
                          ,{" "}
                          {entry.at.toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              );
            })()}
          </Card>
        </div>
      </div>
    </div>
  );
}
