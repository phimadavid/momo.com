"use server";

import { TRPCError } from "@trpc/server";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import { api } from "~/trpc/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Runs a mutation, turning API errors into a message the form can show. */
async function attempt(
  mutation: () => Promise<unknown>,
): Promise<ActionResult> {
  try {
    await mutation();
    return { ok: true };
  } catch (error) {
    if (error instanceof TRPCError) {
      return {
        ok: false,
        error:
          error.cause instanceof ZodError
            ? "Please check your entry and try again."
            : error.message,
      };
    }
    throw error;
  }
}

/** Attaches freshly uploaded files to the student's draft. */
export async function attachUploadedFiles(
  assignmentId: string,
  fileIds: string[],
) {
  const result = await attempt(() =>
    api.submission.saveDraft({ assignmentId, fileIds }),
  );
  revalidatePath("/student/assignments");
  return result;
}

export async function removeAttachment(submissionId: string, fileId: string) {
  const result = await attempt(() =>
    api.submission.removeAttachment({ submissionId, fileId }),
  );
  revalidatePath("/student/assignments");
  return result;
}

export async function saveDraft(
  assignmentId: string,
  draft: { textBody?: string; externalUrl?: string },
) {
  const result = await attempt(() =>
    api.submission.saveDraft({ assignmentId, ...draft }),
  );
  revalidatePath("/student/assignments");
  return result;
}

export async function submitAssignment(
  assignmentId: string,
  work: { fileIds: string[]; textBody?: string; externalUrl?: string },
) {
  const result = await attempt(() =>
    api.submission.submit({ assignmentId, ...work }),
  );
  // Due counts on the sidebar and dashboard change too.
  if (result.ok) revalidatePath("/student", "layout");
  return result;
}
