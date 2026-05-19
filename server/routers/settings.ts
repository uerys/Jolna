import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { setLanguagePreference } from "../db";
import { LANGUAGES } from "../../drizzle/schema";

/**
 * Per-user preferences available to any authenticated role.
 * Language preference is persisted in users.languagePreference.
 */
export const settingsRouter = router({
  setLanguagePreference: protectedProcedure
    .input(z.object({ language: z.enum(LANGUAGES) }))
    .mutation(async ({ ctx, input }) => {
      await setLanguagePreference(ctx.user.id, input.language);
      return { success: true };
    }),
});
