import { type Metadata } from "next";
import Link from "next/link";

import {
  ArrowRightIcon,
  CapIcon,
  ClockIcon,
  UsersIcon,
} from "~/app/_components/icons";
import { api } from "~/trpc/server";
import { clock } from "~/app/_components/format";
import { PageHeader } from "../_components/page-header";
import { Card, EmptyState, Pill } from "~/app/_components/ui";

export const metadata: Metadata = { title: "Courses · Momo Smart" };
export const dynamic = "force-dynamic";

const DAY_SHORT: Record<string, string> = {
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
  FRIDAY: "Fri",
  SATURDAY: "Sat",
  SUNDAY: "Sun",
};

const LEVEL_TONE = {
  AP: "violet",
  IB: "violet",
  HONORS: "amber",
  REGULAR: "slate",
  ELECTIVE: "slate",
} as const;

export default async function CoursesPage() {
  const [sections, performance] = await Promise.all([
    api.course.mySections(),
    api.dashboard.sectionPerformance(),
  ]);

  // Performance is keyed by section, so fold it onto the roster listing.
  const stats = new Map(performance.map((row) => [row.sectionId, row]));
  const totalStudents = sections.reduce((sum, s) => sum + s.studentCount, 0);
  const courses = new Set(sections.map((s) => s.course.id));

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        title="Courses"
        subtitle={`${sections.length} section${sections.length === 1 ? "" : "s"} across ${courses.size} course${courses.size === 1 ? "" : "s"} • ${totalStudents} enrolled students this term.`}
      />

      {sections.length === 0 ? (
        <Card>
          <EmptyState>No sections are assigned to you this term.</EmptyState>
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {sections.map((section) => {
            const stat = stats.get(section.id);
            const level = section.course.level;

            return (
              <Card key={section.id} className="flex flex-col overflow-hidden">
                <div className="bg-navy-deep relative overflow-hidden px-5 py-5">
                  <div
                    aria-hidden="true"
                    className="bg-brand/30 absolute -top-16 -right-10 size-40 rounded-full blur-2xl"
                  />
                  <div className="relative flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold tracking-[0.14em] text-white/60 uppercase">
                        {section.course.code} • {section.code}
                      </p>
                      <h2 className="mt-1 truncate text-xl font-extrabold text-white">
                        {section.course.name}
                      </h2>
                      <p className="mt-1 text-xs text-white/60">
                        {section.course.department.name}
                      </p>
                    </div>
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
                      <CapIcon className="size-5" />
                    </span>
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-4 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill tone={LEVEL_TONE[level] ?? "slate"}>{level}</Pill>
                    <Pill tone="blue">Period {section.period}</Pill>
                    {section.room && <Pill tone="slate">{section.room}</Pill>}
                  </div>

                  <dl className="grid grid-cols-2 gap-3">
                    <div className="border-line bg-canvas rounded-xl border px-3 py-2.5">
                      <dt className="text-muted flex items-center gap-1 text-[11px] font-semibold">
                        <UsersIcon className="size-3.5" />
                        Enrolled
                      </dt>
                      <dd className="text-ink mt-0.5 text-xl font-extrabold">
                        {section.studentCount}
                        <span className="text-muted text-xs font-semibold">
                          {" "}
                          / {section.capacity}
                        </span>
                      </dd>
                    </div>
                    <div className="border-line bg-canvas rounded-xl border px-3 py-2.5">
                      <dt className="text-muted text-[11px] font-semibold">
                        Class average
                      </dt>
                      <dd className="text-ink mt-0.5 text-xl font-extrabold">
                        {stat?.classAverage === null ||
                        stat?.classAverage === undefined
                          ? "—"
                          : `${stat.classAverage}%`}
                      </dd>
                    </div>
                  </dl>

                  {section.meetings.length > 0 && (
                    <div>
                      <p className="text-muted text-[10px] font-bold tracking-wider uppercase">
                        Meets
                      </p>
                      <ul className="mt-1.5 space-y-1">
                        {section.meetings.map((meeting, index) => (
                          <li
                            key={`${meeting.dayOfWeek}-${meeting.startTime}-${index}`}
                            className="text-muted flex items-center gap-1.5 text-xs"
                          >
                            <ClockIcon className="size-3.5 shrink-0" />
                            {DAY_SHORT[meeting.dayOfWeek] ??
                              meeting.dayOfWeek}{" "}
                            {clock(meeting.startTime)} –{" "}
                            {clock(meeting.endTime)}
                            {meeting.room && ` • ${meeting.room}`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-auto">
                    <p className="text-muted truncate text-xs">
                      {stat?.currentUnit
                        ? `Now teaching: ${stat.currentUnit.title}`
                        : "No unit in progress"}
                    </p>
                    <div className="border-line mt-3 flex items-center justify-between gap-2 border-t pt-3">
                      <Link
                        href={`/teacher/grades?section=${section.id}`}
                        className="text-brand inline-flex items-center gap-1 text-xs font-bold hover:underline"
                      >
                        Open gradebook
                        <ArrowRightIcon className="size-3.5" />
                      </Link>
                      <Link
                        href={`/teacher/assignments?section=${section.id}`}
                        className="text-muted hover:text-ink text-xs font-semibold transition"
                      >
                        Assignments
                      </Link>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
