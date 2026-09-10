import { type Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Wordmark } from "~/app/_components/brand";
import { CheckIcon } from "~/app/_components/icons";
import { auth } from "~/server/auth";
import { homeForRole } from "~/server/auth/home";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in · Momo Smart",
  description: "Sign in to your Momo Smart school account.",
};

const HIGHLIGHTS = [
  "Grading queue, rubrics and the gradebook in one place",
  "Timed assessments with autosave and proctor signals",
  "Period attendance and early-intervention alerts",
];

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect(homeForRole(session.user.role));

  return (
    <main className="bg-canvas min-h-screen lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* Brand panel — hidden on small screens, where the form leads. */}
      <aside className="bg-navy-deep relative hidden overflow-hidden p-12 lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden="true"
          className="bg-brand/25 absolute -top-32 -right-24 size-96 rounded-full blur-3xl"
        />
        <div
          aria-hidden="true"
          className="bg-pumpkin/15 absolute -bottom-40 -left-24 size-96 rounded-full blur-3xl"
        />

        <div className="relative">
          <Wordmark label="Learning Management" tone="dark" />
        </div>

        <div className="relative max-w-md">
          <p className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-[0.12em] text-white/80 uppercase">
            Fall 2024 · Term 1
          </p>
          <h2 className="mt-6 text-4xl leading-[1.1] font-extrabold tracking-tight text-white">
            Everything a school day needs, on one screen.
          </h2>
          <ul className="mt-8 space-y-3.5">
            {HIGHLIGHTS.map((highlight) => (
              <li
                key={highlight}
                className="flex items-start gap-3 text-white/80"
              >
                <span className="bg-brand/30 mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-white">
                  <CheckIcon className="size-3.5" />
                </span>
                <span className="text-[15px]">{highlight}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/45">
          Momo Smart LMS · Faculty, student and administrator access
        </p>
      </aside>

      {/* Form panel */}
      <section className="flex min-h-screen flex-col px-6 py-10 sm:px-10 lg:px-16">
        <div className="flex items-center justify-between lg:hidden">
          <Wordmark label="Learning Management" />
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <LoginForm />
        </div>

        <p className="text-muted text-center text-sm">
          <Link href="/" className="text-brand font-semibold hover:underline">
            ← Back to home
          </Link>
        </p>
      </section>
    </main>
  );
}
