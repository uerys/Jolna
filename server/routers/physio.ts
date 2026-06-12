import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { physioProcedure, router } from "../_core/trpc";
import {
  createAssignment,
  createExercise,
  createNotification,
  deleteAssignment,
  deleteExercise,
  getClientCompletionStats,
  getAssignmentById,
  getExerciseById,
  getUserById,
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
const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

function formatAssignmentNotification(
  language: "en" | "kh",
  exerciseTitle: string,
  type: "assignment_created" | "assignment_status_updated",
  status?: string
) {
  let statusLabel = status ?? "updated";
  if (language === "kh" && status === "active") {
    statusLabel = "សកម្ម";
  } else if (language === "kh" && status === "completed") {
    statusLabel = "បានបញ្ចប់";
  } else if (language === "kh" && status === "cancelled") {
    statusLabel = "បានលុបចោល";
  } else if (language === "kh") {
    statusLabel = "បានធ្វើបច្ចុប្បន្នភាព";
  }

  if (type === "assignment_created") {
    if (language === "kh") {
      return {
        title: "លំហាត់ថ្មីត្រូវបានផ្ដល់",
        content: `${exerciseTitle} ត្រូវបានផ្ដល់ឲ្យអ្នកហើយ។ សូមចូលទៅមើលក្នុងផ្ទាំងលំហាត់របស់អ្នក។`,
      };
    }
    return {
      title: "New exercise assigned",
      content: `${exerciseTitle} was assigned to you. Open your exercise list to review the plan.`,
    };
  }

  if (language === "kh") {
    return {
      title: "ស្ថានភាពកិច្ចការត្រូវបានធ្វើបច្ចុប្បន្នភាព",
      content: `${exerciseTitle} ត្រូវបានធ្វើបច្ចុប្បន្នភាពទៅជា ${statusLabel}។`,
    };
  }
  return {
    title: "Assignment status updated",
    content: `${exerciseTitle} was updated to ${statusLabel}.`,
  };
}

export const physioRouter = router({
  /* Exercises */
  listMyExercises: physioProcedure.query(({ ctx }) =>
    listExercises(ctx.user.id)
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
      })
    )
    .mutation(({ ctx, input }) =>
      createExercise({ ...input, createdBy: ctx.user.id })
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
      })
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
    listUsers({ role: "client", physiotherapistId: ctx.user.id })
  ),

  listMyAssignments: physioProcedure.query(({ ctx }) =>
    listAssignmentsForPhysio(ctx.user.id)
  ),

  assignExercise: physioProcedure
    .input(
      z.object({
        exerciseId: z.number().int().positive(),
        clientId: z.number().int().positive(),
        reps: z.number().int().min(1).max(500).optional(),
        sets: z.number().int().min(1).max(100).optional(),
        startDate: dateString,
        endDate: dateString,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const ex = await getExerciseById(input.exerciseId);
      if (!ex) throw new TRPCError({ code: "NOT_FOUND" });
      const client = await getUserById(input.clientId);
      if (client?.physiotherapistId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const repsToUse = input.reps ?? ex.defaultReps;
      const setsToUse = input.sets ?? ex.defaultSets ?? 1;
      const assignment = await createAssignment({
        exerciseId: input.exerciseId,
        clientId: input.clientId,
        physiotherapistId: ctx.user.id,
        reps: repsToUse,
        sets: setsToUse,
        startDate: input.startDate,
        endDate: input.endDate,
      });

      const { title, content } = formatAssignmentNotification(
        client.languagePreference ?? "en",
        ex.title,
        "assignment_created"
      );
      await createNotification({
        recipientId: client.id,
        actorId: ctx.user.id,
        type: "assignment_created",
        title,
        content,
        href: "/client/exercises",
      });

      return assignment;
    }),

  updateAssignmentStatus: physioProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        status: AssignmentStatusEnum,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const assignment = await getAssignmentById(input.id);
      if (!assignment) throw new TRPCError({ code: "NOT_FOUND" });
      if (assignment.physiotherapistId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await updateAssignmentStatus(input.id, input.status);

      const client = await getUserById(assignment.clientId);
      const exercise = await getExerciseById(assignment.exerciseId);
      if (client && exercise) {
        const { title, content } = formatAssignmentNotification(
          client.languagePreference ?? "en",
          exercise.title,
          "assignment_status_updated",
          input.status
        );
        await createNotification({
          recipientId: client.id,
          actorId: ctx.user.id,
          type: "assignment_status_updated",
          title,
          content,
          href: "/client/exercises",
        });
      }
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
    listFeedbackForPhysio(ctx.user.id)
  ),
});
