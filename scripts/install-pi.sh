#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR=${PROJECT_DIR:-/opt/pfadi-orga}
REPO_URL=${REPO_URL:-"https://github.com/whitehai11/pfadi_webapp.git"}
PROMPT_ENV=${PROMPT_ENV:-1}

if [[ -z "$REPO_URL" ]]; then
  read -rp "Git-Repo URL (z. B. https://github.com/whitehai11/pfadi_webapp.git): " REPO_URL
fi

if [[ -z "$REPO_URL" ]]; then
  echo "REPO_URL fehlt." >&2
  exit 1
fi

retry_apt() {
  local cmd="$1"
  local tries=5
  for i in $(seq 1 $tries); do
    if eval "$cmd"; then
      return 0
    fi
    echo "APT-Fehler, versuche erneut ($i/$tries)..." >&2
    sleep 3
  done
  return 1
}

retry_apt "sudo apt-get update"
retry_apt "sudo apt-get -y upgrade || true"

sudo apt-get install -y ca-certificates curl gnupg lsb-release git ufw

if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi

if ! docker compose version >/dev/null 2>&1; then
  retry_apt "sudo apt-get install -y docker-compose-plugin"
fi

if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  retry_apt "sudo apt-get install -y nodejs"
fi

sudo systemctl enable --now docker || true

sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable

if [[ ! -d "$PROJECT_DIR/.git" ]]; then
  sudo mkdir -p "$PROJECT_DIR"
  sudo git clone "$REPO_URL" "$PROJECT_DIR"
else
  echo "Repo existiert bereits: $PROJECT_DIR"
fi

sudo chown -R "$USER":"$USER" "$PROJECT_DIR"
cd "$PROJECT_DIR"

if [[ -f .env && ! -f .env.backup ]]; then
  cp .env .env.backup
fi

if [[ ! -f .env ]]; then
  cp .env.example .env
fi

set_env() {
  local key="$1"
  local value="$2"
  if grep -q "^${key}=" .env; then
    sed -i "s|^${key}=.*|${key}=${value}|" .env
  else
    echo "${key}=${value}" >> .env
  fi
}

get_env() {
  local key="$1"
  grep -E "^${key}=" .env | head -n1 | cut -d= -f2-
}

prompt_value() {
  local key="$1"
  local current="$2"
  local label="$3"
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
  echo "$value"
}

prompt_from_example() {
  local example_file=".env.example"
  if [[ ! -f "$example_file" ]]; then
    return
  fi
  while IFS= read -r line; do
    if [[ -z "$line" || "$line" =~ ^# ]]; then
      continue
    fi
    local key="${line%%=*}"
    local current
    current="$(get_env "$key")"
    case "$key" in
      JWT_SECRET)
        if [[ "$PROMPT_ENV" == "1" ]]; then
          read -rp "JWT_SECRET (leer = automatisch generieren): " JWT_SECRET
        fi
        if [[ -z "${JWT_SECRET:-}" ]]; then
          JWT_SECRET=$(openssl rand -hex 32)
        fi
        set_env "JWT_SECRET" "$JWT_SECRET"
        ;;
      VAPID_PUBLIC_KEY|VAPID_PRIVATE_KEY)
        if [[ -z "$(get_env VAPID_PUBLIC_KEY)" || -z "$(get_env VAPID_PRIVATE_KEY)" ]]; then
          echo "Generating VAPID keys..."
          chmod +x scripts/generate-vapid.sh || true
          tmpdir="${TMPDIR:-/tmp}/pfadi"
          mkdir -p "$tmpdir"
          chmod 777 "$tmpdir" || true
          bash ./scripts/generate-vapid.sh > "$tmpdir/vapid.json"
          VAPID_JSON="$tmpdir/vapid.json"
          export VAPID_JSON
          VAPID_PUBLIC_KEY=$(node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync(process.env.VAPID_JSON,'utf8'));console.log(d.publicKey)")
          VAPID_PRIVATE_KEY=$(node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync(process.env.VAPID_JSON,'utf8'));console.log(d.privateKey)")
          set_env "VAPID_PUBLIC_KEY" "$VAPID_PUBLIC_KEY"
          set_env "VAPID_PRIVATE_KEY" "$VAPID_PRIVATE_KEY"
        fi
        ;;
      *)
        case "$key" in
          PORT)
            value="$(prompt_value "$key" "$current" "PORT")"
            ;;
          HOST)
            value="$(prompt_value "$key" "$current" "HOST")"
            ;;
          DATABASE_PATH)
            value="$(prompt_value "$key" "$current" "DATABASE_PATH")"
            ;;
          DATA_DIR)
            value="$(prompt_value "$key" "$current" "DATA_DIR")"
            ;;
          ALLOWED_ORIGINS)
            value="$(prompt_value "$key" "$current" "ALLOWED_ORIGINS")"
            ;;
          BASE_URL)
            value="$(prompt_value "$key" "$current" "BASE_URL")"
            ;;
          ADMIN_EMAILS)
            value="$(prompt_value "$key" "$current" "Admin-Benutzername(n), kommasepariert")"
            ;;
          VAPID_SUBJECT)
            value="$(prompt_value "$key" "$current" "VAPID_SUBJECT")"
            ;;
          *)
            value="$(prompt_value "$key" "$current" "$key")"
            ;;
        esac
        if [[ -n "$value" ]]; then
          set_env "$key" "$value"
        fi
        ;;
    esac
  done < "$example_file"
}

prompt_from_example

sudo mkdir -p nginx/certs

if docker compose version >/dev/null 2>&1; then
  sudo docker compose up -d --build
else
  sudo docker-compose up -d --build
fi

echo "Install complete. Log out/in to apply docker group change."
