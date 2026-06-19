import "dotenv/config";
import { getDb } from "../server/db";
import { users, assignments, feedbackLogs } from "../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { sendEmail } from "../server/_core/mailer";

async function runReminderJob() {
  const db = await getDb();
  if (!db) {
    console.error("[ReminderJob] Database connection failed.");
    return;
  }

  const todayStr = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD
  console.log(`[ReminderJob] Running daily exercise reminder job for: ${todayStr}`);

  try {
    // 1. Get all active clients
    const activeClients = await db
      .select()
      .from(users)
      .where(and(eq(users.role, "client"), eq(users.status, "active")));

    console.log(`[ReminderJob] Found ${activeClients.length} active clients in the database.`);

    let sentCount = 0;

    for (const client of activeClients) {
      // 2. Check if client has active assignments today
      const activeTodayAssignments = await db
        .select()
        .from(assignments)
        .where(
          and(
            eq(assignments.clientId, client.id),
            eq(assignments.status, "active"),
            sql`${assignments.startDate} <= ${todayStr}`,
            sql`${assignments.endDate} >= ${todayStr}`
          )
        );

      if (activeTodayAssignments.length === 0) {
        console.log(`[ReminderJob] Client ${client.name} (${client.email}) has no active exercises assigned for today.`);
        continue;
      }

      // 3. Check if client already submitted feedback today
      const todayFeedback = await db
        .select()
        .from(feedbackLogs)
        .where(
          and(
            eq(feedbackLogs.clientId, client.id),
            sql`date(${feedbackLogs.submittedAt}) = ${todayStr}`
          )
        );

      if (todayFeedback.length > 0) {
        console.log(`[ReminderJob] Client ${client.name} (${client.email}) has already submitted feedback for today.`);
        continue;
      }

      // 4. Send email reminder
      console.log(`[ReminderJob] Sending reminder email to ${client.name} (${client.email})...`);
      const emailContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e7ec; border-radius: 12px;">
          <h2 style="color: #534AB7;">Daily Rehabilitation Reminder</h2>
          <p>Dear <strong>${client.name}</strong>,</p>
          <p>This is a quick reminder from JOLNA support to complete and log your prescribed physical therapy exercises for today.</p>
          <p>Consistency is key to a successful recovery! Please log in to your portal to review your exercises and submit your feedback logs:</p>
          <div style="margin: 20px 0;">
            <a href="http://localhost:3000/login" style="background-color: #534AB7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">View Daily Exercises</a>
          </div>
        </div>
      `;

      const result = await sendEmail(
        client.email,
        "Daily Physical Therapy Exercise Reminder",
        emailContent
      );

      if (result.success) {
        sentCount++;
      }
    }

    console.log(`[ReminderJob] Completed. Successfully sent ${sentCount} reminders.`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[ReminderJob] Execution failed:", msg);
  }
}

void runReminderJob();
