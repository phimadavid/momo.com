import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import type { PrismaClient } from "../../../../generated/prisma";

/**
 * Direct messaging between the people who share a classroom. A student may
 * only open a thread with a teacher who teaches them; teachers may message any
 * student on their roster (and each other).
 */
async function assertMayMessage(
  db: PrismaClient,
  actor: {
    id: string;
    role: string;
    studentId: string | null;
    teacherId: string | null;
  },
  recipientIds: string[],
) {
  if (actor.role === "ADMIN") return;

  const recipients = await db.user.findMany({
    where: { id: { in: recipientIds } },
    select: {
      id: true,
      role: true,
      studentProfile: { select: { id: true } },
      teacherProfile: { select: { id: true } },
    },
  });
  if (recipients.length !== recipientIds.length) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Recipient not found." });
  }

  for (const recipient of recipients) {
    if (recipient.role === "ADMIN") continue;

    const studentId =
      actor.role === "STUDENT" ? actor.studentId : recipient.studentProfile?.id;
    const teacherId =
      actor.role === "TEACHER" ? actor.teacherId : recipient.teacherProfile?.id;

    if (!studentId || !teacherId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You can only message people you share a class with.",
      });
    }

    const shared = await db.enrollment.findFirst({
      where: { studentId, status: "ACTIVE", section: { teacherId } },
      select: { id: true },
    });
    if (!shared) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You can only message people you share a class with.",
      });
    }
  }
}

export const messageRouter = createTRPCRouter({
  /** Inbox: threads ordered by latest activity, with unread counts. */
  threads: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      const conversations = await ctx.db.conversation.findMany({
        where: { participants: { some: { userId: ctx.session.user.id } } },
        orderBy: { updatedAt: "desc" },
        take: input.limit,
        select: {
          id: true,
          subject: true,
          updatedAt: true,
          participants: {
            select: {
              userId: true,
              lastReadAt: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  title: true,
                  role: true,
                },
              },
            },
          },
          messages: {
            orderBy: { sentAt: "desc" },
            take: 1,
            select: {
              id: true,
              body: true,
              sentAt: true,
              sender: { select: { id: true, name: true } },
            },
          },
        },
      });

      // Unread = messages sent after this participant's lastReadAt.
      return Promise.all(
        conversations.map(async (conversation) => {
          const me = conversation.participants.find(
            (p) => p.userId === ctx.session.user.id,
          );
          const unread = await ctx.db.message.count({
            where: {
              conversationId: conversation.id,
              senderId: { not: ctx.session.user.id },
              ...(me?.lastReadAt ? { sentAt: { gt: me.lastReadAt } } : {}),
            },
          });
          return {
            ...conversation,
            latestMessage: conversation.messages[0] ?? null,
            others: conversation.participants
              .filter((p) => p.userId !== ctx.session.user.id)
              .map((p) => p.user),
            unread,
          };
        }),
      );
    }),

  /** Messages in one thread, oldest first. */
  thread: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        limit: z.number().int().min(1).max(200).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const participant = await ctx.db.conversationParticipant.findUnique({
        where: {
          conversationId_userId: {
            conversationId: input.conversationId,
            userId: ctx.session.user.id,
          },
        },
        select: { id: true },
      });
      if (!participant) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not in this conversation.",
        });
      }

      return ctx.db.message.findMany({
        where: { conversationId: input.conversationId },
        orderBy: { sentAt: "asc" },
        take: input.limit,
        select: {
          id: true,
          body: true,
          sentAt: true,
          sender: {
            select: {
              id: true,
              name: true,
              image: true,
              title: true,
              role: true,
            },
          },
        },
      });
    }),

  /** Opens a thread (reusing an existing 1:1 thread) and posts the first message. */
  start: protectedProcedure
    .input(
      z.object({
        recipientIds: z.array(z.string()).min(1).max(20),
        subject: z.string().max(200).optional(),
        body: z.string().min(1).max(20_000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertMayMessage(ctx.db, ctx.session.user, input.recipientIds);

      const participantIds = [
        ...new Set([ctx.session.user.id, ...input.recipientIds]),
      ];

      // Reuse the existing thread for a straight 1:1 conversation.
      let conversationId: string | null = null;
      if (participantIds.length === 2) {
        const existing = await ctx.db.conversation.findFirst({
          where: {
            AND: participantIds.map((userId) => ({
              participants: { some: { userId } },
            })),
            participants: { every: { userId: { in: participantIds } } },
          },
          select: { id: true },
        });
        conversationId = existing?.id ?? null;
      }

      if (!conversationId) {
        const created = await ctx.db.conversation.create({
          data: {
            subject: input.subject,
            participants: {
              create: participantIds.map((userId) => ({ userId })),
            },
          },
          select: { id: true },
        });
        conversationId = created.id;
      }

      const message = await ctx.db.message.create({
        data: {
          conversationId,
          senderId: ctx.session.user.id,
          body: input.body,
        },
      });

      await ctx.db.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      await ctx.db.notification.createMany({
        data: input.recipientIds.map((userId) => ({
          userId,
          type: "MESSAGE" as const,
          title: `New message from ${ctx.session.user.name ?? "a colleague"}`,
          body: input.body.slice(0, 200),
          linkUrl: `/messages/${conversationId}`,
        })),
      });

      return { conversationId, messageId: message.id };
    }),

  send: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        body: z.string().min(1).max(20_000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const conversation = await ctx.db.conversation.findFirst({
        where: {
          id: input.conversationId,
          participants: { some: { userId: ctx.session.user.id } },
        },
        select: { id: true, participants: { select: { userId: true } } },
      });
      if (!conversation) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not in this conversation.",
        });
      }

      const message = await ctx.db.message.create({
        data: {
          conversationId: input.conversationId,
          senderId: ctx.session.user.id,
          body: input.body,
        },
      });

      await ctx.db.conversation.update({
        where: { id: input.conversationId },
        data: { updatedAt: new Date() },
      });

      await ctx.db.notification.createMany({
        data: conversation.participants
          .filter((p) => p.userId !== ctx.session.user.id)
          .map((p) => ({
            userId: p.userId,
            type: "MESSAGE" as const,
            title: `New message from ${ctx.session.user.name ?? "a colleague"}`,
            body: input.body.slice(0, 200),
            linkUrl: `/messages/${input.conversationId}`,
          })),
      });

      return message;
    }),

  markRead: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(({ ctx, input }) =>
      ctx.db.conversationParticipant.update({
        where: {
          conversationId_userId: {
            conversationId: input.conversationId,
            userId: ctx.session.user.id,
          },
        },
        data: { lastReadAt: new Date() },
      }),
    ),
});
