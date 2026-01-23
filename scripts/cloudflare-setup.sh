#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${CF_API_TOKEN:-}" || -z "${CF_ZONE_ID:-}" || -z "${CF_DOMAIN:-}" ]]; then
  echo "Set CF_API_TOKEN, CF_ZONE_ID, CF_DOMAIN before running." >&2
  exit 1
fi

CF_SUBDOMAIN=${CF_SUBDOMAIN:-""}
CF_IP=${CF_IP:-""}

if [[ -z "$CF_IP" ]]; then
  CF_IP=$(curl -fsSL https://api.ipify.org)
fi

CF_API="https://api.cloudflare.com/client/v4"
AUTH_HEADER=("Authorization: Bearer $CF_API_TOKEN" "Content-Type: application/json")

upsert_record() {
  local name="$1"
  local type="A"
  local content="$2"

  local existing
  existing=$(curl -fsSL -X GET "$CF_API/zones/$CF_ZONE_ID/dns_records?type=$type&name=$name" -H "${AUTH_HEADER[0]}" -H "${AUTH_HEADER[1]}")
  local record_id
  record_id=$(python3 - <<'PY'
import json,sys
payload=json.load(sys.stdin)
items=payload.get('result',[])
print(items[0]['id'] if items else '')
PY
<<<"$existing")

  if [[ -n "$record_id" ]]; then
    curl -fsSL -X PUT "$CF_API/zones/$CF_ZONE_ID/dns_records/$record_id" \
      -H "${AUTH_HEADER[0]}" -H "${AUTH_HEADER[1]}" \
      --data "{\"type\":\"$type\",\"name\":\"$name\",\"content\":\"$content\",\"proxied\":true}"
  else
    curl -fsSL -X POST "$CF_API/zones/$CF_ZONE_ID/dns_records" \
      -H "${AUTH_HEADER[0]}" -H "${AUTH_HEADER[1]}" \
      --data "{\"type\":\"$type\",\"name\":\"$name\",\"content\":\"$content\",\"proxied\":true}"
  fi
}

upsert_record "$CF_DOMAIN" "$CF_IP"

if [[ -n "$CF_SUBDOMAIN" ]]; then
  upsert_record "$CF_SUBDOMAIN.$CF_DOMAIN" "$CF_IP"
fi

mkdir -p nginx/certs

if [[ -n "${CF_ORIGIN_CERT:-}" && -n "${CF_ORIGIN_KEY:-}" ]]; then
  echo "$CF_ORIGIN_CERT" > nginx/certs/origin.pem
  echo "$CF_ORIGIN_KEY" > nginx/certs/origin.key
elif [[ -n "${CF_ORIGIN_CERT_PATH:-}" && -n "${CF_ORIGIN_KEY_PATH:-}" ]]; then
  cp "$CF_ORIGIN_CERT_PATH" nginx/certs/origin.pem
  cp "$CF_ORIGIN_KEY_PATH" nginx/certs/origin.key
else
  echo "Provide CF_ORIGIN_CERT/CF_ORIGIN_KEY or CF_ORIGIN_CERT_PATH/CF_ORIGIN_KEY_PATH." >&2
  exit 1
fi

chmod 600 nginx/certs/origin.key

echo "Cloudflare DNS updated for $CF_DOMAIN ($CF_IP)."
