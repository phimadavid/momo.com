import Link from "next/link";

import { LogoMark } from "~/app/_components/brand";
import {
  CalendarIcon,
  CapIcon,
  ChatIcon,
  ClipboardIcon,
  GridIcon,
  HelpIcon,
  SettingsIcon,
  StarIcon,
} from "~/app/_components/icons";
import { Nav, type NavItem } from "./nav";
import { Avatar } from "./ui";

export function Sidebar({
  teacherName,
  department,
  focus,
  ungradedCount,
  unreadMessages,
}: {
  teacherName: string;
  department: string;
  focus: string;
  ungradedCount: number;
  unreadMessages: number;
}) {
  const items: NavItem[] = [
    { label: "Dashboard", href: "/teacher" },
    { label: "Courses", href: "/teacher/courses" },
    {
      label: "Assignments",
      href: "/teacher/assignments",
      badge: ungradedCount,
    },
    { label: "Grades", href: "/teacher/grades" },
    { label: "Calendar", href: "/teacher/calendar" },
    { label: "Messages", href: "/teacher/messages", dot: unreadMessages > 0 },
  ];

  const icons: Record<string, React.ReactNode> = {
    Dashboard: <GridIcon className="size-[18px]" />,
    Courses: <CapIcon className="size-[18px]" />,
    Assignments: <ClipboardIcon className="size-[18px]" />,
    Grades: <StarIcon className="size-[18px]" />,
    Calendar: <CalendarIcon className="size-[18px]" />,
    Messages: <ChatIcon className="size-[18px]" />,
  };

  return (
    <aside className="border-line bg-surface hidden w-[248px] shrink-0 flex-col border-r lg:flex">
      <div className="flex flex-1 flex-col overflow-y-auto px-4 py-5">
        {/* Brand */}
        <div className="flex items-start gap-3 px-1">
          <LogoMark className="size-9 shrink-0" />
          <div className="min-w-0">
            <p className="text-ink text-lg leading-tight font-extrabold tracking-tight">
              Momo Smart
            </p>
            <p className="text-muted mt-0.5 text-[10px] font-bold tracking-[0.1em] uppercase">
              Faculty • {focus}
            </p>
          </div>
        </div>
        <span className="mt-3 inline-flex w-fit rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold tracking-wide text-emerald-700 uppercase">
          Teacher mode
        </span>

        {/* Signed-in teacher */}
        <div className="border-line bg-canvas mt-4 flex items-center gap-3 rounded-xl border px-3 py-2.5">
          <Avatar name={teacherName} />
          <div className="min-w-0">
            <p className="text-ink truncate text-sm font-bold">{teacherName}</p>
            <p className="text-muted truncate text-xs">{department}</p>
          </div>
        </div>

        <button
          type="button"
          className="bg-navy hover:bg-navy-deep mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition"
        >
          <ClipboardIcon className="size-4" />
          Submit Assignment
        </button>

        <Nav items={items} icons={icons} />
      </div>

      {/* Footer */}
      <div className="border-line border-t px-4 py-4">
        <div className="space-y-1">
          <Link
            href="/teacher/settings"
            className="text-muted hover:bg-canvas hover:text-ink flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition"
          >
            <SettingsIcon className="size-[18px]" />
            Settings
          </Link>
          <Link
            href="/teacher/help"
            className="text-muted hover:bg-canvas hover:text-ink flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition"
          >
            <HelpIcon className="size-[18px]" />
            Help Center
          </Link>
        </div>
        <p className="text-muted mt-3 px-3 text-[11px]">
          Momo Smart LMS · Fall Term
        </p>
      </div>
    </aside>
  );
}
