#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR=${PROJECT_DIR:-/opt/pfadi-orga}
REPO_URL=${REPO_URL:-"https://github.com/whitehai11/pfadi_webapp.git"}
PROMPT_ENV=${PROMPT_ENV:-1}
INSTALL_NODE=${INSTALL_NODE:-1}
CONFIGURE_FIREWALL=${CONFIGURE_FIREWALL:-1}
START_STACK=${START_STACK:-1}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log() {
  printf '[pfadi-install] %s\n' "$*"
}

warn() {
  printf '[pfadi-install] WARN: %s\n' "$*" >&2
}

fail() {
  printf '[pfadi-install] ERROR: %s\n' "$*" >&2
  exit 1
}

if [[ -z "$REPO_URL" ]]; then
  read -rp "Git-Repo URL: " REPO_URL
fi

[[ -n "$REPO_URL" ]] || fail "REPO_URL fehlt."

if [[ -r /etc/os-release ]]; then
  # shellcheck disable=SC1091
  source /etc/os-release
else
  fail "/etc/os-release konnte nicht gelesen werden."
fi

DISTRO_ID="${ID:-}"
DISTRO_CODENAME="${VERSION_CODENAME:-}"
DISTRO_LIKE="${ID_LIKE:-}"
DISTRO_ARCH="$(dpkg --print-architecture)"
REPO_DISTRO="debian"

if [[ "$DISTRO_ID" == "ubuntu" ]]; then
  REPO_DISTRO="ubuntu"
fi

if [[ "$DISTRO_ID" != "ubuntu" && "$DISTRO_ID" != "debian" && "$DISTRO_LIKE" != *"debian"* ]]; then
  fail "Nur Ubuntu und Debian-basierte Systeme werden unterstuetzt. Erkannt: ${DISTRO_ID:-unbekannt}"
fi

if [[ -z "$DISTRO_CODENAME" ]]; then
  fail "Konnte VERSION_CODENAME nicht ermitteln. Bitte /etc/os-release pruefen."
fi

SUDO=""
if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  command -v sudo >/dev/null 2>&1 || fail "sudo wird benoetigt."
  SUDO="sudo"
fi

retry() {
  local tries="$1"
  shift
  local attempt=1
  until "$@"; do
    if (( attempt >= tries )); then
      return 1
    fi
    warn "Befehl fehlgeschlagen. Neuer Versuch ${attempt}/${tries}: $*"
    attempt=$((attempt + 1))
    sleep 3
  done
}

apt_install() {
  retry 5 $SUDO apt-get install -y "$@"
}

ensure_base_packages() {
  log "Installiere Basis-Pakete..."
  retry 5 $SUDO apt-get update
  apt_install ca-certificates curl gnupg lsb-release git jq openssl ufw
}

configure_docker_repo() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    log "Docker und Compose-Plugin sind bereits vorhanden."
    return
  fi

  log "Richte offizielles Docker-Repository ein..."
  $SUDO install -m 0755 -d /etc/apt/keyrings
  curl -fsSL "https://download.docker.com/linux/${REPO_DISTRO}/gpg" | $SUDO gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  $SUDO chmod a+r /etc/apt/keyrings/docker.gpg

  cat <<EOF | $SUDO tee /etc/apt/sources.list.d/docker.list >/dev/null
deb [arch=${DISTRO_ARCH} signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/${REPO_DISTRO} ${DISTRO_CODENAME} stable
EOF

  retry 5 $SUDO apt-get update
  apt_install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
}

ensure_docker_running() {
  log "Aktiviere Docker-Dienst..."
  $SUDO systemctl enable --now docker

  if ! groups "$USER" | grep -q '\bdocker\b'; then
    log "Fuege ${USER} zur docker-Gruppe hinzu..."
    $SUDO usermod -aG docker "$USER"
  fi
}

ensure_node() {
  if [[ "$INSTALL_NODE" != "1" ]]; then
    return
  fi

  if command -v node >/dev/null 2>&1 && command -v npx >/dev/null 2>&1; then
    log "Node.js ist bereits vorhanden."
    return
  fi

  log "Installiere Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | $SUDO -E bash -
  apt_install nodejs
}

