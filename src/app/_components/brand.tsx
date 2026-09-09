import Link from "next/link";

/** The pumpkin mark used in the product sidebar. */
export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-xl bg-navy text-lg leading-none ${className}`}
      aria-hidden="true"
    >
      🎃
    </span>
  );
}

/**
 * Wordmark + role chip, matching the sidebar lockup ("Momo Smart" over a small
 * uppercase label).
 */
export function Wordmark({
  label,
  tone = "light",
  href = "/",
}: {
  label?: string;
  tone?: "light" | "dark";
  href?: string | null;
}) {
  const content = (
    <span className="flex items-center gap-3">
      <LogoMark className="size-10 shrink-0" />
      <span className="flex flex-col leading-tight">
        <span
          className={`text-xl font-extrabold tracking-tight ${
            tone === "dark" ? "text-white" : "text-ink"
          }`}
        >
          Momo Smart
        </span>
        {label && (
          <span
            className={`text-[11px] font-semibold tracking-[0.14em] uppercase ${
              tone === "dark" ? "text-white/60" : "text-muted"
            }`}
          >
            {label}
          </span>
        )}
      </span>
    </span>
  );

  return href ? (
    <Link href={href} className="inline-flex">
      {content}
    </Link>
  ) : (
    content
  );
}
