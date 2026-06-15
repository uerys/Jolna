import { COOKIE_NAME, ONE_YEAR_MS } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { IMPERSONATE_COOKIE, publicProcedure, router } from "./_core/trpc";
import { sdk } from "./_core/localAuth";
import { getUserById } from "./db";
import { adminRouter } from "./routers/admin";
import { clientRouter } from "./routers/client";
import { devRouter } from "./routers/dev";
import { notificationsRouter } from "./routers/notifications";
import { physioRouter } from "./routers/physio";
import { settingsRouter } from "./routers/settings";
import { parse as parseCookieHeader } from "cookie";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

/**
 * Resolve effective user (respects dev-mode impersonation) for auth.me.
 */
async function resolveEffectiveMe(ctx: {
  user: Awaited<ReturnType<typeof getUserById>> | null | undefined;
  req: { headers: { cookie?: string } };
}) {
  if (!ctx.user) return null;
  if (process.env.NODE_ENV === "production") return ctx.user;
  const cookieHeader = ctx.req.headers?.cookie;
  if (!cookieHeader) return ctx.user;
  const parsed = parseCookieHeader(cookieHeader);
  const raw = parsed[IMPERSONATE_COOKIE];
  if (!raw) return ctx.user;
  const id = Number.parseInt(raw, 10);
  if (!Number.isFinite(id)) return ctx.user;
  if (ctx.user.role !== "admin") return ctx.user;
  const impersonated = await getUserById(id);
  return impersonated ?? ctx.user;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    /**
     * Public registration is disabled.
     * Account creation is handled by the administrator via admin.createUser.
     * This endpoint is kept as a stub to avoid breaking the client build.
     */
    register: publicProcedure
      .input(
        z.object({
          name: z.string().min(1).max(120),
          email: z.string().email({ message: "Invalid email" }).max(320),
          password: z.string().min(8).max(128),
        })
      )
      .mutation(async () => {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Public registration is disabled. Please contact your clinic administrator to create an account.",
        });
      }),
    login: publicProcedure
      .input(
        z.object({
          email: z.string().email({ message: "Invalid email" }).max(320),
          password: z.string().min(1).max(128),
        })
      )
      .mutation(async opts => {
        const { user, sessionToken } = await sdk.login(opts.input);
        const cookieOptions = getSessionCookieOptions(opts.ctx.req);
        opts.ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        });
        return user;
      }),
    me: publicProcedure.query(async opts => {
      const effective = await resolveEffectiveMe(opts.ctx);
      if (!effective) return null;
      // Surface whether the user is currently being impersonated so the UI
      // can show a "Viewing as …" banner.
      const rawCookie = opts.ctx.req.headers?.cookie ?? "";
      const impersonating =
        process.env.NODE_ENV !== "production" &&
        opts.ctx.user?.role === "admin" &&
        !!parseCookieHeader(rawCookie)[IMPERSONATE_COOKIE];
      return { ...effective, __impersonating: impersonating };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      ctx.res.clearCookie(IMPERSONATE_COOKIE, { path: "/" });
      return { success: true } as const;
    }),
  }),
  admin: adminRouter,
  physio: physioRouter,
  clientApp: clientRouter,
  notifications: notificationsRouter,
  dev: devRouter,
  settings: settingsRouter,
});

export type AppRouter = typeof appRouter;
