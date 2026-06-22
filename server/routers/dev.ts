import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminProcedure, IMPERSONATE_COOKIE, router } from "../_core/trpc";
import { listUsers } from "../db";

const isDev = () => process.env.NODE_ENV !== "production";

function setImpersonationCookie(res: any, value: string | null) {
  if (!res?.cookie || !res?.clearCookie) return;
  if (value === null) {
    res.clearCookie(IMPERSONATE_COOKIE, { path: "/" });
    return;
  }
  res.cookie(IMPERSONATE_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 1000 * 60 * 60 * 8,
  });
}

export const devRouter = router({
  /** List seeded users that the admin may impersonate (dev only). */
  listImpersonationTargets: adminProcedure.query(async () => {
    if (!isDev()) return [];
    return listUsers();
  }),

  impersonate: adminProcedure
    .input(z.object({ userId: z.number().int().positive() }))
    .mutation(({ ctx, input }) => {
      if (!isDev()) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Impersonation disabled in production.",
        });
      }
      setImpersonationCookie(ctx.res, String(input.userId));
      return { success: true };
    }),

  stopImpersonation: adminProcedure.mutation(({ ctx }) => {
    setImpersonationCookie(ctx.res, null);
    return { success: true };
  }),
});
