// api/index.ts
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");
  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: isSecureRequest(req),
  };
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};

// server/_core/notification.ts
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = value => value.trim();
var isNonEmptyString = value =>
  typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = baseUrl => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = input => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required.",
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required.",
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`,
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`,
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured.",
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured.",
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1",
      },
      body: JSON.stringify({ title, content }),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import { parse as parseCookieHeader } from "cookie";
import superjson from "superjson";

// server/db.ts
import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";

// drizzle/schema.ts
import {
  boolean,
  date,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  longtext,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";
var ROLES = ["user", "admin", "client", "physiotherapist"];
var ACCOUNT_STATUSES = ["active", "inactive", "suspended"];
var LANGUAGES = ["en", "kh"];
var ASSIGNMENT_STATUSES = ["active", "completed", "cancelled"];
var NOTIFICATION_TYPES = [
  "assignment_created",
  "assignment_status_updated",
  "feedback_submitted",
];
var INJURY_TYPES = [
  "muscle_strain",
  "ligament_sprain",
  "fracture_recovery",
  "post_surgery",
  "joint_pain",
  "back_pain",
  "neck_pain",
  "shoulder_injury",
  "knee_injury",
  "ankle_injury",
  "tendonitis",
  "other",
];
var EXERCISE_TYPES = [
  "strength",
  "flexibility",
  "balance",
  "endurance",
  "mobility",
  "stretching",
  "functional",
  "other",
];
var users = mysqlTable(
  "users",
  {
    id: int("id").autoincrement().primaryKey(),
    openId: varchar("openId", { length: 320 }).notNull().unique(),
    name: text("name"),
    email: varchar("email", { length: 320 }),
    phoneNumber: varchar("phoneNumber", { length: 32 }),
    avatarUrl: longtext("avatarUrl"),
    passwordHash: text("passwordHash"),
    loginMethod: varchar("loginMethod", { length: 64 }),
    role: mysqlEnum("role", ROLES).default("user").notNull(),
    status: mysqlEnum("status", ACCOUNT_STATUSES).default("active").notNull(),
    languagePreference: mysqlEnum("languagePreference", LANGUAGES)
      .default("en")
      .notNull(),
    physiotherapistId: int("physiotherapistId"),
    injuryType: varchar("injuryType", { length: 255 }).default("other"),
    nextClinicVisit: varchar("nextClinicVisit", { length: 255 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  },
  t2 => ({
    byRole: index("users_role_idx").on(t2.role),
    byPhysio: index("users_physio_idx").on(t2.physiotherapistId),
  })
);
var exercises = mysqlTable(
  "exercises",
  {
    id: int("id").autoincrement().primaryKey(),
    createdBy: int("createdBy").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    instructionsEn: text("instructionsEn").notNull(),
    instructionsKh: text("instructionsKh").notNull(),
    videoUrl: varchar("videoUrl", { length: 1024 }).notNull(),
    exerciseType: varchar("exerciseType", { length: 255 })
      .default("other")
      .notNull(),
    defaultReps: int("defaultReps").notNull().default(10),
    defaultSets: int("defaultSets").notNull().default(1),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  t2 => ({
    byCreator: index("exercises_creator_idx").on(t2.createdBy),
  })
);
var assignments = mysqlTable(
  "assignments",
  {
    id: int("id").autoincrement().primaryKey(),
    exerciseId: int("exerciseId").notNull(),
    physiotherapistId: int("physiotherapistId").notNull(),
    clientId: int("clientId").notNull(),
    injuryType: varchar("injuryType", { length: 255 })
      .default("other")
      .notNull(),
    exerciseType: varchar("exerciseType", { length: 255 })
      .default("other")
      .notNull(),
    reps: int("reps").notNull(),
    sets: int("sets").notNull().default(1),
    dailyFrequency: int("dailyFrequency").notNull().default(1),
    startDate: date("startDate", { mode: "string" }).notNull(),
    endDate: date("endDate", { mode: "string" }).notNull(),
    status: mysqlEnum("status", ASSIGNMENT_STATUSES)
      .default("active")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  t2 => ({
    byClient: index("assignments_client_idx").on(t2.clientId),
    byPhysio: index("assignments_physio_idx").on(t2.physiotherapistId),
    byExercise: index("assignments_exercise_idx").on(t2.exerciseId),
  })
);
var feedbackLogs = mysqlTable(
  "feedback_logs",
  {
    id: int("id").autoincrement().primaryKey(),
    assignmentId: int("assignmentId").notNull(),
    clientId: int("clientId").notNull(),
    painScore: int("painScore").notNull(),
    completed: boolean("completed").notNull().default(false),
    notes: text("notes"),
    submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  },
  t2 => ({
    byAssignment: index("feedback_assignment_idx").on(t2.assignmentId),
    byClient: index("feedback_client_idx").on(t2.clientId),
  })
);
var notifications = mysqlTable(
  "notifications",
  {
    id: int("id").autoincrement().primaryKey(),
    recipientId: int("recipientId").notNull(),
    actorId: int("actorId"),
    type: mysqlEnum("type", NOTIFICATION_TYPES).notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    href: varchar("href", { length: 1024 }),
    readAt: timestamp("readAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  t2 => ({
    byRecipient: index("notifications_recipient_idx").on(t2.recipientId),
    byRecipientRead: index("notifications_recipient_read_idx").on(
      t2.recipientId,
      t2.readAt
    ),
  })
);
var auditLogs = mysqlTable(
  "audit_logs",
  {
    id: int("id").autoincrement().primaryKey(),
    actorId: int("actorId").notNull(),
    action: varchar("action", { length: 128 }).notNull(),
    targetType: varchar("targetType", { length: 64 }).notNull(),
    targetId: int("targetId"),
    description: text("description"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  t2 => ({
    byActor: index("audit_actor_idx").on(t2.actorId),
    byTarget: index("audit_target_idx").on(t2.targetType, t2.targetId),
  })
);
var usersRelations = relations(users, ({ one, many }) => ({
  physiotherapist: one(users, {
    fields: [users.physiotherapistId],
    references: [users.id],
    relationName: "client_to_physio",
  }),
  clients: many(users, { relationName: "client_to_physio" }),
  exercisesCreated: many(exercises),
  assignmentsAsPhysio: many(assignments, {
    relationName: "physio_assignments",
  }),
  assignmentsAsClient: many(assignments, {
    relationName: "client_assignments",
  }),
  feedbackLogs: many(feedbackLogs),
}));
var exercisesRelations = relations(exercises, ({ one, many }) => ({
  creator: one(users, {
    fields: [exercises.createdBy],
    references: [users.id],
  }),
  assignments: many(assignments),
}));
var assignmentsRelations = relations(assignments, ({ one, many }) => ({
  exercise: one(exercises, {
    fields: [assignments.exerciseId],
    references: [exercises.id],
  }),
  physiotherapist: one(users, {
    fields: [assignments.physiotherapistId],
    references: [users.id],
    relationName: "physio_assignments",
  }),
  client: one(users, {
    fields: [assignments.clientId],
    references: [users.id],
    relationName: "client_assignments",
  }),
  feedbackLogs: many(feedbackLogs),
}));
var feedbackLogsRelations = relations(feedbackLogs, ({ one }) => ({
  assignment: one(assignments, {
    fields: [feedbackLogs.assignmentId],
    references: [assignments.id],
  }),
  client: one(users, {
    fields: [feedbackLogs.clientId],
    references: [users.id],
  }),
}));
var notificationsRelations = relations(notifications, ({ one }) => ({
  recipient: one(users, {
    fields: [notifications.recipientId],
    references: [users.id],
    relationName: "notification_recipient",
  }),
  actor: one(users, {
    fields: [notifications.actorId],
    references: [users.id],
    relationName: "notification_actor",
  }),
}));
var auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actor: one(users, {
    fields: [auditLogs.actorId],
    references: [users.id],
  }),
}));
var customExerciseTypes = mysqlTable("custom_exercise_types", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
var customInjuryTypes = mysqlTable("custom_injury_types", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// server/db.ts
var _db = null;
async function getDb() {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        "DATABASE_URL environment variable is missing. Please set it in your Vercel settings."
      );
    }
    try {
      _db = drizzle(url);
    } catch (error) {
      console.error("[Database] Failed to initialize Drizzle:", error);
      throw error;
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = { openId: user.openId };
    const updateSet = {};
    const textFields = [
      "name",
      "email",
      "phoneNumber",
      "avatarUrl",
      "passwordHash",
      "loginMethod",
    ];
    const assignNullable = field => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (user.status !== void 0) {
      values.status = user.status;
      updateSet.status = user.status;
    }
    if (user.languagePreference !== void 0) {
      values.languagePreference = user.languagePreference;
      updateSet.languagePreference = user.languagePreference;
    }
    values.lastSignedIn ??= /* @__PURE__ */ new Date();
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db
      .insert(users)
      .values(values)
      .onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);
  return result[0];
}
async function getUserByEmail(email) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return result[0];
}
async function getUserById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}
async function listUsers(filter) {
  const db = await getDb();
  if (!db) return [];
  const clauses = [];
  if (filter?.role) clauses.push(eq(users.role, filter.role));
  if (filter?.status) clauses.push(eq(users.status, filter.status));
  if (filter?.physiotherapistId)
    clauses.push(eq(users.physiotherapistId, filter.physiotherapistId));
  const q = db.select().from(users);
  const rows = clauses.length
    ? await q.where(and(...clauses)).orderBy(asc(users.name))
    : await q.orderBy(asc(users.name));
  return rows;
}
async function updateUserFields(id, patch) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set(patch).where(eq(users.id, id));
  return getUserById(id);
}
async function deleteUser(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(users).where(eq(users.id, id));
}
async function setLanguagePreference(id, lang) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(users)
    .set({ languagePreference: lang })
    .where(eq(users.id, id));
}
async function listExercises(createdBy) {
  const db = await getDb();
  if (!db) return [];
  const q = db.select().from(exercises);
  return createdBy
    ? await q
        .where(eq(exercises.createdBy, createdBy))
        .orderBy(desc(exercises.updatedAt))
    : await q.orderBy(desc(exercises.updatedAt));
}
async function getExerciseById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const r = await db
    .select()
    .from(exercises)
    .where(eq(exercises.id, id))
    .limit(1);
  return r[0];
}
async function getAssignmentById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const r = await db
    .select()
    .from(assignments)
    .where(eq(assignments.id, id))
    .limit(1);
  return r[0];
}
async function createExercise(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [{ insertId }] = await db.insert(exercises).values(data);
  return getExerciseById(Number(insertId));
}
async function updateExercise(id, patch) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(exercises).set(patch).where(eq(exercises.id, id));
  return getExerciseById(id);
}
async function deleteExercise(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(exercises).where(eq(exercises.id, id));
}
async function createAssignment(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [{ insertId }] = await db.insert(assignments).values(data);
  const row = await db
    .select()
    .from(assignments)
    .where(eq(assignments.id, Number(insertId)))
    .limit(1);
  return row[0];
}
async function listAssignmentsForClient(clientId, opts) {
  const db = await getDb();
  if (!db) return [];
  const clauses = [eq(assignments.clientId, clientId)];
  if (opts?.status) clauses.push(eq(assignments.status, opts.status));
  if (opts?.activeOn) {
    clauses.push(
      lte(assignments.startDate, opts.activeOn),
      gte(assignments.endDate, opts.activeOn)
    );
  }
  const rows = await db
    .select({
      assignment: {
        id: assignments.id,
        reps: assignments.reps,
        sets: assignments.sets,
        startDate: assignments.startDate,
        endDate: assignments.endDate,
        status: assignments.status,
        injuryType: assignments.injuryType,
        exerciseType: assignments.exerciseType,
        physiotherapistId: assignments.physiotherapistId,
        createdAt: assignments.createdAt,
      },
      exercise: {
        id: exercises.id,
        title: exercises.title,
        instructionsEn: exercises.instructionsEn,
        instructionsKh: exercises.instructionsKh,
        videoUrl: exercises.videoUrl,
        exerciseType: exercises.exerciseType,
      },
    })
    .from(assignments)
    .innerJoin(exercises, eq(exercises.id, assignments.exerciseId))
    .where(and(...clauses))
    .orderBy(desc(assignments.startDate));
  const physioIds = [...new Set(rows.map(r => r.assignment.physiotherapistId))];
  const physioMap = /* @__PURE__ */ new Map();
  if (physioIds.length > 0) {
    for (const pid of physioIds) {
      const p = await getUserById(pid);
      if (p) physioMap.set(pid, { name: p.name, email: p.email });
    }
  }
  return rows.map(r => ({
    ...r,
    physiotherapist: physioMap.get(r.assignment.physiotherapistId) ?? {
      name: null,
      email: null,
    },
  }));
}
async function listAllAssignmentsForClient(clientId) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      assignment: {
        id: assignments.id,
        reps: assignments.reps,
        sets: assignments.sets,
        startDate: assignments.startDate,
        endDate: assignments.endDate,
        status: assignments.status,
        injuryType: assignments.injuryType,
        exerciseType: assignments.exerciseType,
        physiotherapistId: assignments.physiotherapistId,
        createdAt: assignments.createdAt,
      },
      exercise: {
        id: exercises.id,
        title: exercises.title,
        instructionsEn: exercises.instructionsEn,
        instructionsKh: exercises.instructionsKh,
        videoUrl: exercises.videoUrl,
        exerciseType: exercises.exerciseType,
      },
    })
    .from(assignments)
    .innerJoin(exercises, eq(exercises.id, assignments.exerciseId))
    .where(eq(assignments.clientId, clientId))
    .orderBy(desc(assignments.startDate));
  const physioIds = [...new Set(rows.map(r => r.assignment.physiotherapistId))];
  const physioMap = /* @__PURE__ */ new Map();
  for (const pid of physioIds) {
    const p = await getUserById(pid);
    if (p) physioMap.set(pid, { name: p.name, email: p.email });
  }
  return rows.map(r => ({
    ...r,
    physiotherapist: physioMap.get(r.assignment.physiotherapistId) ?? {
      name: null,
      email: null,
    },
  }));
}
async function listAssignmentsForPhysio(physiotherapistId) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ assignment: assignments, exercise: exercises, client: users })
    .from(assignments)
    .innerJoin(exercises, eq(exercises.id, assignments.exerciseId))
    .innerJoin(users, eq(users.id, assignments.clientId))
    .where(eq(assignments.physiotherapistId, physiotherapistId))
    .orderBy(desc(assignments.startDate));
}
async function listAssignmentsForClientByPhysio(clientId, physiotherapistId) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      assignment: assignments,
      exercise: exercises,
    })
    .from(assignments)
    .innerJoin(exercises, eq(exercises.id, assignments.exerciseId))
    .where(
      and(
        eq(assignments.clientId, clientId),
        eq(assignments.physiotherapistId, physiotherapistId)
      )
    )
    .orderBy(desc(assignments.startDate));
}
async function updateAssignmentStatus(id, status) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(assignments).set({ status }).where(eq(assignments.id, id));
}
async function updateAssignment(id, patch) {
  const db = await getDb();
  await db.update(assignments).set(patch).where(eq(assignments.id, id));
}
async function deleteAssignment(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(assignments).where(eq(assignments.id, id));
}
async function createFeedback(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [{ insertId }] = await db.insert(feedbackLogs).values(data);
  const r = await db
    .select()
    .from(feedbackLogs)
    .where(eq(feedbackLogs.id, Number(insertId)))
    .limit(1);
  return r[0];
}
async function listFeedbackByClient(clientId, opts) {
  const db = await getDb();
  if (!db) return [];
  const clauses = [eq(feedbackLogs.clientId, clientId)];
  if (opts?.from) clauses.push(gte(feedbackLogs.submittedAt, opts.from));
  if (opts?.to) clauses.push(lte(feedbackLogs.submittedAt, opts.to));
  return db
    .select()
    .from(feedbackLogs)
    .where(and(...clauses))
    .orderBy(desc(feedbackLogs.submittedAt));
}
async function listFeedbackByAssignment(assignmentId) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(feedbackLogs)
    .where(eq(feedbackLogs.assignmentId, assignmentId))
    .orderBy(desc(feedbackLogs.submittedAt));
}
async function listFeedbackByClientEnriched(clientId, opts) {
  const db = await getDb();
  if (!db) return [];
  const clauses = [eq(feedbackLogs.clientId, clientId)];
  if (opts?.assignmentId)
    clauses.push(eq(feedbackLogs.assignmentId, opts.assignmentId));
  if (opts?.from) clauses.push(gte(feedbackLogs.submittedAt, opts.from));
  if (opts?.to) clauses.push(lte(feedbackLogs.submittedAt, opts.to));
  return db
    .select({
      feedback: feedbackLogs,
      assignment: {
        id: assignments.id,
        injuryType: assignments.injuryType,
        exerciseType: assignments.exerciseType,
        status: assignments.status,
        startDate: assignments.startDate,
        endDate: assignments.endDate,
        physiotherapistId: assignments.physiotherapistId,
      },
      exercise: {
        id: exercises.id,
        title: exercises.title,
      },
    })
    .from(feedbackLogs)
    .innerJoin(assignments, eq(assignments.id, feedbackLogs.assignmentId))
    .innerJoin(exercises, eq(exercises.id, assignments.exerciseId))
    .where(and(...clauses))
    .orderBy(desc(feedbackLogs.submittedAt));
}
async function listFeedbackForPhysio(physiotherapistId) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      feedback: feedbackLogs,
      client: users,
      assignment: {
        id: assignments.id,
        injuryType: assignments.injuryType,
        exerciseType: assignments.exerciseType,
      },
      exercise: {
        id: exercises.id,
        title: exercises.title,
      },
    })
    .from(feedbackLogs)
    .innerJoin(assignments, eq(assignments.id, feedbackLogs.assignmentId))
    .innerJoin(exercises, eq(exercises.id, assignments.exerciseId))
    .innerJoin(users, eq(users.id, feedbackLogs.clientId))
    .where(eq(assignments.physiotherapistId, physiotherapistId))
    .orderBy(desc(feedbackLogs.submittedAt));
}
async function updateFeedbackNotes(id, notes, physiotherapistId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [row] = await db
    .select({ physioId: assignments.physiotherapistId })
    .from(feedbackLogs)
    .innerJoin(assignments, eq(assignments.id, feedbackLogs.assignmentId))
    .where(eq(feedbackLogs.id, id))
    .limit(1);
  if (!row || row.physioId !== physiotherapistId) {
    throw new Error(
      "Unauthorized: You do not have permission to annotate this feedback."
    );
  }
  await db.update(feedbackLogs).set({ notes }).where(eq(feedbackLogs.id, id));
}
async function getAssignmentCompletionStats(assignmentId) {
  const db = await getDb();
  if (!db) return { total: 0, completed: 0 };
  const r = await db
    .select({
      total: sql`count(*)`,
      completed: sql`sum(case when ${feedbackLogs.completed} = true then 1 else 0 end)`,
    })
    .from(feedbackLogs)
    .where(eq(feedbackLogs.assignmentId, assignmentId));
  const row = r[0] ?? { total: 0, completed: 0 };
  return {
    total: Number(row.total ?? 0),
    completed: Number(row.completed ?? 0),
  };
}
async function getClientCompletionStats(clientId) {
  const db = await getDb();
  if (!db) return { total: 0, completed: 0 };
  const r = await db
    .select({
      total: sql`count(*)`,
      completed: sql`sum(case when ${feedbackLogs.completed} = true then 1 else 0 end)`,
    })
    .from(feedbackLogs)
    .where(eq(feedbackLogs.clientId, clientId));
  const row = r[0] ?? { total: 0, completed: 0 };
  return {
    total: Number(row.total ?? 0),
    completed: Number(row.completed ?? 0),
  };
}
async function createNotification(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    const [{ insertId }] = await db.insert(notifications).values(data);
    const row = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, Number(insertId)))
      .limit(1);
    return row[0];
  } catch (error) {
    console.warn("[Database] Failed to create notification:", error);
    return void 0;
  }
}
async function listNotificationsForUser(recipientId, opts) {
  const db = await getDb();
  if (!db) return [];
  const limit = Math.max(1, Math.min(opts?.limit ?? 8, 50));
  try {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.recipientId, recipientId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  } catch (error) {
    console.warn("[Database] Failed to list notifications:", error);
    return [];
  }
}
async function countUnreadNotifications(recipientId) {
  const db = await getDb();
  if (!db) return 0;
  try {
    const rows = await db
      .select({
        total: sql`count(*)`,
      })
      .from(notifications)
      .where(
        and(
          eq(notifications.recipientId, recipientId),
          sql`${notifications.readAt} is null`
        )
      );
    return Number(rows[0]?.total ?? 0);
  } catch (error) {
    console.warn("[Database] Failed to count unread notifications:", error);
    return 0;
  }
}
async function markNotificationAsRead(id, recipientId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    await db
      .update(notifications)
      .set({ readAt: /* @__PURE__ */ new Date() })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.recipientId, recipientId)
        )
      );
  } catch (error) {
    console.warn("[Database] Failed to mark notification as read:", error);
  }
}
async function markAllNotificationsAsRead(recipientId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    await db
      .update(notifications)
      .set({ readAt: /* @__PURE__ */ new Date() })
      .where(
        and(
          eq(notifications.recipientId, recipientId),
          sql`${notifications.readAt} is null`
        )
      );
  } catch (error) {
    console.warn("[Database] Failed to mark all notifications as read:", error);
  }
}
async function createAuditLog(data) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(auditLogs).values(data);
  } catch (error) {
    console.warn("[Database] Failed to create audit log:", error);
  }
}
function formatInjuryTypeLocal(type) {
  return type
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
function formatExerciseTypeLocal(type) {
  return type.charAt(0).toUpperCase() + type.slice(1);
}
async function listCustomExerciseTypes() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(customExerciseTypes);
  if (rows.length === 0) {
    const defaults = [
      "strength",
      "flexibility",
      "balance",
      "endurance",
      "mobility",
      "stretching",
      "functional",
      "other",
    ];
    await db
      .insert(customExerciseTypes)
      .values(defaults.map(name => ({ name: formatExerciseTypeLocal(name) })));
    return db
      .select()
      .from(customExerciseTypes)
      .orderBy(asc(customExerciseTypes.name));
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}
async function createCustomExerciseType(name) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(customExerciseTypes).values({ name });
}
async function listCustomInjuryTypes() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(customInjuryTypes);
  if (rows.length === 0) {
    const defaults = [
      "muscle_strain",
      "ligament_sprain",
      "fracture_recovery",
      "post_surgery",
      "joint_pain",
      "back_pain",
      "neck_pain",
      "shoulder_injury",
      "knee_injury",
      "ankle_injury",
      "tendonitis",
      "other",
    ];
    await db
      .insert(customInjuryTypes)
      .values(defaults.map(name => ({ name: formatInjuryTypeLocal(name) })));
    return db
      .select()
      .from(customInjuryTypes)
      .orderBy(asc(customInjuryTypes.name));
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}
async function createCustomInjuryType(name) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(customInjuryTypes).values({ name });
}
async function deleteCustomExerciseType(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(customExerciseTypes).where(eq(customExerciseTypes.id, id));
}
async function deleteCustomInjuryType(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(customInjuryTypes).where(eq(customInjuryTypes.id, id));
}

