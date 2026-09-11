import {
  CheckCircleIcon,
  ClipboardIcon,
  StarIcon,
  TimerIcon,
  TrophyIcon,
} from "~/app/_components/icons";
import { Card, Pill } from "~/app/_components/ui";
import type { RouterOutputs } from "~/trpc/react";
import { points } from "./format";

type Stars = RouterOutputs["dashboard"]["studentStars"];

export function StarPoints({ stars }: { stars: Stars }) {
  const { nextReward } = stars;

  const tallies = [
    { label: "Unit Tests", value: stars.tests, icon: ClipboardIcon },
    {
      label: "Quizzes & Coursework",
      value: stars.coursework,
      icon: TimerIcon,
    },
  ];

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
            <StarIcon className="size-5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-ink text-[17px] font-bold">
                Star Points Accumulator
              </h2>
              <Pill tone="amber">{stars.total.toLocaleString()} Stars</Pill>
            </div>
            <p className="text-muted mt-0.5 text-xs">1 Star per graded point</p>
          </div>
        </div>
        {nextReward && (
          <div className="text-right">
            <p className="text-muted text-[11px] font-semibold">
              Reward Progress
            </p>
            <p className="text-navy text-sm font-bold">
              {stars.total.toLocaleString()} /{" "}
              {nextReward.stars.toLocaleString()} Stars
            </p>
          </div>
        )}
      </div>

      <div className="px-5 pt-5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-ink inline-flex items-center gap-1.5 font-semibold">
            <TrophyIcon className="size-4 text-amber-500" />
            {nextReward
              ? `Next: ${nextReward.reward}`
              : "Every reward unlocked"}
          </span>
          {nextReward && (
            <span className="font-bold text-orange-600">
              {stars.starsToNext.toLocaleString()} stars left (
              {stars.percentToNext}%)
            </span>
          )}
        </div>
        <div
          role="progressbar"
          aria-label="Progress to next reward"
          aria-valuenow={stars.percentToNext}
          aria-valuemin={0}
          aria-valuemax={100}
          className="mt-2 h-2 overflow-hidden rounded-full bg-orange-100"
        >
          <div
            className="h-full rounded-full bg-orange-500"
            style={{ width: `${stars.percentToNext}%` }}
          />
        </div>
      </div>

      <div className="grid gap-3 px-5 pt-5 sm:grid-cols-2">
        {tallies.map((tally) => (
          <div
            key={tally.label}
            className="border-line bg-canvas/60 flex items-center gap-3 rounded-xl border px-4 py-3"
          >
            <tally.icon className="text-navy size-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-ink text-[11px] font-bold tracking-wide uppercase">
                {tally.label}
              </p>
              <p className="text-muted text-xs">1 Star per point</p>
            </div>
            <div className="text-right">
              <p className="text-navy text-lg font-extrabold">
                {tally.value.toLocaleString()}
              </p>
              <p className="text-[10px] font-semibold text-orange-600">
                Stars Earned
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="px-5 pt-5 pb-5">
        <div className="flex items-center justify-between">
          <p className="text-muted text-[11px] font-bold tracking-wide uppercase">
            Recent Star Earnings
          </p>
          <button
            type="button"
            className="text-brand text-xs font-bold hover:underline"
          >
            Full Ledger
          </button>
        </div>

        {stars.recent.length === 0 ? (
          <p className="text-muted mt-3 text-sm">
            Stars appear here once a grade is released.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {stars.recent.map((entry) => (
              <li
                key={entry.id}
                className="border-line flex items-center gap-3 rounded-xl border px-4 py-3"
              >
                <CheckCircleIcon
                  className={`size-5 shrink-0 ${
                    entry.isPerfect ? "text-orange-500" : "text-teal-600"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-ink flex flex-wrap items-center gap-2 text-sm font-semibold">
                    {entry.title}
                    {entry.isPerfect && <Pill tone="green">Perfect!</Pill>}
                  </p>
                  <p className="text-muted text-xs">
                    {entry.courseName} • {points(entry.score)}/
                    {points(entry.pointsPossible)} pts
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-orange-600">
                  <StarIcon className="size-4" />+{entry.stars} Stars
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
