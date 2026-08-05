#!/usr/bin/env bash
# Cron-friendly sync for external Web3 jobs (ideal: every 15–60 min).
# Example cPanel cron: */30 * * * * /home/USER/bin/sync-external-jobs.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
set -a
# Prefer dedicated env file for cron; fall back to arcusx/.env
if [[ -f "$ROOT/.env.external-jobs" ]]; then
  # shellcheck disable=SC1091
  source "$ROOT/.env.external-jobs"
elif [[ -f "$ROOT/arcusx/.env" ]]; then
  # shellcheck disable=SC1091
  source "$ROOT/arcusx/.env"
fi
set +a
exec node "$ROOT/scripts/sync-external-jobs.mjs"
