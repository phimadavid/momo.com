import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  studentProcedure,
  teacherProcedure,
} from "~/server/api/trpc";
import { letterFor, refreshEnrollmentGrade, round } from "~/server/lib/grading";
import {
  assertEnrolled,
  assertSectionAccess,
  assertTeachesSection,
} from "~/server/lib/permissions";
import type { PrismaClient } from "../../../../generated/prisma";

/** Question types the engine can score without a human in the loop. */
const AUTO_SCORED = [
  "MULTIPLE_CHOICE",
  "MULTI_SELECT",
  "TRUE_FALSE",
  "NUMERIC",
];

export const assessmentRouter = createTRPCRouter({
  /** Assessments visible in a section, with the caller's attempt history. */
  listForSection: protectedProcedure
    .input(z.object({ sectionId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertSectionAccess(ctx.db, ctx.session.user, input.sectionId);

      return ctx.db.assessment.findMany({
        where: {
          sectionId: input.sectionId,
          ...(ctx.session.user.role === "STUDENT"
            ? { publishedAt: { not: null } }
            : {}),
        },
        orderBy: { opensAt: "asc" },
        select: {
          id: true,
          title: true,
          instructions: true,
          standards: true,
          totalPoints: true,
          timeLimitMinutes: true,
          maxAttempts: true,
          opensAt: true,
          closesAt: true,
          lockdownEnabled: true,
          publishedAt: true,
          _count: { select: { questions: true } },
          attempts: {
            where: { studentId: ctx.session.user.studentId ?? "" },
            orderBy: { attempt: "desc" },
            select: {
              id: true,
              attempt: true,
              status: true,
              startedAt: true,
              submittedAt: true,
              expiresAt: true,
              totalScore: true,
            },
          },
        },
      });
    }),

  /**
   * Opens (or resumes) an attempt. The deadline is computed once at start so a
   * page reload cannot extend it; accommodations add their extra minutes here.
   */
  startAttempt: studentProcedure
    .input(z.object({ assessmentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const assessment = await ctx.db.assessment.findUnique({
        where: { id: input.assessmentId },
        select: {
          id: true,
          sectionId: true,
          maxAttempts: true,
          timeLimitMinutes: true,
          opensAt: true,
          closesAt: true,
          publishedAt: true,
        },
      });
      if (!assessment?.publishedAt) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assessment not found.",
        });
      }
      await assertEnrolled(ctx.db, ctx.session.user, assessment.sectionId);

      const now = new Date();
      if (assessment.opensAt && now < assessment.opensAt) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This assessment has not opened yet.",
        });
      }
      if (assessment.closesAt && now > assessment.closesAt) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This assessment is closed.",
        });
      }

      const existing = await ctx.db.assessmentAttempt.findFirst({
        where: { assessmentId: assessment.id, studentId: ctx.studentId },
        orderBy: { attempt: "desc" },
        select: { id: true, attempt: true, status: true, expiresAt: true },
      });

      if (existing?.status === "IN_PROGRESS") {
        if (existing.expiresAt && now > existing.expiresAt) {
          await ctx.db.assessmentAttempt.update({
            where: { id: existing.id },
            data: { status: "EXPIRED" },
          });
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Your previous attempt ran out of time.",
          });
        }
        return { attemptId: existing.id, resumed: true };
      }

      const used = existing?.attempt ?? 0;
      if (used >= assessment.maxAttempts) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You have used all attempts for this assessment.",
        });
      }

      // Extended-time accommodations lengthen the window.
      const accommodation = await ctx.db.accommodation.findFirst({
        where: {
          studentId: ctx.studentId,
          type: "EXTENDED_TIME",
          OR: [{ activeTo: null }, { activeTo: { gt: now } }],
        },
        select: { multiplier: true },
      });

      const baseMinutes = assessment.timeLimitMinutes ?? 0;
      const extraMinutes = accommodation
        ? Math.round(baseMinutes * (accommodation.multiplier - 1))
        : 0;
      const expiresAt =
        baseMinutes > 0
          ? new Date(now.getTime() + (baseMinutes + extraMinutes) * 60_000)
          : null;

      const attempt = await ctx.db.assessmentAttempt.create({
        data: {
          assessmentId: assessment.id,
          studentId: ctx.studentId,
          attempt: used + 1,
          status: "IN_PROGRESS",
          startedAt: now,
          expiresAt,
          extraMinutes,
        },
      });

      return { attemptId: attempt.id, resumed: false };
    }),

  /**
   * The full attempt state driving the test-taker: questions (with correct
   * answers stripped), saved responses, flags and the remaining time.
   */
  getAttempt: studentProcedure
    .input(z.object({ attemptId: z.string() }))
    .query(async ({ ctx, input }) => {
      const attempt = await ctx.db.assessmentAttempt.findFirst({
        where: { id: input.attemptId, studentId: ctx.studentId },
        select: {
          id: true,
          attempt: true,
          status: true,
          startedAt: true,
          expiresAt: true,
          submittedAt: true,
          lastAutosaveAt: true,
          extraMinutes: true,
          totalScore: true,
          assessment: {
            select: {
              id: true,
              title: true,
              instructions: true,
              standards: true,
              totalPoints: true,
              timeLimitMinutes: true,
              allowScratchpad: true,
              allowAttachments: true,
              lockdownEnabled: true,
              section: {
                select: {
                  id: true,
                  code: true,
                  period: true,
                  course: { select: { name: true, code: true } },
                },
              },
              questions: {
                orderBy: { order: "asc" },
                select: {
                  id: true,
                  order: true,
                  type: true,
                  prompt: true,
                  helperText: true,
                  points: true,
                  options: {
                    orderBy: { order: "asc" },
                    // isCorrect is deliberately not selected while testing.
                    select: {
                      id: true,
                      label: true,
                      text: true,
                      description: true,
                    },
                  },
                },
              },
            },
          },
          responses: {
            select: {
              questionId: true,
              selectedOptionIds: true,
              textAnswer: true,
              numericAnswer: true,
              scratchpad: true,
              isFlagged: true,
              isAnswered: true,
              updatedAt: true,
              attachments: {
                select: {
                  file: {
                    select: {
                      id: true,
                      url: true,
                      fileName: true,
                      sizeBytes: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!attempt) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Attempt not found.",
        });
      }

      const now = Date.now();
      const secondsRemaining = attempt.expiresAt
        ? Math.max(0, Math.floor((attempt.expiresAt.getTime() - now) / 1000))
        : null;

      const answered = attempt.responses.filter((r) => r.isAnswered).length;
      const flagged = attempt.responses.filter((r) => r.isFlagged).length;

      return {
        ...attempt,
        secondsRemaining,
        progress: {
          answered,
          flagged,
          total: attempt.assessment.questions.length,
          unanswered: attempt.assessment.questions.length - answered,
        },
      };
    }),

  /** Autosaves a single response; also carries the flag and scratchpad state. */
  saveResponse: studentProcedure
    .input(
      z.object({
        attemptId: z.string(),
        questionId: z.string(),
        selectedOptionIds: z.array(z.string()).max(10).optional(),
        textAnswer: z.string().max(50_000).optional(),
        numericAnswer: z.number().optional(),
        scratchpad: z.string().max(20_000).optional(),
        isFlagged: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const attempt = await requireOpenAttempt(
        ctx.db,
        input.attemptId,
        ctx.studentId,
      );

      const question = await ctx.db.question.findFirst({
        where: { id: input.questionId, assessmentId: attempt.assessmentId },
        select: { id: true, type: true, options: { select: { id: true } } },
      });
      if (!question) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "That question is not part of this assessment.",
        });
      }

      const selected = input.selectedOptionIds ?? [];
      if (selected.length > 0) {
        const valid = new Set(question.options.map((o) => o.id));
        if (selected.some((id) => !valid.has(id))) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Unknown answer option.",
          });
        }
        if (question.type !== "MULTI_SELECT" && selected.length > 1) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "This question accepts a single answer.",
          });
        }
      }

      const isAnswered =
        selected.length > 0 ||
        Boolean(input.textAnswer?.trim()) ||
        input.numericAnswer !== undefined;

      const now = new Date();
      const [response] = await ctx.db.$transaction([
        ctx.db.questionResponse.upsert({
          where: {
            attemptId_questionId: {
              attemptId: input.attemptId,
              questionId: input.questionId,
            },
          },
          create: {
            attemptId: input.attemptId,
            questionId: input.questionId,
            selectedOptionIds: selected,
            textAnswer: input.textAnswer,
            numericAnswer: input.numericAnswer,
            scratchpad: input.scratchpad,
            isFlagged: input.isFlagged ?? false,
            isAnswered,
            answeredAt: isAnswered ? now : null,
          },
          update: {
            ...(input.selectedOptionIds !== undefined
              ? { selectedOptionIds: selected }
              : {}),
            ...(input.textAnswer !== undefined
              ? { textAnswer: input.textAnswer }
              : {}),
            ...(input.numericAnswer !== undefined
              ? { numericAnswer: input.numericAnswer }
              : {}),
            ...(input.scratchpad !== undefined
              ? { scratchpad: input.scratchpad }
              : {}),
            ...(input.isFlagged !== undefined
              ? { isFlagged: input.isFlagged }
              : {}),
            ...(isAnswered ? { isAnswered: true, answeredAt: now } : {}),
          },
        }),
        ctx.db.assessmentAttempt.update({
          where: { id: input.attemptId },
          data: { lastAutosaveAt: now },
        }),
      ]);

      return { savedAt: now, isAnswered: response.isAnswered };
    }),

  /** "Marked for Review" toggle in the question header. */
  toggleFlag: studentProcedure
    .input(
      z.object({
        attemptId: z.string(),
        questionId: z.string(),
        flagged: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireOpenAttempt(ctx.db, input.attemptId, ctx.studentId);

      return ctx.db.questionResponse.upsert({
        where: {
          attemptId_questionId: {
            attemptId: input.attemptId,
            questionId: input.questionId,
          },
        },
        create: {
          attemptId: input.attemptId,
          questionId: input.questionId,
          isFlagged: input.flagged,
        },
        update: { isFlagged: input.flagged },
        select: { questionId: true, isFlagged: true },
      });
    }),

  /** "Clear Choice" — wipes the saved answer but keeps the scratchpad. */
  clearResponse: studentProcedure
    .input(z.object({ attemptId: z.string(), questionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await requireOpenAttempt(ctx.db, input.attemptId, ctx.studentId);

      await ctx.db.questionResponse.updateMany({
        where: { attemptId: input.attemptId, questionId: input.questionId },
        data: {
          selectedOptionIds: [],
          textAnswer: null,
          numericAnswer: null,
          isAnswered: false,
          answeredAt: null,
        },
      });
      return { ok: true };
    }),

  /** Attaches a calculation sheet or lab diagram to a response. */
  attachToResponse: studentProcedure
    .input(
      z.object({
        attemptId: z.string(),
        questionId: z.string(),
        fileId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const attempt = await requireOpenAttempt(
        ctx.db,
        input.attemptId,
        ctx.studentId,
      );

      const assessment = await ctx.db.assessment.findUniqueOrThrow({
        where: { id: attempt.assessmentId },
        select: { allowAttachments: true },
      });
      if (!assessment.allowAttachments) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This assessment does not accept attachments.",
        });
      }

      const response = await ctx.db.questionResponse.upsert({
        where: {
          attemptId_questionId: {
            attemptId: input.attemptId,
            questionId: input.questionId,
          },
        },
        create: { attemptId: input.attemptId, questionId: input.questionId },
        update: {},
        select: { id: true },
      });

      return ctx.db.responseAttachment.create({
        data: { responseId: response.id, fileId: input.fileId },
        include: { file: true },
      });
    }),

  /** Logs a lockdown/proctor signal such as a tab switch. */
  recordProctorEvent: studentProcedure
    .input(
      z.object({
        attemptId: z.string(),
        type: z.enum([
          "TAB_SWITCH",
          "WINDOW_BLUR",
          "FULLSCREEN_EXIT",
          "PASTE",
          "HELP_PING",
          "RECONNECT",
        ]),
        detail: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const attempt = await ctx.db.assessmentAttempt.findFirst({
        where: { id: input.attemptId, studentId: ctx.studentId },
        select: { id: true, assessment: { select: { sectionId: true } } },
      });
      if (!attempt) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Attempt not found.",
        });
      }

      const event = await ctx.db.proctorEvent.create({
        data: {
          attemptId: input.attemptId,
          type: input.type,
          detail: input.detail,
        },
      });

      // Help pings go straight to the proctoring teacher.
      if (input.type === "HELP_PING") {
        const section = await ctx.db.section.findUnique({
          where: { id: attempt.assessment.sectionId },
          select: { teacher: { select: { userId: true } } },
        });
        if (section) {
          await ctx.db.notification.create({
            data: {
              userId: section.teacher.userId,
              type: "SYSTEM",
              title: "A student requested help during an assessment",
              body: input.detail ?? "Technical assistance requested.",
              linkUrl: `/assessments/attempts/${input.attemptId}`,
            },
          });
        }
      }

      return event;
    }),

  /**
   * Submits the attempt: auto-scores objective questions, leaves written
   * responses for the teacher, and posts to the gradebook when the assessment
   * is linked to an assignment and needs no manual marking.
   */
  submitAttempt: studentProcedure
    .input(z.object({ attemptId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const attempt = await ctx.db.assessmentAttempt.findFirst({
        where: { id: input.attemptId, studentId: ctx.studentId },
        select: {
          id: true,
          status: true,
          expiresAt: true,
          assessment: {
            select: {
              id: true,
              sectionId: true,
              assignmentId: true,
              totalPoints: true,
              questions: {
                select: {
                  id: true,
                  type: true,
                  points: true,
                  answerKey: true,
                  tolerance: true,
                  options: { select: { id: true, isCorrect: true } },
                },
              },
            },
          },
          responses: {
            select: {
              id: true,
              questionId: true,
              selectedOptionIds: true,
              textAnswer: true,
              numericAnswer: true,
            },
          },
        },
      });

      if (!attempt) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Attempt not found.",
        });
      }
      if (attempt.status !== "IN_PROGRESS") {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This attempt has already been submitted.",
        });
      }

      const responsesByQuestion = new Map(
        attempt.responses.map((r) => [r.questionId, r]),
      );

      let autoScore = 0;
      let needsManualMarking = false;
      const updates: Array<{ id: string; isCorrect: boolean; points: number }> =
        [];

      for (const question of attempt.assessment.questions) {
        const response = responsesByQuestion.get(question.id);
        if (!AUTO_SCORED.includes(question.type)) {
          if (response) needsManualMarking = true;
          continue;
        }
        if (!response) continue;

        let correct = false;
        if (question.type === "NUMERIC") {
          const expected = Number(question.answerKey);
          const tolerance = question.tolerance ?? 0;
          correct =
            response.numericAnswer !== null &&
            !Number.isNaN(expected) &&
            Math.abs((response.numericAnswer ?? 0) - expected) <= tolerance;
        } else {
          const correctIds = question.options
            .filter((o) => o.isCorrect)
            .map((o) => o.id)
            .sort();
          const givenIds = [...response.selectedOptionIds].sort();
          correct =
            correctIds.length > 0 &&
            correctIds.length === givenIds.length &&
            correctIds.every((id, index) => id === givenIds[index]);
        }

        const points = correct ? question.points : 0;
        autoScore += points;
        updates.push({ id: response.id, isCorrect: correct, points });
      }

      const now = new Date();
      const totalScore = round(autoScore, 2);

      await ctx.db.$transaction([
        ...updates.map((update) =>
          ctx.db.questionResponse.update({
            where: { id: update.id },
            data: { isCorrect: update.isCorrect, pointsAwarded: update.points },
          }),
        ),
        ctx.db.assessmentAttempt.update({
          where: { id: attempt.id },
          data: {
            status: needsManualMarking ? "SUBMITTED" : "GRADED",
            submittedAt: now,
            autoScore: totalScore,
            totalScore: needsManualMarking ? null : totalScore,
          },
        }),
      ]);

      if (attempt.assessment.assignmentId) {
        await postAttemptToGradebook(
          ctx.db,
          attempt.assessment.assignmentId,
          ctx.studentId,
          totalScore,
          needsManualMarking,
        );
      }

      return {
        autoScore: totalScore,
        totalPoints: attempt.assessment.totalPoints,
        awaitingManualMarking: needsManualMarking,
      };
    }),

  /** Post-release review: answers, correctness and explanations. */
  reviewAttempt: studentProcedure
    .input(z.object({ attemptId: z.string() }))
    .query(async ({ ctx, input }) => {
      const attempt = await ctx.db.assessmentAttempt.findFirst({
        where: {
          id: input.attemptId,
          studentId: ctx.studentId,
          status: { in: ["GRADED", "SUBMITTED"] },
        },
        select: {
          id: true,
          status: true,
          totalScore: true,
          autoScore: true,
          submittedAt: true,
          assessment: {
            select: {
              title: true,
              totalPoints: true,
              questions: {
                orderBy: { order: "asc" },
                select: {
                  id: true,
                  order: true,
                  type: true,
                  prompt: true,
                  points: true,
                  explanation: true,
                  options: {
                    orderBy: { order: "asc" },
                    select: {
                      id: true,
                      label: true,
                      text: true,
                      description: true,
                      isCorrect: true,
                    },
                  },
                },
              },
            },
          },
          responses: {
            select: {
              questionId: true,
              selectedOptionIds: true,
              textAnswer: true,
              numericAnswer: true,
              isCorrect: true,
              pointsAwarded: true,
              graderComment: true,
            },
          },
        },
      });

      if (!attempt) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No completed attempt to review.",
        });
      }
      // Correct answers stay hidden until the attempt is fully graded.
      if (attempt.status !== "GRADED") {
        return {
          ...attempt,
          assessment: {
            ...attempt.assessment,
            questions: attempt.assessment.questions.map((q) => ({
              ...q,
              explanation: null,
              options: q.options.map(
                ({ isCorrect: _drop, ...option }) => option,
              ),
            })),
          },
        };
      }
      return attempt;
    }),

  // --- Teacher side ---------------------------------------------------------

  create: teacherProcedure
    .input(
      z.object({
        sectionId: z.string(),
        unitId: z.string().optional(),
        assignmentId: z.string().optional(),
        title: z.string().min(1).max(200),
        instructions: z.string().max(10_000).optional(),
        standards: z.string().max(500).optional(),
        timeLimitMinutes: z.number().int().min(1).max(600).optional(),
        maxAttempts: z.number().int().min(1).max(10).default(1),
        opensAt: z.date().optional(),
        closesAt: z.date().optional(),
        shuffleQuestions: z.boolean().default(false),
        allowScratchpad: z.boolean().default(true),
        allowAttachments: z.boolean().default(false),
        lockdownEnabled: z.boolean().default(false),
        questions: z
          .array(
            z.object({
              type: z.enum([
                "MULTIPLE_CHOICE",
                "MULTI_SELECT",
                "TRUE_FALSE",
                "SHORT_ANSWER",
                "FREE_RESPONSE",
                "NUMERIC",
              ]),
              prompt: z.string().min(1).max(5000),
              helperText: z.string().max(2000).optional(),
              points: z.number().min(0).max(100).default(1),
              explanation: z.string().max(5000).optional(),
              answerKey: z.string().max(2000).optional(),
              tolerance: z.number().min(0).optional(),
              options: z
                .array(
                  z.object({
                    label: z.string().min(1).max(10),
                    text: z.string().min(1).max(2000),
                    description: z.string().max(2000).optional(),
                    isCorrect: z.boolean().default(false),
                  }),
                )
                .default([]),
            }),
          )
          .default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertTeachesSection(ctx.db, ctx.session.user, input.sectionId);
      const { questions, ...assessment } = input;

      for (const [index, question] of questions.entries()) {
        const needsOptions = [
          "MULTIPLE_CHOICE",
          "MULTI_SELECT",
          "TRUE_FALSE",
        ].includes(question.type);
        if (needsOptions && !question.options.some((o) => o.isCorrect)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Question ${index + 1} has no correct answer marked.`,
          });
        }
      }

      const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

      return ctx.db.assessment.create({
        data: {
          ...assessment,
          totalPoints,
          questions: {
            create: questions.map((question, index) => ({
              order: index + 1,
              type: question.type,
              prompt: question.prompt,
              helperText: question.helperText,
              points: question.points,
              explanation: question.explanation,
              answerKey: question.answerKey,
              tolerance: question.tolerance,
              options: {
                create: question.options.map((option, optionIndex) => ({
                  ...option,
                  order: optionIndex,
                })),
              },
            })),
          },
        },
        include: { questions: { include: { options: true } } },
      });
    }),

  publish: teacherProcedure
    .input(z.object({ assessmentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const assessment = await ctx.db.assessment.findUnique({
        where: { id: input.assessmentId },
        select: { sectionId: true, _count: { select: { questions: true } } },
      });
      if (!assessment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assessment not found.",
        });
      }
      await assertTeachesSection(
        ctx.db,
        ctx.session.user,
        assessment.sectionId,
      );
      if (assessment._count.questions === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Add at least one question before publishing.",
        });
      }

      return ctx.db.assessment.update({
        where: { id: input.assessmentId },
        data: { publishedAt: new Date() },
      });
    }),

  /** Live proctor view: who is in progress, their pace and any flags raised. */
  monitor: teacherProcedure
    .input(z.object({ assessmentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const assessment = await ctx.db.assessment.findUnique({
        where: { id: input.assessmentId },
        select: { sectionId: true, totalPoints: true },
      });
      if (!assessment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assessment not found.",
        });
      }
      await assertTeachesSection(
        ctx.db,
        ctx.session.user,
        assessment.sectionId,
      );

      const attempts = await ctx.db.assessmentAttempt.findMany({
        where: { assessmentId: input.assessmentId },
        orderBy: { startedAt: "asc" },
        select: {
          id: true,
          status: true,
          startedAt: true,
          submittedAt: true,
          expiresAt: true,
          lastAutosaveAt: true,
          totalScore: true,
          student: {
            select: {
              id: true,
              studentNumber: true,
              user: { select: { name: true, image: true } },
            },
          },
          _count: { select: { responses: true, proctorEvents: true } },
          proctorEvents: {
            orderBy: { occurredAt: "desc" },
            take: 5,
            select: { type: true, detail: true, occurredAt: true },
          },
        },
      });

      return {
        totalPoints: assessment.totalPoints,
        inProgress: attempts.filter((a) => a.status === "IN_PROGRESS").length,
        submitted: attempts.filter((a) => a.status !== "IN_PROGRESS").length,
        attempts,
      };
    }),

  /** Marks a written response and finalises the attempt once nothing is left. */
  gradeResponse: teacherProcedure
    .input(
      z.object({
        attemptId: z.string(),
        questionId: z.string(),
        points: z.number().min(0),
        comment: z.string().max(5000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const attempt = await ctx.db.assessmentAttempt.findUnique({
        where: { id: input.attemptId },
        select: {
          id: true,
          studentId: true,
          assessment: {
            select: { id: true, sectionId: true, assignmentId: true },
          },
        },
      });
      if (!attempt) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Attempt not found.",
        });
      }
      await assertTeachesSection(
        ctx.db,
        ctx.session.user,
        attempt.assessment.sectionId,
      );

      const question = await ctx.db.question.findFirst({
        where: { id: input.questionId, assessmentId: attempt.assessment.id },
        select: { points: true },
      });
      if (!question) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Unknown question.",
        });
      }
      if (input.points > question.points) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Maximum for this question is ${question.points} points.`,
        });
      }

      await ctx.db.questionResponse.update({
        where: {
          attemptId_questionId: {
            attemptId: input.attemptId,
            questionId: input.questionId,
          },
        },
        data: { pointsAwarded: input.points, graderComment: input.comment },
      });

      // Finalise when every answered question carries a score.
      const outstanding = await ctx.db.questionResponse.count({
        where: {
          attemptId: input.attemptId,
          isAnswered: true,
          pointsAwarded: null,
        },
      });

      if (outstanding === 0) {
        const scored = await ctx.db.questionResponse.aggregate({
          where: { attemptId: input.attemptId },
          _sum: { pointsAwarded: true },
        });
        const total = round(scored._sum.pointsAwarded ?? 0, 2);

        await ctx.db.assessmentAttempt.update({
          where: { id: input.attemptId },
          data: { status: "GRADED", totalScore: total, manualScore: total },
        });

        if (attempt.assessment.assignmentId) {
          await postAttemptToGradebook(
            ctx.db,
            attempt.assessment.assignmentId,
            attempt.studentId,
            total,
            false,
          );
        }
      }

      return { finalised: outstanding === 0 };
    }),

  /** Per-question difficulty, for spotting misunderstood concepts. */
  itemAnalysis: teacherProcedure
    .input(z.object({ assessmentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const assessment = await ctx.db.assessment.findUnique({
        where: { id: input.assessmentId },
        select: {
          sectionId: true,
          questions: {
            orderBy: { order: "asc" },
            select: { id: true, order: true, prompt: true, points: true },
          },
        },
      });
      if (!assessment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assessment not found.",
        });
      }
      await assertTeachesSection(
        ctx.db,
        ctx.session.user,
        assessment.sectionId,
      );

      const responses = await ctx.db.questionResponse.groupBy({
        by: ["questionId", "isCorrect"],
        where: {
          attempt: { assessmentId: input.assessmentId, status: "GRADED" },
        },
        _count: { _all: true },
      });

      return assessment.questions.map((question) => {
        const rows = responses.filter((r) => r.questionId === question.id);
        const correct = rows
          .filter((r) => r.isCorrect === true)
          .reduce((sum, r) => sum + r._count._all, 0);
        const answered = rows.reduce((sum, r) => sum + r._count._all, 0);
        return {
          ...question,
          answered,
          correct,
          percentCorrect:
            answered > 0 ? Math.round((correct / answered) * 100) : null,
        };
      });
    }),
});

