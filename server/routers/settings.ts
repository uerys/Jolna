import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getUserById, setLanguagePreference, updateUserFields } from "../db";
import { LANGUAGES } from "../../drizzle/schema";

/**
 * Per-user preferences available to any authenticated role.
 * Language preference is persisted in users.languagePreference.
 */
export const settingsRouter = router({
  getMyProfile: protectedProcedure.query(async ({ ctx }) => {
    const physiotherapist = ctx.user.physiotherapistId
      ? await getUserById(ctx.user.physiotherapistId)
      : null;

    return {
      user: ctx.user,
      physiotherapist: physiotherapist
        ? {
            id: physiotherapist.id,
            name: physiotherapist.name,
            email: physiotherapist.email,
            avatarUrl: physiotherapist.avatarUrl,
          }
        : null,
    };
  }),

  updateMyProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(120).optional(),
        avatarUrl: z.string().max(2_000_000).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const patch: {
        name?: string | null;
        avatarUrl?: string | null;
      } = {};

      if (input.name !== undefined) patch.name = input.name;
      if (input.avatarUrl !== undefined) patch.avatarUrl = input.avatarUrl;

      return updateUserFields(ctx.user.id, patch);
    }),

  setLanguagePreference: protectedProcedure
    .input(z.object({ language: z.enum(LANGUAGES) }))
    .mutation(async ({ ctx, input }) => {
      await setLanguagePreference(ctx.user.id, input.language);
      return { success: true };
    }),
});
