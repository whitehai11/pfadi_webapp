#!/usr/bin/env bash
set -euo pipefail

LOG_FILE=${LOG_FILE:-/var/log/pfadi-update.log}
VERSION_FILE=${VERSION_FILE:-version.json}

log() {
  printf '[%s] [pfadi-update] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

fail() {
  log "ERROR: $*"
  exit 1
}

require_command() {
  local cmd="$1"
  command -v "$cmd" >/dev/null 2>&1 || fail "Benoetigter Befehl fehlt: ${cmd}"
}

require_compose() {
  docker compose version >/dev/null 2>&1 || fail "Docker Compose Plugin fehlt. Erwartet: 'docker compose'."
}

project_root() {
  local dir
  dir="$(pwd)"
  [[ -d "$dir/.git" ]] || fail "Bitte im Projekt-Root ausfuehren: .git fehlt in ${dir}"
  [[ -f "$dir/docker-compose.yml" ]] || fail "Bitte im Projekt-Root ausfuehren: docker-compose.yml fehlt in ${dir}"
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
  if [[ -w "$LOG_FILE" || ! -e "$LOG_FILE" && -w "$(dirname "$LOG_FILE")" ]]; then
    exec >>"$LOG_FILE" 2>&1
    return
  fi

  if command -v sudo >/dev/null 2>&1; then
    exec > >(sudo tee -a "$LOG_FILE") 2>&1
    return
  fi

  fail "Logdatei ${LOG_FILE} ist nicht beschreibbar."
}

write_version_file() {
  local version="$1"
  local commit="$2"
  local updated_at="$3"
  cat > "$VERSION_FILE" <<EOF
{
  "version": "${version}",
  "commit": "${commit}",
  "updated_at": "${updated_at}"
}
EOF
}

sync_version_into_backend() {
  [[ -f "$VERSION_FILE" ]] || fail "Versionsdatei fehlt: ${VERSION_FILE}"

  log "Synchronisiere version.json ins Backend..."
  docker compose exec -T backend sh -lc '
    set -eu
    tmp_file="$(mktemp)"
    cat > "$tmp_file"
    cp "$tmp_file" /app/version.json
    mkdir -p /app/data
    cp "$tmp_file" /app/data/version.json
    rm -f "$tmp_file"
  ' < "$VERSION_FILE"
}

run_update() {
  local root="$1"
  cd "$root"

  log "Pruefe auf Updates..."
  git fetch origin

  local local_head
  local remote_head
  local_head="$(git rev-parse HEAD)"
  remote_head="$(git rev-parse origin/main)"

  local commit
  local updated_at

  if [[ "$local_head" == "$remote_head" ]]; then
    if [[ ! -f "$VERSION_FILE" ]]; then
      commit="$(git rev-parse --short HEAD)"
      updated_at="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
      write_version_file "$commit" "$commit" "$updated_at"
      docker compose up -d backend >/dev/null 2>&1 || true
      sync_version_into_backend || true
      log "Keine Updates vorhanden. Versionsdatei wurde initialisiert."
      return 0
    fi

    log "Keine Updates vorhanden."
    return 0
  fi

  log "Neue Version gefunden. Ziehe Aenderungen..."
  git pull origin main

  commit="$(git rev-parse --short HEAD)"
  updated_at="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  write_version_file "$commit" "$commit" "$updated_at"

  log "Baue und starte Container neu..."
  docker compose up -d --build

  sync_version_into_backend
  log "Update abgeschlossen auf Commit ${commit}."
}

main() {
  require_command git
  require_command docker
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

  local root
  root="$(project_root)"

  log "Starte manuelles Update im Projekt ${root}"
  run_update "$root"
}

main "$@"
