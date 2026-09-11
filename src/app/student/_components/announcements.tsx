import { BookIcon, MegaphoneIcon } from "~/app/_components/icons";
import { timeAgo } from "~/app/_components/format";
import { Card, CardHeader, EmptyState, Pill } from "~/app/_components/ui";
import type { RouterOutputs } from "~/trpc/react";

type Announcement = RouterOutputs["announcement"]["feed"]["items"][number];

export function Announcements({ items }: { items: Announcement[] }) {
  return (
    <Card>
      <CardHeader
        icon={<MegaphoneIcon className="size-4" />}
        title="Announcements"
        action={
          <span className="text-brand text-[11px] font-bold">
            Momo Smart Daily
          </span>
        }
      />

      {items.length === 0 ? (
        <EmptyState>No announcements right now.</EmptyState>
      ) : (
        <ul className="divide-line divide-y">
          {items.map((announcement) => {
            const fromSection = announcement.section !== null;
            const source =
              announcement.section?.course.name ??
              ([announcement.author.title, announcement.author.name]
                .filter(Boolean)
                .join(" ") ||
                "School Office");

            return (
              <li key={announcement.id} className="flex gap-3 px-5 py-4">
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
                    fromSection
                      ? "bg-brand-soft text-brand"
                      : "bg-amber-50 text-amber-600"
                  }`}
                >
                  {fromSection ? (
                    <BookIcon className="size-4" />
                  ) : (
                    <MegaphoneIcon className="size-4" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-ink flex flex-wrap items-center gap-2 text-sm font-bold">
                    {announcement.title}
                    {announcement.isPinned && <Pill tone="blue">Pinned</Pill>}
                  </p>
                  <p className="text-muted mt-1 line-clamp-3 text-xs leading-relaxed">
                    {announcement.body}
                  </p>
                  <p className="text-muted mt-2 text-[11px]">
                    {source} • {timeAgo(announcement.publishedAt)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
