import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, teacherProcedure } from "~/server/api/trpc";
import { letterFor, refreshEnrollmentGrade, round } from "~/server/lib/grading";
import { assertTeachesSection } from "~/server/lib/permissions";
import type { Prisma } from "../../../../generated/prisma";

/** Scopes a query to the sections the caller may grade. */
const gradableSections = (
  role: string,
  teacherId: string | null,
): Prisma.SectionWhereInput =>
  role === "ADMIN" ? {} : { teacherId: teacherId ?? "" };

export const gradingRouter = createTRPCRouter({
  /**
   * The Priority Grading Queue. Ungraded submissions across the teacher's
   * sections, ordered so the oldest submitted work surfaces first.
   */
  queue: teacherProcedure
    .input(
      z.object({
        sectionId: z.string().optional(),
        sort: z.enum(["OLDEST", "NEWEST", "DUE_DATE"]).default("OLDEST"),
        cursor: z.string().nullish(),
        limit: z.number().int().min(1).max(50).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (input.sectionId) {
        await assertTeachesSection(ctx.db, ctx.session.user, input.sectionId);
      }

      const orderBy: Prisma.SubmissionOrderByWithRelationInput =
        input.sort === "NEWEST"
          ? { submittedAt: "desc" }
          : input.sort === "DUE_DATE"
            ? { assignment: { dueAt: "asc" } }
            : { submittedAt: "asc" };

      const items = await ctx.db.submission.findMany({
        where: {
          status: "SUBMITTED",
          OR: [
            { grade: null },
            { grade: { status: { in: ["PENDING", "IN_PROGRESS"] } } },
          ],
          assignment: {
            sectionId: input.sectionId,
            section: gradableSections(ctx.session.user.role, ctx.teacherId),
          },
        },
        orderBy,
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        select: {
          id: true,
          status: true,
          timeliness: true,
          submittedAt: true,
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
                  period: true,
                  course: { select: { name: true, code: true } },
                },
              },
              rubric: {
                select: {
                  id: true,
                  title: true,
                  type: true,
                  totalPoints: true,
                },
              },
            },
          },
          attachments: {
            select: {
              file: {
                select: {
                  fileName: true,
                  mimeType: true,
                  sizeBytes: true,
                  url: true,
                },
              },
            },
          },
          grade: { select: { id: true, status: true } },
        },
      });

      let nextCursor: string | null = null;
      if (items.length > input.limit) {
        nextCursor = items.pop()!.id;
      }

      return { items, nextCursor };
    }),

  /** Headline counts for the "Ungraded Queue" stat card. */
  queueSummary: teacherProcedure.query(async ({ ctx }) => {
    const sectionScope = gradableSections(ctx.session.user.role, ctx.teacherId);
    const soon = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const [total, dueWithin24h, sections] = await Promise.all([
      ctx.db.submission.count({
        where: {
          status: "SUBMITTED",
          OR: [
            { grade: null },
            { grade: { status: { in: ["PENDING", "IN_PROGRESS"] } } },
          ],
          assignment: { section: sectionScope },
        },
      }),
      ctx.db.submission.count({
        where: {
          status: "SUBMITTED",
          OR: [
            { grade: null },
            { grade: { status: { in: ["PENDING", "IN_PROGRESS"] } } },
          ],
          assignment: { section: sectionScope, dueAt: { lte: soon } },
        },
      }),
      ctx.db.section.count({ where: sectionScope }),
    ]);

    return { total, dueWithin24h, sections };
  }),

  /** Claims a submission so concurrent graders do not double up. */
  startGrading: teacherProcedure
    .input(z.object({ submissionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const submission = await ctx.db.submission.findUnique({
        where: { id: input.submissionId },
        select: { assignment: { select: { sectionId: true } } },
      });
      if (!submission) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Submission not found.",
        });
      }
      await assertTeachesSection(
        ctx.db,
        ctx.session.user,
        submission.assignment.sectionId,
      );

      return ctx.db.grade.upsert({
        where: { submissionId: input.submissionId },
        create: {
          submissionId: input.submissionId,
          status: "IN_PROGRESS",
          graderId: ctx.session.user.id,
        },
        update: { status: "IN_PROGRESS", graderId: ctx.session.user.id },
      });
    }),

  /**
   * Records a grade. Rubric-backed assignments derive the score from the
   * per-criterion points; manual-scale assignments take the score directly.
   * Releasing the grade refreshes the student's running section average.
   */
  gradeSubmission: teacherProcedure
    .input(
      z.object({
        submissionId: z.string(),
        score: z.number().min(0).optional(),
        rubricScores: z
          .array(
            z.object({
              criterionId: z.string(),
              levelId: z.string().optional(),
              points: z.number().min(0),
              comment: z.string().max(2000).optional(),
            }),
          )
          .default([]),
        latePenalty: z.number().min(0).default(0),
        feedback: z.string().max(20_000).optional(),
        release: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const submission = await ctx.db.submission.findUnique({
        where: { id: input.submissionId },
        select: {
          id: true,
          studentId: true,
          assignment: {
            select: {
              sectionId: true,
              pointsPossible: true,
              title: true,
              rubric: {
                select: {
                  type: true,
                  criteria: { select: { id: true, maxPoints: true } },
                },
              },
            },
          },
        },
      });
      if (!submission) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Submission not found.",
        });
      }
      const { assignment } = submission;
      await assertTeachesSection(
        ctx.db,
        ctx.session.user,
        assignment.sectionId,
      );

      const usesRubric = assignment.rubric?.type === "STANDARD";

      let rawScore: number;
      if (usesRubric && input.rubricScores.length > 0) {
        const allowed = new Map(
          assignment.rubric!.criteria.map((c) => [c.id, c.maxPoints]),
        );
        for (const entry of input.rubricScores) {
          const max = allowed.get(entry.criterionId);
          if (max === undefined) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Rubric score references an unknown criterion.",
            });
          }
          if (entry.points > max) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Criterion score exceeds its maximum of ${max}.`,
            });
          }
        }
        rawScore = input.rubricScores.reduce((sum, e) => sum + e.points, 0);
      } else {
        if (input.score === undefined) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "A score is required for manually graded work.",
          });
        }
        rawScore = input.score;
      }

      if (rawScore > assignment.pointsPossible) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Score exceeds the ${assignment.pointsPossible} points possible.`,
        });
      }

      const finalScore = Math.max(0, round(rawScore - input.latePenalty, 2));
      const percent =
        assignment.pointsPossible > 0
          ? (finalScore / assignment.pointsPossible) * 100
          : 0;
      const now = new Date();

      const grade = await ctx.db.$transaction(async (tx) => {
        const saved = await tx.grade.upsert({
          where: { submissionId: input.submissionId },
          create: {
            submissionId: input.submissionId,
            graderId: ctx.session.user.id,
            status: input.release ? "RELEASED" : "COMPLETED",
            score: finalScore,
            latePenalty: input.latePenalty,
            letter: letterFor(percent),
            feedback: input.feedback,
            gradedAt: now,
            releasedAt: input.release ? now : null,
          },
          update: {
            graderId: ctx.session.user.id,
            status: input.release ? "RELEASED" : "COMPLETED",
            score: finalScore,
            latePenalty: input.latePenalty,
            letter: letterFor(percent),
            feedback: input.feedback,
            gradedAt: now,
            releasedAt: input.release ? now : null,
          },
        });

        if (input.rubricScores.length > 0) {
          await tx.rubricScore.deleteMany({ where: { gradeId: saved.id } });
          await tx.rubricScore.createMany({
            data: input.rubricScores.map((entry) => ({
              gradeId: saved.id,
              ...entry,
            })),
          });
        }

        await tx.submission.update({
          where: { id: input.submissionId },
          data: { status: "GRADED" },
        });

        return saved;
      });

      if (input.release) {
        await refreshEnrollmentGrade(
          ctx.db,
          assignment.sectionId,
          submission.studentId,
          `Graded: ${assignment.title}`,
        );

        const student = await ctx.db.studentProfile.findUnique({
          where: { id: submission.studentId },
          select: { userId: true },
        });
        if (student) {
          await ctx.db.notification.create({
            data: {
              userId: student.userId,
              type: "GRADE_RELEASED",
              title: `Grade posted: ${assignment.title}`,
              body: `${finalScore} / ${assignment.pointsPossible} (${letterFor(percent)})`,
              linkUrl: `/assignments/submissions/${input.submissionId}`,
            },
          });
        }
      }

      return grade;
    }),

  /** Returns work to the student for revision without recording a score. */
  returnForRevision: teacherProcedure
    .input(
      z.object({
        submissionId: z.string(),
        feedback: z.string().min(1).max(20_000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const submission = await ctx.db.submission.findUnique({
        where: { id: input.submissionId },
        select: {
          studentId: true,
          assignment: { select: { sectionId: true, title: true } },
        },
      });
      if (!submission) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Submission not found.",
        });
      }
      await assertTeachesSection(
        ctx.db,
        ctx.session.user,
        submission.assignment.sectionId,
      );

      await ctx.db.$transaction([
        ctx.db.submission.update({
          where: { id: input.submissionId },
          data: { status: "RETURNED" },
        }),
        ctx.db.grade.upsert({
          where: { submissionId: input.submissionId },
          create: {
            submissionId: input.submissionId,
            graderId: ctx.session.user.id,
            status: "COMPLETED",
            feedback: input.feedback,
          },
          update: { feedback: input.feedback, graderId: ctx.session.user.id },
        }),
      ]);

      return { ok: true };
    }),

  /** Publishes every completed-but-unreleased grade for an assignment. */
  releaseAll: teacherProcedure
    .input(z.object({ assignmentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const assignment = await ctx.db.assignment.findUnique({
        where: { id: input.assignmentId },
        select: { sectionId: true, title: true },
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

      const pending = await ctx.db.grade.findMany({
        where: {
          status: "COMPLETED",
          submission: { assignmentId: input.assignmentId },
        },
        select: { id: true, submission: { select: { studentId: true } } },
      });

      const now = new Date();
      await ctx.db.grade.updateMany({
        where: { id: { in: pending.map((g) => g.id) } },
        data: { status: "RELEASED", releasedAt: now },
      });

      for (const grade of pending) {
        await refreshEnrollmentGrade(
          ctx.db,
          assignment.sectionId,
          grade.submission.studentId,
          `Released: ${assignment.title}`,
        );
      }

      return { released: pending.length };
    }),

  /** Excuses a student from an assignment so it stops counting against them. */
  excuse: teacherProcedure
    .input(z.object({ assignmentId: z.string(), studentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
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

      const existing = await ctx.db.submission.findFirst({
        where: { assignmentId: input.assignmentId, studentId: input.studentId },
        orderBy: { attempt: "desc" },
        select: { id: true },
      });

      return existing
        ? ctx.db.submission.update({
            where: { id: existing.id },
            data: { status: "EXCUSED" },
          })
        : ctx.db.submission.create({
            data: {
              assignmentId: input.assignmentId,
              studentId: input.studentId,
              status: "EXCUSED",
            },
          });
    }),

  /** Gradebook matrix for a section: roster × assignments. */
  gradebook: teacherProcedure
    .input(z.object({ sectionId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertTeachesSection(ctx.db, ctx.session.user, input.sectionId);

      const [assignments, enrollments] = await Promise.all([
        ctx.db.assignment.findMany({
          where: { sectionId: input.sectionId, publishedAt: { not: null } },
          orderBy: { dueAt: "asc" },
          select: {
            id: true,
            title: true,
            type: true,
            pointsPossible: true,
            dueAt: true,
            category: { select: { id: true, name: true, weightPercent: true } },
          },
        }),
        ctx.db.enrollment.findMany({
          where: { sectionId: input.sectionId, status: "ACTIVE" },
          orderBy: { student: { user: { name: "asc" } } },
          select: {
            id: true,
            currentPercent: true,
            currentLetter: true,
            student: {
              select: {
                id: true,
                studentNumber: true,
                user: { select: { name: true, image: true } },
                submissions: {
                  where: { assignment: { sectionId: input.sectionId } },
                  select: {
                    assignmentId: true,
                    status: true,
                    timeliness: true,
                    grade: {
                      select: { score: true, letter: true, status: true },
                    },
                  },
                },
              },
            },
          },
        }),
      ]);

      return {
        assignments,
        rows: enrollments.map((enrollment) => ({
          enrollmentId: enrollment.id,
          student: {
            id: enrollment.student.id,
            studentNumber: enrollment.student.studentNumber,
            name: enrollment.student.user.name,
            image: enrollment.student.user.image,
          },
          currentPercent: enrollment.currentPercent,
          currentLetter: enrollment.currentLetter,
          cells: Object.fromEntries(
            enrollment.student.submissions.map((submission) => [
              submission.assignmentId,
              {
                status: submission.status,
                timeliness: submission.timeliness,
                score: submission.grade?.score ?? null,
                letter: submission.grade?.letter ?? null,
                released: submission.grade?.status === "RELEASED",
              },
            ]),
          ),
        })),
      };
    }),
});
