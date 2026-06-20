require("dotenv").config();

module.exports = {
  apps: [
    {
      name: "jolna",
      script: "npm",
      args: "run start",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
        PORT: process.env.PORT || "3000",
        DISABLE_SCHEDULER: "true",
      },
    },
    {
      name: "jolna-webhook",
      script: "scripts/webhook-server.mjs",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
        WEBHOOK_HOST: process.env.WEBHOOK_HOST || "127.0.0.1",
        WEBHOOK_PORT: process.env.WEBHOOK_PORT || "9000",
        WEBHOOK_SECRET: process.env.WEBHOOK_SECRET,
        DEPLOY_BRANCH: process.env.DEPLOY_BRANCH || "main",
        DEPLOY_SCRIPT: process.env.DEPLOY_SCRIPT || `${__dirname}/scripts/deploy.sh`,
        APP_DIR: process.env.APP_DIR || __dirname,
        APP_NAME: process.env.APP_NAME || "jolna",
        RUN_MIGRATIONS: process.env.RUN_MIGRATIONS || "1",
        RUN_SEED: process.env.RUN_SEED || "0",
        NPM_INSTALL_COMMAND: process.env.NPM_INSTALL_COMMAND || "npm install --include=dev",
        TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
        TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID,
        TELEGRAM_THREAD_ID: process.env.TELEGRAM_THREAD_ID,
      },
    },
    {
      name: "jolna-reminders",
      script: "dist/send-reminders.js",
      cwd: __dirname,
      interpreter: "node",
      instances: 1,
      exec_mode: "fork",
      cron_restart: "0 18 * * *",
      autorestart: false,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
