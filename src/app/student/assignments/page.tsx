import { type Metadata } from "next";
import Link from "next/link";

import {
  ArrowRightIcon,
  ChatIcon,
  CheckCircleIcon,
  ClockIcon,
  StarIcon,
  TrophyIcon,
} from "~/app/_components/icons";
import { Card, EmptyState } from "~/app/_components/ui";
import { starsAvailable } from "~/server/lib/stars";
import { api } from "~/trpc/server";
import { AssignmentCard } from "./_components/assignment-card";
import { GradedCard } from "./_components/graded-card";
import {
  toPanelTask,
  ONLINE_FORMATS,
  type MyAssignment,
} from "./_components/shared";
import { SubmitPanel } from "./_components/submit-panel";

export const metadata: Metadata = { title: "My Assignments · Momo Smart" };

/** Submissions and grades change as the student works, so never cache. */
export const dynamic = "force-dynamic";

type Tab = "todo" | "submitted" | "completed";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "todo", label: "To Do" },
  { id: "submitted", label: "Submitted" },
  { id: "completed", label: "Completed & Scored" },
];

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

type SearchParams = Record<string, string | string[] | undefined>;
const param = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default async function StudentAssignments({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const [assignments, stars] = await Promise.all([
    api.assignment.mine(),
    api.dashboard.studentStars(),
  ]);
  const now = new Date();

  const todo = assignments.filter((a) => a.bucket === "TODO");
  const submitted = assignments.filter((a) => a.bucket === "SUBMITTED");
  const completed = assignments
    .filter((a) => a.bucket === "COMPLETED")
    .sort(
      (a, b) =>
        (b.submission?.grade?.releasedAt?.getTime() ?? 0) -
        (a.submission?.grade?.releasedAt?.getTime() ?? 0),
    );
  const counts: Record<Tab, number> = {
    todo: todo.length,
    submitted: submitted.length,
    completed: completed.length,
  };

  const requestedTab = param(params.tab);
  const tab: Tab = TABS.some((t) => t.id === requestedTab)
    ? (requestedTab as Tab)
    : "todo";

  // The submit panel works on one to-do item: the one asked for, else the
  // most urgent thing that can be handed in from this page.
  const requested = param(params.assignment);
  const selected =
    todo.find((a) => a.id === requested) ??
    todo.find((a) => ONLINE_FORMATS.has(a.format)) ??
    null;

  // Weekly Reward Horizon: stars still on the table for this week's work.
  const thisWeek = todo.filter(
    (a) => a.dueAt.getTime() - now.getTime() <= WEEK_MS,
  );
  const weekStars = thisWeek.reduce((sum, a) => sum + starsAvailable(a), 0);
  const unlocks =
    stars.nextReward && stars.total + weekStars >= stars.nextReward.stars
      ? stars.nextReward.reward
      : null;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* Heading */}
      <div className="border-line flex flex-wrap items-end justify-between gap-5 border-b pb-6">
        <div className="min-w-0">
          <p className="text-brand inline-flex items-center gap-1.5 text-xs font-semibold">
            <CheckCircleIcon className="size-4" />
            Momo Smart Learning Pathway
          </p>
          <h1 className="text-navy mt-1 text-3xl font-extrabold tracking-tight">
            My Assignments
          </h1>
          <p className="text-muted mt-2 max-w-2xl text-sm">
            Review active deadlines, check work against its rubric, and earn a
            star for every point you score.
          </p>
        </div>

        <nav
          aria-label="Assignment status"
          className="border-line bg-brand-soft/50 inline-flex flex-wrap rounded-2xl border p-1"
        >
          {TABS.map((item) => {
            const active = item.id === tab;
            return (
              <Link
                key={item.id}
                href={
                  item.id === "todo"
                    ? "/student/assignments"
                    : `/student/assignments?tab=${item.id}`
                }
                aria-current={active ? "page" : undefined}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? "bg-surface text-navy shadow-card"
                    : "text-muted hover:text-ink"
                }`}
              >
                {item.label}
                <span
                  className={`rounded-full px-1.5 text-[11px] font-bold ${
                    active ? "bg-brand-soft text-brand" : "bg-surface/70"
                  }`}
                >
                  {counts[item.id]}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-8">
          {tab === "todo" && (
            <>
              <section className="space-y-4">
                <SectionHeading
                  icon={<ClockIcon className="size-5 text-orange-500" />}
                  title="Upcoming & Due Soon"
                  aside="Sorted by urgent deadline"
                />
                {todo.length === 0 ? (
                  <Card>
                    <EmptyState>
                      You&apos;re all caught up — nothing to hand in right now.
                    </EmptyState>
                  </Card>
                ) : (
                  todo.map((assignment) => (
                    <AssignmentCard
                      key={assignment.id}
                      assignment={assignment}
                      now={now}
                      selected={assignment.id === selected?.id}
                    />
                  ))
                )}
              </section>

              {completed.length > 0 && (
                <section className="space-y-4">
                  <SectionHeading
                    icon={<TrophyIcon className="size-5 text-teal-600" />}
                    title="Recently Graded & Star Rewards Received"
                    aside={
                      <Link
                        href="/student/assignments?tab=completed"
                        className="text-brand inline-flex items-center gap-1 font-semibold hover:underline"
                      >
                        View All Scores
                        <ArrowRightIcon className="size-3.5" />
                      </Link>
                    }
                  />
                  <GradedGrid assignments={completed.slice(0, 2)} />
                </section>
              )}
            </>
          )}

          {tab === "submitted" && (
            <section className="space-y-4">
              <SectionHeading
                icon={<CheckCircleIcon className="text-brand size-5" />}
                title="Submitted — Awaiting Grades"
                aside="Most recent first"
              />
              {submitted.length === 0 ? (
                <Card>
                  <EmptyState>Nothing is waiting on a grade.</EmptyState>
                </Card>
              ) : (
                [...submitted]
                  .sort(
                    (a, b) =>
                      (b.submission?.submittedAt?.getTime() ?? 0) -
                      (a.submission?.submittedAt?.getTime() ?? 0),
                  )
                  .map((assignment) => (
                    <AssignmentCard
                      key={assignment.id}
                      assignment={assignment}
                      now={now}
                    />
                  ))
              )}
            </section>
          )}

          {tab === "completed" && (
            <section className="space-y-4">
              <SectionHeading
                icon={<TrophyIcon className="size-5 text-teal-600" />}
                title="Completed & Scored"
                aside={`${stars.total.toLocaleString()} stars earned`}
              />
              {completed.length === 0 ? (
                <Card>
                  <EmptyState>
                    Scores appear here once your teacher releases them.
                  </EmptyState>
                </Card>
              ) : (
                <GradedGrid assignments={completed} />
              )}
            </section>
          )}
        </div>

        <aside className="min-w-0 space-y-6">
          <section className="from-navy to-brand shadow-card rounded-2xl bg-linear-to-br p-6 text-white">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold tracking-[0.12em] text-amber-300 uppercase">
                Weekly Reward Horizon
              </p>
              <TrophyIcon className="size-5 text-amber-300" />
            </div>
            <p className="mt-3 flex flex-wrap items-baseline gap-x-2">
              <span className="text-5xl font-extrabold tracking-tight text-amber-300">
                +{weekStars}
              </span>
              <span className="text-xl font-bold">Stars Available</span>
            </p>
            <p className="mt-2 text-sm leading-relaxed text-white/80">
              {thisWeek.length === 0
                ? "Nothing is due this week. New work shows its star value here as it's assigned."
                : `Complete your ${thisWeek.length} task${thisWeek.length === 1 ? "" : "s"} due this week to bank all ${weekStars} stars${unlocks ? ` and unlock ${unlocks}` : ""}.`}
            </p>
            <p className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold">
              <StarIcon className="size-3.5 text-amber-300" />
              {stars.total.toLocaleString()} stars banked • 1 Star / Pt
            </p>
          </section>

          {tab === "todo" && selected && (
            <SubmitPanel key={selected.id} task={toPanelTask(selected, now)} />
          )}

          <Card className="flex items-center gap-3 p-4">
            <span className="bg-brand-soft text-brand flex size-10 shrink-0 items-center justify-center rounded-full">
              <ChatIcon className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-ink text-sm font-bold">Need an extension?</p>
              <p className="text-muted text-xs">
                Ask your teacher or academic advisor.
              </p>
            </div>
            <Link
              href="/student/messages"
              className="border-line text-ink hover:bg-canvas shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition"
            >
              Message
            </Link>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function SectionHeading({
  icon,
  title,
  aside,
}: {
  icon: React.ReactNode;
  title: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-ink inline-flex items-center gap-2 text-xl font-bold">
        {icon}
        {title}
      </h2>
      {aside && <span className="text-muted text-xs">{aside}</span>}
    </div>
  );
}

function GradedGrid({ assignments }: { assignments: MyAssignment[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {assignments.map((assignment) => (
        <GradedCard key={assignment.id} assignment={assignment} />
      ))}
    </div>
  );
}
