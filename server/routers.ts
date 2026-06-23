import { COOKIE_NAME, ONE_YEAR_MS } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { IMPERSONATE_COOKIE, publicProcedure, router } from "./_core/trpc";
import { sdk } from "./_core/localAuth";
import { getUserById, getUserByEmail, upsertUser } from "./db";
import { listUsers, createNotification } from "./db";
import { sendEmail } from "./_core/mailer";
import { type DecodedIdToken } from "firebase-admin/auth";
import { firebaseAuth } from "./_core/firebaseAdmin";
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
    register: publicProcedure
      .input(
        z.object({
          name: z.string().min(1).max(120),
          email: z.string().email({ message: "Invalid email" }).max(320),
          password: z.string().min(8).max(128),
        })
      )
      .mutation(async opts => {
        try {
          const { user } = await sdk.register({
            name: opts.input.name,
            email: opts.input.email,
            password: opts.input.password,
            role: "client",
          });
          await upsertUser({
            openId: user.openId,
            status: "inactive",
          });
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "Your account is pending administrator approval. Please contact your administrator.",
          });
        } catch (error) {
          if (error instanceof TRPCError) {
            throw error;
          }
          const msg = error instanceof Error ? error.message : String(error);
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: msg,
          });
        }
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
    loginWithGoogle: publicProcedure
      .input(
        z.object({
          idToken: z.string(),
        })
      )
      .mutation(async opts => {
        if (!firebaseAuth) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              "Google OAuth via Firebase is not configured on the server.",
          });
        }

        let decodedToken: DecodedIdToken;
        try {
          decodedToken = await firebaseAuth.verifyIdToken(opts.input.idToken);
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: `Invalid Google OAuth token: ${msg}`,
          });
        }

        const { uid, email, name, picture } = decodedToken;
        if (!email) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Email is missing from the Google account.",
          });
        }

        // Check if user exists by email
        let user = await getUserByEmail(email);
        if (!user) {
          // Automatic registration if the user does not exist
          await upsertUser({
            openId: uid,
            name: name ?? email.split("@")[0],
            email: email,
            avatarUrl: picture ?? null,
            loginMethod: "google",
            role: "client",
            status: "inactive",
            lastSignedIn: new Date(),
          });
          user = await getUserByEmail(email);
        } else {
          // If user exists, update their sign-in info
          await upsertUser({
            openId: user.openId,
            lastSignedIn: new Date(),
            avatarUrl: user.avatarUrl ?? picture ?? null,
            name: user.name ?? name ?? null,
          });
          user = await getUserByEmail(email);
        }

        if (!user) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to resolve or create user profile.",
          });
        }

        if (user.status === "inactive") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "Your account is pending administrator approval. Please contact your administrator.",
          });
        }
        if (user.status === "suspended") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "Your account has been suspended. Please contact your administrator.",
          });
        }

        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name ?? user.email ?? "",
        });

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
    forgotPassword: publicProcedure
      .input(
        z.object({
          email: z.string().email({ message: "Invalid email" }),
        })
      )
      .mutation(async ({ input }) => {
        const user = await getUserByEmail(input.email);
        if (!user) {
          // Always return success to prevent email enumeration
          return { success: true };
        }

        const admins = await listUsers({ role: "admin", status: "active" });
        if (admins.length === 0) {
          return { success: true };
        }

        const requesterName = user.name || "Unknown User";
        const requesterEmail = user.email || "No email";

        let emailSent = false;
        for (const admin of admins) {
          if (!admin.email) continue;
          const emailContent = `
            <div style="font-family: sans-serif; line-height: 1.5; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
              <h2 style="color: #534AB7;">Password Reset Request</h2>
              <p>A user has requested a password reset on JOLNA:</p>
              <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 6px 0; font-weight: bold; width: 30%;">Name:</td>
                  <td style="padding: 6px 0;">${requesterName}</td>
                </tr>
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 6px 0; font-weight: bold;">Email:</td>
                  <td style="padding: 6px 0;">${requesterEmail}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-weight: bold;">User ID:</td>
                  <td style="padding: 6px 0;">#${user.id}</td>
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

        for (const admin of admins) {
          await createNotification({
            recipientId: admin.id,
            actorId: user.id,
            type: "password_reset_requested",
            title: "Password Reset Request",
            content: `${requesterName} is requesting a password reset.`,
            href: "/admin/users",
          });
        }

        return { success: true };
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
