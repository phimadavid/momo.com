import { type Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "~/server/auth";
import { homeForRole } from "~/server/auth/home";
import { api } from "~/trpc/server";
import { Sidebar } from "./_components/sidebar";
import { Topbar } from "./_components/topbar";

export const metadata: Metadata = {
  title: "Student Dashboard · Momo Smart",
  description: "Coursework, due dates, grades and attendance in one place.",
};

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  // Every student procedure is keyed by the student profile, so staff are sent
  // to their own home rather than a page that cannot load.
  if (session.user.role !== "STUDENT") redirect(homeForRole(session.user.role));

  const [overview, dueSoon, unread] = await Promise.all([
    api.dashboard.studentOverview(),
    api.assignment.dueSoon({ withinDays: 7 }),
    api.notification.unreadCount(),
  ]);

  const studentName = overview.profile.user.name ?? "Student";

  return (
    <div className="bg-canvas flex min-h-screen">
      <Sidebar
        gradeLevel={overview.profile.gradeLevel}
        dueCount={dueSoon.length}
        unreadMessages={unread}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          termName={overview.term?.name ?? "Current term"}
          studentName={studentName}
          studentNumber={overview.profile.studentNumber}
          unreadNotifications={unread}
        />
        <main className="min-w-0 flex-1 px-5 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
