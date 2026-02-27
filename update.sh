#!/usr/bin/env bash
set -euo pipefail

LOG_FILE=${LOG_FILE:-/var/log/pfadi-update.log}
UPDATER_PATH=${UPDATER_PATH:-/usr/local/bin/pfadi-updater.sh}
CRON_SCHEDULE=${CRON_SCHEDULE:-'0 */12 * * *'}
CRON_FILE=${CRON_FILE:-/etc/cron.d/pfadi-updater}
CRON_COMMAND="${UPDATER_PATH} >> ${LOG_FILE} 2>&1"

log() {
  printf '[%s] [pfadi-update] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

fail() {
  printf '[pfadi-update] ERROR: %s\n' "$*" >&2
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

  # The curl installer is expected to be run from the checked-out project root.
  [[ -d "$dir/.git" ]] || fail "Bitte im Projekt-Root ausfuehren: .git fehlt in ${dir}"
  [[ -f "$dir/docker-compose.yml" ]] || fail "Bitte im Projekt-Root ausfuehren: docker-compose.yml fehlt in ${dir}"

  printf '%s\n' "$dir"
}

ensure_writable_log() {
  local sudo_cmd="${1:-}"
  local log_dir
  log_dir="$(dirname "$LOG_FILE")"

  if [[ -n "$sudo_cmd" ]]; then
    $sudo_cmd mkdir -p "$log_dir"
    $sudo_cmd touch "$LOG_FILE"
    $sudo_cmd chmod 0644 "$LOG_FILE"
  else
    mkdir -p "$log_dir"
    touch "$LOG_FILE"
    chmod 0644 "$LOG_FILE"
  fi
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

write_updater_script() {
  local project_dir="$1"
  local sudo_cmd="${2:-}"

  # Persist the exact project path so cron can update the same checkout later.
  if [[ -n "$sudo_cmd" ]]; then
    $sudo_cmd tee "$UPDATER_PATH" >/dev/null <<EOF
#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR=$(printf '%q' "$project_dir")
LOG_FILE=$(printf '%q' "$LOG_FILE")

log() {
  printf '[%s] [pfadi-update] %s\n' "\$(date '+%Y-%m-%d %H:%M:%S')" "\$*"
}

fail() {
  log "ERROR: \$*"
  exit 1
}

require_command() {
  local cmd="\$1"
  command -v "\$cmd" >/dev/null 2>&1 || fail "Benoetigter Befehl fehlt: \${cmd}"
}

require_compose() {
  docker compose version >/dev/null 2>&1 || fail "Docker Compose Plugin fehlt. Erwartet: 'docker compose'."
}

setup_logging() {
  mkdir -p "\$(dirname "\$LOG_FILE")"

  if [[ -w "\$LOG_FILE" || ! -e "\$LOG_FILE" && -w "\$(dirname "\$LOG_FILE")" ]]; then
    touch "\$LOG_FILE"
    exec >>"\$LOG_FILE" 2>&1
    return
  fi

  if command -v sudo >/dev/null 2>&1; then
    exec > >(sudo tee -a "\$LOG_FILE") 2>&1
    return
  fi

  fail "Logdatei \$LOG_FILE ist nicht beschreibbar."
}

main() {
  require_command git
  require_command docker
  require_compose
  setup_logging

  [[ -d "\$PROJECT_DIR/.git" ]] || fail "Git-Repository fehlt unter \$PROJECT_DIR"
  [[ -f "\$PROJECT_DIR/docker-compose.yml" ]] || fail "docker-compose.yml fehlt unter \$PROJECT_DIR"

  cd "\$PROJECT_DIR"

  log "Pruefe auf Updates..."
  git fetch origin

  local LOCAL
  local REMOTE
  LOCAL="\$(git rev-parse HEAD)"
  REMOTE="\$(git rev-parse origin/main)"

  if [[ "\$LOCAL" != "\$REMOTE" ]]; then
    log "Neue Version gefunden. Ziehe Aenderungen..."
    git pull origin main
    log "Baue und starte Container neu..."
    docker compose up -d --build
    log "Update abgeschlossen."
    exit 0
  fi

  log "Keine Updates vorhanden."
}

main "\$@"
EOF
    $sudo_cmd chmod 0755 "$UPDATER_PATH"
    return
  fi

  cat > "$UPDATER_PATH" <<EOF
#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR=$(printf '%q' "$project_dir")
LOG_FILE=$(printf '%q' "$LOG_FILE")

log() {
  printf '[%s] [pfadi-update] %s\n' "\$(date '+%Y-%m-%d %H:%M:%S')" "\$*"
}

fail() {
  log "ERROR: \$*"
  exit 1
}

require_command() {
  local cmd="\$1"
  command -v "\$cmd" >/dev/null 2>&1 || fail "Benoetigter Befehl fehlt: \${cmd}"
}

require_compose() {
  docker compose version >/dev/null 2>&1 || fail "Docker Compose Plugin fehlt. Erwartet: 'docker compose'."
}

setup_logging() {
  mkdir -p "\$(dirname "\$LOG_FILE")"

  if [[ -w "\$LOG_FILE" || ! -e "\$LOG_FILE" && -w "\$(dirname "\$LOG_FILE")" ]]; then
    touch "\$LOG_FILE"
    exec >>"\$LOG_FILE" 2>&1
    return
  fi

  if command -v sudo >/dev/null 2>&1; then
    exec > >(sudo tee -a "\$LOG_FILE") 2>&1
    return
  fi

  fail "Logdatei \$LOG_FILE ist nicht beschreibbar."
}

main() {
  require_command git
  require_command docker
  require_compose
  setup_logging

  [[ -d "\$PROJECT_DIR/.git" ]] || fail "Git-Repository fehlt unter \$PROJECT_DIR"
  [[ -f "\$PROJECT_DIR/docker-compose.yml" ]] || fail "docker-compose.yml fehlt unter \$PROJECT_DIR"

  cd "\$PROJECT_DIR"

  log "Pruefe auf Updates..."
  git fetch origin

  local LOCAL
  local REMOTE
  LOCAL="\$(git rev-parse HEAD)"
  REMOTE="\$(git rev-parse origin/main)"

  if [[ "\$LOCAL" != "\$REMOTE" ]]; then
    log "Neue Version gefunden. Ziehe Aenderungen..."
    git pull origin main
    log "Baue und starte Container neu..."
    docker compose up -d --build
    log "Update abgeschlossen."
    exit 0
  fi

  log "Keine Updates vorhanden."
}

main "\$@"
EOF
  chmod 0755 "$UPDATER_PATH"
}

install_cronjob() {
  local sudo_cmd="${1:-}"
  local cron_line="${CRON_SCHEDULE} root ${CRON_COMMAND}"

  # A dedicated cron.d file is idempotent and avoids duplicate user-crontab entries.
  [[ -d /etc/cron.d ]] || fail "/etc/cron.d fehlt. Bitte Cron installieren."

  if [[ -n "$sudo_cmd" ]]; then
    $sudo_cmd tee "$CRON_FILE" >/dev/null <<EOF
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
${cron_line}
EOF
    $sudo_cmd chmod 0644 "$CRON_FILE"
  else
    cat > "$CRON_FILE" <<EOF
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
${cron_line}
EOF
    chmod 0644 "$CRON_FILE"
  fi

  log "Cronjob eingerichtet: ${cron_line}"
}

run_update() {
  local project_dir="$1"

  cd "$project_dir"

  log "Pruefe auf Updates..."
  git fetch origin

  # Compare the deployed commit with origin/main before rebuilding anything.
  local LOCAL
  local REMOTE
  LOCAL="$(git rev-parse HEAD)"
  REMOTE="$(git rev-parse origin/main)"

  if [[ "$LOCAL" != "$REMOTE" ]]; then
    log "Neue Version gefunden. Ziehe Aenderungen..."
    git pull origin main
    log "Baue und starte Container neu..."
    docker compose up -d --build
    log "Update abgeschlossen."
    return
  fi

  log "Keine Updates vorhanden."
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

  local root
  root="$(project_root)"

  ensure_writable_log "$sudo_cmd"
  setup_logging

  log "Start"
  log "Projektverzeichnis: ${root}"

  run_update "$root"
  write_updater_script "$root" "$sudo_cmd"
  install_cronjob "$sudo_cmd"

  log "Updater installiert: ${UPDATER_PATH}"
  log "Logdatei: ${LOG_FILE}"
}

main "$@"
