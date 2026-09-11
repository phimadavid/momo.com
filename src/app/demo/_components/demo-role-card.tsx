"use client";

import { useActionState } from "react";

import {
  AlertIcon,
  ArrowRightIcon,
  BookIcon,
  CheckIcon,
  ClipboardIcon,
} from "~/app/_components/icons";
import { startDemo, type DemoState } from "../actions";

const initialState: DemoState = { error: null };

const ROLES = {
  teacher: {
    icon: ClipboardIcon,
    eyebrow: "Teacher mode",
    title: "Teacher Command Center",
    persona: "Dr. Aris Chen · AP Biology, 4 sections",
    points: [
      "Work through a live priority grading queue with rubrics",
      "See the three students flagged by early-intervention alerts",
      "Take today's period attendance and review section performance",
    ],
    cta: "Try as Teacher",
    pending: "Opening the command center…",
    dark: true,
  },
  student: {
    icon: BookIcon,
    eyebrow: "Student mode",
    title: "Student Dashboard",
    persona: "Alex Rivera · Grade 11",
    points: [
      "Check what is due soon, ranked by deadline",
      "Resume a lecture where you left off and take notes",
      "Submit a lab report and track grades and Star Points",
    ],
    cta: "Try as Student",
    pending: "Opening the dashboard…",
    dark: false,
  },
} as const;

/** One-click entry into a shared demo account. */
export function DemoRoleCard({ role }: { role: keyof typeof ROLES }) {
  const [state, formAction, pending] = useActionState(startDemo, initialState);
  const { icon: Icon, dark, ...copy } = ROLES[role];

  return (
    <article
      className={`flex flex-col rounded-3xl p-7 ${
        dark
          ? "bg-navy text-white"
          : "border-line bg-surface text-ink shadow-card border"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`flex size-11 items-center justify-center rounded-xl ${
            dark ? "bg-white/15 text-white" : "bg-brand-soft text-brand"
          }`}
        >
          <Icon className="size-5.5" />
        </span>
        <div>
          <p
            className={`text-xs font-bold tracking-[0.14em] uppercase ${
              dark ? "text-white/55" : "text-brand"
            }`}
          >
            {copy.eyebrow}
          </p>
          <h2 className="text-xl font-extrabold tracking-tight">
            {copy.title}
          </h2>
        </div>
      </div>

      <p className={`mt-4 text-sm ${dark ? "text-white/65" : "text-muted"}`}>
        Signed in as {copy.persona}
      </p>

      <ul className="mt-5 flex-1 space-y-3">
        {copy.points.map((point) => (
          <li key={point} className="flex items-start gap-3">
            <span
              className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${
                dark ? "bg-white/15 text-white" : "bg-brand-soft text-brand"
              }`}
            >
              <CheckIcon className="size-3.5" />
            </span>
            <span
              className={`text-[15px] ${dark ? "text-white/80" : "text-muted"}`}
            >
              {point}
            </span>
          </li>
        ))}
      </ul>

      <form action={formAction} className="mt-7">
        <input type="hidden" name="role" value={role} />
        <button
          type="submit"
          disabled={pending}
          className={`group flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-[15px] font-semibold transition focus:ring-4 focus:outline-none disabled:cursor-wait disabled:opacity-75 ${
            dark
              ? "text-navy-deep bg-white hover:bg-white/90 focus:ring-white/25"
              : "bg-navy hover:bg-navy-deep focus:ring-navy/20 text-white"
          }`}
        >
          {pending ? copy.pending : copy.cta}
          {!pending && (
            <ArrowRightIcon className="size-4 transition group-hover:translate-x-0.5" />
          )}
        </button>
        {state.error && (
          <p
            role="alert"
            className={`mt-3 flex items-start gap-2 text-sm font-medium ${
              dark ? "text-rose-200" : "text-rose-700"
            }`}
          >
            <AlertIcon className="mt-px size-4 shrink-0" />
            {state.error}
          </p>
        )}
      </form>
    </article>
  );
}
