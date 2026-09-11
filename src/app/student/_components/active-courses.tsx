import Link from "next/link";

import { CalendarIcon, ChevronRightIcon } from "~/app/_components/icons";
import type { RouterOutputs } from "~/trpc/react";
import { courseTone, dueLabel, dueUrgency } from "./format";

type Section = RouterOutputs["course"]["mySections"][number];
type DueItem = RouterOutputs["assignment"]["dueSoon"][number];

export function ActiveCourses({
  sections,
  dueSoon,
}: {
  sections: Section[];
  dueSoon: DueItem[];
}) {
  const now = new Date();

  return (
    <section>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-ink text-xl font-extrabold tracking-tight">
            Active Courses
          </h2>
          <p className="text-muted mt-0.5 text-xs">
            {sections.length} active enrolled course
            {sections.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link
          href="/student/courses"
          className="text-brand inline-flex items-center gap-1 text-sm font-bold hover:underline"
        >
          View All
          <ChevronRightIcon className="size-4" />
        </Link>
      </div>

      {sections.length === 0 ? (
        <p className="border-line bg-surface text-muted mt-4 rounded-2xl border px-5 py-8 text-center text-sm">
          You are not enrolled in any sections this term.
        </p>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {sections.map((section) => {
            const tone = courseTone(section.course.colorToken);
            const grade = section.myGrade;
            const syllabus = Math.round(grade?.syllabusPercent ?? 0);
            // dueSoon is ordered by due date, so the first match is the next.
            const next = dueSoon.find((item) => item.section.id === section.id);
            const surname = section.teacher.user.name?.split(" ").slice(-1)[0];
            const teacher = [section.teacher.user.title, surname]
              .filter(Boolean)
              .join(" ");

            return (
              <article
                key={section.id}
                className="border-line bg-surface shadow-card relative overflow-hidden rounded-2xl border"
              >
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-0 top-0 h-1 ${tone.bar}`}
                />
                <div className="p-4 pt-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p
                        className={`text-[10px] font-bold tracking-wide uppercase ${tone.text}`}
                      >
                        {section.course.department.name}
                      </p>
                      <h3 className="text-ink mt-1 truncate text-lg font-bold">
                        {section.course.name}
                      </h3>
                      <p className="text-muted mt-0.5 text-xs">
                        {teacher || "Staff"} • Period {section.period}
                        {section.room && ` (${section.room})`}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`text-xl font-extrabold ${tone.text}`}>
                        {grade?.currentPercent == null
                          ? "—"
                          : `${Math.round(grade.currentPercent)}%`}
                      </p>
                      {grade?.currentLetter && (
                        <span
                          className={`mt-1 inline-block rounded-md px-2 py-0.5 text-[11px] font-bold ${tone.badge}`}
                        >
                          {grade.currentLetter}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-[11px]">
                    <span className="text-muted font-semibold">
                      Term Syllabus
                    </span>
                    <span className="text-muted">{syllabus}%</span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label={`${section.course.name} syllabus progress`}
                    aria-valuenow={syllabus}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="bg-canvas mt-1.5 h-1.5 overflow-hidden rounded-full"
                  >
                    <div
                      className={`h-full rounded-full ${tone.bar}`}
                      style={{ width: `${syllabus}%` }}
                    />
                  </div>
                </div>

                <div className="border-line bg-canvas/60 flex items-center justify-between gap-3 border-t px-4 py-2.5 text-xs">
                  {next ? (
                    <>
                      <span className="text-muted inline-flex min-w-0 items-center gap-1.5">
                        <CalendarIcon className="size-3.5 shrink-0" />
                        <span className="truncate">{next.title}</span>
                      </span>
                      <span
                        className={`shrink-0 font-semibold ${
                          dueUrgency(next.dueAt, now) === "later"
                            ? "text-ink"
                            : "text-rose-600"
                        }`}
                      >
                        {dueLabel(next.dueAt, now)}
                      </span>
                    </>
                  ) : (
                    <span className="text-muted">No upcoming work</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
