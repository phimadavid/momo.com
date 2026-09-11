import Link from "next/link";

import {
  ArrowRightIcon,
  CheckCircleIcon,
  FileIcon,
  PlayIcon,
  TimerIcon,
} from "~/app/_components/icons";
import { Card, CardHeader, EmptyState, Pill } from "~/app/_components/ui";
import type { RouterOutputs } from "~/trpc/react";
import { mmss, shortDuration } from "./format";

type Resume = RouterOutputs["lesson"]["resumePoint"];

export function ContinueLesson({ resume }: { resume: Resume }) {
  if (!resume) {
    return (
      <Card>
        <CardHeader
          icon={<PlayIcon className="size-4" />}
          title="Continue where you left off"
        />
        <EmptyState>No lessons in progress — you are all caught up.</EmptyState>
      </Card>
    );
  }

  const { lesson } = resume;
  const percent = Math.round(resume.percentComplete);
  const resource = lesson.resources[0];
  // Some unit titles already carry their "Unit 4:" prefix.
  const unitLabel = /^unit\s+\d+/i.test(lesson.unit.title)
    ? lesson.unit.title
    : `Unit ${lesson.unit.order}: ${lesson.unit.title}`;

  return (
    <Card className="overflow-hidden">
      <div className="border-line bg-canvas/60 flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="bg-navy flex size-10 shrink-0 items-center justify-center rounded-xl text-white">
            <PlayIcon className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-brand text-[11px] font-bold tracking-wide uppercase">
              Continue where you left off
            </p>
            <h2 className="text-ink text-lg font-bold">
              {lesson.unit.course.name} — {unitLabel}
            </h2>
          </div>
        </div>
        {resume.remainingSeconds > 0 && (
          <Pill tone="blue">
            <TimerIcon className="size-3.5" />
            {shortDuration(resume.remainingSeconds)} remaining
          </Pill>
        )}
      </div>

      <div className="px-5 py-5">
        <p className="text-ink text-sm">
          Module {lesson.unit.order}.{lesson.order}: {lesson.title}{" "}
          <span className="text-muted">
            (Paused at {mmss(resume.positionSeconds)})
          </span>
        </p>

        <div className="mt-5 flex items-center justify-between text-xs">
          <span className="text-muted font-semibold">Progress</span>
          <span className="text-brand font-bold">{percent}% completed</span>
        </div>
        <div
          role="progressbar"
          aria-label="Lesson progress"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          className="bg-brand-soft mt-2 h-2 overflow-hidden rounded-full"
        >
          <div
            className="bg-brand h-full rounded-full"
            style={{ width: `${percent}%` }}
          />
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="text-muted flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircleIcon className="size-4" />
              {resume.unitLessonsCompleted} of {resume.unitLessonCount} lessons
              done
            </span>
            {resource && (
              <span className="inline-flex items-center gap-1.5">
                <FileIcon className="size-4" />
                {resource.title}
                {lesson._count.resources > 1 &&
                  ` +${lesson._count.resources - 1} more`}
              </span>
            )}
          </div>
          <Link
            href={`/student/courses?lesson=${lesson.id}`}
            className="bg-navy hover:bg-navy-deep inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition"
          >
            Resume
            <ArrowRightIcon className="size-4" />
          </Link>
        </div>
      </div>
    </Card>
  );
}
