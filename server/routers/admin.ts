import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminProcedure, router } from "../_core/trpc";
import {
  deleteUser,
  getUserById,
  listUsers,
  updateUserFields,
} from "../db";
import {
  ACCOUNT_STATUSES,
  INJURY_TYPES,
  LANGUAGES,
  ROLES,
} from "../../drizzle/schema";
import { createAuditLog } from "../db";
import { sdk } from "../_core/localAuth";

const RoleEnum = z.enum(ROLES);
const StatusEnum = z.enum(ACCOUNT_STATUSES);
const LanguageEnum = z.enum(LANGUAGES);

export const adminRouter = router({
  listUsers: adminProcedure
    .input(
      z
        .object({
          role: RoleEnum.optional(),
          status: StatusEnum.optional(),
          physiotherapistId: z.number().int().positive().optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => listUsers(input)),

  getUser: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const user = await getUserById(input.id);
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }
      return user;
    }),

  updateUser: adminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        patch: z.object({
          name: z.string().min(1).max(120).nullable().optional(),
          email: z.string().email().max(320).nullable().optional(),
          role: RoleEnum.optional(),
          status: StatusEnum.optional(),
          languagePreference: LanguageEnum.optional(),
          physiotherapistId: z.number().int().positive().nullable().optional(),
          injuryType: z.enum(INJURY_TYPES).nullable().optional(),
          nextClinicVisit: z.string().nullable().optional(),
        }),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.originalUser && ctx.originalUser.id === input.id) {
        if (input.patch.role && input.patch.role !== ctx.originalUser.role) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot change your own role" });
        }
        if (input.patch.status && input.patch.status !== ctx.originalUser.status) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot change your own status" });
        }
      }
      const result = await updateUserFields(input.id, input.patch);
      await createAuditLog({
        actorId: ctx.originalUser?.id ?? ctx.user.id,
        action: "user_updated",
        targetType: "user",
        targetId: input.id,
        description: `Updated user #${input.id}: ${Object.keys(input.patch).join(", ")}`,
      });
      return result;
    }),

  approveUser: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) =>
      updateUserFields(input.id, { status: "active" }),
    ),

  suspendUser: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      // Prevent an admin from suspending their own account
      if (ctx.originalUser && ctx.originalUser.id === input.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot suspend your own account" });
      }
      return updateUserFields(input.id, { status: "suspended" });
    }),

  deleteUser: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.originalUser && ctx.originalUser.id === input.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot delete your own account" });
      }
      await deleteUser(input.id);
      return { success: true };
    }),

  resetPassword: adminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        password: z.string().min(8),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await sdk.resetPassword(input.id, input.password);

      await createAuditLog({
        actorId: ctx.originalUser?.id ?? ctx.user.id,
        action: "password_reset",
        targetType: "user",
        targetId: input.id,
        description: `Reset password for user #${input.id}`,
      });

      return { success: true };
    }),
  assignClientToPhysio: adminProcedure
    .input(
      z.object({
        clientId: z.number().int().positive(),
        physiotherapistId: z.number().int().positive().nullable(),
      }),
    )
    .mutation(async ({ input }) =>
      updateUserFields(input.clientId, {
        physiotherapistId: input.physiotherapistId,
      }),
    ),

  createUser: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(120),
        email: z.string().email().max(320),
        phoneNumber: z.string().min(1).max(32),
        password: z.string().min(8),
        role: RoleEnum.default("client"),
        status: StatusEnum.default("active"),
      }),
    )
    .mutation(async ({ input }) => {
      const result = await sdk.register({
        name: input.name,
        email: input.email,
        phone: input.phoneNumber,
        password: input.password,
        role: input.role,
      });
      // Update status if needed
      if (input.status !== "active") {
        await updateUserFields(result.user.id, { status: input.status });
        result.user.status = input.status;
      }
      return result.user;
    }),
});
