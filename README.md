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
- `ALLOWED_ORIGINS`
- `ADMIN_BOOTSTRAP_TOKEN` (optional, nur fuer initialen Bootstrap)
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

- Admin kann Nutzerrollen anpassen unter `/admin`
- Initialer erster Admin wird einmalig per Bootstrap gesetzt:

```bash
curl -X POST https://example.org/api/admin/bootstrap \
  -H "Content-Type: application/json" \
  -H "x-bootstrap-token: <ADMIN_BOOTSTRAP_TOKEN>" \
  -d '{"username":"admin@example.org","password":"<starkes-passwort>"}'
```

Hinweis: Sobald ein Admin existiert, ist der Bootstrap-Endpunkt deaktiviert.

## Backup

SQLite DB liegt in Docker-Volume `pfadi_data` (`/app/data/pfadi.db`).

Empfehlung:
- Regelmaessiges Backup des Volumes
- Offsite-Backup (z. B. rsync auf NAS)

## Sicherheit & Datenschutz
- Keine externen SaaS-Dienste (ausser Cloudflare DNS)
- Kein Tracking
- Offline-Caching fuer Kernfunktionen

## Auth Token Lebenszyklus

- Access Token (`JWT`): **15 Minuten**
- Refresh Token: **14 Tage**
- Refresh Tokens werden bei jedem `POST /api/auth/refresh` **rotiert**.
- Browser-Flow:
  - `pfadi_token` Cookie: `HttpOnly`, `SameSite=Lax`, `Secure` in Production
  - `pfadi_refresh` Cookie: `HttpOnly`, `SameSite=Lax`, `Secure` in Production
- API-Clients koennen weiterhin `Authorization: Bearer <accessToken>` nutzen.

## Refresh Ablauf

1. Login liefert Access Token + Refresh Token (Cookie + Response-Daten).
2. Bei `401` versucht das Frontend genau einmal still `POST /api/auth/refresh`.
3. Bei Erfolg wird der Request einmal wiederholt.
4. Bei Fehlschlag wird Session lokal geloescht.
5. `POST /api/auth/logout` widerruft Refresh Tokens und loescht Cookies.

## Secret Rotation

- `JWT_SECRET` regelmaessig rotieren (vorher Wartungsfenster planen).
- Bei Rotation werden bestehende Access Tokens ungueltig; Clients melden sich neu an oder erneuern mit gueltigem Refresh Token.
- Fuer harte Rotation (inkl. Refresh Abbruch) alle aktiven Refresh Tokens serverseitig widerrufen.

## DB Migration Plan (Refresh Tokens)

- Neue Tabelle: `auth_refresh_tokens`
- Migration: `backend/src/db/migrations/017_refresh_tokens.sql`
- Deployment:
  1. Code ausrollen
  2. Backend starten (`npm --prefix backend run build` / Container restart)
  3. Migration wird beim Startup automatisch angewendet

## Auth Testplan (kurz)

1. Login pruefen: Access + Refresh Token ausgestellt.
2. Access Token ablaufen lassen (15m) und API Call senden -> Frontend soll automatisch refreshen und genau einmal retrien.
3. Refresh Rotation pruefen: alter Refresh Token darf nach Nutzung nicht erneut funktionieren.
4. Logout pruefen: Refresh Token widerrufen, danach `/api/auth/refresh` muss `401` liefern.

### Manuelle curl Beispiele

```bash
# 1) Login
curl -i -c cookies.txt -X POST https://example.org/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@example.org","password":"<passwort>"}'

# 2) Refresh ueber Cookie (Browser-aehnlich)
curl -i -b cookies.txt -c cookies.txt -X POST https://example.org/api/auth/refresh \
  -H "Content-Type: application/json" -d '{}'

# 3) Refresh ueber Body-Token (API-Client)
curl -i -X POST https://example.org/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refresh_token>"}'

# 4) Logout + Revocation
curl -i -b cookies.txt -c cookies.txt -X POST https://example.org/api/auth/logout \
  -H "Content-Type: application/json" -d '{}'

# 5) Danach muss Refresh fehlschlagen
curl -i -b cookies.txt -X POST https://example.org/api/auth/refresh \
  -H "Content-Type: application/json" -d '{}'
```

## Security Selbsttest

1. **Backdoor entfernt (`maro`)**
```bash
grep -Rni "maro" backend/src
```
Erwartung: keine Admin-Eskalationslogik ueber feste Benutzernamen.

2. **Startup fail-closed bei leerer Allowlist (Production)**
```bash
NODE_ENV=production ALLOWED_ORIGINS= JWT_SECRET="this-is-a-very-strong-production-secret-1234" npm --prefix backend run dev
```
Erwartung: Start bricht mit Fehler zu `ALLOWED_ORIGINS` ab.

3. **Cookie-auth CSRF Schutz fuer mutierende Requests**
```bash
curl -i -X POST https://example.org/api/auth/refresh \
  -H "Cookie: pfadi_token=<token-aus-cookie-ohne-authorization-header>" \
  -H "Origin: https://evil.example"
```
Erwartung: `403` mit CSRF-Fehler.

4. **Startup fail bei schwachem JWT Secret (Production/Staging)**
```bash
NODE_ENV=production ALLOWED_ORIGINS=https://example.org JWT_SECRET=dev-secret-change-me npm --prefix backend run dev
```
Erwartung: Start bricht mit Fehler zu `JWT_SECRET` ab.