// server/_core/trpc.ts
var IMPERSONATE_COOKIE = "jolna_impersonate";
var t = initTRPC.context().create({
  transformer: superjson,
});
var router = t.router;
var publicProcedure = t.procedure;
async function resolveEffectiveUser(ctx) {
  if (!ctx.user) return null;
  if (process.env.NODE_ENV === "production") return ctx.user;
  const cookieHeader = ctx.req.headers?.cookie;
  if (!cookieHeader) return ctx.user;
  const parsed = parseCookieHeader(cookieHeader);
  const raw = parsed[IMPERSONATE_COOKIE];
  if (!raw) return ctx.user;
  const id = Number.parseInt(raw, 10);
  if (!Number.isFinite(id)) return ctx.user;
  const adminRoles = ["admin"];
  if (!adminRoles.includes(ctx.user.role)) return ctx.user;
  const impersonated = await getUserById(id);
  return impersonated ?? ctx.user;
}
var requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;
  const effectiveUser = await resolveEffectiveUser(ctx);
  if (!effectiveUser) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({ ctx: { ...ctx, user: effectiveUser } });
});
var protectedProcedure = t.procedure.use(requireUser);
function makeRoleProcedure(
  allowedRoles,
  notAllowedMessage = NOT_ADMIN_ERR_MSG
) {
  return t.procedure.use(
    t.middleware(async opts => {
      const { ctx, next } = opts;
      const effectiveUser = await resolveEffectiveUser(ctx);
      if (!effectiveUser) {
        throw new TRPCError2({
          code: "UNAUTHORIZED",
          message: UNAUTHED_ERR_MSG,
        });
      }
      if (!allowedRoles.includes(effectiveUser.role)) {
        throw new TRPCError2({ code: "FORBIDDEN", message: notAllowedMessage });
      }
      return next({ ctx: { ...ctx, user: effectiveUser } });
    })
  );
}
function makeAdminOnlyProcedure(
  notAllowedMessage = "Clinic Admin access required."
) {
  return t.procedure.use(
    t.middleware(async opts => {
      const { ctx, next } = opts;
      if (!ctx.originalUser || ctx.originalUser.role !== "admin") {
        throw new TRPCError2({ code: "FORBIDDEN", message: notAllowedMessage });
      }
      const effectiveUser = await resolveEffectiveUser(ctx);
      if (!effectiveUser) {
        throw new TRPCError2({
          code: "UNAUTHORIZED",
          message: UNAUTHED_ERR_MSG,
        });
      }
      return next({ ctx: { ...ctx, user: effectiveUser } });
    })
  );
}
var adminProcedure = makeAdminOnlyProcedure("Clinic Admin access required.");
var physioProcedure = makeRoleProcedure(
  ["physiotherapist"],
  "Physiotherapist access required."
);
var clientProcedure = makeRoleProcedure(
  ["client", "user"],
  "Client access required."
);
var anyRoleProcedure = makeRoleProcedure(
  ["admin", "physiotherapist", "client", "user"],
  UNAUTHED_ERR_MSG
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),
  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      };
    }),
});

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = msg => new HttpError(403, msg);

