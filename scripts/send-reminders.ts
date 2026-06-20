import "dotenv/config";
import path from "path";
import { getDb, createNotification } from "../server/db";
import { users, assignments, feedbackLogs, exercises } from "../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { sendEmail } from "../server/_core/mailer";

export async function runReminderJob() {
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
      if (!client.email) {
        console.warn(`[ReminderJob] Client ${client.name} (ID: ${client.id}) has no email address.`);
        continue;
      }
      // 2. Check if client has active assignments today
      const activeTodayAssignments = await db
        .select({
          id: assignments.id,
          sets: assignments.sets,
          reps: assignments.reps,
          exerciseTitle: exercises.title,
        })
        .from(assignments)
        .innerJoin(exercises, eq(assignments.exerciseId, exercises.id))
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
      const subject = "Daily Physical Therapy Exercise Reminder / សេចក្តីរំលឹកការហាត់ប្រាណប្រចាំថ្ងៃ";

      const exerciseListHtml = activeTodayAssignments
        .map(a => `<li><strong>${a.exerciseTitle}</strong> — ធ្វើចំនួន ${a.sets} សិត x ${a.reps} ដង (${a.sets} sets x ${a.reps} reps)</li>`)
        .join("");

      const emailContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e7ec; border-radius: 12px;">
          <h2 style="color: #534AB7; margin-bottom: 5px;">សេចក្តីរំលឹកការស្តារនីតិសម្បទាប្រចាំថ្ងៃ</h2>
          <h3 style="color: #475467; margin-top: 0; font-weight: normal; font-size: 16px;">Daily Rehabilitation Reminder</h3>
          
          <p>Dear / ជូនចំពោះលោក-លោកស្រី <strong>${client.name}</strong>,</p>
          
          <p style="margin-bottom: 5px;">នេះគឺជាសេចក្តីរំលឹកពីក្រុមការងារគាំទ្រ JOLNA ដើម្បីបំពេញ និងកត់ត្រាការហាត់ប្រាណដែលបានណែនាំសម្រាប់ថ្ងៃនេះ។</p>
          <p style="color: #475467; margin-top: 0; font-style: italic;">This is a quick reminder from JOLNA support to complete and log your prescribed physical therapy exercises for today.</p>
          
          <div style="background-color: #f8f9fa; border-left: 4px solid #534AB7; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0 0 10px 0; font-weight: bold; color: #333;">
              បញ្ជីលំហាត់ប្រាណសម្រាប់ថ្ងៃនេះ / Your exercises for today:
            </p>
            <ul style="margin: 0; padding-left: 20px; color: #555; line-height: 1.6;">
              ${exerciseListHtml}
            </ul>
          </div>
          
          <p style="margin-bottom: 5px;">ភាពជាប់លាប់គឺជាគន្លឹះដើម្បីទទួលបានជោគជ័យក្នុងការជាសះស្បើយឡើងវិញ! សូមចូលទៅកាន់គណនីរបស់អ្នក ដើម្បីពិនិត្យមើលលំហាត់ប្រាណ និងបញ្ជូនរបាយការណ៍មកយើងខ្ញុំវិញ៖</p>
          <p style="color: #475467; margin-top: 0; font-style: italic;">Consistency is key to a successful recovery! Please log in to your portal to review your exercises and submit your feedback logs:</p>
          
          <div style="margin: 20px 0;">
            <a href="http://localhost:3000/login" style="background-color: #534AB7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              មើលលំហាត់ប្រាណប្រចាំថ្ងៃ / View Daily Exercises
            </a>
          </div>
        </div>
      `;

      const result = await sendEmail(
        client.email,
        subject,
        emailContent
      );

      if (result.success) {
        sentCount++;
        try {
          await createNotification({
            recipientId: client.id,
            type: "assignment_created",
            title: "Daily Exercise Reminder / សេចក្តីរំលឹកការហាត់ប្រាណប្រចាំថ្ងៃ",
            content: "Please log in to review and log your daily exercises. / សូមចូលគណនីរបស់អ្នកដើម្បីពិនិត្យ និងកត់ត្រាការហាត់ប្រាណ។",
            href: "/client/exercises",
          });
        } catch (dbErr) {
          console.warn(`[ReminderJob] Failed to create database notification for ${client.name}:`, dbErr);
        }
      }

    }

    console.log(`[ReminderJob] Completed. Successfully sent ${sentCount} reminders.`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[ReminderJob] Execution failed:", msg);
  }
}

const isMain = !!(
  process.argv[1] &&
  (process.argv[1].endsWith("send-reminders.ts") ||
    process.argv[1].endsWith("send-reminders.js") ||
    path.basename(process.argv[1]) === "send-reminders.ts" ||
    path.basename(process.argv[1]) === "send-reminders.js")
);

if (isMain) {
  runReminderJob()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
