import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  adminProcedure,
  createTRPCRouter,
  protectedProcedure,
  teacherProcedure,
} from "~/server/api/trpc";
import {
  assertSectionAccess,
  assertTeachesSection,
} from "~/server/lib/permissions";

export const courseRouter = createTRPCRouter({
  /**
   * Every section the caller is attached to this term — enrolled sections for a
   * student, taught sections for a teacher. Powers the "Active Courses" grid
   * and the section pickers.
   */
  mySections: protectedProcedure
    .input(z.object({ termId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const term = input?.termId
        ? { id: input.termId }
        : await ctx.db.term.findFirst({
            where: { isCurrent: true },
            select: { id: true },
          });
      if (!term) return [];

      const user = ctx.session.user;
      const sections = await ctx.db.section.findMany({
        where: {
          termId: term.id,
          ...(user.role === "TEACHER"
            ? { teacherId: user.teacherId ?? "" }
            : user.role === "STUDENT"
              ? {
                  enrollments: {
                    some: { studentId: user.studentId ?? "", status: "ACTIVE" },
                  },
                }
              : {}),
        },
        orderBy: { period: "asc" },
        select: {
          id: true,
          code: true,
          period: true,
          room: true,
          capacity: true,
          course: {
            select: {
              id: true,
              code: true,
              name: true,
              level: true,
              colorToken: true,
              department: { select: { name: true } },
            },
          },
          teacher: {
            select: {
              id: true,
              user: { select: { name: true, title: true, image: true } },
            },
          },
          meetings: {
            select: {
              dayOfWeek: true,
              rotation: true,
              startTime: true,
              endTime: true,
              room: true,
            },
          },
          _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
          // Empty for staff, since no enrollment is keyed to their profile.
          enrollments: {
            where: { studentId: user.studentId ?? "" },
            select: {
              currentPercent: true,
              currentLetter: true,
              syllabusPercent: true,
            },
          },
        },
      });

      // Surface the caller's own enrollment as a scalar rather than an array.
      return sections.map(({ enrollments, ...section }) => ({
        ...section,
        studentCount: section._count.enrollments,
        myGrade: enrollments[0] ?? null,
      }));
    }),

  /** Section detail with roster counts, meetings and syllabus pacing. */
  sectionDetail: protectedProcedure
    .input(z.object({ sectionId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertSectionAccess(ctx.db, ctx.session.user, input.sectionId);

      const section = await ctx.db.section.findUnique({
        where: { id: input.sectionId },
        select: {
          id: true,
          code: true,
          period: true,
          room: true,
          capacity: true,
          term: {
            select: { id: true, name: true, startDate: true, endDate: true },
          },
          course: {
            select: {
              id: true,
              code: true,
              name: true,
              description: true,
              level: true,
              colorToken: true,
              department: { select: { name: true } },
              units: {
                orderBy: { order: "asc" },
                select: {
                  id: true,
                  order: true,
                  title: true,
                  examDate: true,
                  _count: { select: { lessons: true } },
                },
              },
            },
          },
          teacher: {
            select: {
              id: true,
              officeLocation: true,
              user: {
                select: { id: true, name: true, title: true, image: true },
              },
              officeHours: {
                select: {
                  id: true,
                  dayOfWeek: true,
                  startTime: true,
                  endTime: true,
                  mode: true,
                  location: true,
                  meetingUrl: true,
                  label: true,
                },
              },
            },
          },
          meetings: {
            select: {
              dayOfWeek: true,
              rotation: true,
              startTime: true,
              endTime: true,
              room: true,
            },
          },
          gradeCategories: {
            select: { id: true, name: true, weightPercent: true },
          },
          pacing: { select: { unitId: true, status: true, completedAt: true } },
          _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
        },
      });

      if (!section) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Section not found.",
        });
      }

      const completedUnits = section.pacing.filter(
        (p) => p.status === "COMPLETED",
      ).length;
      const totalUnits = section.course.units.length;

      return {
        ...section,
        studentCount: section._count.enrollments,
        pacingSummary: {
          completedUnits,
          totalUnits,
          percent:
            totalUnits > 0
              ? Math.round((completedUnits / totalUnits) * 100)
              : 0,
        },
      };
    }),

  /** Full roster with running grades — the "View Master Roster" table. */
  roster: protectedProcedure
    .input(
      z.object({
        sectionId: z.string(),
        includeDropped: z.boolean().default(false),
      }),
    )
    .query(async ({ ctx, input }) => {
      await assertSectionAccess(ctx.db, ctx.session.user, input.sectionId);

      return ctx.db.enrollment.findMany({
        where: {
          sectionId: input.sectionId,
          ...(input.includeDropped ? {} : { status: "ACTIVE" }),
        },
        orderBy: { student: { user: { name: "asc" } } },
        select: {
          id: true,
          status: true,
          seatNo: true,
          currentPercent: true,
          currentLetter: true,
          syllabusPercent: true,
          student: {
            select: {
              id: true,
              studentNumber: true,
              gradeLevel: true,
              user: {
                select: { id: true, name: true, email: true, image: true },
              },
            },
          },
        },
      });
    }),

  /** Syllabus tree for a course, with the caller's lesson progress folded in. */
  syllabus: protectedProcedure
    .input(z.object({ courseId: z.string() }))
    .query(async ({ ctx, input }) => {
      const studentId = ctx.session.user.studentId;

      const units = await ctx.db.unit.findMany({
        where: { courseId: input.courseId },
        orderBy: { order: "asc" },
        select: {
          id: true,
          order: true,
          title: true,
          description: true,
          examDate: true,
          lessons: {
            where:
              ctx.session.user.role === "STUDENT" ? { isPublished: true } : {},
            orderBy: { order: "asc" },
            select: {
              id: true,
              order: true,
              title: true,
              summary: true,
              estimatedMinutes: true,
              prerequisiteId: true,
              progress: {
                where: { studentId: studentId ?? "" },
                select: {
                  status: true,
                  percentComplete: true,
                  positionSeconds: true,
                },
              },
            },
          },
        },
      });

      return units.map((unit) => {
        const lessons = unit.lessons.map(({ progress, ...lesson }) => ({
          ...lesson,
          myProgress: progress[0] ?? null,
        }));
        const done = lessons.filter(
          (l) => l.myProgress?.status === "COMPLETED",
        ).length;
        return {
          ...unit,
          lessons,
          completedLessons: done,
          percentComplete:
            lessons.length > 0 ? Math.round((done / lessons.length) * 100) : 0,
        };
      });
    }),

  /** Marks a unit's pacing state for a section ("7 of 10 modules"). */
  setPacing: teacherProcedure
    .input(
      z.object({
        sectionId: z.string(),
        unitId: z.string(),
        status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertTeachesSection(ctx.db, ctx.session.user, input.sectionId);

      const timestamps = {
        startedAt: input.status === "NOT_STARTED" ? null : new Date(),
        completedAt: input.status === "COMPLETED" ? new Date() : null,
      };

      return ctx.db.sectionPacing.upsert({
        where: {
          sectionId_unitId: {
            sectionId: input.sectionId,
            unitId: input.unitId,
          },
        },
        create: { ...input, ...timestamps },
        update: { status: input.status, ...timestamps },
      });
    }),

  // --- School configuration -------------------------------------------------

  createCourse: adminProcedure
    .input(
      z.object({
        code: z.string().min(2).max(20),
        name: z.string().min(2).max(120),
        description: z.string().max(2000).optional(),
        level: z
          .enum(["REGULAR", "HONORS", "AP", "IB", "ELECTIVE"])
          .default("REGULAR"),
        credits: z.number().min(0).max(10).default(1),
        departmentId: z.string(),
        colorToken: z.string().max(40).optional(),
      }),
    )
    .mutation(({ ctx, input }) => ctx.db.course.create({ data: input })),

  createSection: adminProcedure
    .input(
      z.object({
        courseId: z.string(),
        termId: z.string(),
        teacherId: z.string(),
        code: z.string().min(1).max(20),
        period: z.number().int().min(0).max(12),
        room: z.string().max(40).optional(),
        capacity: z.number().int().min(1).max(200).default(30),
        meetings: z
          .array(
            z.object({
              dayOfWeek: z.enum([
                "MONDAY",
                "TUESDAY",
                "WEDNESDAY",
                "THURSDAY",
                "FRIDAY",
                "SATURDAY",
                "SUNDAY",
              ]),
              rotation: z.enum(["ALL", "ODD", "EVEN"]).default("ALL"),
              startTime: z.string().regex(/^\d{2}:\d{2}$/),
              endTime: z.string().regex(/^\d{2}:\d{2}$/),
              room: z.string().max(40).optional(),
            }),
          )
          .default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { meetings, ...section } = input;
      return ctx.db.section.create({
        data: { ...section, meetings: { create: meetings } },
        include: { meetings: true },
      });
    }),

  enrollStudent: adminProcedure
    .input(
      z.object({
        sectionId: z.string(),
        studentId: z.string(),
        seatNo: z.number().int().positive().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const section = await ctx.db.section.findUnique({
        where: { id: input.sectionId },
        select: {
          capacity: true,
          _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
        },
      });
      if (!section) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Section not found.",
        });
      }
      if (section._count.enrollments >= section.capacity) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This section is at capacity.",
        });
      }

      return ctx.db.enrollment.upsert({
        where: {
          sectionId_studentId: {
            sectionId: input.sectionId,
            studentId: input.studentId,
          },
        },
        create: input,
        update: { status: "ACTIVE", droppedAt: null, seatNo: input.seatNo },
      });
    }),

  dropStudent: adminProcedure
    .input(z.object({ sectionId: z.string(), studentId: z.string() }))
    .mutation(({ ctx, input }) =>
      ctx.db.enrollment.update({
        where: {
          sectionId_studentId: {
            sectionId: input.sectionId,
            studentId: input.studentId,
          },
        },
        data: { status: "DROPPED", droppedAt: new Date() },
      }),
    ),
});
