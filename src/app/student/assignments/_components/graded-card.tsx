import { ChatIcon, StarIcon } from "~/app/_components/icons";
import {
  courseTone,
  points,
  shortDate,
  teacherFullName,
} from "~/app/student/_components/format";
import { starsFor } from "~/server/lib/stars";
import type { MyAssignment } from "./shared";

/** A completed assignment: final score, stars earned and teacher feedback. */
export function GradedCard({ assignment }: { assignment: MyAssignment }) {
  const tone = courseTone(assignment.section.course.colorToken);
  const grade = assignment.submission?.grade ?? null;
  const excused = assignment.submission?.status === "EXCUSED";
  const score = grade?.score ?? 0;
  const percent =
    grade && assignment.pointsPossible > 0
      ? Math.round((score / assignment.pointsPossible) * 100)
      : null;
  const stars = grade ? starsFor(score) : 0;

  return (
    <article className="border-line bg-surface shadow-card flex flex-col rounded-2xl border p-5">
      <div className="flex items-center justify-between gap-2">
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${tone.badge}`}
        >
          {assignment.section.course.name}
        </span>
        {stars > 0 && (
          <span className="inline-flex items-center gap-1 text-sm font-bold text-orange-600">
            <StarIcon className="size-4" />+{stars} Stars
          </span>
        )}
      </div>

      <h3 className="text-ink mt-3 text-base leading-snug font-bold">
        {assignment.title}
      </h3>
      <p className="text-muted mt-1 text-xs">
        Instructor: {teacherFullName(assignment.section.teacher.user)}
      </p>

      <div className="border-line mt-4 flex items-end justify-between gap-3 border-t pt-4">
        <span className="text-muted text-xs font-semibold">Final Score</span>
        {excused ? (
          <span className="text-muted text-sm font-bold">Excused</span>
        ) : (
          <span className="text-navy text-3xl font-extrabold tracking-tight">
            {points(score)} / {points(assignment.pointsPossible)}
            {percent !== null && (
              <span className="text-muted ml-1 text-xs font-semibold">
                ({percent}%)
              </span>
            )}
          </span>
        )}
      </div>

      {grade?.feedback && (
        <blockquote className="bg-brand-soft/60 text-ink mt-4 flex gap-2 rounded-xl px-4 py-3 text-sm">
          <ChatIcon className="text-brand mt-0.5 size-4 shrink-0" />
          <span className="italic">“{grade.feedback}”</span>
        </blockquote>
      )}
      {grade?.releasedAt && (
        <p className="text-muted mt-auto pt-3 text-[11px]">
          Released {shortDate(grade.releasedAt)}
          {grade.letter && ` • ${grade.letter}`}
        </p>
      )}
    </article>
  );
}
