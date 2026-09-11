import { ClockIcon } from "~/app/_components/icons";
import { Card, CardHeader, EmptyState, Pill } from "~/app/_components/ui";
import type { RouterOutputs } from "~/trpc/react";
import { dueLabel, dueUrgency, points } from "./format";

type DueItem = RouterOutputs["assignment"]["dueSoon"][number];

const FORMAT_LABELS: Record<DueItem["format"], string> = {
  FILE_UPLOAD: "File upload",
  TEXT_ENTRY: "Text entry",
  EXTERNAL_LINK: "External link",
  ONLINE_ASSESSMENT: "Online quiz",
  ON_PAPER: "In class",
};

/** Work due within this many hours (or already overdue) counts as urgent. */
const URGENT_HOURS = 72;

export function DueSoon({ items }: { items: DueItem[] }) {
  const now = new Date();
  const urgent = items.filter((item) => item.hoursRemaining <= URGENT_HOURS);

  return (
    <Card>
      <CardHeader
        icon={<ClockIcon className="size-4" />}
        title="Due Soon"
        action={
          urgent.length > 0 && <Pill tone="rose">{urgent.length} Urgent</Pill>
        }
      />

      {items.length === 0 ? (
        <EmptyState>Nothing due this week.</EmptyState>
      ) : (
        <ul className="space-y-3 p-4">
          {items.slice(0, 4).map((item) => {
            const urgency = dueUrgency(item.dueAt, now);
            const pressing = urgency === "overdue" || urgency === "today";
            // Online quizzes and external tools open elsewhere; everything else
            // is handed in here.
            const opensElsewhere =
              item.format === "EXTERNAL_LINK" ||
              item.format === "ONLINE_ASSESSMENT";

            return (
              <li
                key={item.id}
                className={`rounded-xl border p-4 ${
                  pressing
                    ? "border-amber-200 bg-amber-50/50"
                    : "border-line bg-canvas/60"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-ink text-sm font-bold">{item.title}</p>
                    <p className="text-muted mt-0.5 text-xs">
                      {item.section.course.name}
                    </p>
                  </div>
                  <Pill
                    tone={
                      urgency === "overdue"
                        ? "rose"
                        : urgency === "today"
                          ? "amber"
                          : urgency === "tomorrow"
                            ? "blue"
                            : "slate"
                    }
                    className="shrink-0"
                  >
                    {urgency === "overdue"
                      ? "Overdue"
                      : `Due ${dueLabel(item.dueAt, now)}`}
                  </Pill>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-muted text-xs">
                    {points(item.pointsPossible)} Pts •{" "}
                    {item.rubric ? "Rubric Ready" : FORMAT_LABELS[item.format]}
                  </p>
                  <button
                    type="button"
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                      opensElsewhere
                        ? "bg-brand-soft text-brand hover:bg-brand/10"
                        : pressing
                          ? "bg-orange-600 text-white hover:bg-orange-700"
                          : "bg-brand hover:bg-brand/90 text-white"
                    }`}
                  >
                    {opensElsewhere
                      ? "Open"
                      : item.draft
                        ? "Continue"
                        : "Submit"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
