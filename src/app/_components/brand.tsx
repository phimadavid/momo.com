import Link from "next/link";

/**
 * The golden retriever mark on a navy tile. `public/icon.svg` is the same
 * drawing, used as the favicon — keep the two in step.
 */
export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`bg-navy inline-flex items-center justify-center rounded-xl ${className}`}
      aria-hidden="true"
    >
      <GoldenRetriever className="size-[82%]" />
    </span>
  );
}

function GoldenRetriever({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} focusable="false">
      {/* Fluffy crown tuft, then a broad head. */}
      <path
        fill="#e3a64a"
        d="M26 13.5c1.2-4.5 3.4-2.2 4.2-5 .9 2.8 2.9 1 3.6 4.4 1.4-2.4 3.3-1.2 3.7 1.4z"
      />
      <path
        fill="#e3a64a"
        d="M14 30c0-12 8-19 18-19s18 7 18 19v4c0 11-8 18-18 18s-18-7-18-18z"
      />
      {/* Ears set high and folding over the sides of the head. */}
      <path
        fill="#c07f2c"
        d="M21 14c-9.5-.5-15 9.5-14 22 .6 7.6 6.2 10.6 10.2 7.5 3-2.3 3.6-7.6 3.8-13z"
      />
      <path
        fill="#c07f2c"
        d="M43 14c9.5-.5 15 9.5 14 22-.6 7.6-6.2 10.6-10.2 7.5-3-2.3-3.6-7.6-3.8-13z"
      />
      <path
        fill="#f3cf8a"
        d="M32 33c-6.8 0-11.5 3.6-11.5 8.6S25.2 51 32 51s11.5-4.4 11.5-9.4S38.8 33 32 33z"
      />
      {/* Light golden brows. */}
      <path
        fill="none"
        stroke="#f3cf8a"
        strokeLinecap="round"
        strokeWidth="1.6"
        d="M22.6 25.4c1.6-1.4 3.8-1.6 5.4-.6m13.4.6c-1.6-1.4-3.8-1.6-5.4-.6"
      />
      <circle cx="25.6" cy="29.6" r="2.7" fill="#2b1b0e" />
      <circle cx="38.4" cy="29.6" r="2.7" fill="#2b1b0e" />
      <circle cx="26.5" cy="28.8" r=".9" fill="#fff" />
      <circle cx="39.3" cy="28.8" r=".9" fill="#fff" />
      <path
        fill="#e8707a"
        d="M29.6 44c0 4.2 1.1 6.4 2.4 6.4s2.4-2.2 2.4-6.4z"
      />
      <path
        fill="#2b1b0e"
        d="M27.8 36.8c0-2.2 8.4-2.2 8.4 0 0 2.3-2.3 4-4.2 4s-4.2-1.7-4.2-4z"
      />
      <path
        fill="none"
        stroke="#7a4a1c"
        strokeLinecap="round"
        strokeWidth="1.4"
        d="M32 40.8v2.6m0 0c-1.4 2-3.8 2.2-5.2.6m5.2-.6c1.4 2 3.8 2.2 5.2.6"
      />
    </svg>
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
