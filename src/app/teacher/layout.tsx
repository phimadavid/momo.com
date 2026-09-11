import { type Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "~/server/auth";
import { homeForRole } from "~/server/auth/home";
import { api } from "~/trpc/server";
import { Sidebar } from "./_components/sidebar";
import { Topbar } from "./_components/topbar";

export const metadata: Metadata = {
  title: "Teacher Command Center · Momo Smart",
  description:
    "Rosters, grading queue, attendance and alerts for the school day.",
};

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role === "STUDENT") redirect(homeForRole("STUDENT"));

  const [me, overview, unread] = await Promise.all([
    api.user.me(),
    api.dashboard.teacherOverview(),
    api.notification.unreadCount(),
  ]);

  const teacherName = [me.title, me.name].filter(Boolean).join(" ");
  const sections = await api.course.mySections();
  // The sidebar's focus label follows whichever course the teacher runs most.
  const focus =
    sections[0]?.course.name ??
    me.teacherProfile?.department?.name ??
    "Faculty";

  return (
    <div className="bg-canvas flex min-h-screen">
      <Sidebar
        teacherName={teacherName || (me.name ?? "Teacher")}
        department={me.teacherProfile?.department?.name ?? "Faculty"}
        focus={focus}
        ungradedCount={overview.ungradedCount}
        unreadMessages={unread}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          termName={overview.term?.name ?? "Current term"}
          week={overview.term?.week ?? null}
          teacherName={me.name ?? "Teacher"}
          unreadNotifications={unread}
        />
        <main className="min-w-0 flex-1 px-5 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
