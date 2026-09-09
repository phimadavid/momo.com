import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const notificationRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        unreadOnly: z.boolean().default(false),
        limit: z.number().int().min(1).max(50).default(20),
        cursor: z.string().nullish(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const items = await ctx.db.notification.findMany({
        where: {
          userId: ctx.session.user.id,
          ...(input.unreadOnly ? { readAt: null } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          linkUrl: true,
          readAt: true,
          createdAt: true,
        },
      });

      let nextCursor: string | null = null;
      if (items.length > input.limit) {
        nextCursor = items.pop()!.id;
      }
      return { items, nextCursor };
    }),

  /** Badge count for the bell icon. */
  unreadCount: protectedProcedure.query(({ ctx }) =>
    ctx.db.notification.count({
      where: { userId: ctx.session.user.id, readAt: null },
    }),
  ),

  markRead: protectedProcedure
    .input(z.object({ notificationIds: z.array(z.string()).min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.notification.updateMany({
        where: {
          id: { in: input.notificationIds },
          userId: ctx.session.user.id,
        },
        data: { readAt: new Date() },
      });
      return { updated: result.count };
    }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    const result = await ctx.db.notification.updateMany({
      where: { userId: ctx.session.user.id, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }),
});
