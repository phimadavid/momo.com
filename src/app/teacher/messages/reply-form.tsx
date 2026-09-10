"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";

import { ArrowRightIcon } from "~/app/_components/icons";
import { sendReply } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-navy hover:bg-navy-deep inline-flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Sending…" : "Send"}
      {!pending && <ArrowRightIcon className="size-4" />}
    </button>
  );
}

export function ReplyForm({ conversationId }: { conversationId: string }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await sendReply(formData);
        formRef.current?.reset();
      }}
      className="border-line flex items-end gap-2 border-t px-5 py-4"
    >
      <input type="hidden" name="conversationId" value={conversationId} />
      <label htmlFor="reply-body" className="sr-only">
        Write a reply
      </label>
      <textarea
        id="reply-body"
        name="body"
        rows={2}
        required
        maxLength={20000}
        placeholder="Write a reply…"
        className="border-line bg-canvas text-ink placeholder:text-muted focus:border-brand focus:ring-brand/10 focus:bg-surface min-w-0 flex-1 resize-none rounded-xl border px-4 py-2.5 text-sm transition outline-none focus:ring-4"
      />
      <SubmitButton />
    </form>
  );
}
