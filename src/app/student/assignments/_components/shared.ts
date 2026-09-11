import { clockOf, fileSize, weekdayName } from "~/app/_components/format";
import {
  daysBetween,
  dueLabel,
  points,
  shortDate,
} from "~/app/student/_components/format";
import { starsAvailable } from "~/server/lib/stars";
import type { RouterOutputs } from "~/trpc/react";
import type { PanelTask } from "./submit-panel";

export type MyAssignment = RouterOutputs["assignment"]["mine"][number];

/** Formats a student hands in from this page rather than in class or a quiz. */
export const ONLINE_FORMATS: ReadonlySet<MyAssignment["format"]> = new Set([
  "FILE_UPLOAD",
  "TEXT_ENTRY",
  "EXTERNAL_LINK",
]);

function dayName(date: Date, now: Date): string {
  const days = daysBetween(now, date);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days > 1 && days < 7) return weekdayName(date);
  return shortDate(date);
}

/** "Due in 14 hours (Tomorrow, 11:59 PM)" / "Due in 3 days (Friday, 03:30 PM)" */
export function dueDescription(dueAt: Date, now: Date): string {
  const time = clockOf(dueAt);
  const ms = dueAt.getTime() - now.getTime();
  if (ms < 0) {
    return `Overdue — was due ${dayName(dueAt, now).toLowerCase() === "today" ? "today" : shortDate(dueAt)} at ${time}`;
  }
  const hours = Math.max(1, Math.round(ms / 3_600_000));
  if (hours < 24) {
    return `Due in ${hours} hour${hours === 1 ? "" : "s"} (${dayName(dueAt, now)}, ${time})`;
  }
  const days = Math.max(1, daysBetween(now, dueAt));
  return `Due in ${days} day${days === 1 ? "" : "s"} (${dayName(dueAt, now)}, ${time})`;
}

function instructionsFor(assignment: MyAssignment, now: Date): string[] {
  const lines: string[] = [];
  if (assignment.format === "FILE_UPLOAD") {
    lines.push(
      "Attach your work as one or more files — PDF, Word, PowerPoint, Excel, CSV, text or images.",
    );
  } else if (assignment.format === "TEXT_ENTRY") {
    lines.push(
      "Type your response below. You can save a draft and come back to it.",
    );
  } else if (assignment.format === "EXTERNAL_LINK") {
    lines.push(
      "Paste a link to your work and make sure your teacher can open it.",
    );
  }
  if (assignment.rubric) {
    lines.push(
      `Graded against the ${assignment.rubric.title} (${points(assignment.rubric.totalPoints)} pts).`,
    );
  }
  if (!assignment.allowLate) {
    lines.push("Late work is not accepted.");
  } else if (assignment.dueAt < now) {
    lines.push("It is past the due date, so this will be marked late.");
  }
  if (assignment.closesAt) {
    lines.push(
      `Submissions close ${shortDate(assignment.closesAt)} at ${clockOf(assignment.closesAt)}.`,
    );
  }
  return lines;
}

/** Everything the client-side submit panel needs, with dates pre-formatted. */
export function toPanelTask(assignment: MyAssignment, now: Date): PanelTask {
  const draft =
    assignment.submission?.status === "DRAFT" ? assignment.submission : null;

  return {
    id: assignment.id,
    title: assignment.title,
    courseName: assignment.section.course.name,
    dueText:
      assignment.dueAt < now
        ? "Overdue"
        : `Due ${dueLabel(assignment.dueAt, now)}`,
    format: assignment.format,
    stars: starsAvailable(assignment),
    description: assignment.description,
    instructions: instructionsFor(assignment, now),
    rubric:
      assignment.rubric?.criteria.map((criterion) => ({
        id: criterion.id,
        title: criterion.title,
      })) ?? [],
    submissionId: assignment.submission?.id ?? null,
    attachments:
      draft?.attachments.map(({ file }) => ({
        id: file.id,
        fileName: file.fileName,
        url: file.url,
        sizeLabel: fileSize(file.sizeBytes),
      })) ?? [],
    textBody: draft?.textBody ?? "",
    externalUrl: draft?.externalUrl ?? "",
  };
}
