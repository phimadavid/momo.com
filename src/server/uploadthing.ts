import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

import { auth } from "~/server/auth";
import { db } from "~/server/db";

const f = createUploadthing();

const DOCUMENT = { maxFileSize: "32MB", maxFileCount: 5 } as const;

/**
 * UploadThing file routes. Files go straight from the browser to UploadThing;
 * `onUploadComplete` records each one as a `FileObject` owned by the uploader,
 * which is what the submission mutations accept as attachments.
 */
export const uploadRouter = {
  submissionFile: f({
    pdf: DOCUMENT,
    text: { maxFileSize: "16MB", maxFileCount: 5 },
    image: { maxFileSize: "16MB", maxFileCount: 5 },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      DOCUMENT,
    "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      DOCUMENT,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      DOCUMENT,
  })
    .middleware(async () => {
      const session = await auth();
      if (session?.user.role !== "STUDENT" || !session.user.studentId) {
        // UploadThingError is how the message reaches the client; the lint
        // rule cannot see through its Effect-based class to Error.
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw new UploadThingError("Only students can upload submissions.");
      }
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const record = await db.fileObject.create({
        data: {
          storageKey: file.key,
          url: file.ufsUrl,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          uploadedById: metadata.userId,
        },
        select: { id: true },
      });
      return { fileId: record.id };
    }),
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;
