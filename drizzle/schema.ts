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

/**
 * Recovry role enum — the three roles described in the FYP.
 * We keep the legacy "user" / "admin" literals as well so older data and
 * dev fixtures keep compiling. Inside Recovry we treat:
 *   - "admin"          ≡ Clinic Admin
 *   - "physiotherapist"≡ Physiotherapist
 *   - "client"         ≡ Client (default for newly-signed-in visitors)
 *   - "user"           ≡ legacy / pre-role-assignment (treated as Client in the UI)
 */
export const ROLES = [
  "user",
  "admin",
  "client",
  "physiotherapist",
] as const;
export type RecovryRole = (typeof ROLES)[number];

export const ACCOUNT_STATUSES = ["pending", "active", "suspended"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const LANGUAGES = ["en", "kh"] as const;
export type Language = (typeof LANGUAGES)[number];

export const ASSIGNMENT_STATUSES = [
  "active",
  "completed",
  "cancelled",
] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

/**
 * Core user table.
 * - openId: local auth identifier / legacy Manus identifier.
 * - role: one of ROLES.
 * - status: account lifecycle state managed by the Clinic Admin.
 * - languagePreference: persisted EN/KH preference (source of truth for i18n).
 * - physiotherapistId: optional FK to the physiotherapist assigned to a client.
 */
export const users = mysqlTable(
  "users",
  {
    id: int("id").autoincrement().primaryKey(),
    openId: varchar("openId", { length: 320 }).notNull().unique(),
    name: text("name"),
    email: varchar("email", { length: 320 }),
    avatarUrl: longtext("avatarUrl"),
    passwordHash: text("passwordHash"),
    loginMethod: varchar("loginMethod", { length: 64 }),
    role: mysqlEnum("role", ROLES).default("user").notNull(),
    status: mysqlEnum("status", ACCOUNT_STATUSES).default("active").notNull(),
    languagePreference: mysqlEnum("languagePreference", LANGUAGES)
      .default("en")
      .notNull(),
    physiotherapistId: int("physiotherapistId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  },
  (t) => ({
    byRole: index("users_role_idx").on(t.role),
    byPhysio: index("users_physio_idx").on(t.physiotherapistId),
  }),
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Exercise template — created by a physiotherapist.
 * Holds bilingual instructions and a demonstration video URL.
 */
export const exercises = mysqlTable(
  "exercises",
  {
    id: int("id").autoincrement().primaryKey(),
    createdBy: int("createdBy").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    instructionsEn: text("instructionsEn").notNull(),
    instructionsKh: text("instructionsKh").notNull(),
    videoUrl: varchar("videoUrl", { length: 1024 }).notNull(),
    defaultReps: int("defaultReps").notNull().default(10),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => ({
    byCreator: index("exercises_creator_idx").on(t.createdBy),
  }),
);

export type Exercise = typeof exercises.$inferSelect;
export type InsertExercise = typeof exercises.$inferInsert;

/**
 * Assignment — links a client to an exercise for a specific date range.
 */
export const assignments = mysqlTable(
  "assignments",
  {
    id: int("id").autoincrement().primaryKey(),
    exerciseId: int("exerciseId").notNull(),
    physiotherapistId: int("physiotherapistId").notNull(),
    clientId: int("clientId").notNull(),
    reps: int("reps").notNull(),
    startDate: date("startDate", { mode: "string" }).notNull(),
    endDate: date("endDate", { mode: "string" }).notNull(),
    status: mysqlEnum("status", ASSIGNMENT_STATUSES)
      .default("active")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => ({
    byClient: index("assignments_client_idx").on(t.clientId),
    byPhysio: index("assignments_physio_idx").on(t.physiotherapistId),
    byExercise: index("assignments_exercise_idx").on(t.exerciseId),
  }),
);

export type Assignment = typeof assignments.$inferSelect;
export type InsertAssignment = typeof assignments.$inferInsert;

/**
 * Feedback log — daily entry submitted by a client for an assignment.
 * painScore is enforced 0–10 by the app layer (zod validation).
 */
export const feedbackLogs = mysqlTable(
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
  (t) => ({
    byAssignment: index("feedback_assignment_idx").on(t.assignmentId),
    byClient: index("feedback_client_idx").on(t.clientId),
  }),
);

export type FeedbackLog = typeof feedbackLogs.$inferSelect;
export type InsertFeedbackLog = typeof feedbackLogs.$inferInsert;

/* ------------------------------------------------------------------ */
/* Relations                                                           */
/* ------------------------------------------------------------------ */

export const usersRelations = relations(users, ({ one, many }) => ({
  physiotherapist: one(users, {
    fields: [users.physiotherapistId],
    references: [users.id],
    relationName: "client_to_physio",
  }),
  clients: many(users, { relationName: "client_to_physio" }),
  exercisesCreated: many(exercises),
  assignmentsAsPhysio: many(assignments, { relationName: "physio_assignments" }),
  assignmentsAsClient: many(assignments, { relationName: "client_assignments" }),
  feedbackLogs: many(feedbackLogs),
}));

export const exercisesRelations = relations(exercises, ({ one, many }) => ({
  creator: one(users, {
    fields: [exercises.createdBy],
    references: [users.id],
  }),
  assignments: many(assignments),
}));

export const assignmentsRelations = relations(assignments, ({ one, many }) => ({
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

export const feedbackLogsRelations = relations(feedbackLogs, ({ one }) => ({
  assignment: one(assignments, {
    fields: [feedbackLogs.assignmentId],
    references: [assignments.id],
  }),
  client: one(users, {
    fields: [feedbackLogs.clientId],
    references: [users.id],
  }),
}));
