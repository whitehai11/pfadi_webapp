#!/usr/bin/env bash
set -euo pipefail

if ! command -v npx >/dev/null 2>&1; then
  echo "npx not found. Install Node.js first." >&2
  exit 1
fi

npx web-push generate-vapid-keys --json
