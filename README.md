# Pfadfinder Orga Web-App

Produktionsreife, selbst gehostete PWA fuer eine einzelne Pfadfinder-Organisation. Fokus auf Stabilitaet, Datenschutz, Wartbarkeit und Self-Hosting.

## Projektueberblick
- **Frontend:** SvelteKit PWA, Mobile-First UI, Offline-Cache
- **Backend:** Node.js (TypeScript), Fastify, REST-API, Cron-Jobs
- **Datenbank:** SQLite (Migrationen vorbereitet), vorbereitet fuer PostgreSQL
- **Push:** Web Push API mit VAPID Keys
- **Kalender:** iCalendar (ICS), read-only, st?ndliche Regeneration
- **Hosting:** Docker, docker-compose, NGINX Reverse Proxy
- **Optionen:** NFC/QR Feature Flags

## Lokale Entwicklung

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend
cd ../frontend
npm install
npm run dev
```

## Docker (Produktion / Linux)

```bash
docker-compose up -d --build
```

## Linux Installation (Ubuntu / Debian / Raspberry Pi OS)

1. Repository-URL setzen und Installer ausfuehren:

```bash
export REPO_URL=https://github.com/eure-org/pfadi-orga.git
./scripts/install-linux.sh
```

Der alte Einstiegspunkt `./scripts/install-pi.sh` bleibt als Kompatibilitaets-Wrapper erhalten.

2. Optional steuerbar per Umgebungsvariablen:
- `PROJECT_DIR=/opt/pfadi-orga`
- `PROMPT_ENV=0` fuer non-interaktive Uebernahme bestehender Werte
- `CONFIGURE_FIREWALL=0` falls UFW nicht angepasst werden soll
- `START_STACK=0` wenn Container noch nicht gestartet werden sollen

3. `.env` anpassen (siehe `.env.example`), falls du Werte spaeter manuell aendern willst:
- `JWT_SECRET`
- `BASE_URL`
- `ADMIN_EMAILS`
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`

## Cloudflare & Domain Setup

Voraussetzungen:
- Domain ist in Cloudflare vorhanden
- API-Token mit DNS-Edit-Rechten vorhanden
- Cloudflare Origin Certificate vorhanden (Full/Full Strict)

Beispiel:

```bash
export CF_API_TOKEN=...
export CF_ZONE_ID=...
export CF_DOMAIN=example.org
export CF_SUBDOMAIN=app   # optional
export CF_ORIGIN_CERT_PATH=/path/to/origin.pem
export CF_ORIGIN_KEY_PATH=/path/to/origin.key

./scripts/cloudflare-setup.sh
```

NGINX nutzt `/etc/nginx/certs/origin.pem` und `/etc/nginx/certs/origin.key`. Kein certbot notwendig.

## Push-Aktivierung

- Backend: VAPID Keys in `.env`
- Frontend: `Einstellungen` -> Push aktivieren
- iOS/Android/Desktop: Browser/OS fordert Berechtigung an

## Kalender abonnieren

ICS-Endpoint:

```
GET /calendar.ics
```

In externen Kalendern abonnierbar (read-only). Regeneration stuendlich.

## Admin-Verwaltung

- Admins werden in `.env` via `ADMIN_EMAILS` gesetzt
- Admin kann Nutzerrollen anpassen unter `/admin`

## Backup

SQLite DB liegt in Docker-Volume `pfadi_data` (`/app/data/pfadi.db`).

Empfehlung:
- Regelmaessiges Backup des Volumes
- Offsite-Backup (z. B. rsync auf NAS)

## Sicherheit & Datenschutz
- Keine externen SaaS-Dienste (ausser Cloudflare DNS)
- Kein Tracking
- Offline-Caching fuer Kernfunktionen

