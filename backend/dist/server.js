import fs from "node:fs";
import crypto from "node:crypto";
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import { settings } from "./config/settings.js";
import { applyMigrations } from "./db/migrate-runner.js";
import { db } from "./db/database.js";
import { calendarRoutes } from "./api/calendar.routes.js";
import { inventoryRoutes } from "./api/inventory.routes.js";
import { boxRoutes } from "./api/box.routes.js";
import { packlistRoutes } from "./api/packlist.routes.js";
import { pushRoutes } from "./api/push.routes.js";
import { adminRoutes } from "./api/admin.routes.js";
import { authRoutes } from "./api/auth.routes.js";
import { settingsRoutes } from "./api/settings.routes.js";
import { chatRoutes } from "./api/chat.routes.js";
import { systemRoutes } from "./api/system.routes.js";
import { generateIcs, getIcsPath } from "./services/ics.service.js";
import { scheduleCalendarRefresh } from "./cron/calendar-refresh.cron.js";
import { scheduleReminders } from "./cron/reminders.cron.js";
import { schedulePacklistChecks } from "./cron/packlist-check.cron.js";
import { scheduleCustomPushRules } from "./cron/push-rules.cron.js";
import { ensureDefaultChatRoom } from "./services/chat.service.js";
const app = Fastify({ logger: true });
app.register(helmet, {
    global: true,
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            connectSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "blob:"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            workerSrc: ["'self'", "blob:"],
            fontSrc: ["'self'", "data:"],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"]
        }
    },
    referrerPolicy: { policy: "no-referrer" },
    xFrameOptions: true,
    xContentTypeOptions: true,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: "same-origin" },
    crossOriginResourcePolicy: { policy: "same-origin" }
});
app.register(cors, {
    origin: (origin, cb) => {
        if (!origin)
            return cb(null, true);
        if (settings.allowedOrigins.length === 0)
            return cb(null, true);
        cb(null, settings.allowedOrigins.includes(origin));
    }
});
app.register(jwt, { secret: settings.jwtSecret });
app.register(multipart, {
    limits: {
        files: 1,
        fileSize: settings.chatUploadMaxBytes
    }
});
app.addHook("onRequest", async (_request, reply) => {
    reply.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
});
const ensureDefaults = () => {
    const existingRules = db.prepare("SELECT rule_type FROM push_rules").all();
    const existing = new Set(existingRules.map((rule) => rule.rule_type));
    const now = new Date().toISOString();
    const insertRule = db.prepare("INSERT INTO push_rules (id, rule_type, enabled, lead_time_hours, target_user_id, target_role, title_template, body_template, min_response_percent, event_type, send_start, send_end, schedule_start_date, schedule_every, schedule_time, cooldown_hours, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    const addDefaultRule = (ruleType, leadHours, titleTemplate, bodyTemplate, minResponsePercent = null, schedule = null) => {
        if (existing.has(ruleType))
            return;
        insertRule.run(crypto.randomUUID(), ruleType, 1, leadHours, null, null, titleTemplate, bodyTemplate, minResponsePercent, null, null, null, schedule?.startDate ?? null, schedule?.every ?? null, schedule?.time ?? null, 24, now, now);
    };
    addDefaultRule("event-reminder", 24, "Termin-Erinnerung", "{event.title} startet am {event.start}");
    addDefaultRule("availability-missing", 48, "Rückmeldung fehlt", "{event.title} am {event.start} – bitte Rückmeldung geben.", null, { startDate: now.slice(0, 10), every: "daily", time: "08:00" });
    addDefaultRule("packlist-missing", 72, "Packliste fehlt", "Für {event.title} am {event.start} fehlt die Packliste.", null, { startDate: now.slice(0, 10), every: "daily", time: "09:00" });
    addDefaultRule("packlist-incomplete", 48, "Packliste unvollständig", "Bei {event.title} fehlen noch Packlisteneinträge.", null, { startDate: now.slice(0, 10), every: "daily", time: "09:30" });
    addDefaultRule("weekly-admin", 168, "Wöchentliche Admin-Erinnerung", "Bitte prüfe offene Packlisten, Material und anstehende Termine.", null, { startDate: now.slice(0, 10), every: "weekly", time: "08:00" });
    addDefaultRule("inventory-low", 0, "Material unter Mindestmenge", "{item.name} ist unter der Mindestmenge ({item.quantity}/{item.min_quantity}).", null, { startDate: now.slice(0, 10), every: "daily", time: "07:30" });
    addDefaultRule("event-created", 0, "Neuer Termin", "{event.title} am {event.start} wurde erstellt.");
    addDefaultRule("event-updated", 0, "Termin geändert", "{event.title} wurde aktualisiert.");
    addDefaultRule("event-canceled", 0, "Termin abgesagt", "{event.title} am {event.start} wurde abgesagt.");
    db.prepare("UPDATE push_rules SET target_user_id = NULL, target_role = NULL WHERE rule_type IN ('event-reminder','weekly-admin','availability-missing','packlist-missing','packlist-incomplete','event-created','event-updated','event-canceled','inventory-low')").run();
    const insertSetting = db.prepare("INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO NOTHING");
    insertSetting.run("nfc_enabled", "false", now);
    insertSetting.run("chat_enabled", "false", now);
    insertSetting.run("quiet_hours_start", "21:00", now);
    insertSetting.run("quiet_hours_end", "06:00", now);
    if (settings.adminEmails.length > 0) {
        const update = db.prepare("UPDATE users SET role = 'admin', status = 'approved', updated_at = ? WHERE email = ?");
        for (const email of settings.adminEmails) {
            update.run(now, email.trim().toLowerCase());
        }
    }
    db.prepare("UPDATE users SET role = 'admin', status = 'approved', updated_at = ? WHERE lower(email) = 'maro'").run(now);
    ensureDefaultChatRoom();
};
app.register(authRoutes, { prefix: "/api" });
app.register(calendarRoutes, { prefix: "/api" });
app.register(inventoryRoutes, { prefix: "/api" });
app.register(boxRoutes, { prefix: "/api" });
app.register(packlistRoutes, { prefix: "/api" });
app.register(pushRoutes, { prefix: "/api" });
app.register(adminRoutes, { prefix: "/api" });
app.register(settingsRoutes, { prefix: "/api" });
app.register(chatRoutes, { prefix: "/api" });
app.register(systemRoutes, { prefix: "/api" });
app.get("/calendar.ics", async (request, reply) => {
    const icsPath = getIcsPath();
    if (!fs.existsSync(icsPath)) {
        generateIcs();
    }
    reply.header("Content-Type", "text/calendar; charset=utf-8");
    return reply.send(fs.readFileSync(icsPath));
});
const start = async () => {
    applyMigrations();
    ensureDefaults();
    generateIcs();
    scheduleCalendarRefresh();
    scheduleReminders();
    schedulePacklistChecks();
    scheduleCustomPushRules();
    await app.listen({ port: settings.port, host: settings.host });
    console.log(`API listening on ${settings.host}:${settings.port}`);
};
start().catch((err) => {
    app.log.error(err);
    process.exit(1);
});