configure_firewall() {
  if [[ "$CONFIGURE_FIREWALL" != "1" ]]; then
    return
  fi

  log "Aktualisiere UFW-Regeln..."
  $SUDO ufw allow OpenSSH >/dev/null || true
  $SUDO ufw allow 80 >/dev/null || true
  $SUDO ufw allow 443 >/dev/null || true
  $SUDO ufw --force enable >/dev/null || true
}

clone_or_update_repo() {
  log "Bereite Projektverzeichnis vor: ${PROJECT_DIR}"
  $SUDO mkdir -p "$PROJECT_DIR"
  $SUDO chown -R "$USER":"$USER" "$PROJECT_DIR"

  if [[ ! -d "$PROJECT_DIR/.git" ]]; then
    git clone "$REPO_URL" "$PROJECT_DIR"
    return
  fi

  if [[ ! -d "$PROJECT_DIR/.git" ]]; then
    fail "${PROJECT_DIR} existiert, ist aber kein Git-Repository."
  fi

  log "Repository existiert bereits. Hole aktuelle Aenderungen..."
  git -C "$PROJECT_DIR" remote set-url origin "$REPO_URL"
  git -C "$PROJECT_DIR" fetch origin
  local branch
  branch="$(git -C "$PROJECT_DIR" rev-parse --abbrev-ref HEAD)"
  git -C "$PROJECT_DIR" pull --ff-only origin "$branch" || warn "Konnte Branch ${branch} nicht automatisch fast-forwarden."
}

backup_env_file() {
  local env_file="$1"
  if [[ -f "$env_file" ]]; then
    cp "$env_file" "${env_file}.backup.$(date +%Y%m%d%H%M%S)"
  fi
}

set_env() {
  local env_file="$1"
  local key="$2"
  local value="$3"
  if grep -q "^${key}=" "$env_file"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$env_file"
  else
    printf '%s=%s\n' "$key" "$value" >> "$env_file"
  fi
}

get_env() {
  local env_file="$1"
  local key="$2"
  grep -E "^${key}=" "$env_file" | head -n1 | cut -d= -f2- || true
}

prompt_value() {
  local current="$1"
  local label="$2"
  local value=""

  if [[ "$PROMPT_ENV" == "1" ]]; then
    if [[ -n "$current" ]]; then
      read -rp "${label} [${current}]: " value
      value="${value:-$current}"
    else
      read -rp "${label}: " value
    fi
  else
    value="$current"
  fi

  printf '%s' "$value"
}

generate_vapid_keys() {
  local project_dir="$1"
  local json_file
  json_file="$(mktemp)"
  (cd "$project_dir" && bash ./scripts/generate-vapid.sh > "$json_file")

  local public_key
  local private_key
  public_key="$(jq -r '.publicKey' "$json_file")"
  private_key="$(jq -r '.privateKey' "$json_file")"
  rm -f "$json_file"

  [[ -n "$public_key" && "$public_key" != "null" ]] || fail "VAPID public key konnte nicht erzeugt werden."
  [[ -n "$private_key" && "$private_key" != "null" ]] || fail "VAPID private key konnte nicht erzeugt werden."

  printf '%s\n%s\n' "$public_key" "$private_key"
}

