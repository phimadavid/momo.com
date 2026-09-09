import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  studentProcedure,
  teacherProcedure,
} from "~/server/api/trpc";
import { assertLessonAccess } from "~/server/lib/permissions";
import type { PrismaClient } from "../../../../generated/prisma";

/** Percentage of the video after which a lesson counts as watched. */
const COMPLETION_THRESHOLD = 95;

export const lessonRouter = createTRPCRouter({
  /**
   * Everything the lesson page renders: body tabs, video + markers, resources,
   * the caller's progress and notes, and sibling lessons for the unit rail.
   */
  get: protectedProcedure
    .input(z.object({ lessonId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertLessonAccess(ctx.db, ctx.session.user, input.lessonId);
      const studentId = ctx.session.user.studentId ?? "";

      const lesson = await ctx.db.lesson.findUnique({
        where: { id: input.lessonId },
        select: {
          id: true,
          order: true,
          title: true,
          summary: true,
          estimatedMinutes: true,
          videoUrl: true,
          videoDurationSeconds: true,
          transcriptUrl: true,
          prerequisiteId: true,
          prerequisite: { select: { id: true, title: true, order: true } },
          unit: {
            select: {
              id: true,
              order: true,
              title: true,
              examDate: true,
              course: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  level: true,
                  department: { select: { name: true } },
                },
              },
              lessons: {
                orderBy: { order: "asc" },
                select: {
                  id: true,
                  order: true,
                  title: true,
                  summary: true,
                  estimatedMinutes: true,
                  prerequisiteId: true,
                  progress: {
                    where: { studentId },
                    select: {
                      status: true,
                      percentComplete: true,
                      positionSeconds: true,
                    },
                  },
                },
              },
            },
          },
          sections: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              kind: true,
              title: true,
              body: true,
              order: true,
            },
          },
          resources: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              title: true,
              kind: true,
              url: true,
              detail: true,
              file: {
                select: {
                  id: true,
                  url: true,
                  fileName: true,
                  sizeBytes: true,
                  mimeType: true,
                },
              },
            },
          },
          markers: {
            orderBy: { positionSeconds: "asc" },
            select: { id: true, label: true, positionSeconds: true },
          },
          progress: {
            where: { studentId },
            select: {
              status: true,
              positionSeconds: true,
              percentComplete: true,
              lastViewedAt: true,
              completedAt: true,
            },
          },
          notes: {
            where: { studentId },
            orderBy: { timestampSeconds: "asc" },
            select: {
              id: true,
              body: true,
              timestampSeconds: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          assignments: {
            select: {
              id: true,
              title: true,
              type: true,
              dueAt: true,
              pointsPossible: true,
            },
          },
        },
      });

      if (!lesson) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Lesson not found.",
        });
      }

      const { progress, notes, unit, ...rest } = lesson;
      const siblings = unit.lessons.map(({ progress: p, ...l }) => ({
        ...l,
        myProgress: p[0] ?? null,
      }));

      // A gated lesson stays locked until its prerequisite is completed.
      const prerequisiteMet =
        !lesson.prerequisiteId ||
        siblings.find((l) => l.id === lesson.prerequisiteId)?.myProgress
          ?.status === "COMPLETED";

      return {
        ...rest,
        unit: { ...unit, lessons: siblings },
        myProgress: progress[0] ?? null,
        myNotes: notes,
        isLocked: ctx.session.user.role === "STUDENT" && !prerequisiteMet,
      };
    }),

  /**
   * Autosaves the player position. Crossing the completion threshold flips the
   * lesson to COMPLETED and refreshes the student's syllabus percentage.
   */
  saveProgress: studentProcedure
    .input(
      z.object({
        lessonId: z.string(),
        positionSeconds: z.number().int().min(0),
        durationSeconds: z.number().int().positive().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertLessonAccess(ctx.db, ctx.session.user, input.lessonId);

      const lesson = await ctx.db.lesson.findUniqueOrThrow({
        where: { id: input.lessonId },
        select: {
          videoDurationSeconds: true,
          unit: { select: { courseId: true } },
        },
      });

      const duration =
        lesson.videoDurationSeconds ?? input.durationSeconds ?? 0;
      const percent =
        duration > 0
          ? Math.min(100, Math.round((input.positionSeconds / duration) * 100))
          : 0;
      const completed = percent >= COMPLETION_THRESHOLD;

      const progress = await ctx.db.lessonProgress.upsert({
        where: {
          lessonId_studentId: {
            lessonId: input.lessonId,
            studentId: ctx.studentId,
          },
        },
        create: {
          lessonId: input.lessonId,
          studentId: ctx.studentId,
          status: completed ? "COMPLETED" : "IN_PROGRESS",
          positionSeconds: input.positionSeconds,
          percentComplete: percent,
          lastViewedAt: new Date(),
          completedAt: completed ? new Date() : null,
        },
        update: {
          status: completed ? "COMPLETED" : "IN_PROGRESS",
          positionSeconds: input.positionSeconds,
          percentComplete: percent,
          lastViewedAt: new Date(),
          ...(completed ? { completedAt: new Date() } : {}),
        },
      });

      if (completed) {
        await recomputeSyllabusPercent(
          ctx.db,
          ctx.studentId,
          lesson.unit.courseId,
        );
      }

      return progress;
    }),

  /** Explicit "Mark as Completed" checkbox on the lesson header. */
  setCompleted: studentProcedure
    .input(z.object({ lessonId: z.string(), completed: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await assertLessonAccess(ctx.db, ctx.session.user, input.lessonId);

      const lesson = await ctx.db.lesson.findUniqueOrThrow({
        where: { id: input.lessonId },
        select: { unit: { select: { courseId: true } } },
      });

      const progress = await ctx.db.lessonProgress.upsert({
        where: {
          lessonId_studentId: {
            lessonId: input.lessonId,
            studentId: ctx.studentId,
          },
        },
        create: {
          lessonId: input.lessonId,
          studentId: ctx.studentId,
          status: input.completed ? "COMPLETED" : "IN_PROGRESS",
          percentComplete: input.completed ? 100 : 0,
          completedAt: input.completed ? new Date() : null,
          lastViewedAt: new Date(),
        },
        update: {
          status: input.completed ? "COMPLETED" : "IN_PROGRESS",
          completedAt: input.completed ? new Date() : null,
          ...(input.completed ? { percentComplete: 100 } : {}),
        },
      });

      await recomputeSyllabusPercent(
        ctx.db,
        ctx.studentId,
        lesson.unit.courseId,
      );
      return progress;
    }),

  /** Timestamped note taken against the lecture video. */
  addNote: studentProcedure
    .input(
      z.object({
        lessonId: z.string(),
        body: z.string().min(1).max(5000),
        timestampSeconds: z.number().int().min(0).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertLessonAccess(ctx.db, ctx.session.user, input.lessonId);
      return ctx.db.lessonNote.create({
        data: { ...input, studentId: ctx.studentId },
      });
    }),

  updateNote: studentProcedure
    .input(z.object({ noteId: z.string(), body: z.string().min(1).max(5000) }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.lessonNote.updateMany({
        where: { id: input.noteId, studentId: ctx.studentId },
        data: { body: input.body },
      });
      if (result.count === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Note not found." });
      }
      return { ok: true };
    }),

  deleteNote: studentProcedure
    .input(z.object({ noteId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.lessonNote.deleteMany({
        where: { id: input.noteId, studentId: ctx.studentId },
      });
      if (result.count === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Note not found." });
      }
      return { ok: true };
    }),

  /** The most recent in-progress lesson — "Continue where you left off". */
  resumePoint: studentProcedure.query(async ({ ctx }) => {
    const progress = await ctx.db.lessonProgress.findFirst({
      where: { studentId: ctx.studentId, status: "IN_PROGRESS" },
      orderBy: { lastViewedAt: "desc" },
      select: {
        positionSeconds: true,
        percentComplete: true,
        lastViewedAt: true,
        lesson: {
          select: {
            id: true,
            title: true,
            order: true,
            summary: true,
            videoDurationSeconds: true,
            unit: {
              select: {
                id: true,
                order: true,
                title: true,
                course: { select: { id: true, name: true, code: true } },
              },
            },
          },
        },
      },
    });
    if (!progress) return null;

    const remainingSeconds = Math.max(
      0,
      (progress.lesson.videoDurationSeconds ?? 0) - progress.positionSeconds,
    );
    return { ...progress, remainingSeconds };
  }),

  /** How many students are currently viewing a lesson. */
  liveViewerCount: protectedProcedure
    .input(
      z.object({
        lessonId: z.string(),
        withinMinutes: z.number().int().min(1).max(120).default(15),
      }),
    )
    .query(async ({ ctx, input }) => {
      await assertLessonAccess(ctx.db, ctx.session.user, input.lessonId);
      const since = new Date(Date.now() - input.withinMinutes * 60_000);
      return ctx.db.lessonProgress.count({
        where: { lessonId: input.lessonId, lastViewedAt: { gte: since } },
      });
    }),

  // --- Authoring ------------------------------------------------------------

  upsertLesson: teacherProcedure
    .input(
      z.object({
        id: z.string().optional(),
        unitId: z.string(),
        order: z.number().int().min(1),
        title: z.string().min(1).max(200),
        summary: z.string().max(2000).optional(),
        estimatedMinutes: z.number().int().min(1).max(600).default(45),
        videoUrl: z.string().url().optional(),
        videoDurationSeconds: z.number().int().positive().optional(),
        transcriptUrl: z.string().url().optional(),
        prerequisiteId: z.string().optional(),
        isPublished: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const unit = await ctx.db.unit.findUnique({
        where: { id: data.unitId },
        select: { courseId: true },
      });
      if (!unit)
        throw new TRPCError({ code: "NOT_FOUND", message: "Unit not found." });

      if (ctx.session.user.role !== "ADMIN") {
        const teaches = await ctx.db.section.findFirst({
          where: { courseId: unit.courseId, teacherId: ctx.teacherId ?? "" },
          select: { id: true },
        });
        if (!teaches) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not teach this course.",
          });
        }
      }

      return id
        ? ctx.db.lesson.update({ where: { id }, data })
        : ctx.db.lesson.create({ data });
    }),

  upsertSection: teacherProcedure
    .input(
      z.object({
        id: z.string().optional(),
        lessonId: z.string(),
        kind: z.enum([
          "READING",
          "LAB_PROTOCOL",
          "SELF_CHECK",
          "FORMULA",
          "OVERVIEW",
        ]),
        title: z.string().min(1).max(200),
        body: z.string().max(50_000),
        order: z.number().int().min(0).default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertLessonAccess(ctx.db, ctx.session.user, input.lessonId);
      const { id, ...data } = input;
      return id
        ? ctx.db.lessonSection.update({ where: { id }, data })
        : ctx.db.lessonSection.create({ data });
    }),

  addResource: teacherProcedure
    .input(
      z.object({
        lessonId: z.string(),
        title: z.string().min(1).max(200),
        kind: z.enum([
          "PDF",
          "SLIDES",
          "DOCUMENT",
          "SPREADSHEET",
          "IMAGE",
          "VIDEO",
          "LINK",
          "TRANSCRIPT",
        ]),
        fileId: z.string().optional(),
        url: z.string().url().optional(),
        detail: z.string().max(120).optional(),
        order: z.number().int().min(0).default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertLessonAccess(ctx.db, ctx.session.user, input.lessonId);
      if (!input.fileId && !input.url) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A resource needs either an uploaded file or a URL.",
        });
      }
      return ctx.db.lessonResource.create({ data: input });
    }),
});

/**
 * Recomputes the cached syllabus percentage on every enrollment the student
 * holds in the course, based on completed published lessons.
 */
async function recomputeSyllabusPercent(
  db: PrismaClient,
  studentId: string,
  courseId: string,
) {
  const [total, completed] = await Promise.all([
    db.lesson.count({ where: { unit: { courseId }, isPublished: true } }),
    db.lessonProgress.count({
      where: {
        studentId,
        status: "COMPLETED",
        lesson: { unit: { courseId }, isPublished: true },
      },
    }),
  ]);

  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  await db.enrollment.updateMany({
    where: { studentId, section: { courseId }, status: "ACTIVE" },
    data: { syllabusPercent: percent },
  });
  return percent;
}
