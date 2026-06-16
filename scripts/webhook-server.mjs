import crypto from "node:crypto";
import http from "node:http";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const PORT = Number.parseInt(process.env.WEBHOOK_PORT || "9000", 10);
const HOST = process.env.WEBHOOK_HOST || "127.0.0.1";
const SECRET = process.env.WEBHOOK_SECRET;
const DEPLOY_SCRIPT = process.env.DEPLOY_SCRIPT || path.join(repoRoot, "scripts", "deploy.sh");
const EXPECTED_BRANCH = process.env.DEPLOY_BRANCH || "";
const EXPECTED_EVENT = "push";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";
const TELEGRAM_THREAD_ID = process.env.TELEGRAM_THREAD_ID || "";
const TELEGRAM_MAX_MESSAGE_LENGTH = 3900;


let deploying = false;
let queued = false;

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function verifyGithubSignature(body, signature) {
  if (!SECRET) {
    console.error("[webhook] WEBHOOK_SECRET is required");
    return false;
  }

  if (typeof signature !== "string" || !signature.startsWith("sha256=")) {
    return false;
  }

  const expected =
    "sha256=" + crypto.createHmac("sha256", SECRET).update(body).digest("hex");

  return safeEqual(signature, expected);
}

function shouldDeploy(headers, body) {
  if (headers["x-github-event"] !== EXPECTED_EVENT) {
    return false;
  }

  if (!EXPECTED_BRANCH) {
    return true;
  }

  try {
    const payload = JSON.parse(body.toString("utf8"));
    return payload.ref === `refs/heads/${EXPECTED_BRANCH}`;
  } catch (error) {
    console.error("[webhook] invalid JSON payload", error);
    return false;
  }
}

function telegramEnabled() {
  return TELEGRAM_BOT_TOKEN.length > 0 && TELEGRAM_CHAT_ID.length > 0;
}

function telegramChunks(text) {
  const chunks = [];

  for (let offset = 0; offset < text.length; offset += TELEGRAM_MAX_MESSAGE_LENGTH) {
    chunks.push(text.slice(offset, offset + TELEGRAM_MAX_MESSAGE_LENGTH));
  }

  return chunks.length > 0 ? chunks : ["(no output)"];
}

async function sendTelegram(text) {
  if (!telegramEnabled()) {
    return;
  }

  const basePayload = {
    chat_id: TELEGRAM_CHAT_ID,
    disable_web_page_preview: true,
  };

  if (TELEGRAM_THREAD_ID) {
    basePayload.message_thread_id = Number.parseInt(TELEGRAM_THREAD_ID, 10);
  }

  for (const chunk of telegramChunks(text)) {
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...basePayload, text: chunk }),
        }
      );

      if (!response.ok) {
        console.error("[webhook] Telegram notification failed", await response.text());
      }
    } catch (error) {
      console.error("[webhook] Telegram notification failed", error);
    }
  }
}

function appendLog(log, chunk, stream = process.stdout) {
  const text = chunk.toString("utf8");
  stream.write(text);
  log.value += text;
}

function runDeploy() {
  if (deploying) {
    queued = true;
    void sendTelegram(`[Jolna deploy] Deploy queued while another deploy is running.`);
    return;
  }

  const startedAt = new Date();
  const deployId = startedAt.toISOString();
  const log = { value: "" };

  deploying = true;
  queued = false;

  console.log(`[webhook] starting ${DEPLOY_SCRIPT}`);
  void sendTelegram(
    `[Jolna deploy] Started\nid: ${deployId}\nbranch: ${EXPECTED_BRANCH || "current"}\nscript: ${DEPLOY_SCRIPT}`
  );

  const child = spawn(DEPLOY_SCRIPT, {
    cwd: repoRoot,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", chunk => appendLog(log, chunk));
  child.stderr.on("data", chunk => appendLog(log, chunk, process.stderr));

  child.on("exit", (code, signal) => {
    deploying = false;

    const finishedAt = new Date();
    const durationSeconds = Math.round((finishedAt.getTime() - startedAt.getTime()) / 1000);
    const succeeded = code === 0 && signal === null;
    const status = succeeded ? "Succeeded" : "Failed";
    const exit = signal ? `signal ${signal}` : `exit code ${code}`;

    console.log(`[webhook] deploy exited code=${code} signal=${signal ?? "none"}`);
    void sendTelegram(
      `[Jolna deploy] ${status}\nid: ${deployId}\nduration: ${durationSeconds}s\n${exit}\n\n${log.value || "(no output)"}`
    );

    if (queued) {
      console.log("[webhook] running queued deploy");
      runDeploy();
    }
  });

  child.on("error", error => {
    deploying = false;
    console.error("[webhook] deploy failed to start", error);
    void sendTelegram(`[Jolna deploy] Failed to start\nid: ${deployId}\n${String(error)}`);
  });
}

const server = http.createServer((req, res) => {
  if (req.method !== "POST" || req.url !== "/deploy") {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("Not found\n");
    return;
  }

  const chunks = [];

  req.on("data", chunk => {
    chunks.push(chunk);
  });

  req.on("end", () => {
    const body = Buffer.concat(chunks);
    const signature = req.headers["x-hub-signature-256"];

    if (!verifyGithubSignature(body, signature)) {
      res.writeHead(401, { "content-type": "text/plain" });
      res.end("Bad signature\n");
      return;
    }

    if (!shouldDeploy(req.headers, body)) {
      res.writeHead(202, { "content-type": "text/plain" });
      res.end("Ignored\n");
      return;
    }

    runDeploy();

    res.writeHead(202, { "content-type": "text/plain" });
    res.end(deploying ? "Deploy accepted\n" : "Deploy queued\n");
  });
});

server.listen(PORT, HOST, () => {
  console.log(`[webhook] listening on http://${HOST}:${PORT}/deploy`);
});
