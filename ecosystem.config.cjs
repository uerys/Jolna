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
        TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
        TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID,
        TELEGRAM_THREAD_ID: process.env.TELEGRAM_THREAD_ID,
      },
    },
  ],
};
