import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getUserById, listUsers, setLanguagePreference, updateUserFields } from "../db";
import { LANGUAGES } from "../../drizzle/schema";
import { sdk } from "../_core/localAuth";
/**
 * Per-user preferences available to any authenticated role.
 * Language preference is persisted in users.languagePreference.
 */
export const settingsRouter = router({
  getMyProfile: protectedProcedure.query(async ({ ctx }) => {
    const physiotherapist = ctx.user.physiotherapistId
      ? await getUserById(ctx.user.physiotherapistId)
      : null;
    const assignedClients = ctx.user.role === "physiotherapist"
      ? await listUsers({ role: "client", status: "active", physiotherapistId: ctx.user.id })
      : [];

    return {
      user: ctx.user,
      physiotherapist: physiotherapist
        ? {
            id: physiotherapist.id,
            name: physiotherapist.name,
            email: physiotherapist.email,
            avatarUrl: physiotherapist.avatarUrl,
            phoneNumber: physiotherapist.phoneNumber,
          }
        : null,
      assignedClients: assignedClients.map((client) => ({
        id: client.id,
        name: client.name,
        email: client.email,
        avatarUrl: client.avatarUrl,
        phoneNumber: client.phoneNumber,
        status: client.status,
      })),
    };
  }),

  // Contacts for clinic admins so users (clients/physios) can reach out
  getAdminsContacts: protectedProcedure.query(async ({ ctx }) => {
    const admins = await listUsers({ role: "admin", status: "active" });
    return admins.map((a) => ({
      id: a.id,
      name: a.name,
      email: a.email,
      phoneNumber: a.phoneNumber,
    }));
  }),

  updateMyProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(120).optional(),
        phoneNumber: z.string().min(1).max(32).nullable().optional(),
        avatarUrl: z.string().max(2_000_000).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const patch: {
        name?: string | null;
        phoneNumber?: string | null;
        avatarUrl?: string | null;
      } = {};

      if (input.name !== undefined) patch.name = input.name;
      if (input.phoneNumber !== undefined) patch.phoneNumber = input.phoneNumber;
      if (input.avatarUrl !== undefined) patch.avatarUrl = input.avatarUrl;

      return updateUserFields(ctx.user.id, patch);
    }),

  setLanguagePreference: protectedProcedure
    .input(z.object({ language: z.enum(LANGUAGES) }))
    .mutation(async ({ ctx, input }) => {
      await setLanguagePreference(ctx.user.id, input.language);
      return { success: true };
    }),

  updatePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8).max(128),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await getUserById(ctx.user.id);
      if (!user || !user.passwordHash) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "User not found or has no password hash set.",
        });
      }

      if (!sdk.checkPassword(input.currentPassword, user.passwordHash)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Incorrect current password.",
        });
      }

      await sdk.resetPassword(ctx.user.id, input.newPassword);
      return { success: true };
    }),
});
