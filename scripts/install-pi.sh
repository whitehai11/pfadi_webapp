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

if [[ -z "$(get_env JWT_SECRET)" || "$PROMPT_ENV" == "1" ]]; then
  read -rp "JWT_SECRET (leer = automatisch generieren): " JWT_SECRET
  if [[ -z "$JWT_SECRET" ]]; then
    JWT_SECRET=$(openssl rand -hex 32)
  fi
  set_env "JWT_SECRET" "$JWT_SECRET"
fi

if [[ -z "$(get_env BASE_URL)" || "$PROMPT_ENV" == "1" ]]; then
  read -rp "BASE_URL (z. B. https://pfadi.example.org): " BASE_URL
  set_env "BASE_URL" "$BASE_URL"
fi

if [[ -z "$(get_env ADMIN_EMAILS)" || "$PROMPT_ENV" == "1" ]]; then
  read -rp "Admin-Benutzername(n), kommasepariert (z. B. maro,alex): " ADMIN_EMAILS
  set_env "ADMIN_EMAILS" "$ADMIN_EMAILS"
fi

if [[ -z "$(get_env VAPID_PUBLIC_KEY)" || -z "$(get_env VAPID_PRIVATE_KEY)" ]]; then
  echo "Generating VAPID keys..."
  chmod +x scripts/generate-vapid.sh || true
  bash ./scripts/generate-vapid.sh > /tmp/vapid.json
  VAPID_PUBLIC_KEY=$(node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync('/tmp/vapid.json','utf8'));console.log(d.publicKey)")
  VAPID_PRIVATE_KEY=$(node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync('/tmp/vapid.json','utf8'));console.log(d.privateKey)")
  set_env "VAPID_PUBLIC_KEY" "$VAPID_PUBLIC_KEY"
  set_env "VAPID_PRIVATE_KEY" "$VAPID_PRIVATE_KEY"
fi

sudo mkdir -p nginx/certs

if docker compose version >/dev/null 2>&1; then
  sudo docker compose up -d --build
else
  sudo docker-compose up -d --build
fi

echo "Install complete. Log out/in to apply docker group change."
