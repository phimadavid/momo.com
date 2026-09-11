import type { AssignmentType } from "../../../generated/prisma";

/**
 * Star Points: a student earns one star per point scored on graded work,
 * counted once the grade is released. Stars are derived from the gradebook
 * rather than stored, so a total can never drift from the scores behind it.
 */
export const STAR_ASSIGNMENT_TYPES: AssignmentType[] = [
  "LAB_REPORT",
  "ESSAY",
  "QUIZ",
  "EXAM",
  "DIAGRAM",
  "WORKSHEET",
  "PRACTICUM",
  "PROBLEM_SET",
  "DISCUSSION",
  "PROJECT",
];

/** Stars an assignment is worth when scored in full. */
export function starsAvailable(assignment: {
  type: AssignmentType;
  pointsPossible: number;
}): number {
  return STAR_ASSIGNMENT_TYPES.includes(assignment.type)
    ? starsFor(assignment.pointsPossible)
    : 0;
}

/** Rewards a student unlocks as their star total grows, lowest first. */
export const STAR_REWARDS = [
  { stars: 250, reward: "Late Pass" },
  { stars: 750, reward: "Seat Choice for a Week" },
  { stars: 1500, reward: "Homework Pass" },
  { stars: 2500, reward: "Free Period Pass" },
] as const;

export function starsFor(score: number | null): number {
  return Math.max(0, Math.round(score ?? 0));
}

/** Where a star total sits against the next reward tier. */
export function rewardProgress(total: number) {
  const next = STAR_REWARDS.find((tier) => tier.stars > total) ?? null;

  return {
    nextReward: next,
    rewardsEarned: STAR_REWARDS.filter((tier) => tier.stars <= total).map(
      (tier) => tier.reward,
    ),
    starsToNext: next ? next.stars - total : 0,
    percentToNext: next
      ? Math.min(100, Math.round((total / next.stars) * 100))
      : 100,
  };
}
