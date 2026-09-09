import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  studentProcedure,
  teacherProcedure,
} from "~/server/api/trpc";
import { timelinessFor } from "~/server/lib/grading";
import {
  assertEnrolled,
  assertSubmissionAccess,
  assertTeachesSection,
} from "~/server/lib/permissions";

const countWords = (text: string) =>
  text.trim().split(/\s+/).filter(Boolean).length;

export const submissionRouter = createTRPCRouter({
  /** Registers an uploaded file so it can be attached to work. */
  registerFile: protectedProcedure
    .input(
      z.object({
        storageKey: z.string().min(1),
        url: z.string().url(),
        fileName: z.string().min(1).max(255),
        mimeType: z.string().min(1).max(120),
        sizeBytes: z
          .number()
          .int()
          .positive()
          .max(50 * 1024 * 1024),
      }),
    )
    .mutation(({ ctx, input }) =>
      ctx.db.fileObject.create({
        data: { ...input, uploadedById: ctx.session.user.id },
      }),
    ),

  /** Creates or updates the student's draft for an assignment. */
  saveDraft: studentProcedure
    .input(
      z.object({
        assignmentId: z.string(),
        textBody: z.string().max(200_000).optional(),
        externalUrl: z.string().url().optional(),
        fileIds: z.array(z.string()).max(10).default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const assignment = await ctx.db.assignment.findUnique({
        where: { id: input.assignmentId },
        select: { sectionId: true, publishedAt: true },
      });
      if (!assignment?.publishedAt) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assignment not found.",
        });
      }
      await assertEnrolled(ctx.db, ctx.session.user, assignment.sectionId);

      const existing = await ctx.db.submission.findFirst({
        where: { assignmentId: input.assignmentId, studentId: ctx.studentId },
        orderBy: { attempt: "desc" },
        select: { id: true, status: true, attempt: true },
      });

      if (existing && existing.status !== "DRAFT") {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This assignment has already been submitted.",
        });
      }

      const data = {
        textBody: input.textBody,
        externalUrl: input.externalUrl,
        wordCount: input.textBody ? countWords(input.textBody) : null,
      };

      const submission = existing
        ? await ctx.db.submission.update({ where: { id: existing.id }, data })
        : await ctx.db.submission.create({
            data: {
              ...data,
              assignmentId: input.assignmentId,
              studentId: ctx.studentId,
              status: "DRAFT",
            },
          });

      if (input.fileIds.length > 0) {
        await ctx.db.submissionAttachment.createMany({
          data: input.fileIds.map((fileId) => ({
            submissionId: submission.id,
            fileId,
          })),
          skipDuplicates: true,
        });
      }

      return submission;
    }),

  /** Turns the draft in, stamping on-time / grace / late against the due date. */
  submit: studentProcedure
    .input(
      z.object({
        assignmentId: z.string(),
        textBody: z.string().max(200_000).optional(),
        externalUrl: z.string().url().optional(),
        fileIds: z.array(z.string()).max(10).default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const assignment = await ctx.db.assignment.findUnique({
        where: { id: input.assignmentId },
        select: {
          id: true,
          sectionId: true,
          format: true,
          dueAt: true,
          closesAt: true,
          allowLate: true,
          graceMinutes: true,
          publishedAt: true,
        },
      });
      if (!assignment?.publishedAt) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assignment not found.",
        });
      }
      await assertEnrolled(ctx.db, ctx.session.user, assignment.sectionId);

      const now = new Date();
      if (assignment.closesAt && now > assignment.closesAt) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Submissions for this assignment are closed.",
        });
      }

      const timeliness = timelinessFor(assignment, now);
      if (timeliness === "LATE" && !assignment.allowLate) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This assignment does not accept late work.",
        });
      }

      // Format-specific completeness checks.
      const hasFiles = input.fileIds.length > 0;
      if (assignment.format === "FILE_UPLOAD" && !hasFiles) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This assignment requires a file upload.",
        });
      }
      if (assignment.format === "TEXT_ENTRY" && !input.textBody?.trim()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This assignment requires a text response.",
        });
      }
      if (assignment.format === "EXTERNAL_LINK" && !input.externalUrl) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This assignment requires a link.",
        });
      }

      const existing = await ctx.db.submission.findFirst({
        where: { assignmentId: input.assignmentId, studentId: ctx.studentId },
        orderBy: { attempt: "desc" },
        select: { id: true, status: true, attempt: true },
      });

      if (
        existing &&
        !["DRAFT", "RETURNED", "MISSING"].includes(existing.status)
      ) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This assignment has already been submitted.",
        });
      }

      const payload = {
        status: "SUBMITTED" as const,
        timeliness,
        submittedAt: now,
        textBody: input.textBody,
        externalUrl: input.externalUrl,
        wordCount: input.textBody ? countWords(input.textBody) : null,
      };

      // A returned submission is re-submitted as a new attempt.
      const submission =
        existing?.status === "RETURNED"
          ? await ctx.db.submission.create({
              data: {
                ...payload,
                assignmentId: input.assignmentId,
                studentId: ctx.studentId,
                attempt: existing.attempt + 1,
              },
            })
          : existing
            ? await ctx.db.submission.update({
                where: { id: existing.id },
                data: payload,
              })
            : await ctx.db.submission.create({
                data: {
                  ...payload,
                  assignmentId: input.assignmentId,
                  studentId: ctx.studentId,
                },
              });

      if (input.fileIds.length > 0) {
        await ctx.db.submissionAttachment.createMany({
          data: input.fileIds.map((fileId) => ({
            submissionId: submission.id,
            fileId,
          })),
          skipDuplicates: true,
        });
      }

      // Queue it for the teacher with a PENDING grade shell.
      await ctx.db.grade.upsert({
        where: { submissionId: submission.id },
        create: { submissionId: submission.id, status: "PENDING" },
        update: {},
      });

      // Clear any missing-work alert this submission satisfies.
      await ctx.db.alert.updateMany({
        where: {
          studentId: ctx.studentId,
          sectionId: assignment.sectionId,
          type: "MISSING_WORK",
          status: "OPEN",
        },
        data: { status: "RESOLVED", resolvedAt: now },
      });

      return { ...submission, timeliness };
    }),

  /** Detaches a file from a draft. */
  removeAttachment: studentProcedure
    .input(z.object({ submissionId: z.string(), fileId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const submission = await ctx.db.submission.findFirst({
        where: { id: input.submissionId, studentId: ctx.studentId },
        select: { status: true },
      });
      if (!submission) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Submission not found.",
        });
      }
      if (submission.status !== "DRAFT") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Attachments can only be changed while the work is a draft.",
        });
      }
      await ctx.db.submissionAttachment.deleteMany({
        where: { submissionId: input.submissionId, fileId: input.fileId },
      });
      return { ok: true };
    }),

  /** One submission with attachments and released feedback. */
  get: protectedProcedure
    .input(z.object({ submissionId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertSubmissionAccess(
        ctx.db,
        ctx.session.user,
        input.submissionId,
      );
      const isStudent = ctx.session.user.role === "STUDENT";

      const submission = await ctx.db.submission.findUniqueOrThrow({
        where: { id: input.submissionId },
        select: {
          id: true,
          status: true,
          timeliness: true,
          attempt: true,
          submittedAt: true,
          textBody: true,
          wordCount: true,
          externalUrl: true,
          student: {
            select: {
              id: true,
              studentNumber: true,
              user: { select: { name: true, image: true } },
            },
          },
          assignment: {
            select: {
              id: true,
              title: true,
              type: true,
              format: true,
              pointsPossible: true,
              dueAt: true,
              section: {
                select: {
                  id: true,
                  code: true,
                  course: { select: { name: true } },
                },
              },
              rubric: {
                select: {
                  id: true,
                  title: true,
                  type: true,
                  totalPoints: true,
                  criteria: {
                    orderBy: { order: "asc" },
                    select: {
                      id: true,
                      title: true,
                      description: true,
                      maxPoints: true,
                      levels: {
                        orderBy: { order: "asc" },
                        select: {
                          id: true,
                          label: true,
                          points: true,
                          description: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          attachments: {
            select: {
              file: {
                select: {
                  id: true,
                  url: true,
                  fileName: true,
                  mimeType: true,
                  sizeBytes: true,
                },
              },
            },
          },
          grade: {
            select: {
              id: true,
              status: true,
              score: true,
              letter: true,
              latePenalty: true,
              feedback: true,
              gradedAt: true,
              releasedAt: true,
              grader: { select: { name: true, title: true, image: true } },
              rubricScores: {
                select: {
                  criterionId: true,
                  levelId: true,
                  points: true,
                  comment: true,
                },
              },
            },
          },
        },
      });

      // Students only see a grade once it has been released.
      if (isStudent && submission.grade?.status !== "RELEASED") {
        return { ...submission, grade: null };
      }
      return submission;
    }),

  /** The student's own submissions, newest first. */
  mine: studentProcedure
    .input(
      z.object({
        sectionId: z.string().optional(),
        status: z
          .enum([
            "DRAFT",
            "SUBMITTED",
            "RETURNED",
            "GRADED",
            "MISSING",
            "EXCUSED",
          ])
          .optional(),
        limit: z.number().int().min(1).max(100).default(25),
      }),
    )
    .query(({ ctx, input }) =>
      ctx.db.submission.findMany({
        where: {
          studentId: ctx.studentId,
          status: input.status,
          assignment: input.sectionId
            ? { sectionId: input.sectionId }
            : undefined,
        },
        orderBy: [{ submittedAt: "desc" }, { updatedAt: "desc" }],
        take: input.limit,
        select: {
          id: true,
          status: true,
          timeliness: true,
          submittedAt: true,
          assignment: {
            select: {
              id: true,
              title: true,
              type: true,
              pointsPossible: true,
              dueAt: true,
              section: {
                select: {
                  id: true,
                  code: true,
                  course: { select: { name: true } },
                },
              },
            },
          },
          grade: {
            select: {
              score: true,
              letter: true,
              status: true,
              releasedAt: true,
            },
          },
        },
      }),
    ),

  /** All submissions for one assignment — the teacher's per-assignment view. */
  listForAssignment: teacherProcedure
    .input(z.object({ assignmentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const assignment = await ctx.db.assignment.findUnique({
        where: { id: input.assignmentId },
        select: { sectionId: true },
      });
      if (!assignment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assignment not found.",
        });
      }
      await assertTeachesSection(
        ctx.db,
        ctx.session.user,
        assignment.sectionId,
      );

      return ctx.db.submission.findMany({
        where: { assignmentId: input.assignmentId },
        orderBy: { student: { user: { name: "asc" } } },
        select: {
          id: true,
          status: true,
          timeliness: true,
          submittedAt: true,
          attempt: true,
          wordCount: true,
          student: {
            select: {
              id: true,
              studentNumber: true,
              user: { select: { name: true, image: true } },
            },
          },
          _count: { select: { attachments: true } },
          grade: { select: { status: true, score: true, letter: true } },
        },
      });
    }),

  /**
   * Flags every unsubmitted assignment whose window has closed as MISSING, so
   * the intervention alerts have something concrete to point at.
   */
  sweepMissing: teacherProcedure
    .input(z.object({ sectionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertTeachesSection(ctx.db, ctx.session.user, input.sectionId);
      const now = new Date();

      const assignments = await ctx.db.assignment.findMany({
        where: {
          sectionId: input.sectionId,
          publishedAt: { not: null },
          dueAt: { lt: now },
        },
        select: { id: true, graceMinutes: true, dueAt: true },
      });

      const roster = await ctx.db.enrollment.findMany({
        where: { sectionId: input.sectionId, status: "ACTIVE" },
        select: { studentId: true },
      });

      let created = 0;
      for (const assignment of assignments) {
        const cutoff = new Date(
          assignment.dueAt.getTime() + assignment.graceMinutes * 60_000,
        );
        if (now < cutoff) continue;

        const submitted = await ctx.db.submission.findMany({
          where: { assignmentId: assignment.id },
          select: { studentId: true },
        });
        const has = new Set(submitted.map((s) => s.studentId));

        const missing = roster
          .filter((r) => !has.has(r.studentId))
          .map((r) => ({
            assignmentId: assignment.id,
            studentId: r.studentId,
            status: "MISSING" as const,
          }));

        if (missing.length > 0) {
          const result = await ctx.db.submission.createMany({
            data: missing,
            skipDuplicates: true,
          });
          created += result.count;
        }
      }

      return { flagged: created };
    }),
});
