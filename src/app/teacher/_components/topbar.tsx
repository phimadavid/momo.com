import { logout } from "~/app/login/actions";
import {
  BellIcon,
  HelpIcon,
  PlusCircleIcon,
  SearchIcon,
} from "~/app/_components/icons";
import { Avatar } from "./ui";

export function Topbar({
  termName,
  week,
  teacherName,
  unreadNotifications,
}: {
  termName: string;
  week: number | null;
  teacherName: string;
  unreadNotifications: number;
}) {
  return (
    <header className="border-line bg-surface/90 sticky top-0 z-10 border-b backdrop-blur">
      <div className="flex items-center gap-4 px-5 py-3">
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-ink text-sm font-bold">{termName}</span>
          {week !== null && (
            <span className="bg-brand-soft text-brand rounded-full px-2.5 py-1 text-[11px] font-bold">
              Week {week}
            </span>
          )}
        </div>

        <label className="relative hidden min-w-0 flex-1 md:block">
          <span className="sr-only">Search</span>
          <SearchIcon className="text-muted absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <input
            type="search"
            placeholder="Search student name, assignment, or rubric…"
            className="border-line bg-canvas text-ink placeholder:text-muted focus:border-brand focus:bg-surface focus:ring-brand/10 w-full rounded-xl border py-2.5 pr-4 pl-9 text-sm transition outline-none focus:ring-4"
          />
        </label>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="text-muted hover:bg-canvas hover:text-ink relative rounded-lg p-2 transition"
            aria-label={`Notifications${unreadNotifications > 0 ? ` (${unreadNotifications} unread)` : ""}`}
          >
            <BellIcon className="size-5" />
            {unreadNotifications > 0 && (
              <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-rose-500" />
            )}
          </button>
          <button
            type="button"
            className="text-muted hover:bg-canvas hover:text-ink rounded-lg p-2 transition"
            aria-label="Help"
          >
            <HelpIcon className="size-5" />
          </button>

          <button
            type="button"
            className="bg-brand hover:bg-brand/90 hidden items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition sm:inline-flex"
          >
            <PlusCircleIcon className="size-4" />
            New Submission
          </button>

          <form action={logout} className="flex items-center">
            <button
              type="submit"
              className="rounded-full transition hover:opacity-80"
              title={`${teacherName} — sign out`}
            >
              <span className="sr-only">Sign out</span>
              <Avatar name={teacherName} size="lg" />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
