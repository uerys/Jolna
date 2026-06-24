import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { physioProcedure, router } from "../_core/trpc";
import {
  createAssignment,
  createAuditLog,
  createExercise,
  createNotification,
  deleteAssignment,
  deleteExercise,
  getAssignmentCompletionStats,
  getClientCompletionStats,
  getAssignmentById,
  getExerciseById,
  getUserById,
  listAssignmentsForClientByPhysio,
  listAssignmentsForPhysio,
  listExercises,
  listFeedbackByAssignment,
  listFeedbackByClient,
  listFeedbackByClientEnriched,
  listFeedbackForPhysio,
  listUsers,
  updateAssignmentStatus,
  updateAssignment,
  updateExercise,
  updateFeedbackNotes,
  updateUserFields,
  listCustomExerciseTypes,
  createCustomExerciseType,
  listCustomInjuryTypes,
  createCustomInjuryType,
  deleteCustomExerciseType,
  deleteCustomInjuryType,
} from "../db";
import { getDb } from "../db";
import { eq, and, sql } from "drizzle-orm";
import { ASSIGNMENT_STATUSES, notifications } from "../../drizzle/schema";

const AssignmentStatusEnum = z.enum(ASSIGNMENT_STATUSES);
const InjuryTypeEnum = z.string();
const ExerciseTypeEnum = z.string();
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
        exerciseType: ExerciseTypeEnum.optional(),
        defaultReps: z.number().int().min(1).max(500),
        defaultSets: z.number().int().min(1).max(100),
      })
    )
    .mutation(({ ctx, input }) =>
      createExercise({
        ...input,
        exerciseType: input.exerciseType ?? "other",
        createdBy: ctx.user.id,
      })
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
          exerciseType: ExerciseTypeEnum.optional(),
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
  listMyClients: physioProcedure.query(async ({ ctx }) => {
    const clients = await listUsers({
      role: "client",
      physiotherapistId: ctx.user.id,
    });
    const dbInstance = await getDb();
    if (!dbInstance) return clients.map(c => ({ ...c, unreadChatCount: 0 }));

    const enriched = await Promise.all(
      clients.map(async client => {
        const rows = await dbInstance
          .select({
            total: sql<number>`count(*)`,
          })
          .from(notifications)
          .where(
            and(
              eq(notifications.recipientId, ctx.user.id),
              eq(notifications.actorId, client.id),
              eq(notifications.type, "new_message"),
              sql`${notifications.readAt} is null`
            )
          );
        const unreadChatCount = Number(rows[0]?.total ?? 0);
        return { ...client, unreadChatCount };
      })
    );
    return enriched;
  }),

  getClientDetail: physioProcedure
    .input(z.object({ clientId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const client = await getUserById(input.clientId);
      if (!client) throw new TRPCError({ code: "NOT_FOUND" });
      if (client.physiotherapistId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your client" });
      }

      const dbInstance = await getDb();
      let unreadChatCount = 0;
      if (dbInstance) {
        const rows = await dbInstance
          .select({
            total: sql<number>`count(*)`,
          })
          .from(notifications)
          .where(
            and(
              eq(notifications.recipientId, ctx.user.id),
              eq(notifications.actorId, client.id),
              eq(notifications.type, "new_message"),
              sql`${notifications.readAt} is null`
            )
          );
        unreadChatCount = Number(rows[0]?.total ?? 0);
      }
      return { ...client, unreadChatCount };
    }),

  /**
   * List assignments for a specific client (ownership-safe).
   */
  listClientAssignments: physioProcedure
    .input(z.object({ clientId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const client = await getUserById(input.clientId);
      if (!client || client.physiotherapistId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your client" });
      }
      return listAssignmentsForClientByPhysio(input.clientId, ctx.user.id);
    }),

  listMyAssignments: physioProcedure.query(({ ctx }) =>
    listAssignmentsForPhysio(ctx.user.id)
  ),

  assignExercise: physioProcedure
    .input(
      z.object({
        exerciseId: z.number().int().positive(),
        clientId: z.number().int().positive(),
        injuryType: InjuryTypeEnum.optional(),
        exerciseType: ExerciseTypeEnum.optional(),
        reps: z.number().int().min(1).max(500).optional(),
        sets: z.number().int().min(1).max(100).optional(),
        dailyFrequency: z.number().int().min(1).max(20).default(1).optional(),
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
        injuryType: input.injuryType ?? "other",
        exerciseType: input.exerciseType ?? ex.exerciseType ?? "other",
        reps: repsToUse,
        sets: setsToUse,
        dailyFrequency: input.dailyFrequency ?? 1,
        startDate: input.startDate,
        endDate: input.endDate,
      });

      // Automatically update the client's primary diagnosis (injuryType) on their profile
      await updateUserFields(input.clientId, {
        injuryType: input.injuryType ?? "other",
      });

      // Audit log
      await createAuditLog({
        actorId: ctx.user.id,
        action: "assignment_created",
        targetType: "assignment",
        targetId: assignment.id,
        description: `Assigned ${ex.title} to client #${input.clientId}`,
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

      // Audit log
      await createAuditLog({
        actorId: ctx.user.id,
        action: "assignment_status_updated",
        targetType: "assignment",
        targetId: input.id,
        description: `Updated assignment #${input.id} status to ${input.status}`,
      });

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
  updateAssignment: physioProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        patch: z.object({
          injuryType: InjuryTypeEnum.optional(),
          exerciseType: ExerciseTypeEnum.optional(),
          reps: z.number().int().min(1).max(500).optional(),
          sets: z.number().int().min(1).max(100).optional(),
          dailyFrequency: z.number().int().min(1).max(20).optional(),
          startDate: dateString.optional(),
          endDate: dateString.optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const assignment = await getAssignmentById(input.id);
      if (!assignment) throw new TRPCError({ code: "NOT_FOUND" });
      if (assignment.physiotherapistId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await updateAssignment(input.id, input.patch);

      // Audit log
      await createAuditLog({
        actorId: ctx.user.id,
        action: "assignment_updated",
        targetType: "assignment",
        targetId: input.id,
        description: `Updated assignment #${input.id}`,
      });

      return { success: true };
    }),

  deleteAssignment: physioProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const assignment = await getAssignmentById(input.id);
      if (!assignment) throw new TRPCError({ code: "NOT_FOUND" });
      if (assignment.physiotherapistId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await deleteAssignment(input.id);

      // Audit log
      await createAuditLog({
        actorId: ctx.user.id,
        action: "assignment_deleted",
        targetType: "assignment",
        targetId: input.id,
        description: `Deleted assignment #${input.id}`,
      });

      return { success: true };
    }),

  /* Monitoring */
  listClientFeedback: physioProcedure
    .input(z.object({ clientId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      // Ownership check
      const client = await getUserById(input.clientId);
      if (!client || client.physiotherapistId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your client" });
      }
      return listFeedbackByClient(input.clientId);
    }),

  /**
   * Enriched feedback for a client: includes assignment details (injury type, exercise type, exercise title).
   */
  listClientFeedbackEnriched: physioProcedure
    .input(
      z.object({
        clientId: z.number().int().positive(),
        assignmentId: z.number().int().positive().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const client = await getUserById(input.clientId);
      if (!client || client.physiotherapistId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your client" });
      }
      return listFeedbackByClientEnriched(input.clientId, {
        assignmentId: input.assignmentId,
        from: input.from ? new Date(input.from) : undefined,
        to: input.to ? new Date(input.to) : undefined,
      });
    }),

  /**
   * Get feedback for a specific assignment.
   */
  listAssignmentFeedback: physioProcedure
    .input(z.object({ assignmentId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const assignment = await getAssignmentById(input.assignmentId);
      if (!assignment) throw new TRPCError({ code: "NOT_FOUND" });
      if (assignment.physiotherapistId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return listFeedbackByAssignment(input.assignmentId);
    }),

  getClientStats: physioProcedure
    .input(z.object({ clientId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const client = await getUserById(input.clientId);
      if (!client || client.physiotherapistId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your client" });
      }
      return getClientCompletionStats(input.clientId);
    }),

  getAssignmentStats: physioProcedure
    .input(z.object({ assignmentId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const assignment = await getAssignmentById(input.assignmentId);
      if (!assignment) throw new TRPCError({ code: "NOT_FOUND" });
      if (assignment.physiotherapistId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return getAssignmentCompletionStats(input.assignmentId);
    }),

  listAllMyFeedback: physioProcedure.query(({ ctx }) =>
    listFeedbackForPhysio(ctx.user.id)
  ),

  updateFeedbackNotes: physioProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        notes: z.string().max(2000).nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await updateFeedbackNotes(input.id, input.notes, ctx.user.id);
        return { success: true };
      } catch (error: any) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: error.message || "Failed to update feedback notes",
        });
      }
    }),

  scheduleNextClinicVisit: physioProcedure
    .input(
      z.object({
        clientId: z.number().int().positive(),
        nextClinicVisit: z.string().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const client = await getUserById(input.clientId);
      if (!client || client.physiotherapistId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your client" });
      }

      await updateUserFields(input.clientId, {
        nextClinicVisit: input.nextClinicVisit,
      });

      return { success: true };
    }),

  listCustomExerciseTypes: physioProcedure.query(async () => {
    return listCustomExerciseTypes();
  }),

  createCustomExerciseType: physioProcedure
    .input(z.object({ name: z.string().min(1).max(255) }))
    .mutation(async ({ input }) => {
      try {
        await createCustomExerciseType(input.name);
        return { success: true };
      } catch (error: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message || "Failed to create custom exercise type",
        });
      }
    }),

  listCustomInjuryTypes: physioProcedure.query(async () => {
    return listCustomInjuryTypes();
  }),

  createCustomInjuryType: physioProcedure
    .input(z.object({ name: z.string().min(1).max(255) }))
    .mutation(async ({ input }) => {
      try {
        await createCustomInjuryType(input.name);
        return { success: true };
      } catch (error: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message || "Failed to create custom injury type",
        });
      }
    }),

  updateClientDiagnosis: physioProcedure
    .input(
      z.object({
        clientId: z.number().int().positive(),
        injuryType: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const client = await getUserById(input.clientId);
      if (!client || client.physiotherapistId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your client" });
      }

      await updateUserFields(input.clientId, {
        injuryType: input.injuryType,
      });

      return { success: true };
    }),

  deleteCustomExerciseType: physioProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      try {
        await deleteCustomExerciseType(input.id);
        return { success: true };
      } catch (error: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message || "Failed to delete custom exercise type",
        });
      }
    }),

  deleteCustomInjuryType: physioProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      try {
        await deleteCustomInjuryType(input.id);
        return { success: true };
      } catch (error: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message || "Failed to delete custom injury type",
        });
      }
    }),
});
