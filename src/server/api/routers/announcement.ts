import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  teacherProcedure,
} from "~/server/api/trpc";
import { assertTeachesSection } from "~/server/lib/permissions";
import type { Prisma } from "../../../../generated/prisma";

export const announcementRouter = createTRPCRouter({
  /**
   * The announcement feed: school-wide posts plus anything targeted at a
   * section the caller belongs to.
   */
  feed: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(50).default(10),
        cursor: z.string().nullish(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const user = ctx.session.user;

      const sectionScope: Prisma.SectionWhereInput | undefined =
        user.role === "TEACHER"
          ? { teacherId: user.teacherId ?? "" }
          : user.role === "STUDENT"
            ? {
                enrollments: {
                  some: { studentId: user.studentId ?? "", status: "ACTIVE" },
                },
              }
            : undefined;

      const now = new Date();
      const items = await ctx.db.announcement.findMany({
        where: {
          publishedAt: { lte: now },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          ...(user.role === "ADMIN"
            ? {}
            : {
                AND: [
                  {
                    OR: [
                      { scope: { in: ["SCHOOL", "DEPARTMENT"] } },
                      { section: sectionScope },
                      { authorId: user.id },
                    ],
                  },
                ],
              }),
        },
        orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        select: {
          id: true,
          scope: true,
          title: true,
          body: true,
          isPinned: true,
          publishedAt: true,
          expiresAt: true,
          author: {
            select: {
              id: true,
              name: true,
              title: true,
              image: true,
              role: true,
            },
          },
          section: {
            select: {
              id: true,
              code: true,
              course: { select: { name: true, code: true } },
            },
          },
          reads: { where: { userId: user.id }, select: { readAt: true } },
        },
      });

      let nextCursor: string | null = null;
      if (items.length > input.limit) {
        nextCursor = items.pop()!.id;
      }

      return {
        items: items.map(({ reads, ...announcement }) => ({
          ...announcement,
          isRead: reads.length > 0,
        })),
        nextCursor,
      };
    }),

  markRead: protectedProcedure
    .input(z.object({ announcementId: z.string() }))
    .mutation(({ ctx, input }) =>
      ctx.db.announcementRead.upsert({
        where: {
          announcementId_userId: {
            announcementId: input.announcementId,
            userId: ctx.session.user.id,
          },
        },
        create: {
          announcementId: input.announcementId,
          userId: ctx.session.user.id,
        },
        update: {},
      }),
    ),

  /** Posts an announcement and notifies the audience. */
  post: teacherProcedure
    .input(
      z.object({
        scope: z.enum(["SCHOOL", "DEPARTMENT", "COURSE", "SECTION"]),
        sectionId: z.string().optional(),
        title: z.string().min(1).max(200),
        body: z.string().min(1).max(20_000),
        isPinned: z.boolean().default(false),
        expiresAt: z.date().optional(),
        notify: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.scope === "SECTION") {
        if (!input.sectionId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "A section is required for section announcements.",
          });
        }
        await assertTeachesSection(ctx.db, ctx.session.user, input.sectionId);
      } else if (ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only administrators can post beyond their own sections.",
        });
      }

      const { notify, ...data } = input;
      const announcement = await ctx.db.announcement.create({
        data: { ...data, authorId: ctx.session.user.id },
      });

      if (notify && input.sectionId) {
        const roster = await ctx.db.enrollment.findMany({
          where: { sectionId: input.sectionId, status: "ACTIVE" },
          select: { student: { select: { userId: true } } },
        });
        await ctx.db.notification.createMany({
          data: roster.map((entry) => ({
            userId: entry.student.userId,
            type: "ANNOUNCEMENT" as const,
            title: input.title,
            body: input.body.slice(0, 200),
            linkUrl: `/announcements/${announcement.id}`,
          })),
        });
      }

      return announcement;
    }),

  /** Broadcasts to every section the teacher owns in one action. */
  broadcast: teacherProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        body: z.string().min(1).max(20_000),
        isPinned: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const sections = await ctx.db.section.findMany({
        where:
          ctx.session.user.role === "ADMIN"
            ? {}
            : { teacherId: ctx.teacherId ?? "" },
        select: { id: true },
      });
      if (sections.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You have no sections to broadcast to.",
        });
      }

      await ctx.db.announcement.createMany({
        data: sections.map((section) => ({
          authorId: ctx.session.user.id,
          scope: "SECTION" as const,
          sectionId: section.id,
          title: input.title,
          body: input.body,
          isPinned: input.isPinned,
        })),
      });

      const roster = await ctx.db.enrollment.findMany({
        where: {
          sectionId: { in: sections.map((s) => s.id) },
          status: "ACTIVE",
        },
        select: { student: { select: { userId: true } } },
        distinct: ["studentId"],
      });

      await ctx.db.notification.createMany({
        data: roster.map((entry) => ({
          userId: entry.student.userId,
          type: "ANNOUNCEMENT" as const,
          title: input.title,
          body: input.body.slice(0, 200),
          linkUrl: "/announcements",
        })),
      });

      return { sections: sections.length, notified: roster.length };
    }),

  delete: teacherProcedure
    .input(z.object({ announcementId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const announcement = await ctx.db.announcement.findUnique({
        where: { id: input.announcementId },
        select: { authorId: true },
      });
      if (!announcement) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Announcement not found.",
        });
      }
      if (
        announcement.authorId !== ctx.session.user.id &&
        ctx.session.user.role !== "ADMIN"
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only delete your own announcements.",
        });
      }
      return ctx.db.announcement.delete({
        where: { id: input.announcementId },
      });
    }),
});
