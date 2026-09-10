import Link from "next/link";

/** Consistent title block across the teacher sub-pages. */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-ink text-3xl font-extrabold tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-muted mt-2 max-w-2xl text-sm">{subtitle}</p>
        )}
      </div>
      {action && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {action}
        </div>
      )}
    </div>
  );
}

/** Pill row used to switch the page between the teacher's sections. */
export function SectionTabs({
  sections,
  activeId,
  basePath,
  allLabel,
}: {
  sections: Array<{ id: string; label: string }>;
  activeId: string | null;
  basePath: string;
  allLabel?: string;
}) {
  const tab = (href: string, label: string, active: boolean) => (
    <Link
      key={href}
      href={href}
      className={`rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition ${
        active
          ? "bg-navy text-white"
          : "border-line bg-surface text-ink hover:bg-canvas border"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {allLabel && tab(basePath, allLabel, activeId === null)}
      {sections.map((section) =>
        tab(
          `${basePath}?section=${section.id}`,
          section.label,
          activeId === section.id,
        ),
      )}
    </div>
  );
}
