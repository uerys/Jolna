/* eslint-disable */
// Seed demo data for JOLNA.
// Usage:  node scripts/seed.mjs

import "dotenv/config";
import mysql from "mysql2/promise";
import crypto from "node:crypto";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const connection = await mysql.createConnection(url);

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derivedKey}`;
}

async function q(sql, params = []) {
  const [rows] = await connection.execute(sql, params);
  return rows;
}

async function upsertDemoUser({
  openId,
  name,
  email,
  role,
  password,
  status = "active",
  languagePreference = "en",
  physiotherapistId = null,
}) {
  await q(
    `INSERT INTO users (openId, name, email, passwordHash, loginMethod, role, status, languagePreference, physiotherapistId, lastSignedIn)
     VALUES (?, ?, ?, ?, 'local', ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       email = VALUES(email),
       passwordHash = VALUES(passwordHash),
       role = VALUES(role),
       status = VALUES(status),
       languagePreference = VALUES(languagePreference),
       physiotherapistId = VALUES(physiotherapistId)`,
    [
      openId,
      name,
      email,
      password ? hashPassword(password) : null,
      role,
      status,
      languagePreference,
      physiotherapistId,
    ]
  );
  const [row] = await q(`SELECT id FROM users WHERE openId = ?`, [openId]);
  return row.id;
}

async function upsertExercise({
  createdBy,
  title,
  instructionsEn,
  instructionsKh,
  videoUrl,
  defaultReps,
}) {
  const existing = await q(
    `SELECT id FROM exercises WHERE title = ? AND createdBy = ? LIMIT 1`,
    [title, createdBy]
  );
  if (existing.length) {
    await q(
      `UPDATE exercises
         SET instructionsEn = ?, instructionsKh = ?, videoUrl = ?, defaultReps = ?
         WHERE id = ?`,
      [instructionsEn, instructionsKh, videoUrl, defaultReps, existing[0].id]
    );
    return existing[0].id;
  }
  const result = await q(
    `INSERT INTO exercises (createdBy, title, instructionsEn, instructionsKh, videoUrl, defaultReps)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [createdBy, title, instructionsEn, instructionsKh, videoUrl, defaultReps]
  );
  return result.insertId;
}

async function ensureAssignment({
  exerciseId,
  physiotherapistId,
  clientId,
  reps,
  startDate,
  endDate,
}) {
  const existing = await q(
    `SELECT id FROM assignments
       WHERE exerciseId = ? AND clientId = ? AND startDate = ?
       LIMIT 1`,
    [exerciseId, clientId, startDate]
  );
  if (existing.length) return existing[0].id;
  const result = await q(
    `INSERT INTO assignments
       (exerciseId, physiotherapistId, clientId, reps, startDate, endDate, status)
     VALUES (?, ?, ?, ?, ?, ?, 'active')`,
    [exerciseId, physiotherapistId, clientId, reps, startDate, endDate]
  );
  return result.insertId;
}

async function ensureFeedback({
  assignmentId,
  clientId,
  painScore,
  completed,
  notes,
  daysAgo,
}) {
  const existing = await q(
    `SELECT id FROM feedback_logs
       WHERE assignmentId = ? AND clientId = ?
         AND DATE(submittedAt) = DATE(DATE_SUB(NOW(), INTERVAL ? DAY))
       LIMIT 1`,
    [assignmentId, clientId, daysAgo]
  );
  if (existing.length) return existing[0].id;
  await q(
    `INSERT INTO feedback_logs (assignmentId, clientId, painScore, completed, notes, submittedAt)
     VALUES (?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))`,
    [assignmentId, clientId, painScore, completed ? 1 : 0, notes, daysAgo]
  );
}

async function ensureCustomExerciseType(name) {
  const existing = await q(
    `SELECT id FROM custom_exercise_types WHERE name = ? LIMIT 1`,
    [name]
  );
  if (existing.length) return existing[0].id;
  const result = await q(
    `INSERT INTO custom_exercise_types (name) VALUES (?)`,
    [name]
  );
  return result.insertId;
}

