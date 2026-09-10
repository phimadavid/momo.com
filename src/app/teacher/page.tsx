import { DownloadIcon, MegaphoneIcon } from "~/app/_components/icons";
import { api } from "~/trpc/server";
import { AlertsPanel } from "./_components/alerts-panel";
import { DailyRoster } from "./_components/daily-roster";
import { GradingQueue } from "./_components/grading-queue";
import { OfficeHours } from "./_components/office-hours";
import { Performance } from "./_components/performance";
import { StatCards } from "./_components/stat-cards";

/** Live figures, so the dashboard always reflects the database. */
export const dynamic = "force-dynamic";

export default async function TeacherDashboard() {
  const now = new Date();
  const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const [
    me,
    overview,
    attendanceToday,
    daySchedule,
    queue,
    queueSummary,
    alerts,
    performance,
    pacing,
    officeHours,
    agenda,
  ] = await Promise.all([
    api.user.me(),
    api.dashboard.teacherOverview(),
    api.attendance.todaySummary({}),
    api.attendance.daySchedule({}),
    api.grading.queue({ limit: 4, sort: "OLDEST" }),
    api.grading.queueSummary(),
    api.alert.list({ status: "OPEN", limit: 3 }),
    api.dashboard.sectionPerformance(),
    api.dashboard.pacingSummary(),
    api.dashboard.officeHoursToday(),
    api.calendar.agenda({ from: now, to: in14Days }),
  ]);

  const pendingPeriod = daySchedule.periods.find(
    (period) => period.state !== "SUBMITTED",
  );
  const surname = me.name?.split(" ").slice(-1)[0] ?? "there";

  const deadlines = agenda.events
    .filter((event) => event.type === "ADMIN_DEADLINE")
    .slice(0, 2);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* Page heading */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-ink text-3xl font-extrabold tracking-tight">
              Teacher Command Center
            </h1>
            {daySchedule.periods.some((p) => p.state === "IN_SESSION") && (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-700">
                Live session
              </span>
            )}
          </div>
          <p className="text-muted mt-2 max-w-2xl text-sm">
            Welcome back, {me.title ? `${me.title} ` : ""}
            {surname}. You have {overview.ungradedCount} item
            {overview.ungradedCount === 1 ? "" : "s"} awaiting evaluation
            {pendingPeriod
              ? ` and Period ${pendingPeriod.period} attendance pending.`
              : " and attendance is complete for today."}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            className="border-line bg-surface text-ink hover:bg-canvas inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition"
          >
            <DownloadIcon className="size-4" />
            Export Reports
          </button>
          <button
            type="button"
            className="bg-navy hover:bg-navy-deep inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition"
          >
            <MegaphoneIcon className="size-4" />
            Broadcast Announcement
          </button>
        </div>
      </div>

      <StatCards
        totalEnrolled={overview.totalEnrolled}
        sectionCount={overview.sectionCount}
        ungradedCount={overview.ungradedCount}
        ungradedDueWithin24h={overview.ungradedDueWithin24h}
        attendanceRate={overview.attendanceRate}
        attendanceDelta={attendanceToday.deltaFromPreviousDay}
        excusedToday={overview.excusedToday}
        atRiskCount={overview.atRiskCount}
      />

      <DailyRoster
        date={daySchedule.date}
        rotation={daySchedule.rotation}
        periods={daySchedule.periods}
      />

      {/* Queue + alerts */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,2.1fr)_minmax(0,1fr)]">
        <GradingQueue
          items={queue.items}
          total={queueSummary.total}
          sectionCount={queueSummary.sections}
        />
        <AlertsPanel alerts={alerts.items} total={alerts.total} />
      </div>

      {/* Performance + office hours */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,2.1fr)_minmax(0,1fr)]">
        <Performance sections={performance} />
        <OfficeHours
          officeHours={officeHours}
          deadlines={deadlines}
          pacing={pacing}
          termName={overview.term?.name.split("–").pop()?.trim() ?? "Term"}
        />
      </div>
    </div>
  );
}