configure_env() {
  local project_dir="$1"
  local env_file="$project_dir/.env"
  local example_file="$project_dir/.env.example"

  [[ -f "$example_file" ]] || fail ".env.example fehlt in ${project_dir}"

  if [[ ! -f "$env_file" ]]; then
    cp "$example_file" "$env_file"
  else
    backup_env_file "$env_file"
  fi

  local jwt_secret
  jwt_secret="$(get_env "$env_file" "JWT_SECRET")"
  if [[ -z "$jwt_secret" || "$jwt_secret" == "change-me-very-long" ]]; then
    if [[ "$PROMPT_ENV" == "1" ]]; then
      read -rp "JWT_SECRET (leer = automatisch generieren): " jwt_secret
    fi
    jwt_secret="${jwt_secret:-$(openssl rand -hex 32)}"
    set_env "$env_file" "JWT_SECRET" "$jwt_secret"
  fi

  local key current value
  while IFS= read -r line; do
    [[ -z "$line" || "$line" =~ ^# ]] && continue
    key="${line%%=*}"
    current="$(get_env "$env_file" "$key")"

    case "$key" in
      JWT_SECRET)
        ;;
      VAPID_PUBLIC_KEY|VAPID_PRIVATE_KEY)
        ;;
      PORT)
        value="$(prompt_value "$current" "Backend-Port")"
        [[ -n "$value" ]] && set_env "$env_file" "$key" "$value"
        ;;
      HOST)
        value="$(prompt_value "$current" "Backend-Host")"
        [[ -n "$value" ]] && set_env "$env_file" "$key" "$value"
        ;;
      DATABASE_PATH)
        value="$(prompt_value "$current" "Pfad zur SQLite-Datei")"
        [[ -n "$value" ]] && set_env "$env_file" "$key" "$value"
        ;;
      DATA_DIR)
        value="$(prompt_value "$current" "Datenverzeichnis")"
        [[ -n "$value" ]] && set_env "$env_file" "$key" "$value"
        ;;
      ALLOWED_ORIGINS)
        value="$(prompt_value "$current" "Erlaubte Origins (leer = alle)")"
        set_env "$env_file" "$key" "$value"
        ;;
      BASE_URL)
        value="$(prompt_value "$current" "Oeffentliche App-URL (z. B. https://app.example.org oder http://localhost:8080)")"
        [[ -n "$value" ]] && set_env "$env_file" "$key" "$value"
        ;;
      ADMIN_EMAILS)
        value="$(prompt_value "$current" "Admin-E-Mails oder Benutzernamen, kommasepariert")"
        [[ -n "$value" ]] && set_env "$env_file" "$key" "$value"
        ;;
      VAPID_SUBJECT)
        value="$(prompt_value "$current" "VAPID-Subject (z. B. mailto:admin@example.org)")"
        [[ -n "$value" ]] && set_env "$env_file" "$key" "$value"
        ;;
      *)
        value="$(prompt_value "$current" "$key")"
        [[ -n "$value" ]] && set_env "$env_file" "$key" "$value"
        ;;
    esac
  done < "$example_file"

  local vapid_public vapid_private
  vapid_public="$(get_env "$env_file" "VAPID_PUBLIC_KEY")"
  vapid_private="$(get_env "$env_file" "VAPID_PRIVATE_KEY")"

  if [[ -z "$vapid_public" || -z "$vapid_private" ]]; then
    ensure_node
    log "Erzeuge VAPID-Keys..."
    mapfile -t vapid_keys < <(generate_vapid_keys "$project_dir")
    set_env "$env_file" "VAPID_PUBLIC_KEY" "${vapid_keys[0]}"
    set_env "$env_file" "VAPID_PRIVATE_KEY" "${vapid_keys[1]}"
  fi
}

start_stack() {
  local project_dir="$1"
  if [[ "$START_STACK" != "1" ]]; then
    log "START_STACK=0 gesetzt. Ueberspringe docker compose up."
    return
  fi

  log "Starte Container..."
  (cd "$project_dir" && $SUDO docker compose up -d --build)
}

print_summary() {
  local base_url="siehe ${PROJECT_DIR}/.env"
  if [[ -f "${PROJECT_DIR}/.env" ]]; then
    base_url="$(get_env "${PROJECT_DIR}/.env" "BASE_URL")"
    base_url="${base_url:-siehe ${PROJECT_DIR}/.env}"
  fi

  cat <<EOF

Installation abgeschlossen.

Projekt: ${PROJECT_DIR}
Distribution: ${PRETTY_NAME:-$DISTRO_ID}

Naechste Schritte:
  1. Falls noetig, neu einloggen, damit die docker-Gruppe aktiv wird.
  2. Stack pruefen: cd ${PROJECT_DIR} && docker compose ps
  3. App oeffnen: ${base_url}

EOF
}

main() {
  log "Starte Installer fuer Ubuntu/Debian..."
  ensure_base_packages
  configure_docker_repo
  ensure_docker_running
  configure_firewall
  clone_or_update_repo
  configure_env "$PROJECT_DIR"
  $SUDO mkdir -p "$PROJECT_DIR/nginx/certs"
  start_stack "$PROJECT_DIR"
  print_summary
}

main "$@"
