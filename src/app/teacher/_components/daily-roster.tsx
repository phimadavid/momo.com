import Link from "next/link";

import {
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
  SwitchIcon,
} from "~/app/_components/icons";
import { submitAttendance, takeAttendance } from "../actions";
import { clock, clockOf, weekdayName } from "./format";
import { Card, CardHeader, EmptyState, Pill } from "./ui";

type Period = {
  sectionId: string;
  sectionCode: string;
  course: { name: string };
  period: number;
  room: string | null;
  startTime: string | null;
  endTime: string | null;
  enrolled: number;
  state: "SUBMITTED" | "IN_SESSION" | "UPCOMING" | "PENDING";
  sessionId: string | null;
  submittedAt: Date | null;
  presentCount: number | null;
};

export function DailyRoster({
  date,
  rotation,
  periods,
}: {
  date: Date;
  rotation: "ALL" | "ODD" | "EVEN";
  periods: Period[];
}) {
  return (
    <Card>
      <CardHeader
        icon={<ClockIcon className="size-[18px]" />}
        title={
          <span className="flex flex-wrap items-baseline gap-2">
            Daily Roster &amp; Period Attendance
            <span className="text-muted text-xs font-medium">
              • {weekdayName(date)} schedule
              {rotation !== "ALL" && ` (${rotation.toLowerCase()} periods)`}
            </span>
          </span>
        }
        action={
          <Link
            href="/teacher/roster"
            className="text-brand inline-flex items-center gap-1 text-xs font-bold hover:underline"
          >
            View Master Roster
            <ArrowRightIcon className="size-3.5" />
          </Link>
        }
      />

      {periods.length === 0 ? (
        <EmptyState>No classes meet today.</EmptyState>
      ) : (
        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
          {periods.map((period) => (
            <PeriodTile key={period.sectionId} period={period} />
          ))}
        </div>
      )}
    </Card>
  );
}

function PeriodTile({ period }: { period: Period }) {
  const live = period.state === "IN_SESSION";
  const done = period.state === "SUBMITTED";

  return (
    <article
      className={`rounded-2xl border p-4 transition ${
        live
          ? "border-brand bg-brand-soft/60 ring-brand/30 ring-1"
          : "border-line bg-canvas"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full ${
            done
              ? "bg-emerald-100 text-emerald-600"
              : live
                ? "bg-brand text-white"
                : "bg-slate-200 text-slate-500"
          }`}
        >
          {done ? (
            <CheckCircleIcon className="size-4" />
          ) : live ? (
            <SwitchIcon className="size-4" />
          ) : (
            <ClockIcon className="size-4" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-ink text-sm font-bold">
              Period {period.period}: {period.course.name} ({period.sectionCode}
              )
            </p>
            {done && (
              <Pill tone="green">
                {period.presentCount ?? 0}/{period.enrolled} Present
              </Pill>
            )}
            {live && (
              <Pill tone="amber" className="uppercase">
                In session
              </Pill>
            )}
            {period.state === "UPCOMING" && <Pill tone="slate">Upcoming</Pill>}
            {period.state === "PENDING" && <Pill tone="rose">Pending</Pill>}
          </div>

          <p className="text-muted mt-1 text-xs">
            {clock(period.startTime)} – {clock(period.endTime)}
            {period.room && ` • ${period.room}`}
          </p>

          <div className="mt-3">
            {done ? (
              <p className="text-muted text-xs">
                Submitted {clockOf(period.submittedAt)}
              </p>
            ) : period.sessionId ? (
              <form action={submitAttendance}>
                <input
                  type="hidden"
                  name="sessionId"
                  value={period.sessionId}
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
                >
                  <CheckCircleIcon className="size-3.5" />
                  Submit attendance
                </button>
              </form>
            ) : (
              <form action={takeAttendance}>
                <input
                  type="hidden"
                  name="sectionId"
                  value={period.sectionId}
                />
                <button
                  type="submit"
                  className="bg-brand hover:bg-brand/90 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white transition"
                >
                  <SwitchIcon className="size-3.5" />
                  Take Attendance
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
