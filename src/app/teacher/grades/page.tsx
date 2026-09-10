import { type Metadata } from "next";

import { DownloadIcon, StarIcon } from "~/app/_components/icons";
import { api } from "~/trpc/server";
import { PageHeader, SectionTabs } from "../_components/page-header";
import { Avatar, Card, CardHeader, EmptyState, Pill } from "../_components/ui";

export const metadata: Metadata = { title: "Grades · Momo Smart" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ section?: string }>;

/** Cell styling by submission state, so gaps are visible at a glance. */
function Cell({
  cell,
  pointsPossible,
}: {
  cell:
    | {
        status: string;
        timeliness: string | null;
        score: number | null;
        letter: string | null;
        released: boolean;
      }
    | undefined;
  pointsPossible: number;
}) {
  if (!cell) {
    return <span className="text-muted text-xs">—</span>;
  }
  if (cell.status === "MISSING") {
    return <Pill tone="rose">Missing</Pill>;
  }
  if (cell.status === "EXCUSED") {
    return <Pill tone="slate">Excused</Pill>;
  }
  if (cell.score === null || !cell.released) {
    return <Pill tone="amber">Ungraded</Pill>;
  }

  const percent =
    pointsPossible > 0 ? Math.round((cell.score / pointsPossible) * 100) : 0;
  const tone =
    percent >= 90
      ? "text-emerald-600"
      : percent >= 80
        ? "text-brand"
        : percent >= 70
          ? "text-amber-600"
          : "text-rose-600";

  return (
    <span className="whitespace-nowrap">
      <span className={`text-sm font-bold ${tone}`}>{cell.score}</span>
      <span className="text-muted text-xs"> / {pointsPossible}</span>
      {cell.timeliness === "LATE" && (
        <span className="ml-1 text-[10px] font-bold text-rose-500">LATE</span>
      )}
    </span>
  );
}

export default async function GradesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { section: sectionParam } = await searchParams;
  const sections = await api.course.mySections();

  if (sections.length === 0) {
    return (
      <div className="mx-auto max-w-[1400px] space-y-6">
        <PageHeader title="Grades" />
        <Card>
          <EmptyState>No sections are assigned to you this term.</EmptyState>
        </Card>
      </div>
    );
  }

  // The gradebook is one section at a time; default to the earliest period.
  const active = sections.find((s) => s.id === sectionParam) ?? sections[0]!;
  const gradebook = await api.grading.gradebook({ sectionId: active.id });

  const graded = gradebook.rows.filter((row) => row.currentPercent !== null);
  const average =
    graded.length > 0
      ? Math.round(
          (graded.reduce((sum, row) => sum + (row.currentPercent ?? 0), 0) /
            graded.length) *
            10,
        ) / 10
      : null;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        title="Grades"
        subtitle={`${active.course.name} — ${active.code} • ${gradebook.rows.length} students • ${gradebook.assignments.length} published assignments${average !== null ? ` • class average ${average}%` : ""}.`}
        action={
          <button
            type="button"
            className="border-line bg-surface text-ink hover:bg-canvas inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition"
          >
            <DownloadIcon className="size-4" />
            Export CSV
          </button>
        }
      />

      <SectionTabs
        sections={sections.map((s) => ({
          id: s.id,
          label: `${s.course.code} — ${s.code}`,
        }))}
        activeId={active.id}
        basePath="/teacher/grades"
      />

      <Card>
        <CardHeader
          icon={<StarIcon className="size-[18px]" />}
          title="Gradebook"
          subtitle="Released scores only; ungraded work is flagged for the queue."
        />

        {gradebook.assignments.length === 0 ? (
          <EmptyState>No published assignments in this section yet.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-canvas text-muted text-[11px] font-bold tracking-wider uppercase">
                  <th className="bg-canvas sticky left-0 z-10 px-5 py-3">
                    Student
                  </th>
                  <th className="px-4 py-3 whitespace-nowrap">Running grade</th>
                  {gradebook.assignments.map((assignment) => (
                    <th
                      key={assignment.id}
                      className="px-4 py-3 align-bottom whitespace-nowrap"
                    >
                      <span className="text-ink block max-w-[140px] truncate text-xs font-bold normal-case">
                        {assignment.title}
                      </span>
                      <span className="text-muted text-[10px] font-semibold">
                        {assignment.pointsPossible} pts
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-line divide-y">
                {gradebook.rows.map((row) => (
                  <tr
                    key={row.enrollmentId}
                    className="hover:bg-canvas/60 transition"
                  >
                    <th
                      scope="row"
                      className="bg-surface sticky left-0 z-10 px-5 py-3 text-left font-normal"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar name={row.student.name} size="sm" />
                        <div className="min-w-0">
                          <p className="text-ink truncate text-sm font-bold">
                            {row.student.name}
                          </p>
                          <p className="text-muted text-xs">
                            #{row.student.studentNumber}
                          </p>
                        </div>
                      </div>
                    </th>
                    <td className="px-4 py-3">
                      {row.currentPercent === null ? (
                        <span className="text-muted text-xs">—</span>
                      ) : (
                        <span className="flex items-baseline gap-1.5 whitespace-nowrap">
                          <span className="text-ink text-sm font-extrabold">
                            {row.currentPercent}%
                          </span>
                          <Pill tone="slate">{row.currentLetter}</Pill>
                        </span>
                      )}
                    </td>
                    {gradebook.assignments.map((assignment) => (
                      <td key={assignment.id} className="px-4 py-3">
                        <Cell
                          cell={row.cells[assignment.id]}
                          pointsPossible={assignment.pointsPossible}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
