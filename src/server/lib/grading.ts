import type {
  CourseLevel,
  PrismaClient,
  Timeliness,
} from "../../../generated/prisma";

/** Standard +/- cutoffs, highest first. */
const LETTER_CUTOFFS: Array<[number, string]> = [
  [97, "A+"],
  [93, "A"],
  [90, "A-"],
  [87, "B+"],
  [83, "B"],
  [80, "B-"],
  [77, "C+"],
  [73, "C"],
  [70, "C-"],
  [67, "D+"],
  [63, "D"],
  [60, "D-"],
];

export function letterFor(percent: number): string {
  for (const [cutoff, letter] of LETTER_CUTOFFS) {
    if (percent >= cutoff) return letter;
  }
  return "F";
}

/** Unweighted 4.0-scale points for a percentage. */
export function gradePoints(percent: number): number {
  if (percent >= 93) return 4;
  if (percent >= 90) return 3.7;
  if (percent >= 87) return 3.3;
  if (percent >= 83) return 3;
  if (percent >= 80) return 2.7;
  if (percent >= 77) return 2.3;
  if (percent >= 73) return 2;
  if (percent >= 70) return 1.7;
  if (percent >= 67) return 1.3;
  if (percent >= 63) return 1;
  if (percent >= 60) return 0.7;
  return 0;
}

/** Extra quality points awarded for accelerated coursework. */
export function levelBonus(level: CourseLevel): number {
  switch (level) {
    case "AP":
    case "IB":
      return 1;
    case "HONORS":
      return 0.5;
    default:
      return 0;
  }
}

export const round = (value: number, decimals = 1): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

/**
 * Classifies a submission against the assignment's due date and grace window.
 */
export function timelinessFor(
  assignment: { dueAt: Date; graceMinutes: number },
  submittedAt: Date,
): Timeliness {
  if (submittedAt <= assignment.dueAt) return "ON_TIME";
  const graceEnd = new Date(
    assignment.dueAt.getTime() + assignment.graceMinutes * 60_000,
  );
  return submittedAt <= graceEnd ? "GRACE_PERIOD" : "LATE";
}

/**
 * Weighted section grade for one student.
 *
 * Released grades are bucketed by grade category and averaged as
 * `earned / possible` per bucket, then combined by the category weights. Only
 * categories that actually have graded work contribute, and the weights are
 * renormalised so an unstarted category does not depress the running grade.
 * Sections without categories fall back to a flat points-based average.
 */
export async function computeSectionGrade(
  db: PrismaClient,
  sectionId: string,
  studentId: string,
): Promise<{ percent: number; letter: string; gradedCount: number } | null> {
  const grades = await db.grade.findMany({
    where: {
      status: "RELEASED",
      submission: {
        studentId,
        assignment: { sectionId },
      },
    },
    select: {
      score: true,
      submission: {
        select: {
          assignment: {
            select: {
              pointsPossible: true,
              categoryId: true,
              category: { select: { weightPercent: true } },
            },
          },
        },
      },
    },
  });

  if (grades.length === 0) return null;

  const buckets = new Map<
    string,
    { earned: number; possible: number; weight: number }
  >();

  for (const grade of grades) {
    const assignment = grade.submission.assignment;
    if (assignment.pointsPossible <= 0) continue;
    const key = assignment.categoryId ?? "__uncategorised__";
    const bucket = buckets.get(key) ?? {
      earned: 0,
      possible: 0,
      weight: assignment.category?.weightPercent ?? 0,
    };
    bucket.earned += grade.score ?? 0;
    bucket.possible += assignment.pointsPossible;
    buckets.set(key, bucket);
  }

  if (buckets.size === 0) return null;

  const weighted = [...buckets.values()].filter(
    (b) => b.weight > 0 && b.possible > 0,
  );
  const totalWeight = weighted.reduce((sum, b) => sum + b.weight, 0);

  let percent: number;
  if (totalWeight > 0) {
    percent =
      weighted.reduce((sum, b) => sum + (b.earned / b.possible) * b.weight, 0) /
      totalWeight;
    percent *= 100;
  } else {
    const earned = [...buckets.values()].reduce((s, b) => s + b.earned, 0);
    const possible = [...buckets.values()].reduce((s, b) => s + b.possible, 0);
    percent = possible > 0 ? (earned / possible) * 100 : 0;
  }

  const rounded = round(percent);
  return {
    percent: rounded,
    letter: letterFor(rounded),
    gradedCount: grades.length,
  };
}

/**
 * Recomputes and caches the running grade on the enrollment, recording a
 * history snapshot so grade-drop alerts have a trend to compare against.
 */
export async function refreshEnrollmentGrade(
  db: PrismaClient,
  sectionId: string,
  studentId: string,
  reason?: string,
) {
  const result = await computeSectionGrade(db, sectionId, studentId);
  if (!result) return null;

  const enrollment = await db.enrollment.update({
    where: { sectionId_studentId: { sectionId, studentId } },
    data: { currentPercent: result.percent, currentLetter: result.letter },
    select: { id: true, currentPercent: true, currentLetter: true },
  });

  await db.gradeSnapshot.create({
    data: {
      enrollmentId: enrollment.id,
      percent: result.percent,
      letter: result.letter,
      reason,
    },
  });

  return result;
}

/**
 * Cumulative weighted GPA across a student's graded enrollments.
 */
export async function computeGpa(db: PrismaClient, studentId: string) {
  const enrollments = await db.enrollment.findMany({
    where: { studentId, currentPercent: { not: null } },
    select: {
      currentPercent: true,
      section: {
        select: { course: { select: { credits: true, level: true } } },
      },
    },
  });

  if (enrollments.length === 0) return null;

  let points = 0;
  let credits = 0;
  for (const enrollment of enrollments) {
    const course = enrollment.section.course;
    const value =
      gradePoints(enrollment.currentPercent ?? 0) + levelBonus(course.level);
    points += value * course.credits;
    credits += course.credits;
  }

  return credits > 0 ? round(points / credits, 2) : null;
}

/** Buckets used by the grade-distribution chart on the teacher dashboard. */
export type GradeDistribution = { A: number; B: number; C: number; DF: number };

export function distributionOf(percents: number[]): GradeDistribution {
  const distribution: GradeDistribution = { A: 0, B: 0, C: 0, DF: 0 };
  for (const percent of percents) {
    if (percent >= 90) distribution.A += 1;
    else if (percent >= 80) distribution.B += 1;
    else if (percent >= 70) distribution.C += 1;
    else distribution.DF += 1;
  }
  return distribution;
}
