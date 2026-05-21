import { COOKIE_NAME, ONE_YEAR_MS, UNAUTHED_ERR_MSG } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { parse as parseCookieHeader } from "cookie";
import crypto from "node:crypto";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

export type SessionPayload = {
  openId: string;
  appId: string;
  name: string;
};

class LocalAuthService {
  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) {
      return new Map<string, string>();
    }

    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }

  private getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }

  private getSessionAppId() {
    return ENV.appId || "local";
  }

  private hashPassword(password: string, salt = crypto.randomBytes(16).toString("hex")) {
    const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");
    return `scrypt$${salt}$${derivedKey}`;
  }

  private verifyPassword(password: string, storedHash: string) {
    const [scheme, salt, expectedHash] = storedHash.split("$");
    if (scheme !== "scrypt" || !salt || !expectedHash) return false;

    const actualHash = crypto.scryptSync(password, salt, 64).toString("hex");
    const actual = Buffer.from(actualHash, "hex");
    const expected = Buffer.from(expectedHash, "hex");

    if (actual.length !== expected.length) return false;
    return crypto.timingSafeEqual(actual, expected);
  }

  async createSessionToken(
    openId: string,
    options: { expiresInMs?: number; name?: string } = {},
  ): Promise<string> {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
    const secretKey = this.getSessionSecret();

    return new SignJWT({
      openId,
      appId: this.getSessionAppId(),
      name: options.name || "",
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .sign(secretKey);
  }

  async verifySession(
    cookieValue: string | undefined | null,
  ): Promise<{ openId: string; appId: string; name: string } | null> {
    if (!cookieValue) {
      return null;
    }

    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"],
      });
      const { openId, appId, name } = payload as Record<string, unknown>;

      if (
        !isNonEmptyString(openId) ||
        !isNonEmptyString(appId) ||
        !isNonEmptyString(name)
      ) {
        return null;
      }

      return { openId, appId, name };
    } catch {
      return null;
    }
  }

  async register(input: { name: string; email: string; phone?: string; password: string; role?: string }) {
    const email = this.normalizeEmail(input.email);
    const openId = email;
    const existingUser = (await db.getUserByEmail(email)) ?? (await db.getUserByOpenId(openId));
    if (existingUser) {
      throw ForbiddenError("An account with that email already exists.");
    }

    const passwordHash = this.hashPassword(input.password);
    await db.upsertUser({
      openId,
      name: input.name.trim(),
      email,
      phoneNumber: input.phone?.trim() || null,
      passwordHash,
      loginMethod: "local",
      role: (input.role as any) || "client",
      status: "active",
      lastSignedIn: new Date(),
    });

    const user = await db.getUserByOpenId(openId);
    if (!user) {
      throw ForbiddenError("Failed to create account.");
    }

    const sessionToken = await this.createSessionToken(user.openId, {
      name: user.name || input.name,
    });

    return { user, sessionToken };
  }

  async login(input: { email: string; password: string }) {
    const email = this.normalizeEmail(input.email);
    const user = (await db.getUserByEmail(email)) ?? (await db.getUserByOpenId(email));
    if (!user || !user.passwordHash) {
      throw ForbiddenError("Invalid email or password.");
    }

    // Prevent login for inactive/suspended accounts
    if (user.status !== "active") {
      throw ForbiddenError("Account is inactive. Contact your administrator.");
    }

    if (!this.verifyPassword(input.password, user.passwordHash)) {
      throw ForbiddenError("Invalid email or password.");
    }

    await db.upsertUser({
      openId: user.openId,
      lastSignedIn: new Date(),
    });

    const sessionToken = await this.createSessionToken(user.openId, {
      name: user.name || user.email || "",
    });

    return { user, sessionToken };
  }

  async authenticateRequest(req: Request): Promise<User> {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);

    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }

    const signedInAt = new Date();
    const user = await db.getUserByOpenId(session.openId);

    if (!user) {
      throw ForbiddenError("User not found");
    }

    // Block requests for inactive/suspended accounts. Returning the
    // shared `UNAUTHED_ERR_MSG` causes the client to redirect to login
    // and clear the session automatically.
    if (user.status !== "active") {
      throw ForbiddenError(UNAUTHED_ERR_MSG);
    }

    await db.upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt,
    });

    return user;
  }
}

export const sdk = new LocalAuthService();
