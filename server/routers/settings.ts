import { z } from "zod";
import { validateCambodianPhoneNumber } from "../../shared/phoneValidation";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getUserById,
  listUsers,
  setLanguagePreference,
  updateUserFields,
  createNotification,
} from "../db";
import { LANGUAGES } from "../../drizzle/schema";
import { sdk } from "../_core/localAuth";
import { sendEmail } from "../_core/mailer";
/**
 * Per-user preferences available to any authenticated role.
 * Language preference is persisted in users.languagePreference.
 */
export const settingsRouter = router({
  getMyProfile: protectedProcedure.query(async ({ ctx }) => {
    const physiotherapist = ctx.user.physiotherapistId
      ? await getUserById(ctx.user.physiotherapistId)
      : null;
    const assignedClients =
      ctx.user.role === "physiotherapist"
        ? await listUsers({
            role: "client",
            status: "active",
            physiotherapistId: ctx.user.id,
          })
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
      assignedClients: assignedClients.map(client => ({
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
    return admins.map(a => ({
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
        phoneNumber: z
          .string()
          .min(1)
          .max(32)
          .nullable()
          .optional()
          .refine(val => !val || validateCambodianPhoneNumber(val), {
            message: "Invalid Cambodian phone number.",
          }),
        avatarUrl: z.string().max(2_000_000).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const patch: {
        name?: string | null;
        phoneNumber?: string | null;
        avatarUrl?: string | null;
      } = {};

      if (input.name !== undefined) patch.name = input.name;
      if (input.phoneNumber !== undefined)
        patch.phoneNumber = input.phoneNumber;
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

  requestPasswordReset: protectedProcedure.mutation(async ({ ctx }) => {
    const admins = await listUsers({ role: "admin", status: "active" });
    if (admins.length === 0) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No active administrator contact found.",
      });
    }

    const requesterName = ctx.user.name ?? ctx.user.email ?? "A client";
    const requesterEmail = ctx.user.email;

    let emailSent = false;
    for (const admin of admins) {
      if (!admin.email) continue;

      const emailContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e7ec; border-radius: 12px;">
          <h2 style="color: #534AB7;">Password Reset Request</h2>
          <p>Dear <strong>${admin.name ?? "Administrator"}</strong>,</p>
          <p>A user has requested a password reset on JOLNA:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <tr>
              <td style="padding: 6px 0; font-weight: bold; width: 120px;">Name:</td>
              <td style="padding: 6px 0;">${requesterName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold;">Email:</td>
              <td style="padding: 6px 0;">${requesterEmail}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold;">User ID:</td>
              <td style="padding: 6px 0;">#${ctx.user.id}</td>
            </tr>
          </table>
          <p>Please log in to your Admin Panel to reset their password:</p>
          <div style="margin: 20px 0;">
            <a href="http://localhost:3000/admin/users" style="background-color: #534AB7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Go to User Management</a>
          </div>
        </div>
      `;

      const result = await sendEmail(
        admin.email,
        `Password Reset Request - ${requesterName}`,
        emailContent
      );
      if (result.success) {
        emailSent = true;
      }
    }

    if (!emailSent) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to deliver the reset request email to administrators.",
      });
    }

    // Create in-app notifications for all admins
    for (const admin of admins) {
      await createNotification({
        recipientId: admin.id,
        actorId: ctx.user.id,
        type: "password_reset_requested",
        title: "Password Reset Request",
        content: `${requesterName} is requesting a password reset.`,
        href: "/admin/users",
      });
    }

    return { success: true };
  }),
});
