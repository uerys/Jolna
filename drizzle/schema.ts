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
 * JOLNA role enum — the three roles described in the FYP.
 *   - "admin"          ≡ Clinic Admin
 *   - "physiotherapist"≡ Physiotherapist
 *   - "client"         ≡ Client (default for newly-signed-in visitors)
 *   - "user"           ≡ legacy / pre-role-assignment (treated as Client in the UI)
 */
export const ROLES = ["user", "admin", "client", "physiotherapist"] as const;
export type JolnaRole = (typeof ROLES)[number];

export const ACCOUNT_STATUSES = ["active", "inactive", "suspended"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const LANGUAGES = ["en", "kh"] as const;
export type Language = (typeof LANGUAGES)[number];

export const ASSIGNMENT_STATUSES = [
  "active",
  "completed",
  "cancelled",
] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export const NOTIFICATION_TYPES = [
  "assignment_created",
  "assignment_status_updated",
  "feedback_submitted",
  "new_message",
  "password_reset_requested",
  "physio_assigned",
  "client_assigned",
  "assignment_modified",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/**
 * Injury types commonly used in physiotherapy clinics.
 */
export const INJURY_TYPES = [
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
] as const;
export type InjuryType = (typeof INJURY_TYPES)[number];

/**
 * Exercise categories used for classification.
 */
export const EXERCISE_TYPES = [
  "strength",
  "flexibility",
  "balance",
  "endurance",
  "mobility",
  "stretching",
  "functional",
  "other",
] as const;
export type ExerciseType = (typeof EXERCISE_TYPES)[number];

/**
 * Core user table.
 */
export const users = mysqlTable(
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
  t => ({
    byRole: index("users_role_idx").on(t.role),
    byPhysio: index("users_physio_idx").on(t.physiotherapistId),
  })
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Exercise template — created by a physiotherapist.
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
    exerciseType: varchar("exerciseType", { length: 255 })
      .default("other")
      .notNull(),
    defaultReps: int("defaultReps").notNull().default(10),
    defaultSets: int("defaultSets").notNull().default(1),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  t => ({
    byCreator: index("exercises_creator_idx").on(t.createdBy),
  })
);

export type Exercise = typeof exercises.$inferSelect;
export type InsertExercise = typeof exercises.$inferInsert;

/**
 * Assignment — links a client to an exercise for a specific date range.
 * Includes injuryType and exerciseType for transparency.
 */
export const assignments = mysqlTable(
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
  t => ({
    byClient: index("assignments_client_idx").on(t.clientId),
    byPhysio: index("assignments_physio_idx").on(t.physiotherapistId),
    byExercise: index("assignments_exercise_idx").on(t.exerciseId),
  })
);

export type Assignment = typeof assignments.$inferSelect;
export type InsertAssignment = typeof assignments.$inferInsert;

/**
 * Feedback log — daily entry submitted by a client for an assignment.
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
  t => ({
    byAssignment: index("feedback_assignment_idx").on(t.assignmentId),
    byClient: index("feedback_client_idx").on(t.clientId),
  })
);

export type FeedbackLog = typeof feedbackLogs.$inferSelect;
export type InsertFeedbackLog = typeof feedbackLogs.$inferInsert;

/**
 * In-app notification.
 */
export const notifications = mysqlTable(
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
  t => ({
    byRecipient: index("notifications_recipient_idx").on(t.recipientId),
    byRecipientRead: index("notifications_recipient_read_idx").on(
      t.recipientId,
      t.readAt
    ),
  })
);

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Audit trail — records important system actions for transparency.
 */
export const auditLogs = mysqlTable(
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
  t => ({
    byActor: index("audit_actor_idx").on(t.actorId),
    byTarget: index("audit_target_idx").on(t.targetType, t.targetId),
  })
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

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
  assignmentsAsPhysio: many(assignments, {
    relationName: "physio_assignments",
  }),
  assignmentsAsClient: many(assignments, {
    relationName: "client_assignments",
  }),
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

export const notificationsRelations = relations(notifications, ({ one }) => ({
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

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actor: one(users, {
    fields: [auditLogs.actorId],
    references: [users.id],
  }),
}));

export const customExerciseTypes = mysqlTable("custom_exercise_types", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const customInjuryTypes = mysqlTable("custom_injury_types", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
