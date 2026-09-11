import { type Metadata } from "next";
import Link from "next/link";

import { Wordmark } from "~/app/_components/brand";
import { CheckIcon, LockIcon } from "~/app/_components/icons";
import { PeekingDog } from "~/app/_components/peeking-dog";
import { env } from "~/env";
import { DEMO_RESET_HOURS } from "~/server/demo/accounts";
import { DemoRoleCard } from "./_components/demo-role-card";
import { WaitlistForm } from "./_components/waitlist-form";

export const metadata: Metadata = {
  title: "Live demo · Momo Smart",
  description:
    "Explore a live demo school as a teacher or a student, or request early access for your school.",
};

const EARLY_ACCESS = [
  "A walkthrough of the teacher and student views with your team",
  "Early access ahead of your next term",
  "No commitment — we only follow up about Momo Smart",
];

export default function DemoPage() {
  const demoLive = env.DEMO_MODE;

  return (
    <div className="bg-canvas min-h-screen">
      <header className="border-line/80 bg-surface/85 sticky top-0 z-20 border-b backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Wordmark label="Learning Management" />

          <nav className="text-muted hidden items-center gap-8 text-sm font-semibold md:flex">
            {demoLive && (
              <a href="#try" className="hover:text-ink transition">
                Try the demo
              </a>
            )}
            <a href="#waitlist" className="hover:text-ink transition">
              Request access
            </a>
          </nav>

          <Link
            href="/login"
            className="border-line text-ink hover:bg-canvas rounded-xl border px-4 py-2 text-sm font-semibold transition"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main>
        {/* Try the demo */}
        <section
          id="try"
          className="mx-auto max-w-6xl scroll-mt-20 px-6 py-16 lg:py-20"
        >
          <div className="max-w-2xl">
            <p className="bg-brand-soft text-brand inline-flex rounded-full px-3 py-1 text-xs font-bold tracking-[0.12em] uppercase">
              {demoLive ? "Live demo · no signup" : "Early access"}
            </p>
            <h1 className="text-ink mt-5 text-4xl leading-[1.08] font-extrabold tracking-tight sm:text-5xl">
              Explore a real school day in Momo Smart.
            </h1>
            <p className="text-muted mt-5 text-lg">
              Step into a working demo school: Dr. Aris Chen&apos;s AP Biology
              sections, a full grading queue, a timed quiz mid-attempt and the
              students the early-warning system has flagged.
            </p>
          </div>

          {demoLive ? (
            <>
              <div className="mt-10 grid gap-5 lg:grid-cols-2">
                <DemoRoleCard role="teacher" />
                <DemoRoleCard role="student" />
              </div>
              <p className="text-muted mt-5 flex items-center gap-2 text-sm">
                <LockIcon className="size-4 shrink-0" />A shared demo school.
                Anything you change is wiped at the next reset, every{" "}
                {DEMO_RESET_HOURS} hours.
              </p>
            </>
          ) : (
            // The dog pops up over this card's top edge, near its right corner.
            <div className="relative isolate mt-12">
              <PeekingDog side="top" />
              <div className="border-line bg-surface relative z-10 rounded-2xl border p-6">
                <p className="text-ink font-semibold">
                  The live demo is offline right now.
                </p>
                <p className="text-muted mt-1 text-[15px]">
                  Request access below and we&apos;ll walk you through it.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Waitlist */}
        <section
          id="waitlist"
          className="border-line bg-surface scroll-mt-16 border-y"
        >
          <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
            <div>
              <h2 className="text-ink text-3xl font-extrabold tracking-tight sm:text-4xl">
                Bring Momo Smart to your school
              </h2>
              <p className="text-muted mt-4 text-lg">
                We&apos;re onboarding a small number of schools. Tell us about
                yours and we&apos;ll reach out to set up a walkthrough.
              </p>
              <ul className="mt-8 space-y-3.5">
                {EARLY_ACCESS.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="bg-brand-soft text-brand mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full">
                      <CheckIcon className="size-3.5" />
                    </span>
                    <span className="text-muted text-[15px]">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* The right margin leaves room for the dog peeking past the card. */}
            <div className="relative isolate lg:mr-24">
              <PeekingDog />
              <div className="relative z-10">
                <WaitlistForm source="demo" />
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-line bg-surface border-t">
        <div className="text-muted mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm sm:flex-row">
          <Wordmark href="/" />
          <Link href="/" className="hover:text-ink transition">
            ← Back to home
          </Link>
        </div>
      </footer>
    </div>
  );
}
