import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import {
  assignments,
  auditLogs,
  exercises,
  feedbackLogs,
  notifications,
  users,
  InsertAssignment,
  InsertAuditLog,
  InsertExercise,
  InsertFeedbackLog,
  InsertNotification,
  InsertUser,
  customExerciseTypes,
  customInjuryTypes,
  type AccountStatus,
  type AssignmentStatus,
  type JolnaRole,
  type Language,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: MySql2Database<Record<string, unknown>> | null = null;
let _pool: mysql.Pool | null = null;

export async function getDb() {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        "DATABASE_URL environment variable is missing. Please set it in your Vercel settings."
      );
    }
    try {
      // Use a connection pool for serverless environments
      if (!_pool) {
        _pool = mysql.createPool(url);
      }
      _db = drizzle(_pool);
    } catch (error) {
      console.error(
        "[Database] Failed to initialize Drizzle with Pool:",
        error
      );
      throw error;
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
  role?: JolnaRole;
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
      | "injuryType"
      | "nextClinicVisit"
      | "passwordHash"
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

/**
 * Enhanced: returns full assignment + exercise + physiotherapist info for the client.
 * This provides the transparency data needed for the client landing page.
 */
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

  // Alias for physiotherapist user
  const rows = await db
    .select({
      assignment: {
        id: assignments.id,
        reps: assignments.reps,
        sets: assignments.sets,
        dailyFrequency: assignments.dailyFrequency,
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

  // Enrich with physiotherapist names
  const physioIds = [...new Set(rows.map(r => r.assignment.physiotherapistId))];
  const physioMap = new Map<
    number,
    { name: string | null; email: string | null }
  >();
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

/**
 * List all assignments for a client (no date filter), for self-monitoring.
 */
export async function listAllAssignmentsForClient(clientId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      assignment: {
        id: assignments.id,
        reps: assignments.reps,
        sets: assignments.sets,
        dailyFrequency: assignments.dailyFrequency,
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
  const physioMap = new Map<
    number,
    { name: string | null; email: string | null }
  >();
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

/**
 * List assignments for a specific client under a specific physiotherapist (ownership-safe).
 */
export async function listAssignmentsForClientByPhysio(
  clientId: number,
  physiotherapistId: number
) {
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

export async function updateAssignmentStatus(
  id: number,
  status: AssignmentStatus
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(assignments).set({ status }).where(eq(assignments.id, id));
}
export async function updateAssignment(
  id: number,
  patch: Partial<InsertAssignment>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(assignments).set(patch).where(eq(assignments.id, id));
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

/**
 * Assignment-based feedback: list feedback for a specific assignment.
 */
export async function listFeedbackByAssignment(assignmentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(feedbackLogs)
    .where(eq(feedbackLogs.assignmentId, assignmentId))
    .orderBy(desc(feedbackLogs.submittedAt));
}

/**
 * Enhanced: list feedback for a client with assignment details (injury type, exercise type, exercise title).
 * This is the assignment-based session history.
 */
export async function listFeedbackByClientEnriched(
  clientId: number,
  opts?: {
    assignmentId?: number;
    from?: Date;
    to?: Date;
  }
) {
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

export async function listFeedbackForPhysio(physiotherapistId: number) {
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

export async function updateFeedbackNotes(
  id: number,
  notes: string | null,
  physiotherapistId: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Verify ownership: feedback log must belong to an assignment handled by this physiotherapist
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

/**
 * Enhanced: get completion stats scoped to an assignment.
 */
export async function getAssignmentCompletionStats(assignmentId: number) {
  const db = await getDb();
  if (!db) return { total: 0, completed: 0 };
  const r = await db
    .select({
      total: sql<number>`count(*)`,
      completed: sql<number>`sum(case when ${feedbackLogs.completed} = true then 1 else 0 end)`,
    })
    .from(feedbackLogs)
    .where(eq(feedbackLogs.assignmentId, assignmentId));
  const row = r[0] ?? { total: 0, completed: 0 };
  return {
    total: Number(row.total ?? 0),
    completed: Number(row.completed ?? 0),
  };
}

export async function getAssignmentLogCountForDay(
  assignmentId: number,
  day: string
) {
  const db = await getDb();
  if (!db) return 0;
  // MySQL timestamp comparison with date string
  const r = await db
    .select({
      count: sql<number>`count(*)`,
    })
    .from(feedbackLogs)
    .where(
      and(
        eq(feedbackLogs.assignmentId, assignmentId),
        sql`DATE(${feedbackLogs.submittedAt}) = ${day}`
      )
    );
  return Number(r[0]?.count ?? 0);
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

/* ------------------------------------------------------------------ */
/* Audit Trail                                                         */
/* ------------------------------------------------------------------ */

export async function createAuditLog(data: InsertAuditLog) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(auditLogs).values(data);
  } catch (error) {
    console.warn("[Database] Failed to create audit log:", error);
  }
}

export async function listAuditLogs(opts?: {
  limit?: number;
  actorId?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const limit = Math.max(1, Math.min(opts?.limit ?? 50, 200));
  const clauses = [];
  if (opts?.actorId) clauses.push(eq(auditLogs.actorId, opts.actorId));
  const q = db.select().from(auditLogs);
  const rows = clauses.length
    ? await q
        .where(and(...clauses))
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit)
    : await q.orderBy(desc(auditLogs.createdAt)).limit(limit);
  return rows;
}

export async function listCustomExerciseTypes() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rows = await db.select().from(customExerciseTypes);
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

export async function createCustomExerciseType(name: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(customExerciseTypes).values({ name });
}

export async function listCustomInjuryTypes() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rows = await db.select().from(customInjuryTypes);
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

export async function createCustomInjuryType(name: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(customInjuryTypes).values({ name });
}

export async function deleteCustomExerciseType(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(customExerciseTypes).where(eq(customExerciseTypes.id, id));
}

export async function deleteCustomInjuryType(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(customInjuryTypes).where(eq(customInjuryTypes.id, id));
}
