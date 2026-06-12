import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { clientProcedure, router } from "../_core/trpc";
import {
  createFeedback,
  createNotification,
  getAssignmentById,
  getExerciseById,
  getClientCompletionStats,
  listAssignmentsForClient,
  listFeedbackByClient,
  getUserById,
} from "../db";

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

function formatFeedbackNotification(
  language: "en" | "kh",
  clientName: string,
  exerciseTitle: string,
  painScore: number
) {
  if (language === "kh") {
    return {
      title: "មតិយោបល់ថ្មីពីអ្នកជំងឺ",
      content: `${clientName} បានបញ្ជូនមតិយោបល់សម្រាប់ ${exerciseTitle}។ កម្រិតឈឺគឺ ${painScore}/10។`,
    };
  }

  return {
    title: "New client feedback",
    content: `${clientName} submitted feedback for ${exerciseTitle}. Pain reported: ${painScore}/10.`,
  };
}

export const clientRouter = router({
  listTodayAssignments: clientProcedure.query(({ ctx }) => {
    const today = new Date().toISOString().slice(0, 10);
    return listAssignmentsForClient(ctx.user.id, {
      activeOn: today,
      status: "active",
    });
  }),

  listMyAssignments: clientProcedure
    .input(z.object({ activeOn: dateString.optional() }).optional())
    .query(({ ctx, input }) =>
      listAssignmentsForClient(ctx.user.id, { activeOn: input?.activeOn })
    ),

  submitFeedback: clientProcedure
    .input(
      z.object({
        assignmentId: z.number().int().positive(),
        painScore: z.number().int().min(0).max(10),
        completed: z.boolean(),
        notes: z.string().max(2000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const assignment = await getAssignmentById(input.assignmentId);
      if (assignment?.clientId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const feedback = await createFeedback({
        assignmentId: input.assignmentId,
        clientId: ctx.user.id,
        painScore: input.painScore,
        completed: input.completed,
        notes: input.notes ?? null,
      });

      const physio = await getUserById(assignment.physiotherapistId);
      if (physio) {
        const exercise = await getExerciseById(assignment.exerciseId);
        const clientName = ctx.user.name ?? ctx.user.email ?? "A client";
        const exerciseTitle = exercise?.title ?? "an exercise";
        const { title, content } = formatFeedbackNotification(
          physio.languagePreference ?? "en",
          clientName,
          exerciseTitle,
          input.painScore
        );

        await createNotification({
          recipientId: physio.id,
          actorId: ctx.user.id,
          type: "feedback_submitted",
          title,
          content,
          href: `/physio/clients/${ctx.user.id}`,
        });
      }

      return feedback;
    }),

  listMyFeedback: clientProcedure.query(({ ctx }) =>
    listFeedbackByClient(ctx.user.id)
  ),

  myStats: clientProcedure.query(({ ctx }) =>
    getClientCompletionStats(ctx.user.id)
  ),
});
