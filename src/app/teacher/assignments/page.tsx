import { type Metadata } from "next";

import { ClipboardIcon, PlusCircleIcon } from "~/app/_components/icons";
import { api } from "~/trpc/server";
import { humanise } from "~/app/_components/format";
import { PageHeader, SectionTabs } from "../_components/page-header";
import { Card, CardHeader, EmptyState, Pill } from "~/app/_components/ui";

export const metadata: Metadata = { title: "Assignments · Momo Smart" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ section?: string }>;

const dateLabel = (date: Date) =>
  date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export default async function AssignmentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { section: sectionParam } = await searchParams;
  const sections = await api.course.mySections();
  const activeId =
    sectionParam && sections.some((s) => s.id === sectionParam)
      ? sectionParam
      : null;

  const visible = activeId
    ? sections.filter((s) => s.id === activeId)
    : sections;

  // There is no cross-section listing endpoint, so fan out over the sections.
  const perSection = await Promise.all(
    visible.map(async (section) => ({
      section,
      assignments: await api.assignment.listForSection({
        sectionId: section.id,
        includeUnpublished: true,
      }),
    })),
  );

  const rows = perSection
    .flatMap(({ section, assignments }) =>
      assignments.map((assignment) => ({ ...assignment, section })),
    )
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());

  const now = Date.now();
  const upcoming = rows.filter((row) => row.dueAt.getTime() >= now);
  const past = rows.filter((row) => row.dueAt.getTime() < now).reverse();
  const drafts = rows.filter((row) => row.publishedAt === null).length;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        title="Assignments"
        subtitle={`${rows.length} assignment${rows.length === 1 ? "" : "s"} • ${upcoming.length} still open${drafts > 0 ? ` • ${drafts} unpublished` : ""}.`}
        action={
          <button
            type="button"
            className="bg-navy hover:bg-navy-deep inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition"
          >
            <PlusCircleIcon className="size-4" />
            New Assignment
          </button>
        }
      />

      <SectionTabs
        sections={sections.map((s) => ({
          id: s.id,
          label: `${s.course.code} — ${s.code}`,
        }))}
        activeId={activeId}
        basePath="/teacher/assignments"
        allLabel={`All sections (${sections.length})`}
      />

      <AssignmentTable
        title="Open & upcoming"
        subtitle="Due date ascending"
        rows={upcoming}
      />
      <AssignmentTable
        title="Past due"
        subtitle="Most recent first"
        rows={past}
      />
    </div>
  );
}

type Row = Awaited<ReturnType<typeof api.assignment.listForSection>>[number] & {
  section: { code: string; course: { code: string } };
};

function AssignmentTable({
  title,
  subtitle,
  rows,
}: {
  title: string;
  subtitle: string;
  rows: Row[];
}) {
  return (
    <Card>
      <CardHeader
        icon={<ClipboardIcon className="size-[18px]" />}
        title={title}
        subtitle={`${rows.length} item${rows.length === 1 ? "" : "s"} • ${subtitle}`}
      />

      {rows.length === 0 ? (
        <EmptyState>Nothing here yet.</EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead>
              <tr className="bg-canvas text-muted text-[11px] font-bold tracking-wider uppercase">
                <th className="px-5 py-3">Assignment</th>
                <th className="px-4 py-3">Section</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Points</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-line divide-y">
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-canvas/60 align-top transition"
                >
                  <td className="px-5 py-4">
                    <p className="text-ink text-sm font-bold">{row.title}</p>
                    {row.unit && (
                      <p className="text-muted mt-0.5 text-xs">
                        {row.unit.title}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <Pill tone="blue">
                      {row.section.course.code} — {row.section.code}
                    </Pill>
                  </td>
                  <td className="text-muted px-4 py-4 text-xs font-semibold">
                    {humanise(row.type)}
                  </td>
                  <td className="text-ink px-4 py-4 text-xs font-semibold">
                    {dateLabel(row.dueAt)}
                  </td>
                  <td className="text-ink px-4 py-4 text-xs font-semibold">
                    {row.pointsPossible}
                  </td>
                  <td className="text-muted px-4 py-4 text-xs font-semibold">
                    {row._count.submissions}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {row.publishedAt ? (
                        <Pill tone="green">Published</Pill>
                      ) : (
                        <Pill tone="amber">Draft</Pill>
                      )}
                      {row.rubric && (
                        <Pill tone="slate">
                          {row.rubric.type === "STANDARD" ? "Rubric" : "Manual"}
                        </Pill>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
