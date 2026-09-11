import Link from "next/link";

import { leaveDemo } from "~/app/demo/actions";
import { DEMO_RESET_HOURS } from "~/server/demo/accounts";

/**
 * Shown above the app chrome when a visitor is inside a shared demo account,
 * so they know their changes are temporary and how to reach us.
 */
export function DemoBanner({ persona }: { persona: string }) {
  return (
    <div className="bg-navy-deep text-white">
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 px-5 py-2 text-[13px]">
        <p className="text-white/75">
          <span className="font-semibold text-white">Demo school</span> · You
          are exploring as {persona}. Changes reset every {DEMO_RESET_HOURS}{" "}
          hours.
        </p>
        <Link
          href="/demo#waitlist"
          className="font-semibold text-white underline-offset-2 hover:underline"
        >
          Request access for your school →
        </Link>
        <form action={leaveDemo}>
          <button
            type="submit"
            className="text-white/70 underline-offset-2 transition hover:text-white hover:underline"
          >
            Switch role
          </button>
        </form>
      </div>
    </div>
  );
}
