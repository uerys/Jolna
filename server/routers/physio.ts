import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { physioProcedure, router } from "../_core/trpc";
import {
  createAssignment,
  createExercise,
  deleteAssignment,
  deleteExercise,
  getClientCompletionStats,
  getExerciseById,
  listAssignmentsForPhysio,
  listExercises,
  listFeedbackByClient,
  listFeedbackForPhysio,
  listUsers,
  updateAssignmentStatus,
  updateExercise,
} from "../db";
import { ASSIGNMENT_STATUSES } from "../../drizzle/schema";

const AssignmentStatusEnum = z.enum(ASSIGNMENT_STATUSES);
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

export const physioRouter = router({
  /* Exercises */
  listMyExercises: physioProcedure.query(({ ctx }) =>
    listExercises(ctx.user.id),
  ),

  createExercise: physioProcedure
    .input(
      z.object({
        title: z.string().min(1).max(255),
        instructionsEn: z.string().min(1),
        instructionsKh: z.string().min(1),
        videoUrl: z.string().url().max(1024),
        defaultReps: z.number().int().min(1).max(500),
        defaultSets: z.number().int().min(1).max(100),
      }),
    )
    .mutation(({ ctx, input }) =>
      createExercise({ ...input, createdBy: ctx.user.id }),
    ),

  updateExercise: physioProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        patch: z.object({
          title: z.string().min(1).max(255).optional(),
          instructionsEn: z.string().min(1).optional(),
          instructionsKh: z.string().min(1).optional(),
          videoUrl: z.string().url().max(1024).optional(),
          defaultReps: z.number().int().min(1).max(500).optional(),
          defaultSets: z.number().int().min(1).max(100).optional(),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const ex = await getExerciseById(input.id);
      if (!ex) throw new TRPCError({ code: "NOT_FOUND" });
      if (ex.createdBy !== ctx.user.id)
        throw new TRPCError({ code: "FORBIDDEN" });
      return updateExercise(input.id, input.patch);
    }),

  deleteExercise: physioProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const ex = await getExerciseById(input.id);
      if (!ex) throw new TRPCError({ code: "NOT_FOUND" });
      if (ex.createdBy !== ctx.user.id)
        throw new TRPCError({ code: "FORBIDDEN" });
      await deleteExercise(input.id);
      return { success: true };
    }),

  /* Clients & Assignments */
  listMyClients: physioProcedure.query(async ({ ctx }) =>
    listUsers({ role: "client", physiotherapistId: ctx.user.id }),
  ),

  listMyAssignments: physioProcedure.query(({ ctx }) =>
    listAssignmentsForPhysio(ctx.user.id),
  ),

  assignExercise: physioProcedure
    .input(
      z.object({
        exerciseId: z.number().int().positive(),
        clientId: z.number().int().positive(),
        reps: z.number().int().min(1).max(500),
        startDate: dateString,
        endDate: dateString,
      }),
    )
    .mutation(({ ctx, input }) =>
      createAssignment({
        exerciseId: input.exerciseId,
        clientId: input.clientId,
        physiotherapistId: ctx.user.id,
        reps: input.reps,
        startDate: input.startDate,
        endDate: input.endDate,
      }),
    ),

  updateAssignmentStatus: physioProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        status: AssignmentStatusEnum,
      }),
    )
    .mutation(async ({ input }) => {
      await updateAssignmentStatus(input.id, input.status);
      return { success: true };
    }),

  deleteAssignment: physioProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await deleteAssignment(input.id);
      return { success: true };
    }),

  /* Monitoring */
  listClientFeedback: physioProcedure
    .input(z.object({ clientId: z.number().int().positive() }))
    .query(({ input }) => listFeedbackByClient(input.clientId)),

  getClientStats: physioProcedure
    .input(z.object({ clientId: z.number().int().positive() }))
    .query(({ input }) => getClientCompletionStats(input.clientId)),

  listAllMyFeedback: physioProcedure.query(({ ctx }) =>
    listFeedbackForPhysio(ctx.user.id),
  ),
});
