import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  createTRPCRouter,
  studentProcedure,
  teacherProcedure,
} from "~/server/api/trpc";
import {
  atTime,
  dayOfWeekOf,
  isOddRotationDay,
  toDateOnly,
} from "~/server/lib/dates";
import { assertTeachesSection } from "~/server/lib/permissions";

const attendanceStatuses = [
  "PRESENT",
  "ABSENT",
  "EXCUSED",
  "TARDY",
  "REMOTE",
] as const;

export const attendanceRouter = createTRPCRouter({
  /**
   * The "Daily Roster & Period Attendance" strip: every section the teacher
   * meets on the given date, ordered by period, with each one's live state.
   */
  daySchedule: teacherProcedure
    .input(z.object({ date: z.date().optional() }))
    .query(async ({ ctx, input }) => {
      const date = input.date ?? new Date();
      const dayOfWeek = dayOfWeekOf(date);

      const term = await ctx.db.term.findFirst({
        where: { isCurrent: true },
        select: { id: true, startDate: true },
      });
      if (!term)
        return { date, dayOfWeek, rotation: "ALL" as const, periods: [] };

      const odd = isOddRotationDay(term.startDate, date);
      const rotation = odd ? ("ODD" as const) : ("EVEN" as const);

      const sections = await ctx.db.section.findMany({
        where: {
          termId: term.id,
          ...(ctx.session.user.role === "ADMIN"
            ? {}
            : { teacherId: ctx.teacherId ?? "" }),
          meetings: {
            some: { dayOfWeek, rotation: { in: ["ALL", rotation] } },
          },
        },
        orderBy: { period: "asc" },
        select: {
          id: true,
          code: true,
          period: true,
          room: true,
          course: { select: { id: true, name: true, code: true } },
          meetings: {
            where: { dayOfWeek, rotation: { in: ["ALL", rotation] } },
            select: { startTime: true, endTime: true, room: true },
          },
          _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
          attendanceSessions: {
            where: { date: toDateOnly(date) },
            select: {
              id: true,
              status: true,
              submittedAt: true,
              _count: { select: { records: true } },
              records: {
                where: { status: { in: ["PRESENT", "REMOTE"] } },
                select: { id: true },
              },
            },
          },
        },
      });

      const now = Date.now();
      const periods = sections.map((section) => {
        const meeting = section.meetings[0];
        const session = section.attendanceSessions[0] ?? null;
        const startsAt = meeting ? atTime(date, meeting.startTime) : null;
        const endsAt = meeting ? atTime(date, meeting.endTime) : null;

        const state =
          session?.status === "SUBMITTED"
            ? ("SUBMITTED" as const)
            : startsAt &&
                endsAt &&
                now >= startsAt.getTime() &&
                now <= endsAt.getTime()
              ? ("IN_SESSION" as const)
              : startsAt && now < startsAt.getTime()
                ? ("UPCOMING" as const)
                : ("PENDING" as const);

        return {
          sectionId: section.id,
          sectionCode: section.code,
          course: section.course,
          period: section.period,
          room: meeting?.room ?? section.room,
          startTime: meeting?.startTime ?? null,
          endTime: meeting?.endTime ?? null,
          enrolled: section._count.enrollments,
          state,
          sessionId: session?.id ?? null,
          submittedAt: session?.submittedAt ?? null,
          presentCount: session?.records.length ?? null,
        };
      });

      return { date, dayOfWeek, rotation, periods };
    }),

  /**
   * Opens the roster for a class meeting, pre-filling everyone as present so
   * the teacher only has to mark exceptions.
   */
  openSession: teacherProcedure
    .input(z.object({ sectionId: z.string(), date: z.date().optional() }))
    .mutation(async ({ ctx, input }) => {
      const section = await assertTeachesSection(
        ctx.db,
        ctx.session.user,
        input.sectionId,
      );
      const date = toDateOnly(input.date ?? new Date());

      const period = await ctx.db.section.findUniqueOrThrow({
        where: { id: section.id },
        select: { period: true },
      });

      const session = await ctx.db.attendanceSession.upsert({
        where: { sectionId_date: { sectionId: input.sectionId, date } },
        create: {
          sectionId: input.sectionId,
          date,
          period: period.period,
          status: "IN_SESSION",
          takenById: ctx.session.user.id,
        },
        update: { status: "IN_SESSION", takenById: ctx.session.user.id },
      });

      const roster = await ctx.db.enrollment.findMany({
        where: { sectionId: input.sectionId, status: "ACTIVE" },
        select: { studentId: true },
      });

      await ctx.db.attendanceRecord.createMany({
        data: roster.map((entry) => ({
          sessionId: session.id,
          studentId: entry.studentId,
          status: "PRESENT" as const,
        })),
        skipDuplicates: true,
      });

      return session;
    }),

  /** Roster for an open session, with each student's current mark. */
  session: teacherProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const session = await ctx.db.attendanceSession.findUnique({
        where: { id: input.sessionId },
        select: {
          id: true,
          date: true,
          period: true,
          status: true,
          submittedAt: true,
          note: true,
          sectionId: true,
          section: {
            select: {
              id: true,
              code: true,
              room: true,
              course: { select: { name: true, code: true } },
            },
          },
          records: {
            orderBy: { student: { user: { name: "asc" } } },
            select: {
              id: true,
              status: true,
              minutesLate: true,
              note: true,
              student: {
                select: {
                  id: true,
                  studentNumber: true,
                  user: { select: { name: true, image: true } },
                },
              },
            },
          },
        },
      });
      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session not found.",
        });
      }
      await assertTeachesSection(ctx.db, ctx.session.user, session.sectionId);
      return session;
    }),

  /** Saves marks for one or many students without closing the session. */
  mark: teacherProcedure
    .input(
      z.object({
        sessionId: z.string(),
        marks: z
          .array(
            z.object({
              studentId: z.string(),
              status: z.enum(attendanceStatuses),
              minutesLate: z.number().int().min(0).max(240).optional(),
              note: z.string().max(500).optional(),
            }),
          )
          .min(1)
          .max(200),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.db.attendanceSession.findUnique({
        where: { id: input.sessionId },
        select: { id: true, sectionId: true, status: true },
      });
      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session not found.",
        });
      }
      await assertTeachesSection(ctx.db, ctx.session.user, session.sectionId);

      await ctx.db.$transaction(
        input.marks.map((mark) =>
          ctx.db.attendanceRecord.upsert({
            where: {
              sessionId_studentId: {
                sessionId: input.sessionId,
                studentId: mark.studentId,
              },
            },
            create: { sessionId: input.sessionId, ...mark },
            update: {
              status: mark.status,
              minutesLate: mark.minutesLate,
              note: mark.note,
            },
          }),
        ),
      );

      return { updated: input.marks.length };
    }),

  /** Finalises attendance for the period. */
  submitSession: teacherProcedure
    .input(
      z.object({ sessionId: z.string(), note: z.string().max(500).optional() }),
    )
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.db.attendanceSession.findUnique({
        where: { id: input.sessionId },
        select: { id: true, sectionId: true },
      });
      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session not found.",
        });
      }
      await assertTeachesSection(ctx.db, ctx.session.user, session.sectionId);

      return ctx.db.attendanceSession.update({
        where: { id: input.sessionId },
        data: {
          status: "SUBMITTED",
          submittedAt: new Date(),
          note: input.note,
          takenById: ctx.session.user.id,
        },
      });
    }),

  /**
   * School-day attendance rate across the teacher's sections, with the change
   * against the previous school day — the "Today's Attendance" stat card.
   */
  todaySummary: teacherProcedure
    .input(z.object({ date: z.date().optional() }))
    .query(async ({ ctx, input }) => {
      const date = toDateOnly(input.date ?? new Date());
      const sectionScope =
        ctx.session.user.role === "ADMIN"
          ? {}
          : { teacherId: ctx.teacherId ?? "" };

      const rateFor = async (on: Date) => {
        const rows = await ctx.db.attendanceRecord.groupBy({
          by: ["status"],
          where: { session: { date: on, section: sectionScope } },
          _count: { _all: true },
        });
        const counts = Object.fromEntries(
          rows.map((row) => [row.status, row._count._all]),
        ) as Partial<Record<(typeof attendanceStatuses)[number], number>>;

        const total = Object.values(counts).reduce(
          (sum, n) => sum + (n ?? 0),
          0,
        );
        const present =
          (counts.PRESENT ?? 0) + (counts.REMOTE ?? 0) + (counts.TARDY ?? 0);
        return {
          counts,
          total,
          rate: total > 0 ? Math.round((present / total) * 1000) / 10 : null,
        };
      };

      const previousDay = new Date(date);
      previousDay.setUTCDate(previousDay.getUTCDate() - 1);

      const [today, yesterday] = await Promise.all([
        rateFor(date),
        rateFor(previousDay),
      ]);

      return {
        date,
        rate: today.rate,
        excused: today.counts.EXCUSED ?? 0,
        absent: today.counts.ABSENT ?? 0,
        tardy: today.counts.TARDY ?? 0,
        totalMarked: today.total,
        deltaFromPreviousDay:
          today.rate !== null && yesterday.rate !== null
            ? Math.round((today.rate - yesterday.rate) * 10) / 10
            : null,
      };
    }),

  /** The student's own attendance record — "42 of 43 days". */
  myRecord: studentProcedure
    .input(z.object({ sectionId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.attendanceRecord.groupBy({
        by: ["status"],
        where: {
          studentId: ctx.studentId,
          ...(input.sectionId
            ? { session: { sectionId: input.sectionId } }
            : {}),
        },
        _count: { _all: true },
      });

      const counts = Object.fromEntries(
        rows.map((row) => [row.status, row._count._all]),
      ) as Partial<Record<(typeof attendanceStatuses)[number], number>>;

      const total = Object.values(counts).reduce((sum, n) => sum + (n ?? 0), 0);
      const present = (counts.PRESENT ?? 0) + (counts.REMOTE ?? 0);

      return {
        present,
        absent: counts.ABSENT ?? 0,
        excused: counts.EXCUSED ?? 0,
        tardy: counts.TARDY ?? 0,
        total,
        rate: total > 0 ? Math.round((present / total) * 1000) / 10 : null,
        inGoodStanding: (counts.ABSENT ?? 0) === 0,
      };
    }),
});
