import { z } from "zod";

import {
  createTRPCRouter,
  studentProcedure,
  teacherProcedure,
} from "~/server/api/trpc";
import { dayOfWeekOf, toDateOnly, weekOfTerm } from "~/server/lib/dates";
import { computeGpa, distributionOf, round } from "~/server/lib/grading";

export const dashboardRouter = createTRPCRouter({
  /**
   * Teacher Command Center header: enrolment, grading backlog, attendance and
   * at-risk counts across every section the teacher owns this term.
   */
  teacherOverview: teacherProcedure.query(async ({ ctx }) => {
    const sectionScope =
      ctx.session.user.role === "ADMIN"
        ? {}
        : { teacherId: ctx.teacherId ?? "" };
    const today = toDateOnly(new Date());
    const soon = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const [
      term,
      sectionCount,
      enrolledCount,
      ungraded,
      ungradedSoon,
      attendanceRows,
      atRisk,
      pendingSessions,
    ] = await Promise.all([
      ctx.db.term.findFirst({
        where: { isCurrent: true },
        select: {
          id: true,
          name: true,
          schoolYear: true,
          startDate: true,
          endDate: true,
        },
      }),
      ctx.db.section.count({ where: sectionScope }),
      ctx.db.enrollment.count({
        where: { status: "ACTIVE", section: sectionScope },
      }),
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
      ctx.db.attendanceRecord.groupBy({
        by: ["status"],
        where: { session: { date: today, section: sectionScope } },
        _count: { _all: true },
      }),
      ctx.db.alert.count({
        where: { status: "OPEN", section: sectionScope },
      }),
      ctx.db.attendanceSession.count({
        where: {
          date: today,
          status: { not: "SUBMITTED" },
          section: sectionScope,
        },
      }),
    ]);

    const counts = Object.fromEntries(
      attendanceRows.map((row) => [row.status, row._count._all]),
    ) as Record<string, number>;
    const marked = Object.values(counts).reduce((sum, n) => sum + n, 0);
    const present =
      (counts.PRESENT ?? 0) + (counts.REMOTE ?? 0) + (counts.TARDY ?? 0);

    return {
      term: term
        ? { ...term, week: weekOfTerm(term.startDate, new Date()) }
        : null,
      totalEnrolled: enrolledCount,
      sectionCount,
      ungradedCount: ungraded,
      ungradedDueWithin24h: ungradedSoon,
      attendanceRate: marked > 0 ? round((present / marked) * 100) : null,
      excusedToday: counts.EXCUSED ?? 0,
      atRiskCount: atRisk,
      attendancePending: pendingSessions,
    };
  }),

  /**
   * Per-section performance cards: class average, letter and the A/B/C/D-F
   * distribution used by the bar charts.
   */
  sectionPerformance: teacherProcedure
    .input(z.object({ termId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const termId =
        input?.termId ??
        (
          await ctx.db.term.findFirst({
            where: { isCurrent: true },
            select: { id: true },
          })
        )?.id;
      if (!termId) return [];

      const sections = await ctx.db.section.findMany({
        where: {
          termId,
          ...(ctx.session.user.role === "ADMIN"
            ? {}
            : { teacherId: ctx.teacherId ?? "" }),
        },
        orderBy: { period: "asc" },
        select: {
          id: true,
          code: true,
          period: true,
          course: {
            select: {
              id: true,
              name: true,
              code: true,
              level: true,
              colorToken: true,
            },
          },
          enrollments: {
            where: { status: "ACTIVE" },
            select: { currentPercent: true },
          },
          pacing: { select: { status: true } },
          _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
        },
      });

      // The unit currently in progress doubles as the syllabus label.
      const currentUnits = await ctx.db.sectionPacing.findMany({
        where: {
          sectionId: { in: sections.map((s) => s.id) },
          status: "IN_PROGRESS",
        },
        select: {
          sectionId: true,
          unit: { select: { order: true, title: true } },
        },
      });
      const unitBySection = new Map(
        currentUnits.map((row) => [row.sectionId, row.unit]),
      );

      return sections.map((section) => {
        const percents = section.enrollments
          .map((e) => e.currentPercent)
          .filter((p): p is number => p !== null);
        const average =
          percents.length > 0
            ? round(percents.reduce((sum, p) => sum + p, 0) / percents.length)
            : null;

        return {
          sectionId: section.id,
          sectionCode: section.code,
          period: section.period,
          course: section.course,
          studentCount: section._count.enrollments,
          classAverage: average,
          distribution: distributionOf(percents),
          gradedStudents: percents.length,
          currentUnit: unitBySection.get(section.id) ?? null,
        };
      });
    }),

  /** Curriculum pacing across the term — "7 of 10 Modules • 70%". */
  pacingSummary: teacherProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.sectionPacing.groupBy({
      by: ["status"],
      where: {
        section:
          ctx.session.user.role === "ADMIN"
            ? {}
            : { teacherId: ctx.teacherId ?? "" },
      },
      _count: { _all: true },
    });

    const counts = Object.fromEntries(
      rows.map((row) => [row.status, row._count._all]),
    ) as Record<string, number>;
    const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
    const completed = counts.COMPLETED ?? 0;

    return {
      completedModules: completed,
      totalModules: total,
      percent: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }),

  /** Today's office hours plus how many students have reserved a slot. */
  officeHoursToday: teacherProcedure.query(async ({ ctx }) => {
    if (!ctx.teacherId) return [];
    const now = new Date();

    return ctx.db.officeHour.findMany({
      where: { teacherId: ctx.teacherId, dayOfWeek: dayOfWeekOf(now) },
      orderBy: { startTime: "asc" },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        mode: true,
        location: true,
        meetingUrl: true,
        capacity: true,
        label: true,
        _count: {
          select: {
            bookings: { where: { date: toDateOnly(now), status: "RESERVED" } },
          },
        },
      },
    });
  }),

  /**
   * Student dashboard header: GPA, attendance standing and the day's remaining
   * classes.
   */
  studentOverview: studentProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const today = toDateOnly(now);

    const [profile, term, attendanceRows, gpa] = await Promise.all([
      ctx.db.studentProfile.findUniqueOrThrow({
        where: { id: ctx.studentId },
        select: {
          id: true,
          studentNumber: true,
          gradeLevel: true,
          cumulativeGpa: true,
          gpaPercentile: true,
          user: { select: { name: true, image: true } },
        },
      }),
      ctx.db.term.findFirst({
        where: { isCurrent: true },
        select: { id: true, name: true, startDate: true },
      }),
      ctx.db.attendanceRecord.groupBy({
        by: ["status"],
        where: { studentId: ctx.studentId },
        _count: { _all: true },
      }),
      computeGpa(ctx.db, ctx.studentId),
    ]);

    const counts = Object.fromEntries(
      attendanceRows.map((row) => [row.status, row._count._all]),
    ) as Record<string, number>;
    const totalDays = Object.values(counts).reduce((sum, n) => sum + n, 0);
    const present = (counts.PRESENT ?? 0) + (counts.REMOTE ?? 0);

    // Classes still ahead today, by period.
    const meetings = await ctx.db.sectionMeeting.findMany({
      where: {
        dayOfWeek: dayOfWeekOf(now),
        section: {
          termId: term?.id,
          enrollments: { some: { studentId: ctx.studentId, status: "ACTIVE" } },
        },
      },
      orderBy: { startTime: "asc" },
      select: {
        startTime: true,
        endTime: true,
        room: true,
        section: {
          select: {
            id: true,
            code: true,
            period: true,
            room: true,
            course: { select: { name: true, code: true } },
          },
        },
      },
    });

    const nowLabel = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes(),
    ).padStart(2, "0")}`;
    const remaining = meetings.filter((m) => m.endTime >= nowLabel);

    const [openAlerts, pendingSubmissions] = await Promise.all([
      ctx.db.alert.count({
        where: {
          studentId: ctx.studentId,
          status: { in: ["OPEN", "ACKNOWLEDGED"] },
        },
      }),
      ctx.db.submission.count({
        where: { studentId: ctx.studentId, status: "MISSING" },
      }),
    ]);

    return {
      profile,
      term,
      gpa: gpa ?? profile.cumulativeGpa,
      gpaPercentile: profile.gpaPercentile,
      attendance: {
        present,
        excused: counts.EXCUSED ?? 0,
        tardy: counts.TARDY ?? 0,
        absent: counts.ABSENT ?? 0,
        totalDays,
        rate: totalDays > 0 ? round((present / totalDays) * 100) : null,
        inGoodStanding: (counts.ABSENT ?? 0) === 0,
      },
      classesRemainingToday: remaining.length,
      nextClass: remaining[0] ?? null,
      todayDate: today,
      openAlerts,
      missingWork: pendingSubmissions,
    };
  }),

  /** Recomputes and caches the student's GPA after grades change. */
  refreshGpa: studentProcedure.mutation(async ({ ctx }) => {
    const gpa = await computeGpa(ctx.db, ctx.studentId);
    await ctx.db.studentProfile.update({
      where: { id: ctx.studentId },
      data: { cumulativeGpa: gpa },
    });
    return { gpa };
  }),
});
