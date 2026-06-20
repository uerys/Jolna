#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
APP_NAME="${APP_NAME:-jolna}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-}"
RUN_MIGRATIONS="${RUN_MIGRATIONS:-1}"
RUN_SEED="${RUN_SEED:-0}"
NPM_INSTALL_COMMAND="${NPM_INSTALL_COMMAND:-npm install --include=dev}"

cd "$APP_DIR"

if [[ -z "$DEPLOY_BRANCH" ]]; then
  DEPLOY_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
fi

if [[ "$DEPLOY_BRANCH" == "HEAD" ]]; then
  echo "Cannot deploy from detached HEAD. Set DEPLOY_BRANCH explicitly." >&2
  exit 1
fi

LOCK_FILE="${DEPLOY_LOCK_FILE:-/tmp/${APP_NAME}-deploy.lock}"
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "Deploy already running for ${APP_NAME}." >&2
  exit 75
fi

echo "[deploy] app=${APP_NAME} branch=${DEPLOY_BRANCH} dir=${APP_DIR}"

git fetch --prune origin "$DEPLOY_BRANCH"
git reset --hard "origin/${DEPLOY_BRANCH}"

echo "[deploy] install=${NPM_INSTALL_COMMAND}"
bash -lc "$NPM_INSTALL_COMMAND"

if [[ "$RUN_MIGRATIONS" == "1" ]]; then
  npm run db:push
fi

if [[ "$RUN_SEED" == "1" ]]; then
  npm run db:seed
fi

npm run build

if [ -f ecosystem.config.cjs ]; then
  pm2 reload ecosystem.config.cjs --update-env
else
  if pm2 describe "$APP_NAME" >/dev/null; then
    pm2 reload "$APP_NAME" --update-env
  else
    pm2 start npm --name "$APP_NAME" -- run start
  fi
fi

pm2 save

echo "[deploy] complete"