// server/_core/localAuth.ts
import { parse as parseCookieHeader2 } from "cookie";
import crypto from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString2 = value => typeof value === "string" && value.length > 0;
var LocalAuthService = class {
  normalizeEmail(email) {
    return email.trim().toLowerCase();
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader2(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  getSessionAppId() {
    return ENV.appId || "local";
  }
  hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
    const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");
    return `scrypt$${salt}$${derivedKey}`;
  }
  verifyPassword(password, storedHash) {
    const [scheme, salt, expectedHash] = storedHash.split("$");
    if (scheme !== "scrypt" || !salt || !expectedHash) return false;
    const actualHash = crypto.scryptSync(password, salt, 64).toString("hex");
    const actual = Buffer.from(actualHash, "hex");
    const expected = Buffer.from(expectedHash, "hex");
    if (actual.length !== expected.length) return false;
    return crypto.timingSafeEqual(actual, expected);
  }
  async createSessionToken(openId, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
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
  async verifySession(cookieValue) {
    if (!cookieValue) {
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"],
      });
      const { openId, appId, name } = payload;
      if (
        !isNonEmptyString2(openId) ||
        !isNonEmptyString2(appId) ||
        !isNonEmptyString2(name)
      ) {
        return null;
      }
      return { openId, appId, name };
    } catch {
      return null;
    }
  }
  async register(input) {
    const email = this.normalizeEmail(input.email);
    const openId = email;
    const existingUser =
      (await getUserByEmail(email)) ?? (await getUserByOpenId(openId));
    if (existingUser) {
      throw ForbiddenError("An account with that email already exists.");
    }
    const passwordHash = this.hashPassword(input.password);
    await upsertUser({
      openId,
      name: input.name.trim(),
      email,
      phoneNumber: input.phone?.trim() || null,
      passwordHash,
      loginMethod: "local",
      role: input.role || "client",
      status: "active",
      lastSignedIn: /* @__PURE__ */ new Date(),
    });
    const user = await getUserByOpenId(openId);
    if (!user) {
      throw ForbiddenError("Failed to create account.");
    }
    const sessionToken = await this.createSessionToken(user.openId, {
      name: user.name || input.name,
    });
    return { user, sessionToken };
  }
  async login(input) {
    const email = this.normalizeEmail(input.email);
    const user =
      (await getUserByEmail(email)) ?? (await getUserByOpenId(email));
    if (!user || !user.passwordHash) {
      throw ForbiddenError("Invalid email or password.");
    }
    if (user.status !== "active") {
      throw ForbiddenError("Account is inactive. Contact your administrator.");
    }
    if (!this.verifyPassword(input.password, user.passwordHash)) {
      throw ForbiddenError("Invalid email or password.");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: /* @__PURE__ */ new Date(),
    });
    const sessionToken = await this.createSessionToken(user.openId, {
      name: user.name || user.email || "",
    });
    return { user, sessionToken };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    const signedInAt = /* @__PURE__ */ new Date();
    const user = await getUserByOpenId(session.openId);
    if (!user) {
      throw ForbiddenError("User not found");
    }
    if (user.status !== "active") {
      throw ForbiddenError(UNAUTHED_ERR_MSG);
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt,
    });
    return user;
  }
};
var sdk = new LocalAuthService();

