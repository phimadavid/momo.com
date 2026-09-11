import Link from "next/link";

import { humanise } from "~/app/_components/format";
import { LockIcon, TimerIcon } from "~/app/_components/icons";
import { Card, Pill } from "~/app/_components/ui";
import { teacherFullName } from "~/app/student/_components/format";
import type { RouterOutputs } from "~/trpc/react";
import { MarkComplete } from "./mark-complete";

type Lesson = RouterOutputs["lesson"]["get"];
type Section = RouterOutputs["course"]["mySections"][number];

const LEVEL_LABELS: Record<string, string> = {
  AP: "AP Curriculum",
  IB: "IB Curriculum",
  HONORS: "Honors Curriculum",
  REGULAR: "Standard Curriculum",
};

/** "Unit 4: Cellular Energetics" → "Cellular Energetics" */
export function unitName(title: string): string {
  return title.replace(/^unit\s+\d+\s*:\s*/i, "");
}

export function LessonHeader({
  lesson,
  section,
}: {
  lesson: Lesson;
  section: Section | null;
}) {
  const { unit } = lesson;
  const completed = lesson.myProgress?.status === "COMPLETED";

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone="blue" className="uppercase">
          Unit {unit.order} • {unitName(unit.title)}
        </Pill>
        <Pill tone="amber">
          <TimerIcon className="size-3.5" />
          Estimated: {lesson.estimatedMinutes} min
        </Pill>
        {section && (
          <Pill tone="slate">
            Period {section.period}
            {section.room && ` • ${section.room}`}
          </Pill>
        )}
      </div>

      <h1 className="text-ink mt-4 text-3xl leading-tight font-extrabold tracking-tight">
        Lesson {unit.order}.{lesson.order}: {lesson.title}
      </h1>
      <p className="text-muted mt-2 text-sm">
        {section && (
          <>
            Instructor:{" "}
            <span className="text-ink font-semibold">
              {teacherFullName(section.teacher.user)}
            </span>{" "}
            •{" "}
          </>
        )}
        {unit.course.department.name} •{" "}
        {LEVEL_LABELS[unit.course.level] ?? humanise(unit.course.level)}
      </p>

      <div className="mt-5">
        <MarkComplete
          lessonId={lesson.id}
          completed={completed}
          disabled={lesson.isLocked}
        />
      </div>
    </Card>
  );
}

/** Shown in place of the player and reading when a prerequisite is unmet. */
export function LockedLesson({ lesson }: { lesson: Lesson }) {
  const prerequisite = lesson.prerequisite;

  return (
    <Card className="flex flex-col items-center px-6 py-12 text-center">
      <span className="bg-canvas text-muted flex size-12 items-center justify-center rounded-full">
        <LockIcon className="size-6" />
      </span>
      <h2 className="text-ink mt-4 text-lg font-bold">This lesson is locked</h2>
      <p className="text-muted mt-1 max-w-md text-sm">
        {prerequisite
          ? `Complete Lesson ${lesson.unit.order}.${prerequisite.order}: ${prerequisite.title} to unlock the lecture and reading material.`
          : "Complete the previous lesson to unlock this one."}
      </p>
      {prerequisite && (
        <Link
          href={`/student/courses?lesson=${prerequisite.id}`}
          className="bg-navy hover:bg-navy-deep mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition"
        >
          Go to Lesson {lesson.unit.order}.{prerequisite.order}
        </Link>
      )}
    </Card>
  );
}
