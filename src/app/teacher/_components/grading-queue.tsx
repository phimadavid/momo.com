import {
  ArrowRightIcon,
  ChevronDownIcon,
  ClipboardIcon,
  SlidersIcon,
} from "~/app/_components/icons";
import { fileSize, humanise, timeAgo } from "~/app/_components/format";
import {
  Avatar,
  Card,
  CardHeader,
  EmptyState,
  GhostButton,
  Pill,
} from "~/app/_components/ui";

type QueueItem = {
  id: string;
  timeliness: "ON_TIME" | "GRACE_PERIOD" | "LATE" | null;
  submittedAt: Date | null;
  wordCount: number | null;
  externalUrl: string | null;
  student: {
    id: string;
    studentNumber: string;
    user: { name: string | null };
  };
  assignment: {
    title: string;
    type: string;
    format: string;
    section: { code: string; course: { code: string } };
    rubric: { type: string } | null;
  };
  attachments: Array<{
    file: { fileName: string; mimeType: string; sizeBytes: number };
  }>;
};

const TIMELINESS: Record<
  NonNullable<QueueItem["timeliness"]>,
  { label: string; className: string }
> = {
  ON_TIME: { label: "On Time", className: "text-emerald-600" },
  GRACE_PERIOD: { label: "Grace Period", className: "text-amber-600" },
  LATE: { label: "Late", className: "text-rose-600" },
};

export function GradingQueue({
  items,
  total,
  sectionCount,
}: {
  items: QueueItem[];
  total: number;
  sectionCount: number;
}) {
  return (
    <Card>
      <CardHeader
        icon={<ClipboardIcon className="size-[18px]" />}
        title="Priority Grading Queue"
        subtitle={`${total} student ${total === 1 ? "file" : "files"} ready for rubric grading`}
        action={
          <>
            <GhostButton>
              All Sections ({sectionCount})
              <ChevronDownIcon className="size-3.5" />
            </GhostButton>
            <GhostButton>
              <SlidersIcon className="size-3.5" />
              Sort
            </GhostButton>
          </>
        }
      />

      {items.length === 0 ? (
        <EmptyState>Nothing waiting — the queue is clear.</EmptyState>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-left">
              <thead>
                <tr className="bg-canvas text-muted text-[11px] font-bold tracking-wider uppercase">
                  <th className="px-5 py-3">Student</th>
                  <th className="px-4 py-3">Assignment title</th>
                  <th className="px-4 py-3">Section</th>
                  <th className="px-4 py-3">Timeline</th>
                  <th className="px-4 py-3">Rubric</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-line divide-y">
                {items.map((item) => {
                  const attachment = item.attachments[0]?.file;
                  const timeliness = item.timeliness
                    ? TIMELINESS[item.timeliness]
                    : null;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-canvas/60 align-top transition"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={item.student.user.name} />
                          <div className="min-w-0">
                            <p className="text-ink truncate text-sm font-bold">
                              {item.student.user.name}
                            </p>
                            <p className="text-muted text-xs">
                              ID: #{item.student.studentNumber}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <p className="text-brand text-sm font-semibold">
                          {item.assignment.title}
                        </p>
                        <p className="text-muted mt-0.5 text-xs">
                          {attachment
                            ? `${attachment.fileName.split(".").pop()?.toUpperCase()} • ${fileSize(attachment.sizeBytes)}`
                            : item.externalUrl
                              ? "External link"
                              : item.wordCount !== null
                                ? `Text response • ${item.wordCount} words`
                                : humanise(item.assignment.type)}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <Pill tone="blue">
                          {item.assignment.section.course.code} —{" "}
                          {item.assignment.section.code}
                        </Pill>
                      </td>

                      <td className="px-4 py-4">
                        <p className="text-ink text-xs font-semibold">
                          Submitted {timeAgo(item.submittedAt)}
                        </p>
                        {timeliness && (
                          <p
                            className={`text-xs font-bold ${timeliness.className}`}
                          >
                            {timeliness.label}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        {item.assignment.rubric ? (
                          item.assignment.rubric.type === "STANDARD" ? (
                            <Pill tone="green">Rubric Attached</Pill>
                          ) : (
                            <Pill tone="amber">Manual Scale</Pill>
                          )
                        ) : (
                          <Pill tone="slate">No rubric</Pill>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          className="bg-navy hover:bg-navy-deep inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold text-white transition"
                        >
                          Grade Now
                          <ArrowRightIcon className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="border-line flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3">
            <p className="text-muted text-xs">
              Showing {items.length} of {total} submissions needing grading
            </p>
            <div className="flex items-center gap-2">
              <GhostButton>Previous</GhostButton>
              <button
                type="button"
                className="bg-navy hover:bg-navy-deep rounded-lg px-3 py-2 text-xs font-semibold text-white transition"
              >
                Next Page
              </button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
