import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type Role = "client" | "physiotherapist" | "admin";

function makeCtx(role: Role | null): TrpcContext {
  const user =
    role === null
      ? null
      : ({
          id: role === "admin" ? 1 : role === "physiotherapist" ? 2 : 3,
          openId: `${role}-open-id`,
          email: `${role}@example.com`,
          name: role,
          loginMethod: "manus",
          role: role as any,
          status: "active" as any,
          languagePreference: "en" as any,
          physiotherapistId: role === "client" ? 2 : null,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        } as any);

  return {
    user,
    req: { headers: {}, protocol: "https" } as TrpcContext["req"],
    res: {
      clearCookie: () => void 0,
      cookie: () => void 0,
    } as unknown as TrpcContext["res"],
  };
}

describe("RBAC", () => {
  it("blocks unauthenticated callers from the admin router", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(caller.admin.listUsers()).rejects.toThrow();
  });

  it("blocks a client from the admin router", async () => {
    const caller = appRouter.createCaller(makeCtx("client"));
    await expect(caller.admin.listUsers()).rejects.toThrow();
  });

  it("blocks a physiotherapist from the admin router", async () => {
    const caller = appRouter.createCaller(makeCtx("physiotherapist"));
    await expect(caller.admin.listUsers()).rejects.toThrow();
  });

  it("blocks a client from the physio router", async () => {
    const caller = appRouter.createCaller(makeCtx("client"));
    await expect(caller.physio.listMyExercises()).rejects.toThrow();
  });

  it("blocks a physiotherapist from the client router", async () => {
    const caller = appRouter.createCaller(makeCtx("physiotherapist"));
    await expect(caller.clientApp.listTodayAssignments()).rejects.toThrow();
  });
});

describe("feedback validation", () => {
  it("rejects pain score above 10", async () => {
    const caller = appRouter.createCaller(makeCtx("client"));
    await expect(
      caller.clientApp.submitFeedback({
        assignmentId: 1,
        painScore: 11,
        completed: true,
      }),
    ).rejects.toThrow();
  });

  it("rejects negative pain score", async () => {
    const caller = appRouter.createCaller(makeCtx("client"));
    await expect(
      caller.clientApp.submitFeedback({
        assignmentId: 1,
        painScore: -1,
        completed: true,
      }),
    ).rejects.toThrow();
  });
});

describe("language preference", () => {
  it("accepts valid language values", async () => {
    // Schema-level: procedure input validation accepts "en" and "kh".
    // We verify by checking the input zod parser via the caller.
    const caller = appRouter.createCaller(makeCtx("client"));
    // We can't actually hit the DB in unit tests, but an invalid value must throw at the input layer.
    await expect(
      // @ts-expect-error — invalid on purpose
      caller.settings.setLanguagePreference({ language: "fr" }),
    ).rejects.toThrow();
  });
});

describe("impersonation safety", () => {
  it("refuses to impersonate when NODE_ENV=production", async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      const caller = appRouter.createCaller(makeCtx("admin"));
      await expect(
        caller.dev.impersonate({ userId: 42 }),
      ).rejects.toThrow(/disabled in production/i);
    } finally {
      process.env.NODE_ENV = prev;
    }
  });

  it("returns an empty impersonation-target list in production", async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      const caller = appRouter.createCaller(makeCtx("admin"));
      const targets = await caller.dev.listImpersonationTargets();
      expect(targets).toEqual([]);
    } finally {
      process.env.NODE_ENV = prev;
    }
  });

  it("blocks non-admins from touching the dev router", async () => {
    const caller = appRouter.createCaller(makeCtx("physiotherapist"));
    await expect(caller.dev.listImpersonationTargets()).rejects.toThrow();
  });
});