/** Loads an attempt that is still open, expiring it if the clock has run out. */
async function requireOpenAttempt(
  db: PrismaClient,
  attemptId: string,
  studentId: string,
) {
  const attempt = await db.assessmentAttempt.findFirst({
    where: { id: attemptId, studentId },
    select: { id: true, status: true, expiresAt: true, assessmentId: true },
  });
  if (!attempt) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Attempt not found." });
  }
  if (attempt.status !== "IN_PROGRESS") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This attempt is no longer open.",
    });
  }
  if (attempt.expiresAt && new Date() > attempt.expiresAt) {
    await db.assessmentAttempt.update({
      where: { id: attempt.id },
      data: { status: "EXPIRED" },
    });
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Time is up for this attempt.",
    });
  }
  return attempt;
}

/** Mirrors an assessment score onto its assignment so it lands in the gradebook. */
async function postAttemptToGradebook(
  db: PrismaClient,
  assignmentId: string,
  studentId: string,
  score: number,
  pending: boolean,
) {
  const assignment = await db.assignment.findUnique({
    where: { id: assignmentId },
    select: { id: true, sectionId: true, pointsPossible: true, title: true },
  });
  if (!assignment) return;

  const submission = await db.submission.upsert({
    where: {
      assignmentId_studentId_attempt: { assignmentId, studentId, attempt: 1 },
    },
    create: {
      assignmentId,
      studentId,
      status: pending ? "SUBMITTED" : "GRADED",
      timeliness: "ON_TIME",
      submittedAt: new Date(),
    },
    update: { status: pending ? "SUBMITTED" : "GRADED" },
    select: { id: true },
  });

  const percent =
    assignment.pointsPossible > 0
      ? (score / assignment.pointsPossible) * 100
      : 0;
  const now = new Date();

  await db.grade.upsert({
    where: { submissionId: submission.id },
    create: {
      submissionId: submission.id,
      status: pending ? "PENDING" : "RELEASED",
      score: pending ? null : score,
      letter: pending ? null : letterFor(percent),
      gradedAt: pending ? null : now,
      releasedAt: pending ? null : now,
    },
    update: {
      status: pending ? "PENDING" : "RELEASED",
      score: pending ? null : score,
      letter: pending ? null : letterFor(percent),
      gradedAt: pending ? null : now,
      releasedAt: pending ? null : now,
    },
  });

  if (!pending) {
    await refreshEnrollmentGrade(
      db,
      assignment.sectionId,
      studentId,
      `Assessment: ${assignment.title}`,
    );
  }
}
