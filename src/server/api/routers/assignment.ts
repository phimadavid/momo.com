import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  studentProcedure,
  teacherProcedure,
} from "~/server/api/trpc";
import {
  assertSectionAccess,
  assertTeachesSection,
} from "~/server/lib/permissions";
import type { PrismaClient } from "../../../../generated/prisma";

const assignmentTypes = [
  "LAB_REPORT",
  "ESSAY",
  "QUIZ",
  "EXAM",
  "DIAGRAM",
  "WORKSHEET",
  "PRACTICUM",
  "PROBLEM_SET",
  "DISCUSSION",
  "PROJECT",
] as const;

const submissionFormats = [
  "FILE_UPLOAD",
  "TEXT_ENTRY",
  "EXTERNAL_LINK",
  "ONLINE_ASSESSMENT",
  "ON_PAPER",
] as const;

export const assignmentRouter = createTRPCRouter({
  /** Assignments for a section, with per-student submission state for staff. */
  listForSection: protectedProcedure
    .input(
      z.object({
        sectionId: z.string(),
        includeUnpublished: z.boolean().default(false),
      }),
    )
    .query(async ({ ctx, input }) => {
      await assertSectionAccess(ctx.db, ctx.session.user, input.sectionId);
      const isStaff = ctx.session.user.role !== "STUDENT";

      return ctx.db.assignment.findMany({
        where: {
          sectionId: input.sectionId,
          ...(isStaff && input.includeUnpublished
            ? {}
            : { publishedAt: { not: null } }),
        },
        orderBy: { dueAt: "asc" },
        select: {
          id: true,
          title: true,
          description: true,
          type: true,
          format: true,
          pointsPossible: true,
          dueAt: true,
          closesAt: true,
          allowLate: true,
          graceMinutes: true,
          publishedAt: true,
          unit: { select: { id: true, title: true, order: true } },
          rubric: {
            select: { id: true, title: true, type: true, totalPoints: true },
          },
          category: { select: { id: true, name: true, weightPercent: true } },
          _count: { select: { submissions: true } },
          submissions: {
            where: { studentId: ctx.session.user.studentId ?? "" },
            orderBy: { attempt: "desc" },
            take: 1,
            select: {
              id: true,
              status: true,
              timeliness: true,
              submittedAt: true,
              grade: {
                select: {
                  score: true,
                  letter: true,
                  status: true,
                  releasedAt: true,
                },
              },
            },
          },
        },
      });
    }),

  /** Assignment detail including the full rubric breakdown. */
  get: protectedProcedure
    .input(z.object({ assignmentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const assignment = await ctx.db.assignment.findUnique({
        where: { id: input.assignmentId },
        select: {
          id: true,
          sectionId: true,
          title: true,
          description: true,
          type: true,
          format: true,
          pointsPossible: true,
          dueAt: true,
          availableFrom: true,
          closesAt: true,
          allowLate: true,
          graceMinutes: true,
          publishedAt: true,
          section: {
            select: {
              id: true,
              code: true,
              period: true,
              course: { select: { id: true, name: true, code: true } },
            },
          },
          unit: { select: { id: true, title: true, order: true } },
          lesson: { select: { id: true, title: true } },
          rubric: {
            select: {
              id: true,
              title: true,
              description: true,
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
          assessment: {
            select: {
              id: true,
              title: true,
              timeLimitMinutes: true,
              totalPoints: true,
              maxAttempts: true,
            },
          },
        },
      });

      if (!assignment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assignment not found.",
        });
      }
      await assertSectionAccess(ctx.db, ctx.session.user, assignment.sectionId);
      return assignment;
    }),

  /**
   * The student's "Due Soon" rail: published, still-open work in their active
   * sections that has not been submitted yet.
   */
  dueSoon: studentProcedure
    .input(
      z.object({ withinDays: z.number().int().min(1).max(60).default(14) }),
    )
    .query(async ({ ctx, input }) => {
      const horizon = new Date(
        Date.now() + input.withinDays * 24 * 60 * 60 * 1000,
      );

      const assignments = await ctx.db.assignment.findMany({
        where: {
          publishedAt: { not: null },
          dueAt: { lte: horizon },
          section: {
            enrollments: {
              some: { studentId: ctx.studentId, status: "ACTIVE" },
            },
          },
          NOT: {
            submissions: {
              some: {
                studentId: ctx.studentId,
                status: { in: ["SUBMITTED", "GRADED", "RETURNED", "EXCUSED"] },
              },
            },
          },
        },
        orderBy: { dueAt: "asc" },
        select: {
          id: true,
          title: true,
          type: true,
          format: true,
          pointsPossible: true,
          dueAt: true,
          allowLate: true,
          rubric: { select: { id: true, type: true } },
          section: {
            select: {
              id: true,
              code: true,
              course: { select: { name: true, code: true, colorToken: true } },
            },
          },
          submissions: {
            where: { studentId: ctx.studentId },
            select: { id: true, status: true },
            take: 1,
          },
        },
      });

      const now = Date.now();
      return assignments.map(({ submissions, ...assignment }) => ({
        ...assignment,
        draft: submissions[0] ?? null,
        isOverdue: assignment.dueAt.getTime() < now,
        hoursRemaining: Math.round(
          (assignment.dueAt.getTime() - now) / (60 * 60 * 1000),
        ),
      }));
    }),

  // --- Authoring ------------------------------------------------------------

  create: teacherProcedure
    .input(
      z.object({
        sectionId: z.string(),
        title: z.string().min(1).max(200),
        description: z.string().max(10_000).optional(),
        type: z.enum(assignmentTypes),
        format: z.enum(submissionFormats).default("FILE_UPLOAD"),
        pointsPossible: z.number().min(0).max(1000),
        dueAt: z.date(),
        availableFrom: z.date().optional(),
        closesAt: z.date().optional(),
        allowLate: z.boolean().default(true),
        graceMinutes: z.number().int().min(0).max(10_080).default(0),
        unitId: z.string().optional(),
        lessonId: z.string().optional(),
        categoryId: z.string().optional(),
        rubricId: z.string().optional(),
        publish: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertTeachesSection(ctx.db, ctx.session.user, input.sectionId);
      const { publish, ...data } = input;

      const assignment = await ctx.db.assignment.create({
        data: { ...data, publishedAt: publish ? new Date() : null },
      });

      if (publish) {
        await notifySectionOfAssignment(ctx.db, assignment.id);
      }
      return assignment;
    }),

  update: teacherProcedure
    .input(
      z.object({
        assignmentId: z.string(),
        title: z.string().min(1).max(200).optional(),
        description: z.string().max(10_000).optional(),
        pointsPossible: z.number().min(0).max(1000).optional(),
        dueAt: z.date().optional(),
        closesAt: z.date().nullable().optional(),
        allowLate: z.boolean().optional(),
        graceMinutes: z.number().int().min(0).max(10_080).optional(),
        categoryId: z.string().nullable().optional(),
        rubricId: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { assignmentId, ...data } = input;
      const assignment = await ctx.db.assignment.findUnique({
        where: { id: assignmentId },
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

      return ctx.db.assignment.update({ where: { id: assignmentId }, data });
    }),

  publish: teacherProcedure
    .input(z.object({ assignmentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const assignment = await ctx.db.assignment.findUnique({
        where: { id: input.assignmentId },
        select: { sectionId: true, publishedAt: true },
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

      const updated = await ctx.db.assignment.update({
        where: { id: input.assignmentId },
        data: { publishedAt: assignment.publishedAt ?? new Date() },
      });
      await notifySectionOfAssignment(ctx.db, updated.id);
      return updated;
    }),

  delete: teacherProcedure
    .input(z.object({ assignmentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const assignment = await ctx.db.assignment.findUnique({
        where: { id: input.assignmentId },
        select: { sectionId: true, _count: { select: { submissions: true } } },
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
      if (assignment._count.submissions > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "Unpublish instead: this assignment already has submissions.",
        });
      }
      return ctx.db.assignment.delete({ where: { id: input.assignmentId } });
    }),

  /** Creates a reusable criterion rubric. */
  createRubric: teacherProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        description: z.string().max(2000).optional(),
        type: z.enum(["STANDARD", "MANUAL"]).default("STANDARD"),
        criteria: z
          .array(
            z.object({
              title: z.string().min(1).max(200),
              description: z.string().max(2000).optional(),
              maxPoints: z.number().min(0).max(1000),
              levels: z
                .array(
                  z.object({
                    label: z.string().min(1).max(60),
                    points: z.number().min(0).max(1000),
                    description: z.string().max(1000).optional(),
                  }),
                )
                .default([]),
            }),
          )
          .min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const totalPoints = input.criteria.reduce(
        (sum, c) => sum + c.maxPoints,
        0,
      );

      return ctx.db.rubric.create({
        data: {
          title: input.title,
          description: input.description,
          type: input.type,
          totalPoints,
          criteria: {
            create: input.criteria.map((criterion, index) => ({
              title: criterion.title,
              description: criterion.description,
              maxPoints: criterion.maxPoints,
              order: index,
              levels: {
                create: criterion.levels.map((level, levelIndex) => ({
                  ...level,
                  order: levelIndex,
                })),
              },
            })),
          },
        },
        include: { criteria: { include: { levels: true } } },
      });
    }),
});

/** Fans out an ASSIGNMENT_DUE notification to the section's active roster. */
async function notifySectionOfAssignment(
  db: PrismaClient,
  assignmentId: string,
) {
  const assignment = await db.assignment.findUnique({
    where: { id: assignmentId },
    select: {
      title: true,
      dueAt: true,
      section: {
        select: {
          course: { select: { name: true } },
          enrollments: {
            where: { status: "ACTIVE" },
            select: { student: { select: { userId: true } } },
          },
        },
      },
    },
  });
  if (!assignment) return;

  await db.notification.createMany({
    data: assignment.section.enrollments.map((enrollment) => ({
      userId: enrollment.student.userId,
      type: "ASSIGNMENT_DUE" as const,
      title: `New assignment: ${assignment.title}`,
      body: `${assignment.section.course.name} — due ${assignment.dueAt.toLocaleString()}`,
      linkUrl: `/assignments/${assignmentId}`,
    })),
  });
}
