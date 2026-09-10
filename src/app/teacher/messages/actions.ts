"use server";

import { revalidatePath } from "next/cache";

import { api } from "~/trpc/server";

/** Posts a reply into an existing thread and marks it read. */
export async function sendReply(formData: FormData) {
  const conversationId = formData.get("conversationId");
  const body = formData.get("body");

  if (
    typeof conversationId !== "string" ||
    typeof body !== "string" ||
    body.trim().length === 0
  ) {
    return;
  }

  await api.message.send({ conversationId, body: body.trim() });
  await api.message.markRead({ conversationId });
  revalidatePath("/teacher/messages");
}

/** Marks a thread read when the teacher opens it. */
export async function markThreadRead(conversationId: string) {
  await api.message.markRead({ conversationId });
  revalidatePath("/teacher/messages");
}
