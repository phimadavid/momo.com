import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  teacherProcedure,
} from "~/server/api/trpc";
import {
  assertStudentAccess,
  assertTeachesSection,
} from "~/server/lib/permissions";
import type { Prisma, PrismaClient } from "../../../../generated/prisma";

/** Thresholds that drive automatic detection. */
const RULES = {
  /** Missing assignments before a student is flagged at-risk. */
  missingWorkCount: 2,
  /** Percentage-point fall between snapshots that counts as a grade drop. */
  gradeDropPoints: 8,
  /** Days without a lesson view that counts as inactivity. */
  inactivityDays: 4,
} as const;

export const alertRouter = createTRPCRouter({
  /** Open alerts across the teacher's sections — "Student Attention Alerts". */
  list: teacherProcedure
    .input(
      z.object({
        sectionId: z.string().optional(),
        status: z
          .enum(["OPEN", "ACKNOWLEDGED", "RESOLVED", "DISMISSED"])
          .default("OPEN"),
        severity: z.enum(["INFO", "WARNING", "CRITICAL"]).optional(),
        limit: z.number().int().min(1).max(50).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (input.sectionId) {
        await assertTeachesSection(ctx.db, ctx.session.user, input.sectionId);
      }

      const where: Prisma.AlertWhereInput = {
        status: input.status,
        severity: input.severity,
        section: input.sectionId
          ? { id: input.sectionId }
          : ctx.session.user.role === "ADMIN"
            ? undefined
            : { teacherId: ctx.teacherId ?? "" },
      };

      const [items, total] = await Promise.all([
        ctx.db.alert.findMany({
          where,
          orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
          take: input.limit,
          select: {
            id: true,
            type: true,
            severity: true,
            status: true,
            title: true,
            message: true,
            metadata: true,
            dueBy: true,
            createdAt: true,
            section: {
              select: {
                id: true,
                code: true,
                course: { select: { name: true, code: true } },
              },
            },
            student: {
              select: {
                id: true,
                studentNumber: true,
                user: { select: { id: true, name: true, image: true } },
                enrollments: {
                  where: { status: "ACTIVE" },
                  select: {
                    sectionId: true,
                    currentPercent: true,
                    currentLetter: true,
                  },
                },
              },
            },
            actions: {
              orderBy: { performedAt: "desc" },
              take: 3,
              select: {
                id: true,
                type: true,
                notes: true,
                performedAt: true,
                performedBy: { select: { name: true } },
              },
            },
          },
        }),
        ctx.db.alert.count({ where }),
      ]);

      // Fold in the grade for the section the alert belongs to.
      const enriched = items.map(({ student, ...alert }) => {
        const enrollment = student.enrollments.find(
          (e) => e.sectionId === alert.section?.id,
        );
        return {
          ...alert,
          student: {
            id: student.id,
            studentNumber: student.studentNumber,
            user: student.user,
          },
          currentPercent: enrollment?.currentPercent ?? null,
          currentLetter: enrollment?.currentLetter ?? null,
        };
      });

      return { items: enriched, total };
    }),

  /** Alerts raised on the caller (or a student they supervise). */
  forStudent: protectedProcedure
    .input(z.object({ studentId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const studentId = input.studentId ?? ctx.session.user.studentId;
      if (!studentId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No student specified.",
        });
      }
      await assertStudentAccess(ctx.db, ctx.session.user, studentId);

      return ctx.db.alert.findMany({
        where: { studentId, status: { in: ["OPEN", "ACKNOWLEDGED"] } },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          type: true,
          severity: true,
          title: true,
          message: true,
          dueBy: true,
          createdAt: true,
          section: {
            select: {
              id: true,
              code: true,
              course: { select: { name: true } },
            },
          },
        },
      });
    }),

  /**
   * Rescans a section and raises alerts for missing work, grade drops, missed
   * assessments and inactivity. Idempotent: an equivalent open alert is
   * refreshed rather than duplicated.
   */
  scanSection: teacherProcedure
    .input(z.object({ sectionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertTeachesSection(ctx.db, ctx.session.user, input.sectionId);
      return scanSectionForAlerts(ctx.db, input.sectionId);
    }),

  /** Raises an alert by hand. */
  create: teacherProcedure
    .input(
      z.object({
        studentId: z.string(),
        sectionId: z.string(),
        type: z.enum([
          "MISSING_WORK",
          "GRADE_DROP",
          "ATTENDANCE",
          "MISSED_ASSESSMENT",
          "INACTIVITY",
          "BEHAVIOR",
        ]),
        severity: z.enum(["INFO", "WARNING", "CRITICAL"]).default("WARNING"),
        title: z.string().min(1).max(200),
        message: z.string().min(1).max(2000),
        dueBy: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertTeachesSection(ctx.db, ctx.session.user, input.sectionId);
      return ctx.db.alert.create({ data: input });
    }),

  /**
   * Logs an intervention: contacting a guardian, scheduling a make-up slot,
   * assigning a peer tutor, or referring to a counselor.
   */
  act: teacherProcedure
    .input(
      z.object({
        alertId: z.string(),
        type: z.enum([
          "CONTACT_GUARDIAN",
          "SCHEDULE_MAKEUP",
          "ASSIGN_PEER_TUTOR",
          "COUNSELOR_REFERRAL",
          "STUDENT_CONFERENCE",
          "NOTE",
        ]),
        notes: z.string().max(2000).optional(),
        /** Peer-tutor assignments need the tutor's student id. */
        tutorId: z.string().optional(),
        /** Make-up scheduling carries the slot being offered. */
        scheduledFor: z.date().optional(),
        acknowledge: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const alert = await ctx.db.alert.findUnique({
        where: { id: input.alertId },
        select: {
          id: true,
          sectionId: true,
          studentId: true,
          title: true,
          student: { select: { userId: true } },
        },
      });
      if (!alert) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Alert not found." });
      }
      if (alert.sectionId) {
        await assertTeachesSection(ctx.db, ctx.session.user, alert.sectionId);
      }

      if (input.type === "ASSIGN_PEER_TUTOR") {
        if (!input.tutorId || !alert.sectionId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "A tutor and a section are required to assign peer tutoring.",
          });
        }
        await ctx.db.peerTutorAssignment.create({
          data: {
            studentId: alert.studentId,
            tutorId: input.tutorId,
            sectionId: alert.sectionId,
            notes: input.notes,
          },
        });
      }

      const action = await ctx.db.interventionAction.create({
        data: {
          alertId: input.alertId,
          type: input.type,
          notes: input.notes,
          payload: input.scheduledFor
            ? { scheduledFor: input.scheduledFor.toISOString() }
            : undefined,
          performedById: ctx.session.user.id,
        },
      });

      if (input.acknowledge) {
        await ctx.db.alert.update({
          where: { id: input.alertId },
          data: { status: "ACKNOWLEDGED" },
        });
      }

      // Keep the student in the loop for the actions that concern them.
      if (
        ["SCHEDULE_MAKEUP", "ASSIGN_PEER_TUTOR", "STUDENT_CONFERENCE"].includes(
          input.type,
        )
      ) {
        await ctx.db.notification.create({
          data: {
            userId: alert.student.userId,
            type: "ALERT",
            title: alert.title,
            body: input.notes ?? "Your teacher has set up support for you.",
            linkUrl: "/dashboard",
          },
        });
      }

      return action;
    }),

  setStatus: teacherProcedure
    .input(
      z.object({
        alertId: z.string(),
        status: z.enum(["OPEN", "ACKNOWLEDGED", "RESOLVED", "DISMISSED"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const alert = await ctx.db.alert.findUnique({
        where: { id: input.alertId },
        select: { sectionId: true },
      });
      if (!alert) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Alert not found." });
      }
      if (alert.sectionId) {
        await assertTeachesSection(ctx.db, ctx.session.user, alert.sectionId);
      }

      const resolved =
        input.status === "RESOLVED" || input.status === "DISMISSED";
      return ctx.db.alert.update({
        where: { id: input.alertId },
        data: {
          status: input.status,
          resolvedAt: resolved ? new Date() : null,
          resolvedById: resolved ? ctx.session.user.id : null,
        },
      });
    }),
});

/**
 * Detection pass for one section. Each rule produces at most one open alert per
 * student per type; re-running refreshes the message instead of piling up.
 */
export async function scanSectionForAlerts(
  db: PrismaClient,
  sectionId: string,
) {
  const enrollments = await db.enrollment.findMany({
    where: { sectionId, status: "ACTIVE" },
    select: {
      id: true,
      studentId: true,
      currentPercent: true,
      snapshots: {
        orderBy: { capturedAt: "desc" },
        take: 5,
        select: { percent: true, capturedAt: true },
      },
    },
  });

  const raised: Array<{ studentId: string; type: string }> = [];

  for (const enrollment of enrollments) {
    // --- Missing work -------------------------------------------------------
    const missing = await db.submission.findMany({
      where: {
        studentId: enrollment.studentId,
        status: "MISSING",
        assignment: { sectionId },
      },
      select: { assignment: { select: { id: true, title: true } } },
    });

    if (missing.length >= RULES.missingWorkCount) {
      const titles = missing.map((m) => m.assignment.title);
      await upsertAlert(db, {
        studentId: enrollment.studentId,
        sectionId,
        type: "MISSING_WORK",
        severity: missing.length >= 3 ? "CRITICAL" : "WARNING",
        title: `${missing.length} missing assignments`,
        message: `Missing ${titles.slice(0, 3).join(", ")}${
          titles.length > 3 ? ` and ${titles.length - 3} more` : ""
        }.`,
        metadata: {
          count: missing.length,
          assignmentIds: missing.map((m) => m.assignment.id),
        },
      });
      raised.push({ studentId: enrollment.studentId, type: "MISSING_WORK" });
    }

    // --- Grade drop ---------------------------------------------------------
    const [latest, previous] = enrollment.snapshots;
    if (latest && previous) {
      const drop = previous.percent - latest.percent;
      if (drop >= RULES.gradeDropPoints) {
        await upsertAlert(db, {
          studentId: enrollment.studentId,
          sectionId,
          type: "GRADE_DROP",
          severity: drop >= 15 ? "CRITICAL" : "WARNING",
          title: "Grade drop",
          message: `Drop from ${previous.percent}% to ${latest.percent}%.`,
          metadata: { from: previous.percent, to: latest.percent, drop },
        });
        raised.push({ studentId: enrollment.studentId, type: "GRADE_DROP" });
      }
    }

    // --- Missed assessment --------------------------------------------------
    const missed = await db.assessment.findMany({
      where: {
        sectionId,
        publishedAt: { not: null },
        closesAt: { lt: new Date() },
        attempts: { none: { studentId: enrollment.studentId } },
      },
      select: { id: true, title: true, closesAt: true },
    });

    for (const assessment of missed) {
      await upsertAlert(db, {
        studentId: enrollment.studentId,
        sectionId,
        type: "MISSED_ASSESSMENT",
        severity: "CRITICAL",
        title: `Missed ${assessment.title}`,
        message: "No attempt was recorded before the window closed.",
        metadata: { assessmentId: assessment.id },
        // Make-up windows conventionally run 48 hours past the close.
        dueBy: assessment.closesAt
          ? new Date(assessment.closesAt.getTime() + 48 * 60 * 60 * 1000)
          : undefined,
      });
      raised.push({
        studentId: enrollment.studentId,
        type: "MISSED_ASSESSMENT",
      });
    }

    // --- Inactivity ---------------------------------------------------------
    const cutoff = new Date(
      Date.now() - RULES.inactivityDays * 24 * 60 * 60 * 1000,
    );
    const recentActivity = await db.lessonProgress.count({
      where: { studentId: enrollment.studentId, lastViewedAt: { gte: cutoff } },
    });
    if (recentActivity === 0) {
      await upsertAlert(db, {
        studentId: enrollment.studentId,
        sectionId,
        type: "INACTIVITY",
        severity: "INFO",
        title: `No activity in ${RULES.inactivityDays} days`,
        message: "No lesson views recorded recently.",
        metadata: { since: cutoff.toISOString() },
      });
      raised.push({ studentId: enrollment.studentId, type: "INACTIVITY" });
    }
  }

  return { scanned: enrollments.length, raised: raised.length };
}

type AlertDraft = {
  studentId: string;
  sectionId: string;
  type: Prisma.AlertCreateInput["type"];
  severity: Prisma.AlertCreateInput["severity"];
  title: string;
  message: string;
  metadata?: Prisma.InputJsonValue;
  dueBy?: Date;
};

/** Refreshes an equivalent open alert, or creates one if none exists. */
async function upsertAlert(db: PrismaClient, draft: AlertDraft) {
  const existing = await db.alert.findFirst({
    where: {
      studentId: draft.studentId,
      sectionId: draft.sectionId,
      type: draft.type,
      status: { in: ["OPEN", "ACKNOWLEDGED"] },
    },
    select: { id: true },
  });

  if (existing) {
    return db.alert.update({
      where: { id: existing.id },
      data: {
        severity: draft.severity,
        title: draft.title,
        message: draft.message,
        metadata: draft.metadata,
        dueBy: draft.dueBy,
      },
    });
  }

  return db.alert.create({ data: { ...draft, status: "OPEN" } });
}
