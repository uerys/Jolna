#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
SCHEDULE="${REMINDER_CRON_SCHEDULE:-0 6 * * *}"
CRON_TZ_VALUE="${REMINDER_CRON_TZ:-Asia/Phnom_Penh}"
LOG_FILE="${REMINDER_LOG_FILE:-${APP_DIR}/logs/reminders-cron.log}"
RUNNER_PATH="${REMINDER_RUNNER_PATH:-${APP_DIR}/dist/send-reminders-run.js}"
NODE_BIN="${NODE_BIN:-$(command -v node)}"
PRINT_ONLY="${1:-}"

BLOCK_START="# BEGIN jolna-reminders"
BLOCK_END="# END jolna-reminders"
CRON_LINE="${SCHEDULE} cd ${APP_DIR} && ${NODE_BIN} ${RUNNER_PATH} >> ${LOG_FILE} 2>&1"

if [[ ! -x "$NODE_BIN" ]]; then
  echo "Node binary not found: $NODE_BIN" >&2
  exit 1
fi

if [[ ! -f "$RUNNER_PATH" ]]; then
  echo "Reminder runner missing: $RUNNER_PATH" >&2
  echo "Run npm run build first." >&2
  exit 1
fi

mkdir -p "$(dirname "$LOG_FILE")"
touch "$LOG_FILE"

existing_crontab="$(mktemp)"
new_crontab="$(mktemp)"
trap 'rm -f "$existing_crontab" "$new_crontab"' EXIT

crontab -l 2>/dev/null | sed "/^${BLOCK_START//\//\\/}$/,/^${BLOCK_END//\//\\/}$/d" > "$existing_crontab" || true
cp "$existing_crontab" "$new_crontab"
{
  printf '%s\n' "$BLOCK_START"
  printf 'CRON_TZ=%s\n' "$CRON_TZ_VALUE"
  printf '%s\n' "$CRON_LINE"
  printf '%s\n' "$BLOCK_END"
} >> "$new_crontab"

if [[ "$PRINT_ONLY" == "--print" ]]; then
  cat "$new_crontab"
  exit 0
fi

crontab "$new_crontab"

echo "Installed Jolna reminder cron job:"
echo "  Timezone : $CRON_TZ_VALUE"
echo "  Schedule : $SCHEDULE"
echo "  Node     : $NODE_BIN"
echo "  Runner   : $RUNNER_PATH"
echo "  Log file : $LOG_FILE"

echo
echo "Current crontab block:"
sed -n "/^${BLOCK_START//\//\\/}$/,/^${BLOCK_END//\//\\/}$/p" "$new_crontab"
