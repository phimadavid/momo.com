/** A static rendering of the teacher dashboard, used as a marketing visual. */
export function DashboardPreview() {
  const stats = [
    { label: "Total Enrolled", value: "142", accent: "bg-brand" },
    { label: "Ungraded Queue", value: "18", accent: "bg-amber-500" },
    { label: "Attendance", value: "96.2%", accent: "bg-emerald-500" },
    { label: "Alerts", value: "3", accent: "bg-rose-500" },
  ];

  const queue = [
    {
      student: "Maya Lin",
      work: "Lab 4: Enzyme Catalysis",
      tag: "Rubric",
      when: "2h ago",
    },
    {
      student: "Marcus Vance",
      work: "Unit 3 Review Quiz Essay",
      tag: "Rubric",
      when: "3h ago",
    },
    {
      student: "Lucas Bennet",
      work: "Skeletal System Diagram",
      tag: "Manual",
      when: "7h ago",
    },
  ];

  return (
    <div
      aria-hidden="true"
      className="border-line bg-surface shadow-card rounded-3xl border p-5 sm:p-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted text-xs font-semibold tracking-[0.12em] uppercase">
            Teacher Command Center
          </p>
          <p className="text-ink mt-1 text-lg font-extrabold">
            Thursday · Week 9
          </p>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
          Live session
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="border-line bg-canvas relative overflow-hidden rounded-2xl border px-4 py-3"
          >
            <span
              className={`absolute inset-y-0 left-0 w-1 ${stat.accent}`}
              aria-hidden="true"
            />
            <p className="text-muted text-[11px] font-semibold tracking-wide uppercase">
              {stat.label}
            </p>
            <p className="text-ink mt-1 text-2xl font-extrabold">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="border-line mt-5 rounded-2xl border">
        <div className="border-line flex items-center justify-between border-b px-4 py-3">
          <p className="text-ink text-sm font-bold">Priority Grading Queue</p>
          <span className="text-brand text-xs font-semibold">All sections</span>
        </div>
        <ul className="divide-line divide-y">
          {queue.map((row) => (
            <li
              key={row.student}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-ink truncate text-sm font-semibold">
                  {row.student}
                </p>
                <p className="text-muted truncate text-xs">{row.work}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                  {row.tag}
                </span>
                <span className="text-muted hidden text-xs sm:block">
                  {row.when}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
