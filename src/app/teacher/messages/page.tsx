import { type Metadata } from "next";
import Link from "next/link";

import { ChatIcon, MailIcon } from "~/app/_components/icons";
import { api } from "~/trpc/server";
import { timeAgo } from "~/app/_components/format";
import { PageHeader } from "../_components/page-header";
import { Avatar, Card, CardHeader, EmptyState } from "~/app/_components/ui";
import { ReplyForm } from "./reply-form";

export const metadata: Metadata = { title: "Messages · Momo Smart" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ thread?: string }>;

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { thread: threadParam } = await searchParams;

  const [me, threads] = await Promise.all([
    api.user.me(),
    api.message.threads({ limit: 30 }),
  ]);

  const active =
    threads.find((thread) => thread.id === threadParam) ?? threads[0] ?? null;
  const messages = active
    ? await api.message.thread({ conversationId: active.id, limit: 100 })
    : [];

  const unreadTotal = threads.reduce((sum, thread) => sum + thread.unread, 0);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        title="Messages"
        subtitle={`${threads.length} conversation${threads.length === 1 ? "" : "s"}${unreadTotal > 0 ? ` • ${unreadTotal} unread` : ""}. You can message students on your roster.`}
      />

      {threads.length === 0 ? (
        <Card>
          <EmptyState>
            No conversations yet. Threads started from a student&apos;s profile
            or an intervention alert appear here.
          </EmptyState>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
          {/* Thread list */}
          <Card className="overflow-hidden">
            <CardHeader
              icon={<MailIcon className="size-[18px]" />}
              title="Inbox"
              subtitle={`${threads.length} thread${threads.length === 1 ? "" : "s"}`}
            />
            <ul className="divide-line max-h-[640px] divide-y overflow-y-auto">
              {threads.map((thread) => {
                const other = thread.others[0];
                const isActive = active?.id === thread.id;
                const name = other?.name ?? "Conversation";

                return (
                  <li key={thread.id}>
                    <Link
                      href={`/teacher/messages?thread=${thread.id}`}
                      className={`flex w-full items-start gap-3 px-4 py-3.5 text-left transition ${
                        isActive ? "bg-brand-soft" : "hover:bg-canvas"
                      }`}
                    >
                      <Avatar name={name} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-ink truncate text-sm font-bold">
                            {other?.title ? `${other.title} ` : ""}
                            {name}
                          </p>
                          <span className="text-muted shrink-0 text-[11px]">
                            {timeAgo(thread.latestMessage?.sentAt)}
                          </span>
                        </div>
                        {thread.subject && (
                          <p className="text-ink/70 truncate text-xs font-semibold">
                            {thread.subject}
                          </p>
                        )}
                        <p className="text-muted mt-0.5 line-clamp-2 text-xs">
                          {thread.latestMessage?.body ?? "No messages yet"}
                        </p>
                      </div>
                      {thread.unread > 0 && (
                        <span className="bg-brand mt-1 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white">
                          {thread.unread}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>

          {/* Conversation */}
          <Card className="flex flex-col overflow-hidden">
            {active ? (
              <>
                <CardHeader
                  icon={<ChatIcon className="size-[18px]" />}
                  title={
                    active.others.map((person) => person.name).join(", ") ||
                    "Conversation"
                  }
                  subtitle={active.subject ?? "Direct message"}
                />

                <ol className="max-h-[520px] flex-1 space-y-3 overflow-y-auto px-5 py-4">
                  {messages.map((message) => {
                    const mine = message.sender.id === me.id;
                    return (
                      <li
                        key={message.id}
                        className={`flex gap-3 ${mine ? "flex-row-reverse" : ""}`}
                      >
                        <Avatar name={message.sender.name} size="sm" />
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                            mine
                              ? "bg-navy text-white"
                              : "border-line bg-canvas text-ink border"
                          }`}
                        >
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {message.body}
                          </p>
                          <p
                            className={`mt-1 text-[11px] ${mine ? "text-white/55" : "text-muted"}`}
                          >
                            {mine ? "You" : message.sender.name} ·{" "}
                            {timeAgo(message.sentAt)}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                  {messages.length === 0 && (
                    <li>
                      <EmptyState>No messages in this thread yet.</EmptyState>
                    </li>
                  )}
                </ol>

                <ReplyForm conversationId={active.id} />
              </>
            ) : (
              <EmptyState>Select a conversation to read it.</EmptyState>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
