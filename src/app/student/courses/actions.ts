"use server";

import { revalidatePath } from "next/cache";

import { api } from "~/trpc/server";

/**
 * Lecture-player autosave. Not revalidated: it fires every few seconds of
 * playback, and nothing on screen depends on the stored position until the
 * next visit.
 */
export async function saveLessonProgress(
  lessonId: string,
  positionSeconds: number,
) {
  await api.lesson.saveProgress({ lessonId, positionSeconds });
}

/** The "Mark as Completed" checkbox; also moves the dashboard and syllabus. */
export async function setLessonCompleted(lessonId: string, completed: boolean) {
  await api.lesson.setCompleted({ lessonId, completed });
  revalidatePath("/student", "layout");
}

export async function addLessonNote(
  lessonId: string,
  body: string,
  timestampSeconds: number | null,
) {
  await api.lesson.addNote({
    lessonId,
    body: body.trim(),
    timestampSeconds: timestampSeconds ?? undefined,
  });
  revalidatePath("/student/courses");
}
