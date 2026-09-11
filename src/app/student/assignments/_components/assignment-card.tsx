import Link from "next/link";

import { timeAgo } from "~/app/_components/format";
import { ArrowRightIcon, ClockIcon, StarIcon } from "~/app/_components/icons";
import { Pill } from "~/app/_components/ui";
import {
  courseTone,
  dueUrgency,
  points,
  shortDate,
  type DueUrgency,
} from "~/app/student/_components/format";
import { starsAvailable } from "~/server/lib/stars";
import { dueDescription, ONLINE_FORMATS, type MyAssignment } from "./shared";

type Status = { label: string; text: string; dot: string };

function statusOf(assignment: MyAssignment, urgency: DueUrgency): Status {
  const submission = assignment.submission;

  if (assignment.bucket === "SUBMITTED" && submission) {
    const timing =
      submission.timeliness === "LATE"
        ? " (late)"
        : submission.timeliness === "GRACE_PERIOD"
          ? " (grace period)"
          : "";
    return {
      label: `Submitted ${submission.submittedAt ? shortDate(submission.submittedAt) : ""}${timing} — awaiting grade`,
      text: "text-emerald-700",
      dot: "bg-emerald-500",
    };
  }

  switch (submission?.status) {
    case "DRAFT":
      return {
        label: `In Progress (draft saved ${timeAgo(submission.updatedAt)})`,
        text: "text-amber-700",
        dot: "bg-amber-500",
      };
    case "RETURNED":
      return {
        label: "Returned for revision",
        text: "text-amber-700",
        dot: "bg-amber-500",
      };
    case "MISSING":
      return { label: "Missing", text: "text-rose-700", dot: "bg-rose-500" };
  }

  return urgency === "overdue" || urgency === "today"
    ? { label: "Not Submitted", text: "text-rose-700", dot: "bg-rose-500" }
    : { label: "Not Started", text: "text-muted", dot: "bg-slate-400" };
}

/** A to-do or submitted assignment in the main list. */
export function AssignmentCard({
  assignment,
  now,
  selected = false,
}: {
  assignment: MyAssignment;
  now: Date;
  selected?: boolean;
}) {
  const tone = courseTone(assignment.section.course.colorToken);
  const urgency = dueUrgency(assignment.dueAt, now);
  const status = statusOf(assignment, urgency);
  const stars = starsAvailable(assignment);
  const isTodo = assignment.bucket === "TODO";
  const hasDraft = assignment.submission?.status === "DRAFT";
  const attached = hasDraft
    ? (assignment.submission?.attachments.length ?? 0)
    : 0;
  const criteria = assignment.rubric?.criteria ?? [];

  return (
    <article
      className={`border-line bg-surface shadow-card relative overflow-hidden rounded-2xl border ${
        selected ? "ring-brand/40 ring-2" : ""
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-x-0 top-0 h-1.5 ${tone.bar}`}
      />
      <div className="p-5 pt-6">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${tone.badge}`}
          >
            {assignment.section.course.name}
          </span>
          {isTodo && (
            <Pill
              tone={
                urgency === "overdue"
                  ? "rose"
                  : urgency === "later"
                    ? "slate"
                    : "amber"
              }
            >
              <ClockIcon className="size-3.5" />
              {dueDescription(assignment.dueAt, now)}
            </Pill>
          )}
        </div>

        <h3 className="text-ink mt-3 text-lg leading-snug font-bold">
          {assignment.title}
        </h3>
        <p className="text-navy mt-2 inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-1.5 text-sm font-semibold">
          <StarIcon className="size-4 text-orange-500" />
          {points(assignment.pointsPossible)} Pts
          {stars > 0 && ` • ${stars} Stars`}
        </p>
        {assignment.description && (
          <p className="text-muted mt-3 text-sm leading-relaxed">
            {assignment.description}
          </p>
        )}
        {attached > 0 && (
          <p className="text-muted mt-2 text-xs">
            {attached} file{attached === 1 ? "" : "s"} attached to your draft
          </p>
        )}
      </div>

      <div className="border-line flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4">
        <p
          className={`inline-flex items-center gap-2 text-sm font-medium ${status.text}`}
        >
          <span className={`size-2 shrink-0 rounded-full ${status.dot}`} />
          Status: {status.label}
        </p>
        {isTodo &&
          (ONLINE_FORMATS.has(assignment.format) ? (
            <Link
              href={`/student/assignments?assignment=${assignment.id}#submit`}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                hasDraft
                  ? "border-line text-ink hover:bg-canvas border"
                  : "bg-navy hover:bg-navy-deep text-white"
              }`}
            >
              {hasDraft ? "Continue Working" : "Start Submission"}
              <ArrowRightIcon className="size-4" />
            </Link>
          ) : (
            <span className="text-muted text-xs">
              {assignment.format === "ONLINE_ASSESSMENT"
                ? "Taken as a timed online quiz"
                : "Handed in during class"}
            </span>
          ))}
      </div>

      {criteria.length > 0 && (
        <details className="border-line border-t">
          <summary className="text-brand hover:bg-canvas flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
            View Rubric
            <span className="text-muted text-xs font-normal">
              {criteria.length} criteria •{" "}
              {points(assignment.rubric?.totalPoints ?? 0)} pts
            </span>
          </summary>
          <ul className="space-y-2.5 px-5 pb-4">
            {criteria.map((criterion) => (
              <li
                key={criterion.id}
                className="flex justify-between gap-3 text-sm"
              >
                <span>
                  <span className="text-ink font-semibold">
                    {criterion.title}
                  </span>
                  {criterion.description && (
                    <span className="text-muted block text-xs">
                      {criterion.description}
                    </span>
                  )}
                </span>
                <span className="text-muted shrink-0 text-xs font-semibold">
                  {points(criterion.maxPoints)} pts
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </article>
  );
}
