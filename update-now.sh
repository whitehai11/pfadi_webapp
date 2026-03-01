#!/usr/bin/env bash
set -euo pipefail

LOG_FILE=${LOG_FILE:-/var/log/pfadi-update.log}
LOCK_FILE=${LOCK_FILE:-/tmp/pfadi-update.lock}
VERSION_FILE=${VERSION_FILE:-version.json}

log() {
  printf '[%s] [pfadi-update] %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*"
}

fail() {
  log "ERROR: $*"
  exit 1
}

warn() {
  log "WARN: $*"
}

require_command() {
  local cmd="$1"
  command -v "$cmd" >/dev/null 2>&1 || fail "Missing required command: ${cmd}"
}

require_compose() {
  docker compose version >/dev/null 2>&1 || fail "Docker Compose plugin missing (expected: 'docker compose')."
}

project_root() {
  local dir
  dir="$(pwd)"
  [[ -d "$dir/.git" ]] || fail "Run from project root: .git not found in ${dir}"
  [[ -f "$dir/docker-compose.yml" ]] || fail "Run from project root: docker-compose.yml not found in ${dir}"
  printf '%s\n' "$dir"
}

ensure_log_file() {
  local log_dir
  log_dir="$(dirname "$LOG_FILE")"
  mkdir -p "$log_dir"
  touch "$LOG_FILE"
  chmod 0644 "$LOG_FILE"
}

setup_logging() {
  if [[ -w "$LOG_FILE" || ( ! -e "$LOG_FILE" && -w "$(dirname "$LOG_FILE")" ) ]]; then
    exec >>"$LOG_FILE" 2>&1
    return
  fi

  if command -v sudo >/dev/null 2>&1; then
    exec > >(sudo tee -a "$LOG_FILE") 2>&1
    return
  fi

  fail "Cannot write log file: ${LOG_FILE}"
}

acquire_lock_or_exit() {
  exec 9>"$LOCK_FILE"
  if ! flock -n 9; then
    log "Update already running"
    exit 0
  fi
}

write_version_file() {
  local commit_short="$1"
  local updated_at="$2"
  cat > "$VERSION_FILE" <<EOF
{
  "version": "${commit_short}",
  "commit": "${commit_short}",
  "updated_at": "${updated_at}"
}
EOF
}

ensure_env_safe() {
  if git ls-files --error-unmatch .env >/dev/null 2>&1; then
    fail ".env is tracked by git. Aborting to avoid overwriting .env."
  fi

  if git clean -fdn -e .env | grep -Eq 'Would remove \.env$'; then
    fail "git clean would remove .env. Aborting."
  fi
}

sync_version_into_backend() {
  local backend_cid
  backend_cid="$(docker compose ps -q backend 2>/dev/null || true)"
  if [[ -z "$backend_cid" ]]; then
    warn "Backend container not running. Skipping version.json sync."
    return 0
  fi

  if [[ ! -f "$VERSION_FILE" ]]; then
    warn "version.json missing. Skipping backend sync."
    return 0
  fi

  if ! docker compose exec -T backend sh -lc '
    set -eu
    tmp_file="$(mktemp)"
    cat > "$tmp_file"
    cp "$tmp_file" /app/version.json
    mkdir -p /app/data
    cp "$tmp_file" /app/data/version.json
    rm -f "$tmp_file"
  ' < "$VERSION_FILE"; then
    warn "Failed to sync version.json into backend container."
  else
    log "Synced version.json into backend container."
  fi
}

health_check_services() {
  local expected_services
  local running_services
  local service

  expected_services="$(docker compose config --services)"
  running_services="$(docker compose ps --status running --services)"

  if [[ -z "$expected_services" ]]; then
    fail "No services found in docker compose config."
  fi

  for service in $expected_services; do
    if ! grep -Fxq "$service" <<< "$running_services"; then
      fail "Service '${service}' is not running after update."
    fi
  done

  log "Docker service health check passed."

  if command -v curl >/dev/null 2>&1; then
    if curl -fsS --max-time 5 http://localhost/ >/dev/null 2>&1; then
      log "HTTP check passed: /"
    else
      warn "HTTP check failed for / (non-fatal)"
    fi

    if curl -fsS --max-time 5 http://localhost/api/health >/dev/null 2>&1; then
      log "HTTP check passed: /api/health"
    else
      warn "HTTP check failed for /api/health (non-fatal)"
    fi
  fi
}

run_update() {
  local root="$1"
  cd "$root"

  ensure_env_safe

  log "Fetching origin/main..."
  git fetch origin main

  local local_head
  local remote_head
  local commit_short
  local updated_at

  local_head="$(git rev-parse HEAD)"
  remote_head="$(git rev-parse origin/main)"

  if [[ "$local_head" == "$remote_head" ]]; then
    log "No updates"
    return 0
  fi

  log "Update found: ${local_head} -> ${remote_head}"
  log "Applying deterministic git update (reset + clean)..."
  git reset --hard origin/main
  git clean -fd -e .env

  commit_short="$(git rev-parse --short HEAD)"
  updated_at="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  write_version_file "$commit_short" "$updated_at"
  log "Updated ${VERSION_FILE} for commit ${commit_short}"

  log "Rebuilding and starting containers..."
  docker compose up -d --build --force-recreate --remove-orphans

  log "Restarting services..."
  docker compose restart

  log "Running post-update health checks..."
  docker compose ps
  health_check_services

  sync_version_into_backend
  log "Update completed successfully at commit ${commit_short}"
}

main() {
  require_command git
  require_command docker
  require_command flock
  require_compose

  local sudo_cmd=""
  if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
    require_command sudo
    sudo_cmd="sudo"
  fi

  if [[ -n "$sudo_cmd" ]]; then
    $sudo_cmd mkdir -p "$(dirname "$LOG_FILE")"
    $sudo_cmd touch "$LOG_FILE"
    $sudo_cmd chmod 0644 "$LOG_FILE"
  else
    ensure_log_file
  fi

  setup_logging
  acquire_lock_or_exit

  local root
  root="$(project_root)"

  log "Starting update in ${root}"
  run_update "$root"
}

main "$@"
