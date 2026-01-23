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

## Docker (Produktion / Pi)

```bash
docker-compose up -d --build
```

## Raspberry Pi Installation

1. Repository-URL setzen und Skript ausfuehren:

```bash
export REPO_URL=https://github.com/eure-org/pfadi-orga.git
./scripts/install-pi.sh
```

2. `.env` anpassen (siehe `.env.example`):
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

