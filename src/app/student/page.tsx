import { api } from "~/trpc/server";
import { ActiveCourses } from "./_components/active-courses";
import { Announcements } from "./_components/announcements";
import { AttendanceCard } from "./_components/attendance-card";
import { ContinueLesson } from "./_components/continue-lesson";
import { DueSoon } from "./_components/due-soon";
import { StarPoints } from "./_components/star-points";
import { Welcome } from "./_components/welcome";

/** Live figures, so the dashboard always reflects the database. */
export const dynamic = "force-dynamic";

export default async function StudentDashboard() {
  const [overview, resume, stars, dueSoon, announcements, sections] =
    await Promise.all([
      api.dashboard.studentOverview(),
      api.lesson.resumePoint(),
      api.dashboard.studentStars(),
      // Two weeks, so each course card can show its next piece of work.
      api.assignment.dueSoon({ withinDays: 14 }),
      api.announcement.feed({ limit: 3 }),
      api.course.mySections(),
    ]);

  const weekAhead = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const dueThisWeek = dueSoon.filter(
    (item) => item.dueAt.getTime() <= weekAhead,
  );
  const overdueCount = dueSoon.filter((item) => item.isOverdue).length;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <Welcome overview={overview} stars={stars} overdueCount={overdueCount} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <ContinueLesson resume={resume} />
          <StarPoints stars={stars} />
          <ActiveCourses sections={sections} dueSoon={dueSoon} />
        </div>

        <div className="min-w-0 space-y-6">
          <DueSoon items={dueThisWeek} />
          <Announcements items={announcements.items} />
          <AttendanceCard attendance={overview.attendance} />
        </div>
      </div>
    </div>
  );
}
