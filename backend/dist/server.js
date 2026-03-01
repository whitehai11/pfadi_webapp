/*
 ███╗   ███╗ █████╗ ██████╗  ██████╗
 ████╗ ████║██╔══██╗██╔══██╗██╔═══██╗
 ██╔████╔██║███████║██████╔╝██║   ██║
 ██║╚██╔╝██║██╔══██║██╔══██╗██║   ██║
 ██║ ╚═╝ ██║██║  ██║██║  ██║╚██████╔╝
 ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝

 engineered by Maro Elias Goth
*/
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
import { notificationRoutes } from "./api/notification.routes.js";
import { systemRoutes } from "./api/system.routes.js";
import { generateIcs, getIcsPath } from "./services/ics.service.js";
import { scheduleCalendarRefresh } from "./cron/calendar-refresh.cron.js";
import { scheduleReminders } from "./cron/reminders.cron.js";
import { schedulePacklistChecks } from "./cron/packlist-check.cron.js";
import { scheduleCustomPushRules } from "./cron/push-rules.cron.js";
import { ensureDefaultChatRoom } from "./services/chat.service.js";
import { createRateLimit } from "./utils/rate-limit.js";
import { logger } from "./utils/logger.js";
import { setupChatGateway } from "./ws/chat.gateway.js";
import { setupNotificationGateway } from "./ws/notification.gateway.js";
import { setupAdminGateway } from "./ws/admin/index.js";
import { recordApiMetric, recordSystemError } from "./services/admin-observability.service.js";
import { recordRequestMetric, startMetricsSamplers } from "./services/metrics-registry.service.js";
const appVersion = String(process.env.APP_VERSION ?? process.env.npm_package_version ?? "dev");
const appCommit = String(process.env.GIT_COMMIT ?? process.env.VITE_GIT_COMMIT ?? "dev");
const appEnvironment = String(settings.nodeEnv);
const app = Fastify({
    logger: {
        level: settings.logLevel,
        redact: {
            paths: [
                "req.headers.authorization",
                "req.headers.cookie",
                "req.body.password",
                "req.body.currentPassword",
                "req.body.newPassword",
                "res.headers['set-cookie']"
            ],
            remove: true
        }
    }
});
const parseOrigin = (value) => {
    try {
        return new URL(value).origin.toLowerCase();
    }
    catch {
        return null;
    }
};
const allowedOrigins = new Set();
for (const origin of settings.allowedOrigins) {
    const parsed = parseOrigin(origin);
    if (parsed) {
        allowedOrigins.add(parsed);
    }
}
const hasConfiguredOrigins = allowedOrigins.size > 0;
const allowAnyOriginForDev = settings.nodeEnv !== "production" && !hasConfiguredOrigins;
const isApiRequest = (request) => request.url.startsWith("/api");
const isMutatingMethod = (request) => request.method !== "GET" && request.method !== "HEAD" && request.method !== "OPTIONS";
const validateCsrf = (request) => {
    if (!isApiRequest(request) || !isMutatingMethod(request))
        return true;
    const originalAuthHeader = request.headers.authorization;
    const cookieToken = parseTokenFromCookie(request.headers.cookie);
    if (!cookieToken || originalAuthHeader) {
        return true;
    }
    const secFetchSite = request.headers["sec-fetch-site"];
    if (secFetchSite === "cross-site") {
        return false;
    }
    const origin = typeof request.headers.origin === "string" ? parseOrigin(request.headers.origin) : null;
    const referer = typeof request.headers.referer === "string" ? parseOrigin(request.headers.referer) : null;
    const candidate = origin ?? referer;
    if (!candidate)
        return false;
    if (allowAnyOriginForDev)
        return true;
    return allowedOrigins.has(candidate);
};
const parseTokenFromCookie = (cookieHeader) => {
    if (!cookieHeader)
        return null;
    const parts = cookieHeader.split(";").map((item) => item.trim());
    for (const part of parts) {
        if (!part.startsWith("pfadi_token="))
            continue;
        const value = part.slice("pfadi_token=".length).trim();
        if (!value)
            return null;
        try {
            return decodeURIComponent(value);
        }
        catch {
            return value;
        }
    }
    return null;
};
const normalizeApiResponse = (request, reply, payload) => {
    if (!request.url.startsWith("/api"))
        return payload;
    if (payload === null || payload === undefined) {
        return {
            success: reply.statusCode < 400,
            message: reply.statusCode < 400 ? "OK" : "Request failed"
        };
    }
    if (typeof payload !== "object")
        return payload;
    if (Buffer.isBuffer(payload))
        return payload;
    const body = payload;
    if (typeof body.success === "boolean" && typeof body.message === "string") {
        return payload;
    }
    if (reply.statusCode >= 400) {
        const message = (typeof body.message === "string" && body.message) ||
            (typeof body.error === "string" && body.error) ||
            "Request failed";
        return { success: false, message };
    }
    return {
        success: true,
        message: "OK",
        data: payload
    };
};
const resolveStatusCode = (error) => {
    const candidate = typeof error.statusCode === "number"
        ? Number(error.statusCode)
        : 500;
    if (candidate >= 400 && candidate < 600)
        return candidate;
    return 500;
};
app.register(helmet, {
    global: true,
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            connectSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "blob:"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            scriptSrcAttr: ["'none'"],
            workerSrc: ["'self'", "blob:"],
            fontSrc: ["'self'", "data:"],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            upgradeInsecureRequests: [],
            blockAllMixedContent: []
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
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type", "X-Requested-With"],
    origin: (origin, cb) => {
        if (!origin)
            return cb(null, true);
        if (allowAnyOriginForDev)
            return cb(null, true);
        const normalized = parseOrigin(origin);
        cb(null, Boolean(normalized && allowedOrigins.has(normalized)));
    }
});
app.register(jwt, { secret: settings.jwtSecret });
app.register(multipart, {
    limits: {
        files: 1,
        fileSize: settings.chatUploadMaxBytes
    }
});
const globalApiRateLimit = createRateLimit({
    bucket: "api-global",
    max: 600,
    windowMs: 5 * 60 * 1000,
    message: "Zu viele Anfragen. Bitte kurz warten."
});
app.addHook("onRequest", async (request, reply) => {
    reply.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    const tokenFromCookie = parseTokenFromCookie(request.headers.cookie);
    if (!validateCsrf(request)) {
        return reply.code(403).send({ success: false, message: "CSRF-Validierung fehlgeschlagen." });
    }
    if (!request.headers.authorization && tokenFromCookie) {
        if (isApiRequest(request)) {
            const secFetchSite = request.headers["sec-fetch-site"];
            if (secFetchSite === "cross-site") {
                return reply.code(403).send({ success: false, message: "Forbidden" });
            }
        }
        request.headers.authorization = `Bearer ${tokenFromCookie}`;
    }
});
app.addHook("preHandler", async (request, reply) => {
    if (!isApiRequest(request))
        return;
    if (request.method === "OPTIONS")
        return;
    await globalApiRateLimit(request, reply);
});
app.addHook("onResponse", async (request, reply) => {
    if (!isApiRequest(request))
        return;
    try {
        const endpoint = request.url.split("?")[0] || "/";
        const responseTimeMs = Number(reply.getResponseTime?.() ?? 0);
        recordApiMetric({
            endpoint,
            method: request.method,
            responseTimeMs: Number.isFinite(responseTimeMs) ? responseTimeMs : 0,
            statusCode: reply.statusCode
        });
        const user = request.user;
        recordRequestMetric({
            route: endpoint,
            method: request.method,
            statusCode: reply.statusCode,
            durationMs: Number.isFinite(responseTimeMs) ? responseTimeMs : 0,
            requestId: String(request.id ?? ""),
            userId: typeof user?.id === "string" ? user.id : null,
            ip: request.ip
        });
    }
    catch {
        // best effort only
    }
});
app.addHook("preSerialization", async (request, reply, payload) => normalizeApiResponse(request, reply, payload));
app.setErrorHandler((error, request, reply) => {
    request.log.error({ err: error }, "Unhandled request error");
    if (reply.sent)
        return;
    const statusCode = resolveStatusCode(error);
    const hasValidationIssue = Array.isArray(error.validation);
    const jwtError = typeof error.code === "string" && String(error.code).startsWith("FST_JWT_");
    const message = hasValidationIssue
        ? "Ungueltige Anfrage."
        : jwtError
            ? "Nicht autorisiert."
            : statusCode >= 500
                ? "Interner Serverfehler."
                : error.message || "Request failed";
    if (statusCode >= 500) {
        try {
            const user = request.user;
            const entry = recordSystemError({
                message: error.message || "Unhandled request error",
                stack: error.stack ?? null,
                route: request.url,
                userId: typeof user?.id === "string" ? user.id : null,
                severity: "error"
            });
            void entry;
        }
        catch {
            // best effort only
        }
    }
    reply.code(statusCode).send({ success: false, message });
});
app.setNotFoundHandler((request, reply) => {
    if (request.url.startsWith("/api")) {
        return reply.code(404).send({ success: false, message: "Route nicht gefunden." });
    }
    return reply.code(404).type("text/plain; charset=utf-8").send("Not Found");
});
app.get("/healthz", async (_request, reply) => {
    try {
        db.prepare("SELECT 1 as ok").get();
        reply.code(shuttingDown ? 503 : 200);
        return {
            status: shuttingDown ? "shutting_down" : "ok",
            uptimeSeconds: Math.floor(process.uptime())
        };
    }
    catch {
        reply.code(503);
        return {
            status: "degraded",
            uptimeSeconds: Math.floor(process.uptime())
        };
    }
});
app.get("/api/health", async (_request, reply) => {
    try {
        db.prepare("SELECT 1 as ok").get();
        reply.code(shuttingDown ? 503 : 200);
        return {
            status: shuttingDown ? "shutting_down" : "ok",
            uptimeSeconds: Math.floor(process.uptime())
        };
    }
    catch {
        reply.code(503);
        return {
            status: "degraded",
            uptimeSeconds: Math.floor(process.uptime())
        };
    }
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
app.register(notificationRoutes, { prefix: "/api" });
app.register(systemRoutes, { prefix: "/api" });
const chatGateway = setupChatGateway(app);
const notificationGateway = setupNotificationGateway(app);
const adminMonitorGateway = setupAdminGateway(app);
app.get("/calendar.ics", async (request, reply) => {
    const icsPath = getIcsPath();
    if (!fs.existsSync(icsPath)) {
        generateIcs();
    }
    reply.header("Content-Type", "text/calendar; charset=utf-8");
    return reply.send(fs.readFileSync(icsPath));
});
const scheduledTasks = [];
let shuttingDown = false;
let shutdownInProgress = false;
const gracefulShutdown = async (signal, exitCode = 0) => {
    if (shutdownInProgress)
        return;
    shutdownInProgress = true;
    shuttingDown = true;
    const forceExitTimeout = setTimeout(() => {
        logger.fatal("Forced process exit due to shutdown timeout", { signal, timeoutMs: settings.shutdownTimeoutMs });
        process.exit(1);
    }, settings.shutdownTimeoutMs);
    forceExitTimeout.unref();
    try {
        logger.info("Graceful shutdown started", { signal });
        for (const task of scheduledTasks) {
            try {
                task.stop();
            }
            catch (error) {
                logger.warn("Failed to stop scheduled task", {
                    signal,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
        try {
            chatGateway.close();
        }
        catch (error) {
            logger.warn("Failed to stop chat gateway", {
                signal,
                error: error instanceof Error ? error.message : String(error)
            });
        }
        try {
            notificationGateway.close();
        }
        catch (error) {
            logger.warn("Failed to stop notification gateway", {
                signal,
                error: error instanceof Error ? error.message : String(error)
            });
        }
        try {
            adminMonitorGateway.close();
        }
        catch (error) {
            logger.warn("Failed to stop admin monitor gateway", {
                signal,
                error: error instanceof Error ? error.message : String(error)
            });
        }
        await app.close();
        db.close();
        logger.info("Graceful shutdown complete", { signal });
        process.exit(exitCode);
    }
    catch (error) {
        logger.fatal("Graceful shutdown failed", {
            signal,
            error: error instanceof Error ? error.message : String(error)
        });
        process.exit(1);
    }
};
const start = async () => {
    try {
        applyMigrations();
        ensureDefaults();
        generateIcs();
        scheduledTasks.push(scheduleCalendarRefresh());
        scheduledTasks.push(scheduleReminders());
        scheduledTasks.push(schedulePacklistChecks());
        scheduledTasks.push(scheduleCustomPushRules());
        scheduledTasks.push(startMetricsSamplers());
    }
    catch (error) {
        logger.fatal("Startup initialization failed", {
            error: error instanceof Error ? error.message : String(error)
        });
        throw error;
    }
    await app.listen({ port: settings.port, host: settings.host });
    console.log(`Pfadi Orga API v${appVersion} (commit ${appCommit}) — ${appEnvironment}`);
    console.log("engineered by Maro Elias Goth");
    app.log.info({ host: settings.host, port: settings.port }, "API listening");
};
process.on("SIGTERM", () => {
    void gracefulShutdown("SIGTERM");
});
process.on("SIGINT", () => {
    void gracefulShutdown("SIGINT");
});
process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled promise rejection", {
        reason: reason instanceof Error ? reason.message : String(reason)
    });
    try {
        const entry = recordSystemError({
            message: reason instanceof Error ? reason.message : "Unhandled promise rejection",
            stack: reason instanceof Error ? reason.stack ?? null : null,
            route: "process:unhandledRejection",
            severity: "fatal"
        });
        void entry;
    }
    catch {
        // ignore
    }
    void gracefulShutdown("unhandledRejection", 1);
});
process.on("uncaughtException", (error) => {
    logger.fatal("Uncaught exception", { error: error.message });
    try {
        const entry = recordSystemError({
            message: error.message,
            stack: error.stack ?? null,
            route: "process:uncaughtException",
            severity: "fatal"
        });
        void entry;
    }
    catch {
        // ignore
    }
    void gracefulShutdown("uncaughtException", 1);
});
start().catch((err) => {
    app.log.error(err);
    process.exit(1);
});
