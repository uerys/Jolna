import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  assignments,
  exercises,
  feedbackLogs,
  notifications,
  InsertAssignment,
  InsertExercise,
  InsertFeedbackLog,
  InsertNotification,
  InsertUser,
  users,
  type AccountStatus,
  type AssignmentStatus,
  type Language,
  type RecovryRole,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

/* ------------------------------------------------------------------ */
/* Users                                                               */
/* ------------------------------------------------------------------ */

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};

    const textFields = [
      "name",
      "email",
      "phoneNumber",
      "avatarUrl",
      "passwordHash",
      "loginMethod",
    ] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (user.status !== undefined) {
      values.status = user.status;
      updateSet.status = user.status;
    }
    if (user.languagePreference !== undefined) {
      values.languagePreference = user.languagePreference;
      updateSet.languagePreference = user.languagePreference;
    }

    values.lastSignedIn ??= new Date();
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
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

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);
  return result[0];
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return result[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function listUsers(filter?: {
  role?: RecovryRole;
  status?: AccountStatus;
  physiotherapistId?: number;
}) {
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

export async function updateUserFields(
  id: number,
  patch: Partial<
    Pick<
      InsertUser,
      | "name"
      | "email"
      | "phoneNumber"
      | "avatarUrl"
      | "role"
      | "status"
      | "languagePreference"
      | "physiotherapistId"
    >
  >
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set(patch).where(eq(users.id, id));
  return getUserById(id);
}

export async function deleteUser(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(users).where(eq(users.id, id));
}

export async function setLanguagePreference(id: number, lang: Language) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(users)
    .set({ languagePreference: lang })
    .where(eq(users.id, id));
}

/* ------------------------------------------------------------------ */
/* Exercises                                                           */
/* ------------------------------------------------------------------ */

export async function listExercises(createdBy?: number) {
  const db = await getDb();
  if (!db) return [];
  const q = db.select().from(exercises);
  return createdBy
    ? await q
        .where(eq(exercises.createdBy, createdBy))
        .orderBy(desc(exercises.updatedAt))
    : await q.orderBy(desc(exercises.updatedAt));
}

export async function getExerciseById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const r = await db
    .select()
    .from(exercises)
    .where(eq(exercises.id, id))
    .limit(1);
  return r[0];
}

export async function getAssignmentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const r = await db
    .select()
    .from(assignments)
    .where(eq(assignments.id, id))
    .limit(1);
  return r[0];
}

export async function createExercise(data: InsertExercise) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [{ insertId }] = await db.insert(exercises).values(data);
  return getExerciseById(Number(insertId));
}

export async function updateExercise(
  id: number,
  patch: Partial<InsertExercise>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(exercises).set(patch).where(eq(exercises.id, id));
  return getExerciseById(id);
}

export async function deleteExercise(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(exercises).where(eq(exercises.id, id));
}

/* ------------------------------------------------------------------ */
/* Assignments                                                         */
/* ------------------------------------------------------------------ */

export async function createAssignment(data: InsertAssignment) {
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

export async function listAssignmentsForClient(
  clientId: number,
  opts?: { activeOn?: string; status?: AssignmentStatus }
) {
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
  return db
    .select({
      assignment: {
        id: assignments.id,
        reps: assignments.reps,
      },
      exercise: {
        id: exercises.id,
        title: exercises.title,
        instructionsEn: exercises.instructionsEn,
        instructionsKh: exercises.instructionsKh,
        videoUrl: exercises.videoUrl,
      },
    })
    .from(assignments)
    .innerJoin(exercises, eq(exercises.id, assignments.exerciseId))
    .where(and(...clauses))
    .orderBy(desc(assignments.startDate));
}

export async function listAssignmentsForPhysio(physiotherapistId: number) {
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

export async function updateAssignmentStatus(
  id: number,
  status: AssignmentStatus
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(assignments).set({ status }).where(eq(assignments.id, id));
}

export async function deleteAssignment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(assignments).where(eq(assignments.id, id));
}

/* ------------------------------------------------------------------ */
/* Feedback                                                            */
/* ------------------------------------------------------------------ */

export async function createFeedback(data: InsertFeedbackLog) {
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

export async function listFeedbackByClient(
  clientId: number,
  opts?: { from?: Date; to?: Date }
) {
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

export async function listFeedbackForPhysio(physiotherapistId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ feedback: feedbackLogs, client: users })
    .from(feedbackLogs)
    .innerJoin(users, eq(users.id, feedbackLogs.clientId))
    .where(eq(users.physiotherapistId, physiotherapistId))
    .orderBy(desc(feedbackLogs.submittedAt));
}

export async function getClientCompletionStats(clientId: number) {
  const db = await getDb();
  if (!db) return { total: 0, completed: 0 };
  const r = await db
    .select({
      total: sql<number>`count(*)`,
      completed: sql<number>`sum(case when ${feedbackLogs.completed} = true then 1 else 0 end)`,
    })
    .from(feedbackLogs)
    .where(eq(feedbackLogs.clientId, clientId));
  const row = r[0] ?? { total: 0, completed: 0 };
  return {
    total: Number(row.total ?? 0),
    completed: Number(row.completed ?? 0),
  };
}

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

export async function createNotification(data: InsertNotification) {
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
    return undefined;
  }
}

export async function listNotificationsForUser(
  recipientId: number,
  opts?: { limit?: number }
) {
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

export async function countUnreadNotifications(recipientId: number) {
  const db = await getDb();
  if (!db) return 0;
  try {
    const rows = await db
      .select({
        total: sql<number>`count(*)`,
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

export async function markNotificationAsRead(id: number, recipientId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    await db
      .update(notifications)
      .set({ readAt: new Date() })
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

export async function markAllNotificationsAsRead(recipientId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    await db
      .update(notifications)
      .set({ readAt: new Date() })
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
