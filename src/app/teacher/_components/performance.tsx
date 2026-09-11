import {
  ChevronRightIcon,
  MegaphoneIcon,
  TrendUpIcon,
} from "~/app/_components/icons";
import { Card, CardHeader, EmptyState, Pill } from "~/app/_components/ui";

type SectionPerformance = {
  sectionId: string;
  sectionCode: string;
  period: number;
  course: { name: string; level: string };
  studentCount: number;
  classAverage: number | null;
  gradedStudents: number;
  distribution: { A: number; B: number; C: number; DF: number };
  currentUnit: { order: number; title: string } | null;
};

/** Accent per card, echoing the coloured rules in the design. */
const ACCENTS = ["bg-teal-500", "bg-brand", "bg-amber-500", "bg-violet-500"];

function letterFor(percent: number): string {
  if (percent >= 97) return "A+";
  if (percent >= 93) return "A";
  if (percent >= 90) return "A-";
  if (percent >= 87) return "B+";
  if (percent >= 83) return "B";
  if (percent >= 80) return "B-";
  if (percent >= 77) return "C+";
  if (percent >= 73) return "C";
  if (percent >= 70) return "C-";
  if (percent >= 60) return "D";
  return "F";
}

export function Performance({ sections }: { sections: SectionPerformance[] }) {
  return (
    <Card>
      <CardHeader
        icon={<TrendUpIcon className="size-[18px]" />}
        title="Course Performance & Grade Distribution"
        action={
          <button
            type="button"
            className="border-line bg-surface text-ink hover:bg-canvas inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition"
          >
            <MegaphoneIcon className="size-3.5" />
            Post Announcement
          </button>
        }
      />

      {sections.length === 0 ? (
        <EmptyState>No sections assigned this term.</EmptyState>
      ) : (
        <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
          {sections.map((section, index) => (
            <SectionCard
              key={section.sectionId}
              section={section}
              accent={ACCENTS[index % ACCENTS.length]!}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

function SectionCard({
  section,
  accent,
}: {
  section: SectionPerformance;
  accent: string;
}) {
  const bars = [
    { label: "A", count: section.distribution.A, className: "bg-teal-500" },
    { label: "B", count: section.distribution.B, className: "bg-brand" },
    { label: "C", count: section.distribution.C, className: "bg-amber-500" },
    { label: "D/F", count: section.distribution.DF, className: "bg-rose-500" },
  ];
  const peak = Math.max(1, ...bars.map((bar) => bar.count));

  return (
    <article className="border-line bg-canvas relative overflow-hidden rounded-2xl border p-4">
      <span
        aria-hidden="true"
        className={`absolute inset-x-0 top-0 h-1 ${accent}`}
      />

      <div className="flex items-start justify-between gap-2">
        <p className="text-muted text-[11px] font-bold tracking-wide uppercase">
          {section.sectionCode} • Per. {section.period}
        </p>
        <Pill tone="slate">{section.studentCount} Students</Pill>
      </div>

      <h3 className="text-ink mt-2 text-base font-extrabold">
        {section.course.name}
      </h3>

      <p className="mt-3 flex items-end gap-2">
        <span className="text-ink text-4xl font-extrabold tracking-tight">
          {section.classAverage === null ? "—" : `${section.classAverage}%`}
        </span>
        <span className="text-muted pb-1 text-xs font-semibold">
          Class average
          {section.classAverage !== null &&
            ` (${letterFor(section.classAverage)})`}
        </span>
      </p>

      <div className="mt-4">
        <p className="text-muted text-[10px] font-bold tracking-wider uppercase">
          Grade distribution
        </p>
        <div className="mt-2 flex h-24 items-stretch gap-3">
          {bars.map((bar) => (
            <div
              key={bar.label}
              className="flex flex-1 flex-col items-center gap-1"
            >
              <span className="text-ink text-xs font-bold">{bar.count}</span>
              {/* The track gives the bar a definite height to size against. */}
              <div className="flex w-full flex-1 items-end">
                <div
                  className={`w-full rounded-t-md ${bar.className}`}
                  style={{
                    height: `${Math.max(6, (bar.count / peak) * 100)}%`,
                  }}
                  role="presentation"
                />
              </div>
              <span className="text-muted text-[11px] font-semibold">
                {bar.label}
              </span>
            </div>
          ))}
        </div>
        {section.gradedStudents === 0 && (
          <p className="text-muted mt-2 text-[11px]">No released grades yet.</p>
        )}
      </div>

      <div className="border-line mt-4 flex items-center justify-between gap-2 border-t pt-3">
        <p className="text-muted min-w-0 truncate text-xs">
          {section.currentUnit
            ? `Syllabus: ${section.currentUnit.title}`
            : "Syllabus: not started"}
        </p>
        <button
          type="button"
          className="text-brand inline-flex shrink-0 items-center gap-0.5 text-xs font-bold hover:underline"
        >
          Open Roster
          <ChevronRightIcon className="size-3.5" />
        </button>
      </div>
    </article>
  );
}
