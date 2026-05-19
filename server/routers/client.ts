import { z } from "zod";
import { clientProcedure, router } from "../_core/trpc";
import {
  createFeedback,
  getClientCompletionStats,
  listAssignmentsForClient,
  listFeedbackByClient,
} from "../db";

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

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
      listAssignmentsForClient(ctx.user.id, { activeOn: input?.activeOn }),
    ),

  submitFeedback: clientProcedure
    .input(
      z.object({
        assignmentId: z.number().int().positive(),
        painScore: z.number().int().min(0).max(10),
        completed: z.boolean(),
        notes: z.string().max(2000).optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      createFeedback({
        assignmentId: input.assignmentId,
        clientId: ctx.user.id,
        painScore: input.painScore,
        completed: input.completed,
        notes: input.notes ?? null,
      }),
    ),

  listMyFeedback: clientProcedure.query(({ ctx }) =>
    listFeedbackByClient(ctx.user.id),
  ),

  myStats: clientProcedure.query(({ ctx }) =>
    getClientCompletionStats(ctx.user.id),
  ),
});
