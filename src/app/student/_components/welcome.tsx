import { StarIcon, TimerIcon, TrendUpIcon } from "~/app/_components/icons";
import { clock } from "~/app/_components/format";
import { Card } from "~/app/_components/ui";
import type { RouterOutputs } from "~/trpc/react";
import { gradeLevelName } from "./format";

type Overview = RouterOutputs["dashboard"]["studentOverview"];
type Stars = RouterOutputs["dashboard"]["studentStars"];

export function Welcome({
  overview,
  stars,
  overdueCount,
}: {
  overview: Overview;
  stars: Stars;
  overdueCount: number;
}) {
  const { profile, nextClass, attendance } = overview;
  const remaining = overview.classesRemainingToday;

  const topPercent =
    overview.gpaPercentile === null
      ? null
      : Math.max(1, Math.round(100 - overview.gpaPercentile));

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div className="min-w-0">
          <h1 className="text-navy text-3xl font-extrabold tracking-tight">
            Welcome back, {profile.user.name ?? "there"}
          </h1>
          <span className="bg-brand-soft text-navy mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold">
            {gradeLevelName(profile.gradeLevel)}
            {nextClass && ` • Period ${nextClass.section.period}`}
          </span>
          <p className="text-muted mt-2 text-sm">
            {remaining === 0
              ? "No more classes today."
              : `${remaining} class${remaining === 1 ? "" : "es"} remaining today.`}{" "}
            {overdueCount > 0
              ? `${overdueCount} assignment${overdueCount === 1 ? " is" : "s are"} overdue.`
              : "Assignments on schedule."}
          </p>
          {nextClass && (
            <p className="border-brand/20 bg-brand-soft/60 text-brand mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs">
              <TimerIcon className="size-3.5" />
              <span>
                Next:{" "}
                <span className="font-bold">
                  {nextClass.section.course.name}
                </span>{" "}
                ({clock(nextClass.startTime)}
                {(nextClass.room ?? nextClass.section.room) &&
                  `, ${nextClass.room ?? nextClass.section.room}`}
                )
              </span>
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <Tile label="Current GPA">
            <p className="text-navy text-3xl font-extrabold tracking-tight">
              {overview.gpa === null ? "—" : overview.gpa.toFixed(2)}
            </p>
            {topPercent !== null && (
              <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-teal-600">
                <TrendUpIcon className="size-3.5" />
                Top {topPercent}%
              </p>
            )}
          </Tile>

          <Tile label="Attendance">
            <p className="text-brand text-3xl font-extrabold tracking-tight">
              {attendance.rate === null ? "—" : `${attendance.rate}%`}
            </p>
            <p className="text-muted mt-1 text-[11px] font-semibold">
              {attendance.present} of {attendance.totalDays} Days
            </p>
          </Tile>

          <Tile label="Total Stars" highlight>
            <p className="inline-flex items-center gap-1 text-3xl font-extrabold tracking-tight text-orange-600">
              <StarIcon className="size-6" />
              {stars.total.toLocaleString()}
            </p>
            <p className="text-ink mt-1 text-[11px] font-semibold">
              +{stars.thisWeek} this week
            </p>
            <span className="mt-1 inline-flex rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
              Rank #{stars.rank} in Gr. {stars.gradeLevel}
            </span>
          </Tile>
        </div>
      </div>
    </Card>
  );
}

function Tile({
  label,
  highlight = false,
  children,
}: {
  label: string;
  highlight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex min-w-[120px] flex-col items-center rounded-xl border px-4 py-3 text-center ${
        highlight
          ? "border-amber-200 bg-amber-50/60"
          : "border-line bg-canvas/60"
      }`}
    >
      <p className="text-muted text-[10px] font-bold tracking-[0.1em] uppercase">
        {label}
      </p>
      {children}
    </div>
  );
}
