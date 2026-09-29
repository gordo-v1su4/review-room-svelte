#!/usr/bin/env bash
set -euo pipefail

if [[ "$(uname -s)" != "Linux" ]]; then
  echo "Deploy Review Room Trigger tasks from VM100 Linux." >&2
  exit 1
fi

export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
export PATH="$BUN_INSTALL/bin:/usr/local/bin:$PATH"

deploy_env="${REVIEW_ROOM_TRIGGER_DEPLOY_ENV:-$HOME/.config/review-room/trigger-deploy.env}"
trigger_stack="${TRIGGER_STACK_DIR:-/opt/triggerdev/trigger.dev/hosting/docker}"
[[ -f "$deploy_env" && -f "$trigger_stack/.env" ]] || {
  echo "Review Room deployment environment or Trigger stack environment is missing." >&2
  exit 1
}

set -a
# shellcheck disable=SC1090
source "$trigger_stack/.env"
# shellcheck disable=SC1090
source "$deploy_env"
set +a

[[ "${TRIGGER_ACCESS_TOKEN:-}" == tr_pat_* ]] || {
  echo "A Trigger operator access token is required." >&2
  exit 1
}
[[ -n "${DOCKER_REGISTRY_USERNAME:-}" && -n "${DOCKER_REGISTRY_PASSWORD:-}" ]] || {
  echo "VM100 Trigger registry credentials are missing." >&2
  exit 1
}

printf '%s' "$DOCKER_REGISTRY_PASSWORD" |
  docker login localhost:5000 -u "$DOCKER_REGISTRY_USERNAME" --password-stdin >/dev/null

bun install --frozen-lockfile
bunx svelte-kit sync
deploy_log="$(mktemp)"
trap 'rm -f "$deploy_log"' EXIT
set +e
CI=1 TRIGGER_API_URL=https://trigger.v1su4.dev \
  bunx trigger.dev@4.6.3 deploy \
    --api-url https://trigger.v1su4.dev \
    --skip-update-check \
    --local-build \
    "$@" 2>&1 | tee "$deploy_log"
deploy_status="${PIPESTATUS[0]}"
set -e
[[ "$deploy_status" -eq 0 ]] || exit "$deploy_status"

if [[ " $* " == *" --dry-run "* ]]; then exit 0; fi

version="$(sed -nE 's/.*Version ([0-9]{8}\.[0-9]+) deployed.*/\1/p' "$deploy_log" | tail -1)"
deployment_code="$(sed -nE 's#.*deployments/([a-z0-9]+).*#\1#p' "$deploy_log" | tail -1)"
[[ -n "$version" && -n "$deployment_code" ]] || {
  echo "Could not identify the Review Room deployment image tag." >&2
  exit 1
}
image="localhost:5000/trigger/proj_gtqdmodtodgdpjlpbpkr:${version}.production.${deployment_code}"
docker image inspect "$image" >/dev/null
docker push "$image"
echo "Published Review Room Trigger image to VM100 registry."