async function ensureCustomInjuryType(name) {
  const existing = await q(
    `SELECT id FROM custom_injury_types WHERE name = ? LIMIT 1`,
    [name]
  );
  if (existing.length) return existing[0].id;
  const result = await q(`INSERT INTO custom_injury_types (name) VALUES (?)`, [
    name,
  ]);
  return result.insertId;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function plusDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

try {
  console.log("Seeding JOLNA demo data…");

  const adminId = await upsertDemoUser({
    openId: "demo-admin",
    name: "Demo Clinic Admin",
    email: "admin@jolna.local",
    role: "admin",
    password: "Password1!",
  });

  const physioId = await upsertDemoUser({
    openId: "demo-physio",
    name: "Demo Physiotherapist",
    email: "physio@jolna.local",
    role: "physiotherapist",
    password: "Password1!",
  });

  const clientId = await upsertDemoUser({
    openId: "demo-client",
    name: "Demo Client",
    email: "client@jolna.local",
    role: "client",
    physiotherapistId: physioId,
    password: "Password1!",
  });

  const clientId2 = await upsertDemoUser({
    openId: "demo-client-2",
    name: "Client Two",
    email: "client2@jolna.local",
    role: "client",
    physiotherapistId: physioId,
    password: "Password1!",
  });

  const clientId3 = await upsertDemoUser({
    openId: "demo-client-3",
    name: "Client Three",
    email: "client3@jolna.local",
    role: "client",
    physiotherapistId: physioId,
    password: "Password1!",
    languagePreference: "kh",
  });

  console.log(
    `  users ok (admin=${adminId}, physio=${physioId}, client=${clientId})`
  );

  const ex1 = await upsertExercise({
    createdBy: physioId,
    title: "Seated Knee Extension",
    instructionsEn:
      "Sit on a sturdy chair. Slowly extend one leg until it is straight, hold for 3 seconds, then lower it. Alternate legs.",
    instructionsKh:
      "អង្គុយលើកៅអីរឹងមួយ។ សូមលាតជើងម្ខាងឲ្យត្រង់បន្តិចម្តងៗ រួចកាន់ជើងនោះ ៣វិនាទី រួចសម្រាកចុះ។ ប្តូរជាមួយជើងម្ខាងទៀត។",
    videoUrl: "https://www.youtube.com/embed/J2jWMY2sfB0",
    defaultReps: 10,
  });

  const ex2 = await upsertExercise({
    createdBy: physioId,
    title: "Standing Calf Raises",
    instructionsEn:
      "Stand near a wall for balance. Rise onto the balls of your feet, hold for 2 seconds, then lower slowly.",
    instructionsKh:
      "ឈរនៅជិតជញ្ជាំងដើម្បីរក្សាតុល្យភាព។ លើកជើងឈរលើចុងជើងរយៈពេល ២វិនាទី រួចសម្រាកចុះយឺតៗ។",
    videoUrl: "https://www.youtube.com/embed/-M4-G8p8fmc",
    defaultReps: 12,
  });

  console.log(`  exercises ok (ex1=${ex1}, ex2=${ex2})`);

  const asg1 = await ensureAssignment({
    exerciseId: ex1,
    physiotherapistId: physioId,
    clientId,
    reps: 10,
    startDate: plusDays(-3),
    endDate: plusDays(14),
  });

  const asg2 = await ensureAssignment({
    exerciseId: ex2,
    physiotherapistId: physioId,
    clientId,
    reps: 12,
    startDate: plusDays(-1),
    endDate: plusDays(10),
  });

  const asg3 = await ensureAssignment({
    exerciseId: ex1,
    physiotherapistId: physioId,
    clientId: clientId2,
    reps: 8,
    startDate: plusDays(0),
    endDate: plusDays(14),
  });

  const asg4 = await ensureAssignment({
    exerciseId: ex2,
    physiotherapistId: physioId,
    clientId: clientId3,
    reps: 10,
    startDate: plusDays(-1),
    endDate: plusDays(15),
  });

  console.log(`  assignments ok (a1=${asg1}, a2=${asg2})`);
  console.log(`  extra assignments ok (a3=${asg3}, a4=${asg4})`);

  await ensureFeedback({
    assignmentId: asg1,
    clientId,
    painScore: 6,
    completed: true,
    notes: "Felt some tightness in the knee but completed all reps.",
    daysAgo: 2,
  });
  await ensureFeedback({
    assignmentId: asg1,
    clientId,
    painScore: 4,
    completed: true,
    notes: "Better today, moving more smoothly.",
    daysAgo: 1,
  });
  await ensureFeedback({
    assignmentId: asg2,
    clientId,
    painScore: 3,
    completed: true,
    notes: "No pain during calf raises.",
    daysAgo: 0,
  });

  console.log("  seeding custom exercise and injury types…");
  await ensureCustomExerciseType("Strength");
  await ensureCustomExerciseType("Flexibility");
  await ensureCustomExerciseType("Balance");

  await ensureCustomInjuryType("Muscle Strain");
  await ensureCustomInjuryType("Ligament Sprain");
  await ensureCustomInjuryType("Knee Injury");
  console.log("  custom exercise & injury types ok");

  console.log("  feedback ok");
  console.log("Seed complete.");
} catch (err) {
  console.error("Seed failed:", err);
  process.exitCode = 1;
} finally {
  await connection.end();
}
