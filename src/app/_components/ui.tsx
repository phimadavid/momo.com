import { avatarTone, initials } from "./format";

/** Circular initials avatar; the schema has no uploaded photos by default. */
export function Avatar({
  name,
  size = "md",
}: {
  name: string | null | undefined;
  size?: "sm" | "md" | "lg";
}) {
  const dimensions =
    size === "sm"
      ? "size-8 text-[11px]"
      : size === "lg"
        ? "size-11 text-sm"
        : "size-9 text-xs";

  return (
    <span
      className={`${dimensions} ${avatarTone(name ?? "?")} inline-flex shrink-0 items-center justify-center rounded-full font-bold`}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

type Tone = "blue" | "green" | "amber" | "rose" | "slate" | "violet";

const TONES: Record<Tone, string> = {
  blue: "bg-brand-soft text-brand",
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  rose: "bg-rose-50 text-rose-700",
  slate: "bg-slate-100 text-slate-600",
  violet: "bg-violet-50 text-violet-700",
};

export function Pill({
  children,
  tone = "slate",
  className = "",
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/** The standard white panel used across the dashboard. */
export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`border-line bg-surface shadow-card rounded-2xl border ${className}`}
    >
      {children}
    </section>
  );
}

export function CardHeader({
  icon,
  title,
  subtitle,
  action,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="border-line flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4">
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <span className="bg-brand-soft text-brand mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-ink text-[15px] font-bold">{title}</h2>
          {subtitle && <p className="text-muted mt-0.5 text-xs">{subtitle}</p>}
        </div>
      </div>
      {action && (
        <div className="flex shrink-0 items-center gap-2">{action}</div>
      )}
    </div>
  );
}

/** A non-functional control that mirrors the design; see README for scope. */
export function GhostButton({
  children,
  className = "",
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      className={`border-line bg-surface text-ink hover:bg-canvas inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition ${className}`}
    >
      {children}
    </button>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="text-muted px-5 py-8 text-center text-sm">{children}</p>;
}
