import { logout } from "~/app/login/actions";
import {
  BellIcon,
  ChevronDownIcon,
  HelpIcon,
  PlusCircleIcon,
  SearchIcon,
} from "~/app/_components/icons";
import { Avatar } from "~/app/_components/ui";

export function Topbar({
  termName,
  studentName,
  studentNumber,
  unreadNotifications,
}: {
  termName: string;
  studentName: string;
  studentNumber: string;
  unreadNotifications: number;
}) {
  return (
    <header className="border-line bg-surface/90 sticky top-0 z-10 border-b backdrop-blur">
      <div className="flex items-center gap-4 px-5 py-3">
        <button
          type="button"
          className="text-ink hover:bg-canvas flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-bold transition"
        >
          {termName}
          <ChevronDownIcon className="text-muted size-4" />
        </button>

        <label className="relative hidden max-w-md min-w-0 flex-1 md:block">
          <span className="sr-only">Search</span>
          <SearchIcon className="text-muted absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <input
            type="search"
            placeholder="Search courses, rubrics, announcements…"
            className="border-line bg-canvas text-ink placeholder:text-muted focus:border-brand focus:bg-surface focus:ring-brand/10 w-full rounded-xl border py-2.5 pr-4 pl-9 text-sm transition outline-none focus:ring-4"
          />
        </label>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="bg-brand hover:bg-brand/90 hidden items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition sm:inline-flex"
          >
            <PlusCircleIcon className="size-4" />
            New Submission
          </button>
          <button
            type="button"
            className="text-muted hover:bg-canvas hover:text-ink relative rounded-lg p-2 transition"
            aria-label={`Notifications${unreadNotifications > 0 ? ` (${unreadNotifications} unread)` : ""}`}
          >
            <BellIcon className="size-5" />
            {unreadNotifications > 0 && (
              <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-orange-500" />
            )}
          </button>
          <button
            type="button"
            className="text-muted hover:bg-canvas hover:text-ink rounded-lg p-2 transition"
            aria-label="Help"
          >
            <HelpIcon className="size-5" />
          </button>

          <form action={logout} className="flex items-center">
            <button
              type="submit"
              className="hover:bg-canvas flex items-center gap-3 rounded-xl py-1 pr-2 pl-1 text-left transition"
              title={`${studentName} — sign out`}
            >
              <span className="sr-only">Sign out</span>
              <Avatar name={studentName} size="lg" />
              <span className="hidden min-w-0 xl:block">
                <span className="text-ink block text-sm font-bold">
                  {studentName}
                </span>
                <span className="text-muted block text-[11px] font-semibold">
                  ID: #{studentNumber}
                </span>
              </span>
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
