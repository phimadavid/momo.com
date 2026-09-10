"use server";

import { revalidatePath } from "next/cache";

import { api } from "~/trpc/server";

/**
 * Opens the attendance roster for a section's meeting today, pre-filling every
 * enrolled student as present. Backed by `attendance.openSession`, so all the
 * teacher-owns-this-section checks still apply.
 */
export async function takeAttendance(formData: FormData) {
  const sectionId = formData.get("sectionId");
  if (typeof sectionId !== "string" || sectionId.length === 0) return;

  await api.attendance.openSession({ sectionId });
  revalidatePath("/teacher");
}

/** Marks the open session as submitted for the day. */
export async function submitAttendance(formData: FormData) {
  const sessionId = formData.get("sessionId");
  if (typeof sessionId !== "string" || sessionId.length === 0) return;

  await api.attendance.submitSession({ sessionId });
  revalidatePath("/teacher");
}
