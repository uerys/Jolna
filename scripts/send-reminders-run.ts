import { runReminderJob } from "./send-reminders";

runReminderJob()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
