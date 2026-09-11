import Link from "next/link";

import { LogoMark } from "~/app/_components/brand";
import {
  CalendarIcon,
  CapIcon,
  ChatIcon,
  ClipboardIcon,
  GridIcon,
  HelpIcon,
  PlusCircleIcon,
  SettingsIcon,
  StarIcon,
} from "~/app/_components/icons";
import { Nav, type NavItem } from "~/app/_components/nav";

export function Sidebar({
  gradeLevel,
  dueCount,
  unreadMessages,
}: {
  gradeLevel: number;
  dueCount: number;
  unreadMessages: number;
}) {
  const items: NavItem[] = [
    { label: "Dashboard", href: "/student", exact: true },
    { label: "Courses", href: "/student/courses" },
    { label: "Assignments", href: "/student/assignments", badge: dueCount },
    { label: "Scores", href: "/student/scores" },
    { label: "Calendar", href: "/student/calendar" },
    { label: "Messages", href: "/student/messages", dot: unreadMessages > 0 },
  ];

  const icons: Record<string, React.ReactNode> = {
    Dashboard: <GridIcon className="size-[18px]" />,
    Courses: <CapIcon className="size-[18px]" />,
    Assignments: <ClipboardIcon className="size-[18px]" />,
    Scores: <StarIcon className="size-[18px]" />,
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
            <p className="text-navy text-lg leading-tight font-extrabold tracking-tight">
              Momo Smart
            </p>
            <span className="bg-brand-soft text-navy mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase">
              Student • Gr. {gradeLevel}
            </span>
          </div>
        </div>

        <button
          type="button"
          className="bg-navy hover:bg-navy-deep mt-6 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition"
        >
          <PlusCircleIcon className="size-4" />
          Submit Assignment
        </button>

        <Nav items={items} icons={icons} />
      </div>

      {/* Footer */}
      <div className="border-line border-t px-4 py-4">
        <div className="space-y-1">
          <Link
            href="/student/settings"
            className="text-muted hover:bg-canvas hover:text-ink flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition"
          >
            <SettingsIcon className="size-[18px]" />
            Settings
          </Link>
          <Link
            href="/student/help"
            className="text-muted hover:bg-canvas hover:text-ink flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition"
          >
            <HelpIcon className="size-[18px]" />
            Help Center
          </Link>
        </div>
      </div>
    </aside>
  );
}
