#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-3000}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if command -v lsof >/dev/null 2>&1; then
  PIDS="$(lsof -ti tcp:"$PORT" -sTCP:LISTEN || true)"
elif command -v fuser >/dev/null 2>&1; then
  PIDS="$(fuser "$PORT"/tcp 2>/dev/null || true)"
else
  echo "Neither lsof nor fuser is available to clear port $PORT." >&2
  exit 1
fi

if [[ -n "${PIDS// }" ]]; then
  echo "Stopping process(es) on port $PORT: $PIDS"
  # shellcheck disable=SC2086
  kill -9 $PIDS 2>/dev/null || true
  sleep 1
fi

if command -v lsof >/dev/null 2>&1 && lsof -ti tcp:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Port $PORT is still in use after stopping its listener." >&2
  exit 1
fi

cd "$ROOT"
exec bunx next dev --turbopack --port "$PORT"
