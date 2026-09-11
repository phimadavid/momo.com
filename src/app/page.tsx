import Link from "next/link";

import { Wordmark } from "~/app/_components/brand";
import {
  AlertIcon,
  ArrowRightIcon,
  BookIcon,
  CalendarCheckIcon,
  ChartIcon,
  CheckIcon,
  ClipboardIcon,
  TimerIcon,
} from "~/app/_components/icons";
import { logout } from "~/app/login/actions";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

const FEATURES = [
  {
    icon: ClipboardIcon,
    title: "Priority grading queue",
    body: "Every ungraded submission across your sections in one list, with rubric or manual scoring and one-click release to the gradebook.",
  },
  {
    icon: TimerIcon,
    title: "Timed assessments",
    body: "Question navigation, autosave, flag-for-review and a scratchpad — with accommodations and proctor signals handled server-side.",
  },
  {
    icon: CalendarCheckIcon,
    title: "Period attendance",
    body: "Open the roster for the period, mark only the exceptions, and submit. Daily rates roll up automatically.",
  },
  {
    icon: AlertIcon,
    title: "Early intervention",
    body: "Missing work, grade drops, missed assessments and inactivity surface as alerts, with every contact and referral logged.",
  },
  {
    icon: BookIcon,
    title: "Lesson delivery",
    body: "Lecture video with resume points and timestamped notes, reading material, lab protocols and downloadable resources.",
  },
  {
    icon: ChartIcon,
    title: "Gradebook & GPA",
    body: "Weighted categories, class averages, grade distribution, and a cumulative GPA that weights AP and honors coursework.",
  },
];

const FOR_TEACHERS = [
  "Daily roster with live period state",
  "Rubric grading with per-criterion feedback",
  "Section performance and grade distribution",
  "Broadcast announcements to every section",
];

const FOR_STUDENTS = [
  "Due-soon work ranked by deadline",
  "Continue where you left off in a lesson",
  "Grades and feedback once released",
  "Office-hour booking and attendance record",
];

