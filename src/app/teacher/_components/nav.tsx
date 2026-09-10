"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = {
  label: string;
  href: string;
  badge?: number;
  dot?: boolean;
};

/**
 * Sidebar navigation. Client-side so the active item follows the route;
 * icons are passed in as rendered nodes to keep this component serialisable.
 */
export function Nav({
  items,
  icons,
}: {
  items: NavItem[];
  icons: Record<string, React.ReactNode>;
}) {
  const pathname = usePathname();

  return (
    <nav className="mt-6 space-y-1">
      {items.map(({ label, href, badge, dot }) => {
        // "/teacher" must not stay active on its own sub-routes.
        const active =
          href === "/teacher" ? pathname === href : pathname.startsWith(href);

        return (
          <Link
            key={label}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
              active
                ? "bg-brand-soft text-brand"
                : "text-muted hover:bg-canvas hover:text-ink"
            }`}
          >
            {active && (
              <span
                aria-hidden="true"
                className="bg-brand absolute top-2 bottom-2 -left-4 w-1 rounded-r"
              />
            )}
            {icons[label]}
            <span className="flex-1">{label}</span>
            {badge !== undefined && badge > 0 && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                {badge}
              </span>
            )}
            {dot && (
              <span
                className="bg-brand size-2 rounded-full"
                aria-hidden="true"
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
