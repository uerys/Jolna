import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "@shared/const";
import { initTRPC, TRPCError } from "@trpc/server";
import { parse as parseCookieHeader } from "cookie";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { getUserById } from "../db";

export const IMPERSONATE_COOKIE = "recovry_impersonate";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Resolve the effective user for this request.
 *
 * - In production: always returns the authenticated user.
 * - In development: if the authenticated user is a Clinic Admin and the request
 *   carries the `recovry_impersonate` cookie pointing to an existing user id,
 *   the cookie's user is returned instead. This is purely a demo affordance;
 *   impersonation is silently ignored in production.
 */
async function resolveEffectiveUser(ctx: TrpcContext) {
  if (!ctx.user) return null;
  if (process.env.NODE_ENV === "production") return ctx.user;

  const cookieHeader = ctx.req.headers?.cookie;
  if (!cookieHeader) return ctx.user;
  const parsed = parseCookieHeader(cookieHeader);
  const raw = parsed[IMPERSONATE_COOKIE];
  if (!raw) return ctx.user;

  const id = Number.parseInt(raw, 10);
  if (!Number.isFinite(id)) return ctx.user;

  // Only an admin caller may hydrate impersonation targets.
  const adminRoles: string[] = ["admin"];
  if (!adminRoles.includes(ctx.user.role)) return ctx.user;

  const impersonated = await getUserById(id);
  return impersonated ?? ctx.user;
}

const requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  const effectiveUser = await resolveEffectiveUser(ctx);

  if (!effectiveUser) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({ ctx: { ...ctx, user: effectiveUser } });
});

export const protectedProcedure = t.procedure.use(requireUser);

/* ------------------------------------------------------------------ */
/* Role-gated procedures                                               */
/* ------------------------------------------------------------------ */

function makeRoleProcedure(
  allowedRoles: readonly string[],
  notAllowedMessage = NOT_ADMIN_ERR_MSG,
) {
  return t.procedure.use(
    t.middleware(async (opts) => {
      const { ctx, next } = opts;
      const effectiveUser = await resolveEffectiveUser(ctx);

      if (!effectiveUser) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: UNAUTHED_ERR_MSG,
        });
      }
      if (!allowedRoles.includes(effectiveUser.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: notAllowedMessage });
      }

      return next({ ctx: { ...ctx, user: effectiveUser } });
    }),
  );
}

/**
 * Admin-only procedure that checks the ORIGINAL user's role (before impersonation).
 * This allows admins to perform admin actions even while impersonating another user.
 */
function makeAdminOnlyProcedure(notAllowedMessage = "Clinic Admin access required.") {
  return t.procedure.use(
    t.middleware(async (opts) => {
      const { ctx, next } = opts;

      // Check original user's role, not the effective (impersonated) user's role
      if (!ctx.originalUser || ctx.originalUser.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: notAllowedMessage });
      }

      // But still apply effective user resolution for data access
      const effectiveUser = await resolveEffectiveUser(ctx);
      if (!effectiveUser) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: UNAUTHED_ERR_MSG,
        });
      }

      return next({ ctx: { ...ctx, user: effectiveUser } });
    }),
  );
}

/** Clinic Admin only. Still matches the legacy `admin` enum value. */
export const adminProcedure = makeAdminOnlyProcedure(
  "Clinic Admin access required.",
);

/** Physiotherapist only. */
export const physioProcedure = makeRoleProcedure(
  ["physiotherapist"],
  "Physiotherapist access required.",
);

/** Client only. We also accept the legacy `user` role as "client" for back-compat. */
export const clientProcedure = makeRoleProcedure(
  ["client", "user"],
  "Client access required.",
);

/** Any authenticated Recovry role. Uses the effective (impersonated) user. */
export const anyRoleProcedure = makeRoleProcedure(
  ["admin", "physiotherapist", "client", "user"],
  UNAUTHED_ERR_MSG,
);