export default async function Home() {
  const session = await auth();
  const user = session?.user;

  // Real figures for a signed-in visitor; the marketing preview stays static.
  const snapshot = await loadSnapshot(user?.role);

  return (
    <div className="bg-canvas min-h-screen">
      <header className="border-line/80 bg-surface/85 sticky top-0 z-20 border-b backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Wordmark label="Learning Management" />

          <nav className="text-muted hidden items-center gap-8 text-sm font-semibold md:flex">
            <a href="#features" className="hover:text-ink transition">
              Features
            </a>
            <a href="#roles" className="hover:text-ink transition">
              For teachers &amp; students
            </a>
          </nav>

          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-ink hidden text-sm font-semibold sm:block">
                {user.name}
              </span>
              <form action={logout}>
                <button
                  type="submit"
                  className="border-line text-ink hover:bg-canvas rounded-xl border px-4 py-2 text-sm font-semibold transition"
                >
                  Sign out
                </button>
              </form>
            </div>
          ) : (
            <Link
              href="/login"
              className="bg-navy hover:bg-navy-deep rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition"
            >
              Sign in
            </Link>
          )}
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:py-24">
          <div>
            {user ? (
              <>
                <p className="bg-brand-soft text-brand inline-flex rounded-full px-3 py-1 text-xs font-bold tracking-[0.12em] uppercase">
                  {user.role.toLowerCase()} · signed in
                </p>
                <h1 className="text-ink mt-5 text-4xl leading-[1.08] font-extrabold tracking-tight sm:text-5xl">
                  Welcome back, {user.name?.split(" ")[0] ?? "there"}.
                </h1>
                <p className="text-muted mt-5 max-w-xl text-lg">
                  {snapshot
                    ? snapshot.summary
                    : "Your account is active. The API is live — the in-app screens are next."}
                </p>
                {snapshot && (
                  <dl className="mt-8 grid max-w-lg grid-cols-2 gap-3 sm:grid-cols-3">
                    {snapshot.stats.map((stat) => (
                      <div
                        key={stat.label}
                        className="border-line bg-surface shadow-card rounded-2xl border px-4 py-3"
                      >
                        <dt className="text-muted text-xs font-semibold tracking-wide uppercase">
                          {stat.label}
                        </dt>
                        <dd className="text-ink mt-1 text-2xl font-extrabold">
                          {stat.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
                {(user.role === "TEACHER" || user.role === "ADMIN") && (
                  <Link
                    href="/teacher"
                    className="group bg-navy hover:bg-navy-deep mt-8 inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-[15px] font-semibold text-white transition"
                  >
                    Open Teacher Command Center
                    <ArrowRightIcon className="size-4 transition group-hover:translate-x-0.5" />
                  </Link>
                )}
                {user.role === "STUDENT" && (
                  <Link
                    href="/student"
                    className="group bg-navy hover:bg-navy-deep mt-8 inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-[15px] font-semibold text-white transition"
                  >
                    Open My Dashboard
                    <ArrowRightIcon className="size-4 transition group-hover:translate-x-0.5" />
                  </Link>
                )}
              </>
            ) : (
              <>
                <p className="bg-brand-soft text-brand inline-flex rounded-full px-3 py-1 text-xs font-bold tracking-[0.12em] uppercase">
                  Fall 2024 · Term 1
                </p>
                <h1 className="text-ink mt-5 text-4xl leading-[1.08] font-extrabold tracking-tight sm:text-5xl lg:text-[3.4rem]">
                  The command center for your whole school day.
                </h1>
                <p className="text-muted mt-5 max-w-xl text-lg">
                  Momo Smart brings rosters, lessons, submissions, grading,
                  assessments and attendance into one place — so teachers spend
                  the period teaching and students always know what is due.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Link
                    href="/login"
                    className="group bg-navy hover:bg-navy-deep flex items-center gap-2 rounded-xl px-6 py-3.5 text-[15px] font-semibold text-white transition"
                  >
                    Sign in to your account
                    <ArrowRightIcon className="size-4 transition group-hover:translate-x-0.5" />
                  </Link>
                  <a
                    href="#features"
                    className="border-line bg-surface text-ink hover:bg-canvas rounded-xl border px-6 py-3.5 text-[15px] font-semibold transition"
                  >
                    See what&apos;s inside
                  </a>
                </div>
              </>
            )}
          </div>

          <DashboardPreview />
        </section>

        {/* Features */}
        <section id="features" className="border-line bg-surface border-y">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <h2 className="text-ink max-w-2xl text-3xl font-extrabold tracking-tight sm:text-4xl">
              Built around how a school actually runs
            </h2>
            <p className="text-muted mt-4 max-w-2xl text-lg">
              Six modules, one data model. Attendance, grading and alerts share
              the same roster, so a submission turned in resolves the alert that
              flagged it.
            </p>

            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <article
                  key={title}
                  className="border-line bg-surface hover:border-brand/35 hover:shadow-card rounded-2xl border p-6 transition"
                >
                  <span className="bg-brand-soft text-brand flex size-11 items-center justify-center rounded-xl">
                    <Icon className="size-5.5" />
                  </span>
                  <h3 className="text-ink mt-4 text-lg font-bold">{title}</h3>
                  <p className="text-muted mt-2 text-[15px] leading-relaxed">
                    {body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Roles */}
        <section id="roles" className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid gap-5 lg:grid-cols-2">
            <RoleCard
              eyebrow="Teacher mode"
              title="Run the period, not the paperwork"
              items={FOR_TEACHERS}
            />
            <RoleCard
              eyebrow="Student mode"
              title="Know exactly what is next"
              items={FOR_STUDENTS}
              tone="light"
            />
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-6 pb-20">
          <div className="bg-navy-deep relative overflow-hidden rounded-3xl px-8 py-14 text-center sm:px-16">
            <div
              aria-hidden="true"
              className="bg-brand/25 absolute -top-24 left-1/2 size-80 -translate-x-1/2 rounded-full blur-3xl"
            />
            <div className="relative">
              <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Ready when your term is
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-white/70">
                Sign in with your school account. Faculty, student and
                administrator roles each get their own view of the same term.
              </p>
              <Link
                href={user ? "#features" : "/login"}
                className="text-navy-deep mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-[15px] font-semibold transition hover:bg-white/90"
              >
                {user ? "Explore the modules" : "Sign in"}
                <ArrowRightIcon className="size-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-line bg-surface border-t">
        <div className="text-muted mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm sm:flex-row">
          <Wordmark href={null} />
          <p>Momo Smart LMS · Fall 2024 Term 1</p>
        </div>
      </footer>
    </div>
  );
}

function RoleCard({
  eyebrow,
  title,
  items,
  tone = "dark",
}: {
  eyebrow: string;
  title: string;
  items: string[];
  tone?: "dark" | "light";
}) {
  const dark = tone === "dark";
  return (
    <article
      className={`rounded-3xl p-8 ${
        dark
          ? "bg-navy text-white"
          : "border-line bg-surface text-ink shadow-card border"
      }`}
    >
      <p
        className={`text-xs font-bold tracking-[0.14em] uppercase ${
          dark ? "text-white/55" : "text-brand"
        }`}
      >
        {eyebrow}
      </p>
      <h3 className="mt-3 text-2xl font-extrabold tracking-tight">{title}</h3>
      <ul className="mt-6 space-y-3">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-3">
            <span
              className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${
                dark ? "bg-white/15 text-white" : "bg-brand-soft text-brand"
              }`}
            >
              <CheckIcon className="size-3.5" />
            </span>
            <span
              className={`text-[15px] ${dark ? "text-white/80" : "text-muted"}`}
            >
              {item}
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}

/** A static rendering of the teacher dashboard, used as the hero visual. */
function DashboardPreview() {
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

type Snapshot = {
  summary: string;
  stats: Array<{ label: string; value: string }>;
};

/** Pulls the caller's own figures so the signed-in hero shows real data. */
async function loadSnapshot(role?: string): Promise<Snapshot | null> {
  try {
    if (role === "TEACHER") {
      const overview = await api.dashboard.teacherOverview();
      return {
        summary: `You have ${overview.ungradedCount} submissions awaiting evaluation across ${overview.sectionCount} sections.`,
        stats: [
          { label: "Enrolled", value: String(overview.totalEnrolled) },
          { label: "Ungraded", value: String(overview.ungradedCount) },
          {
            label: "Attendance",
            value:
              overview.attendanceRate === null
                ? "—"
                : `${overview.attendanceRate}%`,
          },
        ],
      };
    }

    if (role === "STUDENT") {
      const [overview, due] = await Promise.all([
        api.dashboard.studentOverview(),
        api.assignment.dueSoon({ withinDays: 7 }),
      ]);
      return {
        summary: `${due.length} ${due.length === 1 ? "assignment is" : "assignments are"} due in the next week.`,
        stats: [
          { label: "GPA", value: overview.gpa ? overview.gpa.toFixed(2) : "—" },
          {
            label: "Attendance",
            value:
              overview.attendance.rate === null
                ? "—"
                : `${overview.attendance.rate}%`,
          },
          { label: "Due soon", value: String(due.length) },
        ],
      };
    }
  } catch {
    // A signed-in account without a matching profile still gets the page.
    return null;
  }

  return null;
}