// server/routers/admin.ts
import { z as z2 } from "zod";
import { TRPCError as TRPCError3 } from "@trpc/server";
var RoleEnum = z2.enum(ROLES);
var StatusEnum = z2.enum(ACCOUNT_STATUSES);
var LanguageEnum = z2.enum(LANGUAGES);
var adminRouter = router({
  listUsers: adminProcedure
    .input(
      z2
        .object({
          role: RoleEnum.optional(),
          status: StatusEnum.optional(),
          physiotherapistId: z2.number().int().positive().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => listUsers(input)),
  getUser: adminProcedure
    .input(z2.object({ id: z2.number().int().positive() }))
    .query(async ({ input }) => {
      const user = await getUserById(input.id);
      if (!user) {
        throw new TRPCError3({ code: "NOT_FOUND", message: "User not found" });
      }
      return user;
    }),
  updateUser: adminProcedure
    .input(
      z2.object({
        id: z2.number().int().positive(),
        patch: z2.object({
          name: z2.string().min(1).max(120).nullable().optional(),
          email: z2.string().email().max(320).nullable().optional(),
          role: RoleEnum.optional(),
          status: StatusEnum.optional(),
          languagePreference: LanguageEnum.optional(),
          physiotherapistId: z2.number().int().positive().nullable().optional(),
          injuryType: z2.enum(INJURY_TYPES).nullable().optional(),
          nextClinicVisit: z2.string().nullable().optional(),
        }),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (
        ctx.originalUser &&
        ctx.originalUser.id === input.id &&
        input.patch.role &&
        input.patch.role !== ctx.originalUser.role
      ) {
        throw new TRPCError3({
          code: "BAD_REQUEST",
          message: "Cannot change your own role",
        });
      }
      const result = await updateUserFields(input.id, input.patch);
      await createAuditLog({
        actorId: ctx.originalUser?.id ?? ctx.user.id,
        action: "user_updated",
        targetType: "user",
        targetId: input.id,
        description: `Updated user #${input.id}: ${Object.keys(input.patch).join(", ")}`,
      });
      return result;
    }),
  approveUser: adminProcedure
    .input(z2.object({ id: z2.number().int().positive() }))
    .mutation(async ({ input }) =>
      updateUserFields(input.id, { status: "active" })
    ),
  suspendUser: adminProcedure
    .input(z2.object({ id: z2.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.originalUser && ctx.originalUser.id === input.id) {
        throw new TRPCError3({
          code: "BAD_REQUEST",
          message: "Cannot suspend your own account",
        });
      }
      return updateUserFields(input.id, { status: "inactive" });
    }),
  deleteUser: adminProcedure
    .input(z2.object({ id: z2.number().int().positive() }))
    .mutation(async ({ input }) => {
      await deleteUser(input.id);
      return { success: true };
    }),
  assignClientToPhysio: adminProcedure
    .input(
      z2.object({
        clientId: z2.number().int().positive(),
        physiotherapistId: z2.number().int().positive().nullable(),
      })
    )
    .mutation(async ({ input }) =>
      updateUserFields(input.clientId, {
        physiotherapistId: input.physiotherapistId,
      })
    ),
  createUser: adminProcedure
    .input(
      z2.object({
        name: z2.string().min(1).max(120),
        email: z2.string().email().max(320),
        phoneNumber: z2.string().min(1).max(32),
        password: z2.string().min(8),
        role: RoleEnum.default("client"),
        status: StatusEnum.default("active"),
      })
    )
    .mutation(async ({ input }) => {
      const result = await sdk.register({
        name: input.name,
        email: input.email,
        phone: input.phoneNumber,
        password: input.password,
        role: input.role,
      });
      if (input.status !== "active") {
        await updateUserFields(result.user.id, { status: input.status });
        result.user.status = input.status;
      }
      return result.user;
    }),
});

// server/routers/client.ts
import { z as z3 } from "zod";
import { TRPCError as TRPCError4 } from "@trpc/server";
var dateString = z3
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");
function formatFeedbackNotification(
  language,
  clientName,
  exerciseTitle,
  painScore
) {
  if (language === "kh") {
    return {
      title:
        "\u1798\u178F\u17B7\u1799\u17C4\u1794\u179B\u17CB\u1790\u17D2\u1798\u17B8\u1796\u17B8\u17A2\u17D2\u1793\u1780\u1787\u17C6\u1784\u17BA",
      content: `${clientName} \u1794\u17B6\u1793\u1794\u1789\u17D2\u1787\u17BC\u1793\u1798\u178F\u17B7\u1799\u17C4\u1794\u179B\u17CB\u179F\u1798\u17D2\u179A\u17B6\u1794\u17CB ${exerciseTitle}\u17D4 \u1780\u1798\u17D2\u179A\u17B7\u178F\u1788\u17BA\u1782\u17BA ${painScore}/10\u17D4`,
    };
  }
  return {
    title: "New client feedback",
    content: `${clientName} submitted feedback for ${exerciseTitle}. Pain reported: ${painScore}/10.`,
  };
}
var clientRouter = router({
  /**
   * Rehabilitation summary for the client landing page.
   * Returns client info, assigned physiotherapist, injury type, next clinic visit, active assignment count.
   */
  getRehabSummary: clientProcedure
    .input(z3.object({ clientDate: dateString.optional() }).optional())
    .query(async ({ ctx, input }) => {
      const user = ctx.user;
      let physioName = null;
      let physioEmail = null;
      if (user.physiotherapistId) {
        const physio = await getUserById(user.physiotherapistId);
        if (physio) {
          physioName = physio.name;
          physioEmail = physio.email;
        }
      }
      const today =
        input?.clientDate ??
        /* @__PURE__ */ new Date().toISOString().slice(0, 10);
      const activeAssignments = await listAssignmentsForClient(user.id, {
        activeOn: today,
        status: "active",
      });
      return {
        clientName: user.name ?? user.email ?? "Client",
        physiotherapistName: physioName,
        physiotherapistEmail: physioEmail,
        injuryType: user.injuryType ?? null,
        nextClinicVisit: user.nextClinicVisit ?? null,
        activeAssignmentCount: activeAssignments.length,
      };
    }),
  listTodayAssignments: clientProcedure
    .input(z3.object({ clientDate: dateString.optional() }).optional())
    .query(({ ctx, input }) => {
      const today =
        input?.clientDate ??
        /* @__PURE__ */ new Date().toISOString().slice(0, 10);
      return listAssignmentsForClient(ctx.user.id, {
        activeOn: today,
        status: "active",
      });
    }),
  listMyAssignments: clientProcedure
    .input(z3.object({ activeOn: dateString.optional() }).optional())
    .query(({ ctx, input }) =>
      listAssignmentsForClient(ctx.user.id, { activeOn: input?.activeOn })
    ),
  /**
   * List ALL assignments (no date filter) for self-monitoring.
   */
  listAllMyAssignments: clientProcedure.query(({ ctx }) =>
    listAllAssignmentsForClient(ctx.user.id)
  ),
  submitFeedback: clientProcedure
    .input(
      z3.object({
        assignmentId: z3.number().int().positive(),
        painScore: z3.number().int().min(0).max(10),
        completed: z3.boolean(),
        notes: z3.string().max(2e3).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const assignment = await getAssignmentById(input.assignmentId);
      if (assignment?.clientId !== ctx.user.id) {
        throw new TRPCError4({ code: "NOT_FOUND" });
      }
      const feedback = await createFeedback({
        assignmentId: input.assignmentId,
        clientId: ctx.user.id,
        painScore: input.painScore,
        completed: input.completed,
        notes: input.notes ?? null,
      });
      const physio = await getUserById(assignment.physiotherapistId);
      if (physio) {
        const exercise = await getExerciseById(assignment.exerciseId);
        const clientName = ctx.user.name ?? ctx.user.email ?? "A client";
        const exerciseTitle = exercise?.title ?? "an exercise";
        const { title, content } = formatFeedbackNotification(
          physio.languagePreference ?? "en",
          clientName,
          exerciseTitle,
          input.painScore
        );
        await createNotification({
          recipientId: physio.id,
          actorId: ctx.user.id,
          type: "feedback_submitted",
          title,
          content,
          href: `/physio/clients/${ctx.user.id}`,
        });
      }
      return feedback;
    }),
  /**
   * Basic feedback list (backward compatible).
   */
  listMyFeedback: clientProcedure.query(({ ctx }) =>
    listFeedbackByClient(ctx.user.id)
  ),
  /**
   * Enriched feedback with assignment details for self-monitoring session history.
   */
  listMyFeedbackEnriched: clientProcedure
    .input(
      z3
        .object({
          assignmentId: z3.number().int().positive().optional(),
          from: z3.string().optional(),
          to: z3.string().optional(),
        })
        .optional()
    )
    .query(({ ctx, input }) =>
      listFeedbackByClientEnriched(ctx.user.id, {
        assignmentId: input?.assignmentId,
        from: input?.from ? new Date(input.from) : void 0,
        to: input?.to ? new Date(input.to) : void 0,
      })
    ),
  /**
   * Get feedback for a specific assignment (client self-monitoring).
   */
  listAssignmentFeedback: clientProcedure
    .input(z3.object({ assignmentId: z3.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const assignment = await getAssignmentById(input.assignmentId);
      if (!assignment || assignment.clientId !== ctx.user.id) {
        throw new TRPCError4({ code: "NOT_FOUND" });
      }
      return listFeedbackByAssignment(input.assignmentId);
    }),
  myStats: clientProcedure.query(({ ctx }) =>
    getClientCompletionStats(ctx.user.id)
  ),
  /**
   * Get completion stats for a specific assignment.
   */
  assignmentStats: clientProcedure
    .input(z3.object({ assignmentId: z3.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const assignment = await getAssignmentById(input.assignmentId);
      if (!assignment || assignment.clientId !== ctx.user.id) {
        throw new TRPCError4({ code: "NOT_FOUND" });
      }
      return getAssignmentCompletionStats(input.assignmentId);
    }),
});

// server/routers/dev.ts
import { z as z4 } from "zod";
import { TRPCError as TRPCError5 } from "@trpc/server";
var isDev = () => process.env.NODE_ENV !== "production";
function setImpersonationCookie(res, value) {
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
    maxAge: 1e3 * 60 * 60 * 8,
  });
}
var devRouter = router({
  /** List seeded users that the admin may impersonate (dev only). */
  listImpersonationTargets: adminProcedure.query(async () => {
    if (!isDev()) return [];
    return listUsers();
  }),
  impersonate: adminProcedure
    .input(z4.object({ userId: z4.number().int().positive() }))
    .mutation(({ ctx, input }) => {
      if (!isDev()) {
        throw new TRPCError5({
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

// server/routers/notifications.ts
import { z as z5 } from "zod";
var notificationsRouter = router({
  listMine: anyRoleProcedure.query(({ ctx }) =>
    listNotificationsForUser(ctx.user.id, { limit: 10 })
  ),
  unreadCount: anyRoleProcedure.query(({ ctx }) =>
    countUnreadNotifications(ctx.user.id)
  ),
  markRead: anyRoleProcedure
    .input(z5.object({ id: z5.number().int().positive() }))
    .mutation(({ ctx, input }) =>
      markNotificationAsRead(input.id, ctx.user.id)
    ),
  markAllRead: anyRoleProcedure.mutation(({ ctx }) =>
    markAllNotificationsAsRead(ctx.user.id)
  ),
});

// server/routers/physio.ts
import { z as z6 } from "zod";
import { TRPCError as TRPCError6 } from "@trpc/server";
var AssignmentStatusEnum = z6.enum(ASSIGNMENT_STATUSES);
var InjuryTypeEnum = z6.enum(INJURY_TYPES);
var ExerciseTypeEnum = z6.enum(EXERCISE_TYPES);
var dateString2 = z6
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");
function formatAssignmentNotification(language, exerciseTitle, type, status) {
  let statusLabel = status ?? "updated";
  if (language === "kh" && status === "active") {
    statusLabel = "\u179F\u1780\u1798\u17D2\u1798";
  } else if (language === "kh" && status === "completed") {
    statusLabel = "\u1794\u17B6\u1793\u1794\u1789\u17D2\u1785\u1794\u17CB";
  } else if (language === "kh" && status === "cancelled") {
    statusLabel = "\u1794\u17B6\u1793\u179B\u17BB\u1794\u1785\u17C4\u179B";
  } else if (language === "kh") {
    statusLabel =
      "\u1794\u17B6\u1793\u1792\u17D2\u179C\u17BE\u1794\u1785\u17D2\u1785\u17BB\u1794\u17D2\u1794\u1793\u17D2\u1793\u1797\u17B6\u1796";
  }
  if (type === "assignment_created") {
    if (language === "kh") {
      return {
        title:
          "\u179B\u17C6\u17A0\u17B6\u178F\u17CB\u1790\u17D2\u1798\u17B8\u178F\u17D2\u179A\u17BC\u179C\u1794\u17B6\u1793\u1795\u17D2\u178A\u179B\u17CB",
        content: `${exerciseTitle} \u178F\u17D2\u179A\u17BC\u179C\u1794\u17B6\u1793\u1795\u17D2\u178A\u179B\u17CB\u17B2\u17D2\u1799\u17A2\u17D2\u1793\u1780\u17A0\u17BE\u1799\u17D4 \u179F\u17BC\u1798\u1785\u17BC\u179B\u1791\u17C5\u1798\u17BE\u179B\u1780\u17D2\u1793\u17BB\u1784\u1795\u17D2\u1791\u17B6\u17C6\u1784\u179B\u17C6\u17A0\u17B6\u178F\u17CB\u179A\u1794\u179F\u17CB\u17A2\u17D2\u1793\u1780\u17D4`,
      };
    }
    return {
      title: "New exercise assigned",
      content: `${exerciseTitle} was assigned to you. Open your exercise list to review the plan.`,
    };
  }
  if (language === "kh") {
    return {
      title:
        "\u179F\u17D2\u1790\u17B6\u1793\u1797\u17B6\u1796\u1780\u17B7\u1785\u17D2\u1785\u1780\u17B6\u179A\u178F\u17D2\u179A\u17BC\u179C\u1794\u17B6\u1793\u1792\u17D2\u179C\u17BE\u1794\u1785\u17D2\u1785\u17BB\u1794\u17D2\u1794\u1793\u17D2\u1793\u1797\u17B6\u1796",
      content: `${exerciseTitle} \u178F\u17D2\u179A\u17BC\u179C\u1794\u17B6\u1793\u1792\u17D2\u179C\u17BE\u1794\u1785\u17D2\u1785\u17BB\u1794\u17D2\u1794\u1793\u17D2\u1793\u1797\u17B6\u1796\u1791\u17C5\u1787\u17B6 ${statusLabel}\u17D4`,
    };
  }
  return {
    title: "Assignment status updated",
    content: `${exerciseTitle} was updated to ${statusLabel}.`,
  };
}
var physioRouter = router({
  /* Exercises */
  listMyExercises: physioProcedure.query(({ ctx }) =>
    listExercises(ctx.user.id)
  ),
  createExercise: physioProcedure
    .input(
      z6.object({
        title: z6.string().min(1).max(255),
        instructionsEn: z6.string().min(1),
        instructionsKh: z6.string().min(1),
        videoUrl: z6.string().url().max(1024),
        exerciseType: ExerciseTypeEnum.optional(),
        defaultReps: z6.number().int().min(1).max(500),
        defaultSets: z6.number().int().min(1).max(100),
      })
    )
    .mutation(({ ctx, input }) =>
      createExercise({
        ...input,
        exerciseType: input.exerciseType ?? "other",
        createdBy: ctx.user.id,
      })
    ),
  updateExercise: physioProcedure
    .input(
      z6.object({
        id: z6.number().int().positive(),
        patch: z6.object({
          title: z6.string().min(1).max(255).optional(),
          instructionsEn: z6.string().min(1).optional(),
          instructionsKh: z6.string().min(1).optional(),
          videoUrl: z6.string().url().max(1024).optional(),
          exerciseType: ExerciseTypeEnum.optional(),
          defaultReps: z6.number().int().min(1).max(500).optional(),
          defaultSets: z6.number().int().min(1).max(100).optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const ex = await getExerciseById(input.id);
      if (!ex) throw new TRPCError6({ code: "NOT_FOUND" });
      if (ex.createdBy !== ctx.user.id)
        throw new TRPCError6({ code: "FORBIDDEN" });
      return updateExercise(input.id, input.patch);
    }),
  deleteExercise: physioProcedure
    .input(z6.object({ id: z6.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const ex = await getExerciseById(input.id);
      if (!ex) throw new TRPCError6({ code: "NOT_FOUND" });
      if (ex.createdBy !== ctx.user.id)
        throw new TRPCError6({ code: "FORBIDDEN" });
      await deleteExercise(input.id);
      return { success: true };
    }),
  /* Clients & Assignments */
  listMyClients: physioProcedure.query(async ({ ctx }) =>
    listUsers({ role: "client", physiotherapistId: ctx.user.id })
  ),
  /**
   * Get detailed client info with ownership check.
   * Physiotherapists can only view clients assigned to them.
   */
  getClientDetail: physioProcedure
    .input(z6.object({ clientId: z6.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const client = await getUserById(input.clientId);
      if (!client) throw new TRPCError6({ code: "NOT_FOUND" });
      if (client.physiotherapistId !== ctx.user.id) {
        throw new TRPCError6({ code: "FORBIDDEN", message: "Not your client" });
      }
      return client;
    }),
  /**
   * List assignments for a specific client (ownership-safe).
   */
  listClientAssignments: physioProcedure
    .input(z6.object({ clientId: z6.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const client = await getUserById(input.clientId);
      if (!client || client.physiotherapistId !== ctx.user.id) {
        throw new TRPCError6({ code: "FORBIDDEN", message: "Not your client" });
      }
      return listAssignmentsForClientByPhysio(input.clientId, ctx.user.id);
    }),
  listMyAssignments: physioProcedure.query(({ ctx }) =>
    listAssignmentsForPhysio(ctx.user.id)
  ),
  assignExercise: physioProcedure
    .input(
      z6.object({
        exerciseId: z6.number().int().positive(),
        clientId: z6.number().int().positive(),
        injuryType: InjuryTypeEnum.optional(),
        exerciseType: ExerciseTypeEnum.optional(),
        reps: z6.number().int().min(1).max(500).optional(),
        sets: z6.number().int().min(1).max(100).optional(),
        dailyFrequency: z6.number().int().min(1).max(20).default(1).optional(),
        startDate: dateString2,
        endDate: dateString2,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const ex = await getExerciseById(input.exerciseId);
      if (!ex) throw new TRPCError6({ code: "NOT_FOUND" });
      const client = await getUserById(input.clientId);
      if (client?.physiotherapistId !== ctx.user.id) {
        throw new TRPCError6({ code: "FORBIDDEN" });
      }
      const repsToUse = input.reps ?? ex.defaultReps;
      const setsToUse = input.sets ?? ex.defaultSets ?? 1;
      const assignment = await createAssignment({
        exerciseId: input.exerciseId,
        clientId: input.clientId,
        physiotherapistId: ctx.user.id,
        injuryType: input.injuryType ?? "other",
        exerciseType: input.exerciseType ?? ex.exerciseType ?? "other",
        reps: repsToUse,
        sets: setsToUse,
        dailyFrequency: input.dailyFrequency ?? 1,
        startDate: input.startDate,
        endDate: input.endDate,
      });
      await updateUserFields(input.clientId, {
        injuryType: input.injuryType ?? "other",
      });
      await createAuditLog({
        actorId: ctx.user.id,
        action: "assignment_created",
        targetType: "assignment",
        targetId: assignment.id,
        description: `Assigned ${ex.title} to client #${input.clientId}`,
      });
      const { title, content } = formatAssignmentNotification(
        client.languagePreference ?? "en",
        ex.title,
        "assignment_created"
      );
      await createNotification({
        recipientId: client.id,
        actorId: ctx.user.id,
        type: "assignment_created",
        title,
        content,
        href: "/client/exercises",
      });
      return assignment;
    }),
  updateAssignmentStatus: physioProcedure
    .input(
      z6.object({
        id: z6.number().int().positive(),
        status: AssignmentStatusEnum,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const assignment = await getAssignmentById(input.id);
      if (!assignment) throw new TRPCError6({ code: "NOT_FOUND" });
      if (assignment.physiotherapistId !== ctx.user.id) {
        throw new TRPCError6({ code: "FORBIDDEN" });
      }
      await updateAssignmentStatus(input.id, input.status);
      await createAuditLog({
        actorId: ctx.user.id,
        action: "assignment_status_updated",
        targetType: "assignment",
        targetId: input.id,
        description: `Updated assignment #${input.id} status to ${input.status}`,
      });
      const client = await getUserById(assignment.clientId);
      const exercise = await getExerciseById(assignment.exerciseId);
      if (client && exercise) {
        const { title, content } = formatAssignmentNotification(
          client.languagePreference ?? "en",
          exercise.title,
          "assignment_status_updated",
          input.status
        );
        await createNotification({
          recipientId: client.id,
          actorId: ctx.user.id,
          type: "assignment_status_updated",
          title,
          content,
          href: "/client/exercises",
        });
      }
      return { success: true };
    }),
  updateAssignment: physioProcedure
    .input(
      z6.object({
        id: z6.number().int().positive(),
        patch: z6.object({
          injuryType: InjuryTypeEnum.optional(),
          exerciseType: ExerciseTypeEnum.optional(),
          reps: z6.number().int().min(1).max(500).optional(),
          sets: z6.number().int().min(1).max(100).optional(),
          dailyFrequency: z6.number().int().min(1).max(20).optional(),
          startDate: dateString2.optional(),
          endDate: dateString2.optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const assignment = await getAssignmentById(input.id);
      if (!assignment) throw new TRPCError6({ code: "NOT_FOUND" });
      if (assignment.physiotherapistId !== ctx.user.id) {
        throw new TRPCError6({ code: "FORBIDDEN" });
      }
      await updateAssignment(input.id, input.patch);
      await createAuditLog({
        actorId: ctx.user.id,
        action: "assignment_updated",
        targetType: "assignment",
        targetId: input.id,
        description: `Updated assignment #${input.id}`,
      });
      return { success: true };
    }),
  deleteAssignment: physioProcedure
    .input(z6.object({ id: z6.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const assignment = await getAssignmentById(input.id);
      if (!assignment) throw new TRPCError6({ code: "NOT_FOUND" });
      if (assignment.physiotherapistId !== ctx.user.id) {
        throw new TRPCError6({ code: "FORBIDDEN" });
      }
      await deleteAssignment(input.id);
      await createAuditLog({
        actorId: ctx.user.id,
        action: "assignment_deleted",
        targetType: "assignment",
        targetId: input.id,
        description: `Deleted assignment #${input.id}`,
      });
      return { success: true };
    }),
  /* Monitoring */
  listClientFeedback: physioProcedure
    .input(z6.object({ clientId: z6.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const client = await getUserById(input.clientId);
      if (!client || client.physiotherapistId !== ctx.user.id) {
        throw new TRPCError6({ code: "FORBIDDEN", message: "Not your client" });
      }
      return listFeedbackByClient(input.clientId);
    }),
  /**
   * Enriched feedback for a client: includes assignment details (injury type, exercise type, exercise title).
   */
  listClientFeedbackEnriched: physioProcedure
    .input(
      z6.object({
        clientId: z6.number().int().positive(),
        assignmentId: z6.number().int().positive().optional(),
        from: z6.string().optional(),
        to: z6.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const client = await getUserById(input.clientId);
      if (!client || client.physiotherapistId !== ctx.user.id) {
        throw new TRPCError6({ code: "FORBIDDEN", message: "Not your client" });
      }
      return listFeedbackByClientEnriched(input.clientId, {
        assignmentId: input.assignmentId,
        from: input.from ? new Date(input.from) : void 0,
        to: input.to ? new Date(input.to) : void 0,
      });
    }),
  /**
   * Get feedback for a specific assignment.
   */
  listAssignmentFeedback: physioProcedure
    .input(z6.object({ assignmentId: z6.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const assignment = await getAssignmentById(input.assignmentId);
      if (!assignment) throw new TRPCError6({ code: "NOT_FOUND" });
      if (assignment.physiotherapistId !== ctx.user.id) {
        throw new TRPCError6({ code: "FORBIDDEN" });
      }
      return listFeedbackByAssignment(input.assignmentId);
    }),
  getClientStats: physioProcedure
    .input(z6.object({ clientId: z6.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const client = await getUserById(input.clientId);
      if (!client || client.physiotherapistId !== ctx.user.id) {
        throw new TRPCError6({ code: "FORBIDDEN", message: "Not your client" });
      }
      return getClientCompletionStats(input.clientId);
    }),
  getAssignmentStats: physioProcedure
    .input(z6.object({ assignmentId: z6.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const assignment = await getAssignmentById(input.assignmentId);
      if (!assignment) throw new TRPCError6({ code: "NOT_FOUND" });
      if (assignment.physiotherapistId !== ctx.user.id) {
        throw new TRPCError6({ code: "FORBIDDEN" });
      }
      return getAssignmentCompletionStats(input.assignmentId);
    }),
  listAllMyFeedback: physioProcedure.query(({ ctx }) =>
    listFeedbackForPhysio(ctx.user.id)
  ),
  updateFeedbackNotes: physioProcedure
    .input(
      z6.object({
        id: z6.number().int().positive(),
        notes: z6.string().max(2e3).nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await updateFeedbackNotes(input.id, input.notes, ctx.user.id);
        return { success: true };
      } catch (error) {
        throw new TRPCError6({
          code: "FORBIDDEN",
          message: error.message || "Failed to update feedback notes",
        });
      }
    }),
  scheduleNextClinicVisit: physioProcedure
    .input(
      z6.object({
        clientId: z6.number().int().positive(),
        nextClinicVisit: z6.string().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const client = await getUserById(input.clientId);
      if (!client || client.physiotherapistId !== ctx.user.id) {
        throw new TRPCError6({ code: "FORBIDDEN", message: "Not your client" });
      }
      await updateUserFields(input.clientId, {
        nextClinicVisit: input.nextClinicVisit,
      });
      return { success: true };
    }),
  listCustomExerciseTypes: physioProcedure.query(async () => {
    return listCustomExerciseTypes();
  }),
  createCustomExerciseType: physioProcedure
    .input(z6.object({ name: z6.string().min(1).max(255) }))
    .mutation(async ({ input }) => {
      try {
        await createCustomExerciseType(input.name);
        return { success: true };
      } catch (error) {
        throw new TRPCError6({
          code: "BAD_REQUEST",
          message: error.message || "Failed to create custom exercise type",
        });
      }
    }),
  listCustomInjuryTypes: physioProcedure.query(async () => {
    return listCustomInjuryTypes();
  }),
  createCustomInjuryType: physioProcedure
    .input(z6.object({ name: z6.string().min(1).max(255) }))
    .mutation(async ({ input }) => {
      try {
        await createCustomInjuryType(input.name);
        return { success: true };
      } catch (error) {
        throw new TRPCError6({
          code: "BAD_REQUEST",
          message: error.message || "Failed to create custom injury type",
        });
      }
    }),
  updateClientDiagnosis: physioProcedure
    .input(
      z6.object({
        clientId: z6.number().int().positive(),
        injuryType: z6.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const client = await getUserById(input.clientId);
      if (!client || client.physiotherapistId !== ctx.user.id) {
        throw new TRPCError6({ code: "FORBIDDEN", message: "Not your client" });
      }
      await updateUserFields(input.clientId, {
        injuryType: input.injuryType,
      });
      return { success: true };
    }),
  deleteCustomExerciseType: physioProcedure
    .input(z6.object({ id: z6.number().int().positive() }))
    .mutation(async ({ input }) => {
      try {
        await deleteCustomExerciseType(input.id);
        return { success: true };
      } catch (error) {
        throw new TRPCError6({
          code: "BAD_REQUEST",
          message: error.message || "Failed to delete custom exercise type",
        });
      }
    }),
  deleteCustomInjuryType: physioProcedure
    .input(z6.object({ id: z6.number().int().positive() }))
    .mutation(async ({ input }) => {
      try {
        await deleteCustomInjuryType(input.id);
        return { success: true };
      } catch (error) {
        throw new TRPCError6({
          code: "BAD_REQUEST",
          message: error.message || "Failed to delete custom injury type",
        });
      }
    }),
});

// server/routers/settings.ts
import { z as z7 } from "zod";
var settingsRouter = router({
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
      z7.object({
        name: z7.string().min(1).max(120).optional(),
        phoneNumber: z7.string().min(1).max(32).nullable().optional(),
        avatarUrl: z7.string().max(2e6).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const patch = {};
      if (input.name !== void 0) patch.name = input.name;
      if (input.phoneNumber !== void 0) patch.phoneNumber = input.phoneNumber;
      if (input.avatarUrl !== void 0) patch.avatarUrl = input.avatarUrl;
      return updateUserFields(ctx.user.id, patch);
    }),
  setLanguagePreference: protectedProcedure
    .input(z7.object({ language: z7.enum(LANGUAGES) }))
    .mutation(async ({ ctx, input }) => {
      await setLanguagePreference(ctx.user.id, input.language);
      return { success: true };
    }),
});

// server/routers.ts
import { parse as parseCookieHeader3 } from "cookie";
import { z as z8 } from "zod";
import { TRPCError as TRPCError7 } from "@trpc/server";
async function resolveEffectiveMe(ctx) {
  if (!ctx.user) return null;
  if (process.env.NODE_ENV === "production") return ctx.user;
  const cookieHeader = ctx.req.headers?.cookie;
  if (!cookieHeader) return ctx.user;
  const parsed = parseCookieHeader3(cookieHeader);
  const raw = parsed[IMPERSONATE_COOKIE];
  if (!raw) return ctx.user;
  const id = Number.parseInt(raw, 10);
  if (!Number.isFinite(id)) return ctx.user;
  if (ctx.user.role !== "admin") return ctx.user;
  const impersonated = await getUserById(id);
  return impersonated ?? ctx.user;
}
var appRouter = router({
  system: systemRouter,
  auth: router({
    /**
     * Public registration is disabled.
     * Account creation is handled by the administrator via admin.createUser.
     * This endpoint is kept as a stub to avoid breaking the client build.
     */
    register: publicProcedure
      .input(
        z8.object({
          name: z8.string().min(1).max(120),
          email: z8.string().email({ message: "Invalid email" }).max(320),
          password: z8.string().min(8).max(128),
        })
      )
      .mutation(async () => {
        throw new TRPCError7({
          code: "FORBIDDEN",
          message:
            "Public registration is disabled. Please contact your clinic administrator to create an account.",
        });
      }),
    login: publicProcedure
      .input(
        z8.object({
          email: z8.string().email({ message: "Invalid email" }).max(320),
          password: z8.string().min(1).max(128),
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
      const rawCookie = opts.ctx.req.headers?.cookie ?? "";
      const impersonating =
        process.env.NODE_ENV !== "production" &&
        opts.ctx.user?.role === "admin" &&
        !!parseCookieHeader3(rawCookie)[IMPERSONATE_COOKIE];
      return { ...effective, __impersonating: impersonating };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      ctx.res.clearCookie(IMPERSONATE_COOKIE, { path: "/" });
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

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user,
    originalUser: user,
  };
}

// api/index.ts
var app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);
app.get("/api", (req, res) => {
  res.json({ status: "ok", message: "API is healthy" });
});
function handler(req, res) {
  return app(req, res);
}
export { handler as default };
