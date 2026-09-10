import {
  AlertIcon,
  CalendarCheckIcon,
  InboxIcon,
  UsersIcon,
} from "~/app/_components/icons";

type Stat = {
  label: string;
  value: string;
  unit?: string;
  delta?: string;
  footnote: string;
  accent: string;
  iconClass: string;
  icon: React.ComponentType<{ className?: string }>;
};

export function StatCards({
  totalEnrolled,
  sectionCount,
  ungradedCount,
  ungradedDueWithin24h,
  attendanceRate,
  attendanceDelta,
  excusedToday,
  atRiskCount,
}: {
  totalEnrolled: number;
  sectionCount: number;
  ungradedCount: number;
  ungradedDueWithin24h: number;
  attendanceRate: number | null;
  attendanceDelta: number | null;
  excusedToday: number;
  atRiskCount: number;
}) {
  const stats: Stat[] = [
    {
      label: "Total Enrolled",
      value: String(totalEnrolled),
      unit: "Students",
      footnote: `Across ${sectionCount} active section${sectionCount === 1 ? "" : "s"}`,
      accent: "bg-teal-500",
      iconClass: "bg-teal-50 text-teal-600",
      icon: UsersIcon,
    },
    {
      label: "Ungraded Queue",
      value: String(ungradedCount),
      unit: "Submissions",
      footnote: `${ungradedDueWithin24h} due within 24h`,
      accent: "bg-amber-500",
      iconClass: "bg-amber-50 text-amber-600",
      icon: InboxIcon,
    },
    {
      label: "Today's Attendance",
      value: attendanceRate === null ? "—" : `${attendanceRate}%`,
      delta:
        attendanceDelta === null || attendanceDelta === 0
          ? undefined
          : `${attendanceDelta > 0 ? "+" : ""}${attendanceDelta}%`,
      footnote: `${excusedToday} excused absence${excusedToday === 1 ? "" : "s"}`,
      accent: "bg-emerald-500",
      iconClass: "bg-emerald-50 text-emerald-600",
      icon: CalendarCheckIcon,
    },
    {
      label: "Academic Alerts",
      value: String(atRiskCount),
      unit: "At-Risk",
      footnote: "Open intervention alerts",
      accent: "bg-rose-500",
      iconClass: "bg-rose-50 text-rose-600",
      icon: AlertIcon,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <article
          key={stat.label}
          className="border-line bg-surface shadow-card relative overflow-hidden rounded-2xl border p-4"
        >
          <span
            aria-hidden="true"
            className={`absolute inset-x-0 top-0 h-1 ${stat.accent}`}
          />
          <div className="flex items-start justify-between gap-3">
            <p className="text-muted text-[13px] font-semibold">{stat.label}</p>
            <span
              className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${stat.iconClass}`}
            >
              <stat.icon className="size-[18px]" />
            </span>
          </div>
          <p className="mt-2 flex items-baseline gap-1.5">
            <span className="text-ink text-3xl font-extrabold tracking-tight">
              {stat.value}
            </span>
            {stat.unit && (
              <span className="text-muted text-xs font-semibold">
                {stat.unit}
              </span>
            )}
            {stat.delta && (
              <span className="text-xs font-bold text-emerald-600">
                {stat.delta}
              </span>
            )}
          </p>
          <p className="border-line text-muted mt-2 border-t pt-2 text-xs">
            {stat.footnote}
          </p>
        </article>
      ))}
    </div>
  );
}
