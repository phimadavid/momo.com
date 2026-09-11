"use client";

import { useOptimistic, useTransition } from "react";

import { setLessonCompleted } from "../actions";

export function MarkComplete({
  lessonId,
  completed,
  disabled = false,
}: {
  lessonId: string;
  completed: boolean;
  disabled?: boolean;
}) {
  const [checked, setChecked] = useOptimistic(completed);
  const [pending, startTransition] = useTransition();

  return (
    <label
      className={`border-line bg-surface inline-flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
        disabled
          ? "text-muted cursor-not-allowed opacity-60"
          : "text-ink hover:bg-canvas cursor-pointer"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled || pending}
        onChange={(event) => {
          const next = event.target.checked;
          startTransition(async () => {
            setChecked(next);
            await setLessonCompleted(lessonId, next);
          });
        }}
        className="accent-brand size-4"
      />
      {checked ? "Completed" : "Mark as Completed"}
    </label>
  );
}
