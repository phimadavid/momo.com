import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  adminProcedure,
  createTRPCRouter,
  protectedProcedure,
  teacherProcedure,
} from "~/server/api/trpc";
import {
  assertStudentAccess,
  assertTeachesSection,
} from "~/server/lib/permissions";

export const userRouter = createTRPCRouter({
  /** The signed-in user plus whichever academic profile applies to them. */
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        title: true,
        role: true,
        studentProfile: {
          select: {
            id: true,
            studentNumber: true,
            gradeLevel: true,
            graduationYear: true,
            homeroom: true,
            cumulativeGpa: true,
            gpaPercentile: true,
            accommodations: {
              where: {
                OR: [{ activeTo: null }, { activeTo: { gt: new Date() } }],
              },
              select: { type: true, multiplier: true, notes: true },
            },
          },
        },
        teacherProfile: {
          select: {
            id: true,
            employeeNumber: true,
            officeLocation: true,
            bio: true,
            department: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });

    if (!user)
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
    return user;
  }),

  /** Current term header ("Fall 2024 – Term 1", week number). */
  currentTerm: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.term.findFirst({
      where: { isCurrent: true },
      select: {
        id: true,
        name: true,
        schoolYear: true,
        startDate: true,
        endDate: true,
      },
    });
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(120).optional(),
        image: z.string().url().optional(),
        title: z.string().max(20).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: input,
        select: { id: true, name: true, image: true, title: true },
      });
    }),

  /** Full academic snapshot of one student, for the teacher's profile drawer. */
  studentSnapshot: protectedProcedure
    .input(z.object({ studentId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertStudentAccess(ctx.db, ctx.session.user, input.studentId);

      const student = await ctx.db.studentProfile.findUnique({
        where: { id: input.studentId },
        select: {
          id: true,
          studentNumber: true,
          gradeLevel: true,
          cumulativeGpa: true,
          user: { select: { id: true, name: true, email: true, image: true } },
          guardians: {
            select: {
              isPrimary: true,
              guardian: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                  relationship: true,
                },
              },
            },
          },
          enrollments: {
            where: { status: "ACTIVE" },
            select: {
              id: true,
              currentPercent: true,
              currentLetter: true,
              section: {
                select: {
                  id: true,
                  code: true,
                  period: true,
                  course: { select: { name: true, code: true } },
                },
              },
            },
          },
          alerts: {
            where: { status: { in: ["OPEN", "ACKNOWLEDGED"] } },
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              type: true,
              severity: true,
              title: true,
              message: true,
              dueBy: true,
              createdAt: true,
            },
          },
        },
      });

      if (!student) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Student not found.",
        });
      }

      const [missing, attendance] = await Promise.all([
        ctx.db.submission.count({
          where: { studentId: input.studentId, status: "MISSING" },
        }),
        ctx.db.attendanceRecord.groupBy({
          by: ["status"],
          where: { studentId: input.studentId },
          _count: { _all: true },
        }),
      ]);

      return {
        ...student,
        missingCount: missing,
        attendance: Object.fromEntries(
          attendance.map((row) => [row.status, row._count._all]),
        ),
      };
    }),

  /** Roster search across the sections the calling teacher owns. */
  searchStudents: teacherProcedure
    .input(
      z.object({
        query: z.string().min(1).max(80),
        sectionId: z.string().optional(),
        limit: z.number().int().min(1).max(50).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (input.sectionId) {
        await assertTeachesSection(ctx.db, ctx.session.user, input.sectionId);
      }

      return ctx.db.studentProfile.findMany({
        where: {
          enrollments: {
            some: {
              status: "ACTIVE",
              sectionId: input.sectionId,
              section:
                ctx.session.user.role === "ADMIN"
                  ? undefined
                  : { teacherId: ctx.teacherId ?? "" },
            },
          },
          OR: [
            { studentNumber: { contains: input.query, mode: "insensitive" } },
            { user: { name: { contains: input.query, mode: "insensitive" } } },
            { user: { email: { contains: input.query, mode: "insensitive" } } },
          ],
        },
        take: input.limit,
        select: {
          id: true,
          studentNumber: true,
          gradeLevel: true,
          user: { select: { name: true, image: true } },
        },
      });
    }),

  /** Attaches or updates a student's testing accommodation. */
  setAccommodation: adminProcedure
    .input(
      z.object({
        studentId: z.string(),
        type: z.enum([
          "EXTENDED_TIME",
          "REDUCED_DISTRACTION",
          "READ_ALOUD",
          "BREAKS",
          "ASSISTIVE_TECH",
        ]),
        multiplier: z.number().min(1).max(3).default(1),
        notes: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.accommodation.create({ data: input });
    }),
});
