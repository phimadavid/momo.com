import { fileSize, humanise } from "~/app/_components/format";
import { DownloadIcon, FileIcon } from "~/app/_components/icons";
import { Card, EmptyState } from "~/app/_components/ui";
import type { RouterOutputs } from "~/trpc/react";
import { LessonTabs, type LessonTab } from "./lesson-tabs";
import { FormulaBlock, LessonMarkdown } from "./markdown";

type Lesson = RouterOutputs["lesson"]["get"];

const TAB_ICONS: Record<string, LessonTab["icon"]> = {
  READING: "reading",
  OVERVIEW: "reading",
  LAB_PROTOCOL: "lab",
  SELF_CHECK: "check",
};

const RESOURCE_LABELS: Record<string, string> = {
  PDF: "PDF Document",
  SLIDES: "Slide Deck",
  DOCUMENT: "Document",
  SPREADSHEET: "Spreadsheet",
  IMAGE: "Image",
  VIDEO: "Video",
  LINK: "Link",
  TRANSCRIPT: "Transcript",
};

/**
 * The tabbed lesson body. Formula sections are not tabs of their own; they
 * sit under the first tab, where the reading that introduces them lives.
 */
export function LessonContent({ lesson }: { lesson: Lesson }) {
  const formulas = lesson.sections
    .filter((section) => section.kind === "FORMULA")
    .map((section) => (
      <FormulaBlock
        key={section.id}
        title={section.title}
        formula={section.body}
      />
    ));

  const tabs: LessonTab[] = lesson.sections
    .filter((section) => section.kind !== "FORMULA")
    .map((section, index) => ({
      id: section.id,
      label: section.title,
      icon: TAB_ICONS[section.kind] ?? "reading",
      content: (
        <>
          <LessonMarkdown source={section.body} />
          {index === 0 && formulas}
        </>
      ),
    }));

  if (tabs.length === 0 && formulas.length > 0) {
    tabs.push({
      id: "formulas",
      label: "Formulas",
      icon: "reading",
      content: <>{formulas}</>,
    });
  }

  if (tabs.length === 0 && lesson.resources.length === 0) {
    return (
      <Card>
        <EmptyState>
          Reading material for this lesson hasn&apos;t been posted yet.
        </EmptyState>
      </Card>
    );
  }

  return (
    <LessonTabs
      tabs={tabs}
      footer={
        lesson.resources.length > 0 ? (
          <LessonResources
            resources={lesson.resources}
            divided={tabs.length > 0}
          />
        ) : null
      }
    />
  );
}

function LessonResources({
  resources,
  divided,
}: {
  resources: Lesson["resources"];
  divided: boolean;
}) {
  return (
    <div className={divided ? "border-line border-t pt-5" : ""}>
      <h3 className="text-ink text-base font-bold">
        Downloadable Lesson Assets &amp; Worksheets
      </h3>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {resources.map((resource) => {
          const href = resource.file?.url ?? resource.url;
          const meta = [
            RESOURCE_LABELS[resource.kind] ?? humanise(resource.kind),
            resource.file ? fileSize(resource.file.sizeBytes) : null,
            resource.detail,
          ]
            .filter(Boolean)
            .join(" • ");

          const body = (
            <>
              <span
                className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${
                  resource.kind === "PDF"
                    ? "bg-rose-50 text-rose-600"
                    : "bg-amber-50 text-amber-600"
                }`}
              >
                <FileIcon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="text-ink block truncate text-sm font-semibold">
                  {resource.file?.fileName ?? resource.title}
                </span>
                <span className="text-muted block truncate text-xs">
                  {meta}
                </span>
              </span>
            </>
          );

          return (
            <li key={resource.id}>
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border-line hover:border-brand/40 hover:bg-canvas flex items-center gap-3 rounded-xl border p-3 transition"
                >
                  {body}
                  <DownloadIcon className="text-muted size-4 shrink-0" />
                </a>
              ) : (
                <div className="border-line flex items-center gap-3 rounded-xl border p-3">
                  {body}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
