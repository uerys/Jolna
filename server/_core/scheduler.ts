import { runReminderJob } from "../../scripts/send-reminders";

export function startNotificationScheduler() {
  if (process.env.DISABLE_SCHEDULER === "true") {
    console.log("[Scheduler] In-memory scheduler disabled via DISABLE_SCHEDULER env var.");
    return;
  }
  const hour = 18; // 6:00 PM
  const minute = 0;

  const scheduleNext = () => {
    const now = new Date();
    const target = new Date();
    target.setHours(hour, minute, 0, 0);

    // If target is in the past, schedule for tomorrow
    if (target <= now) {
      target.setDate(target.getDate() + 1);
    }

    const msToWait = target.getTime() - now.getTime();
    console.log(
      `[Scheduler] Daily exercise reminder job scheduled in ${(msToWait / 1000 / 60 / 60).toFixed(
        2
      )} hours (at ${target.toLocaleString()})`
    );

    setTimeout(async () => {
      console.log("[Scheduler] Triggering daily exercise reminder job...");
      try {
        await runReminderJob();
      } catch (err) {
        console.error("[Scheduler] Error running daily exercise reminder job:", err);
      }
      scheduleNext();
    }, msToWait);
  };

  scheduleNext();
}
