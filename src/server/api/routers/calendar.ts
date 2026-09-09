import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  studentProcedure,
  teacherProcedure,
} from "~/server/api/trpc";
import {
  dayOfWeekOf,
  endOfDay,
  startOfDay,
  toDateOnly,
} from "~/server/lib/dates";
import { assertTeachesSection } from "~/server/lib/permissions";
import type { Prisma } from "../../../../generated/prisma";

export const calendarRouter = createTRPCRouter({
  /**
   * Unified agenda for a date range: scheduled events, class meetings and
   * assignment deadlines for whichever sections the caller belongs to.
   */
  agenda: protectedProcedure
    .input(
      z.object({
        from: z.date(),
        to: z.date(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const user = ctx.session.user;
      const sectionFilter: Prisma.SectionWhereInput =
        user.role === "TEACHER"
          ? { teacherId: user.teacherId ?? "" }
          : user.role === "STUDENT"
            ? {
                enrollments: {
                  some: { studentId: user.studentId ?? "", status: "ACTIVE" },
                },
              }
            : {};

      const from = startOfDay(input.from);
      const to = endOfDay(input.to);

      const [events, assignments] = await Promise.all([
        ctx.db.calendarEvent.findMany({
          where: {
            startAt: { gte: from, lte: to },
            OR: [{ sectionId: null }, { section: sectionFilter }],
          },
          orderBy: { startAt: "asc" },
          select: {
            id: true,
            title: true,
            description: true,
            type: true,
            startAt: true,
            endAt: true,
            allDay: true,
            location: true,
            section: {
              select: {
                id: true,
                code: true,
                course: { select: { name: true } },
              },
            },
          },
        }),
        ctx.db.assignment.findMany({
          where: {
            publishedAt: { not: null },
            dueAt: { gte: from, lte: to },
            section: sectionFilter,
          },
          orderBy: { dueAt: "asc" },
          select: {
            id: true,
            title: true,
            type: true,
            dueAt: true,
            pointsPossible: true,
            section: {
              select: {
                id: true,
                code: true,
                course: { select: { name: true } },
              },
            },
          },
        }),
      ]);

      return {
        events,
        deadlines: assignments.map((assignment) => ({
          ...assignment,
          type: "ASSIGNMENT_DUE" as const,
        })),
      };
    }),

  /** Class meetings for one weekday — the period timetable. */
  timetable: protectedProcedure
    .input(z.object({ date: z.date().optional() }))
    .query(async ({ ctx, input }) => {
      const date = input.date ?? new Date();
      const user = ctx.session.user;

      return ctx.db.sectionMeeting.findMany({
        where: {
          dayOfWeek: dayOfWeekOf(date),
          section: {
            term: { isCurrent: true },
            ...(user.role === "TEACHER"
              ? { teacherId: user.teacherId ?? "" }
              : user.role === "STUDENT"
                ? {
                    enrollments: {
                      some: {
                        studentId: user.studentId ?? "",
                        status: "ACTIVE",
                      },
                    },
                  }
                : {}),
          },
        },
        orderBy: { startTime: "asc" },
        select: {
          id: true,
          dayOfWeek: true,
          rotation: true,
          startTime: true,
          endTime: true,
          room: true,
          section: {
            select: {
              id: true,
              code: true,
              period: true,
              room: true,
              course: {
                select: { id: true, name: true, code: true, colorToken: true },
              },
              teacher: {
                select: { user: { select: { name: true, title: true } } },
              },
            },
          },
        },
      });
    }),

  createEvent: teacherProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        description: z.string().max(2000).optional(),
        type: z.enum([
          "CLASS",
          "EXAM",
          "ASSIGNMENT_DUE",
          "OFFICE_HOURS",
          "SCHOOL_EVENT",
          "ADMIN_DEADLINE",
        ]),
        startAt: z.date(),
        endAt: z.date().optional(),
        allDay: z.boolean().default(false),
        location: z.string().max(120).optional(),
        sectionId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.sectionId) {
        await assertTeachesSection(ctx.db, ctx.session.user, input.sectionId);
      } else if (ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only administrators can create school-wide events.",
        });
      }

      return ctx.db.calendarEvent.create({
        data: { ...input, createdById: ctx.session.user.id },
      });
    }),

  deleteEvent: teacherProcedure
    .input(z.object({ eventId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const event = await ctx.db.calendarEvent.findUnique({
        where: { id: input.eventId },
        select: { createdById: true, sectionId: true },
      });
      if (!event) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found." });
      }
      if (event.sectionId) {
        await assertTeachesSection(ctx.db, ctx.session.user, event.sectionId);
      } else if (ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your event." });
      }
      return ctx.db.calendarEvent.delete({ where: { id: input.eventId } });
    }),

  // --- Office hours ---------------------------------------------------------

  /** Office-hour slots for a teacher, with remaining capacity on each date. */
  officeHours: protectedProcedure
    .input(z.object({ teacherId: z.string(), date: z.date().optional() }))
    .query(async ({ ctx, input }) => {
      const date = toDateOnly(input.date ?? new Date());

      const slots = await ctx.db.officeHour.findMany({
        where: { teacherId: input.teacherId },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
        select: {
          id: true,
          dayOfWeek: true,
          startTime: true,
          endTime: true,
          mode: true,
          location: true,
          meetingUrl: true,
          capacity: true,
          label: true,
          _count: {
            select: { bookings: { where: { date, status: "RESERVED" } } },
          },
          bookings: {
            where: { date, studentId: ctx.session.user.studentId ?? "" },
            select: { id: true, status: true, topic: true },
          },
        },
      });

      return slots.map(({ _count, bookings, ...slot }) => ({
        ...slot,
        reserved: _count.bookings,
        seatsLeft: Math.max(0, slot.capacity - _count.bookings),
        myBooking: bookings[0] ?? null,
      }));
    }),

  bookOfficeHour: studentProcedure
    .input(
      z.object({
        officeHourId: z.string(),
        date: z.date(),
        topic: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const date = toDateOnly(input.date);
      const slot = await ctx.db.officeHour.findUnique({
        where: { id: input.officeHourId },
        select: {
          id: true,
          capacity: true,
          dayOfWeek: true,
          _count: {
            select: { bookings: { where: { date, status: "RESERVED" } } },
          },
        },
      });
      if (!slot) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Office hour not found.",
        });
      }
      if (dayOfWeekOf(input.date) !== slot.dayOfWeek) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "That slot does not run on the chosen date.",
        });
      }
      if (slot._count.bookings >= slot.capacity) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "That slot is full.",
        });
      }

      return ctx.db.officeHourBooking.upsert({
        where: {
          officeHourId_studentId_date: {
            officeHourId: input.officeHourId,
            studentId: ctx.studentId,
            date,
          },
        },
        create: {
          officeHourId: input.officeHourId,
          studentId: ctx.studentId,
          date,
          topic: input.topic,
        },
        update: { status: "RESERVED", topic: input.topic },
      });
    }),

  cancelOfficeHour: studentProcedure
    .input(z.object({ bookingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.officeHourBooking.updateMany({
        where: { id: input.bookingId, studentId: ctx.studentId },
        data: { status: "CANCELLED" },
      });
      if (result.count === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Booking not found.",
        });
      }
      return { ok: true };
    }),

  setOfficeHours: teacherProcedure
    .input(
      z.object({
        slots: z
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
              startTime: z.string().regex(/^\d{2}:\d{2}$/),
              endTime: z.string().regex(/^\d{2}:\d{2}$/),
              mode: z
                .enum(["IN_PERSON", "VIRTUAL", "HYBRID"])
                .default("IN_PERSON"),
              location: z.string().max(120).optional(),
              meetingUrl: z.string().url().optional(),
              capacity: z.number().int().min(1).max(50).default(6),
              label: z.string().max(120).optional(),
            }),
          )
          .max(20),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.teacherId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No teacher profile on this account.",
        });
      }
      const teacherId = ctx.teacherId;

      // Replace the schedule wholesale; existing bookings cascade away with it.
      await ctx.db.officeHour.deleteMany({ where: { teacherId } });
      await ctx.db.officeHour.createMany({
        data: input.slots.map((slot) => ({ ...slot, teacherId })),
      });

      return ctx.db.officeHour.findMany({ where: { teacherId } });
    }),
});
