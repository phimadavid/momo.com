import Link from "next/link";

import { humanise } from "~/app/_components/format";
import {
  CheckIcon,
  ClipboardIcon,
  ListIcon,
  LockIcon,
  PlayFillIcon,
} from "~/app/_components/icons";
import { Card, CardHeader, Pill } from "~/app/_components/ui";
import {
  daysBetween,
  dueLabel,
  dueUrgency,
  mmss,
  points,
  shortDate,
} from "~/app/student/_components/format";
import type { RouterOutputs } from "~/trpc/react";

type Lesson = RouterOutputs["lesson"]["get"];
type PlanLesson = Lesson["unit"]["lessons"][number];
type Work = RouterOutputs["assignment"]["listForSection"][number];

/** Syllabus progress for the unit, then every lesson and graded item in it. */
export function UnitPlan({
  lesson,
  unitWork,
  now,
}: {
  lesson: Lesson;
  unitWork: Work[];
  now: Date;
}) {
  const { unit } = lesson;
  const lessons = unit.lessons;
  const done = lessons.filter(
    (item) => item.myProgress?.status === "COMPLETED",
  ).length;
  const percent =
    lessons.length > 0 ? Math.round((done / lessons.length) * 100) : 0;
  const examIn = unit.examDate ? daysBetween(now, unit.examDate) : null;

  return (
    <>
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-muted text-[11px] font-bold tracking-wide uppercase">
              Course Syllabus
            </p>
            <h2 className="text-navy mt-1 text-lg leading-snug font-bold">
              {unit.title}
            </h2>
          </div>
          <Pill tone="blue" className="shrink-0">
            {percent}% Complete
          </Pill>
        </div>
        <div
          role="progressbar"
          aria-label="Unit progress"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          className="bg-brand-soft mt-4 h-2 overflow-hidden rounded-full"
        >
          <div
            className="bg-brand h-full rounded-full"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="text-muted mt-2 flex flex-wrap justify-between gap-2 text-[11px] font-semibold">
          <span>
            {done} of {lessons.length} Lessons Done
          </span>
          {unit.examDate && examIn !== null && examIn >= 0 && (
            <span>
              Exam{" "}
              {examIn === 0
                ? "today"
                : `in ${examIn} Day${examIn === 1 ? "" : "s"}`}{" "}
              ({shortDate(unit.examDate)})
            </span>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader
          icon={<ListIcon className="size-4" />}
          title="Unit Lesson Plan"
          action={
            <span className="text-muted text-[11px] font-semibold">
              {unit.course.name}
            </span>
          }
        />
        <ol className="divide-line divide-y">
          {lessons.map((item) => (
            <PlanLessonRow
              key={item.id}
              item={item}
              lesson={lesson}
              lessons={lessons}
            />
          ))}
          {unitWork.map((work, index) => (
            <PlanWorkRow
              key={work.id}
              work={work}
              number={`${unit.order}.${lessons.length + index + 1}`}
              now={now}
            />
          ))}
        </ol>
      </Card>
    </>
  );
}

function PlanLessonRow({
  item,
  lesson,
  lessons,
}: {
  item: PlanLesson;
  lesson: Lesson;
  lessons: PlanLesson[];
}) {
  const isCurrent = item.id === lesson.id;
  const status = item.myProgress?.status;
  const completed = status === "COMPLETED";
  const prerequisite = item.prerequisiteId
    ? lessons.find((other) => other.id === item.prerequisiteId)
    : undefined;
  const locked =
    !completed &&
    prerequisite !== undefined &&
    prerequisite.myProgress?.status !== "COMPLETED";

  const meta = [`${item.estimatedMinutes} min`];
  if (isCurrent && item.myProgress && lesson.videoDurationSeconds) {
    meta.push(
      `${mmss(item.myProgress.positionSeconds)} / ${mmss(lesson.videoDurationSeconds)}`,
    );
  } else if (locked && prerequisite) {
    meta.push(
      `Prerequisite: ${lesson.unit.order}.${prerequisite.order} Completion`,
    );
  } else if (status === "IN_PROGRESS" && item.myProgress) {
    meta.push(`${Math.round(item.myProgress.percentComplete)}% watched`);
  }

  const body = (
    <div className="flex gap-3">
      <span
        className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${
          completed
            ? "bg-teal-50 text-teal-600"
            : isCurrent
              ? "bg-navy text-white"
              : locked
                ? "bg-canvas text-muted"
                : "bg-brand-soft text-brand"
        }`}
      >
        {completed ? (
          <CheckIcon className="size-4" />
        ) : locked ? (
          <LockIcon className="size-4" />
        ) : (
          <PlayFillIcon className="ml-0.5 size-3.5" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={`text-sm font-bold ${locked ? "text-muted" : isCurrent ? "text-navy" : "text-ink"}`}
          >
            {lesson.unit.order}.{item.order} {item.title}
          </p>
          <span
            className={`shrink-0 text-[11px] font-bold ${
              completed
                ? "text-teal-600"
                : isCurrent
                  ? "text-brand"
                  : "text-muted"
            }`}
          >
            {completed
              ? "Completed"
              : isCurrent
                ? "● Current"
                : locked
                  ? "Locked"
                  : status === "IN_PROGRESS"
                    ? "In Progress"
                    : "Not Started"}
          </span>
        </div>
        {item.summary && (
          <p className="text-muted mt-0.5 text-xs">{item.summary}</p>
        )}
        <p className="text-muted mt-1.5 text-[11px]">{meta.join(" • ")}</p>
      </div>
    </div>
  );

  return (
    <li
      className={isCurrent ? "border-brand bg-brand-soft/50 border-l-4" : ""}
      aria-current={isCurrent ? "step" : undefined}
    >
      {isCurrent ? (
        <div className="px-5 py-4">{body}</div>
      ) : (
        <Link
          href={`/student/courses?lesson=${item.id}`}
          className="hover:bg-canvas block px-5 py-4 transition"
        >
          {body}
        </Link>
      )}
    </li>
  );
}

function PlanWorkRow({
  work,
  number,
  now,
}: {
  work: Work;
  number: string;
  now: Date;
}) {
  const mine = work.submissions[0];
  const released = mine?.grade?.status === "RELEASED" ? mine.grade : null;
  const turnedIn =
    mine !== undefined &&
    ["SUBMITTED", "GRADED", "RETURNED", "EXCUSED"].includes(mine.status);
  const urgency = dueUrgency(work.dueAt, now);

  return (
    <li className="flex gap-3 px-5 py-4">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
        <ClipboardIcon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-ink text-sm font-bold">
            {number} {work.title}
          </p>
          {released ? (
            <Pill tone="green" className="shrink-0">
              {points(released.score ?? 0)}/{points(work.pointsPossible)}
            </Pill>
          ) : turnedIn ? (
            <Pill tone="green" className="shrink-0">
              Submitted
            </Pill>
          ) : (
            <Pill
              tone={
                urgency === "overdue"
                  ? "rose"
                  : urgency === "later"
                    ? "slate"
                    : "amber"
              }
              className="shrink-0"
            >
              {urgency === "overdue"
                ? "Overdue"
                : `Due ${dueLabel(work.dueAt, now)}`}
            </Pill>
          )}
        </div>
        <p className="text-muted mt-0.5 text-xs">
          {humanise(work.type)}
          {work.category && ` • ${work.category.name}`}
        </p>
        <p className="text-muted mt-1.5 text-[11px]">
          Worth {points(work.pointsPossible)} pts
        </p>
      </div>
    </li>
  );
}
