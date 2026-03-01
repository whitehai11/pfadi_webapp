import { z } from "zod";
import { randomUUID } from "node:crypto";
import { db, nowIso } from "../db/database.js";
import { requireAdmin } from "../utils/guards.js";
import { hashPassword } from "../utils/auth.js";
import { createRateLimit, rateLimitKeyByUserOrIp } from "../utils/rate-limit.js";
import { getCustomPushRule, sendCustomPushRule } from "../services/push-rules.service.js";
import { deleteUserAvatar, getAvatarPublicUrl } from "../services/avatar.service.js";
import { settings } from "../config/settings.js";
import { getAdminStatsController } from "./admin-stats.controller.js";
import { getAdminDockerStatus, getAdminJobDashboard, getAdminSystemMonitor, getAdminWebsocketDashboard, getDbHealth, restartDockerServices, saveFeatureFlags } from "../services/admin-system.service.js";
import { listAuditLogs, writeAuditLog } from "../services/audit-log.service.js";
import { getApiHeatmap, getQueueMonitor, getRedisMonitor, listSystemErrors, resolveSystemError } from "../services/admin-observability.service.js";
import { createAlert, getMetricsReport, getMetricsSummary, getMetricTimeseries, listAlerts, recordQueueRetry, testAlerts } from "../services/metrics-registry.service.js";
import { runCalendarRefreshJob } from "../cron/calendar-refresh.cron.js";
import { runRemindersJob } from "../cron/reminders.cron.js";
import { runPacklistCheckJob } from "../cron/packlist-check.cron.js";
import { runCustomPushRulesJob } from "../cron/push-rules.cron.js";
import { publishAdminQueue } from "../services/admin-stream.service.js";
import { dateSchema, passwordSchema, parseOrReply, textField, timeSchema, usernameSchema, uuidParamSchema } from "../utils/validation.js";
const settingKeySchema = z.enum(["nfc_enabled", "chat_enabled", "quiet_hours_start", "quiet_hours_end"]);
const settingSchema = z
    .object({
    key: settingKeySchema,
    value: z.string().max(120)
})
    .strict()
    .superRefine((value, ctx) => {
    if ((value.key === "nfc_enabled" || value.key === "chat_enabled") && !["true", "false"].includes(value.value)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "boolean expected" });
    }
    if ((value.key === "quiet_hours_start" || value.key === "quiet_hours_end") &&
        !timeSchema.safeParse(value.value).success) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "time expected" });
    }
});
const idParamsSchema = z.object({ id: uuidParamSchema }).strict();
const jobIdParamsSchema = z.object({ id: z.enum(["calendar-refresh", "reminders", "packlist-check", "custom-push-rules"]) }).strict();
const queueRetryParamsSchema = z.object({ jobId: z.string().trim().min(1).max(120) }).strict();
const userListQuerySchema = z
    .object({
    role: z.string().trim().toLowerCase().optional()
})
    .strict();
const errorListQuerySchema = z
    .object({
    page: z.coerce.number().int().min(1).optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
    severity: z.string().trim().max(20).optional(),
    resolved: z.enum(["true", "false"]).optional()
})
    .strict();
const featureFlagsSchema = z
    .object({
    flags: z
        .array(z
        .object({
        key: z.enum(["chat_enabled", "nfc_enabled"]),
        enabled: z.boolean()
    })
        .strict())
        .min(1)
        .max(20)
})
    .strict();
const metricsTimeseriesQuerySchema = z
    .object({
    metric: z.string().trim().min(1).max(120),
    range: z.string().trim().regex(/^\d+(m|h|d)$/i).optional()
})
    .strict();
const metricsReportQuerySchema = z
    .object({
    format: z.enum(["json", "csv"]).default("json")
})
    .strict();
const alertCreateSchema = z
    .object({
    name: z.string().trim().min(2).max(120),
    metric: z.string().trim().min(2).max(120),
    operator: z.enum(["gt", "lt"]),
    threshold: z.number().finite(),
    windowSeconds: z.number().int().min(30).max(86400).default(300),
    isActive: z.boolean().default(true)
})
    .strict();
const auditLogQuerySchema = z
    .object({
    page: z.coerce.number().int().min(1).optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
    user: z.string().trim().max(120).optional(),
    action: z.string().trim().max(120).optional(),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
    search: z.string().trim().max(200).optional()
})
    .strict();
const roleSchema = z
    .object({
    role: z.enum(["admin", "user", "materialwart"])
})
    .strict();
const bootstrapSchema = z
    .object({
    username: usernameSchema,
    password: passwordSchema.optional()
})
    .strict();
const statusSchema = z
    .object({
    status: z.enum(["approved", "rejected"]),
    role: z.enum(["admin", "user", "materialwart"]).optional()
})
    .strict();
const customPushRuleSchema = z
    .object({
    title: textField(160),
    message: textField(1200),
    notification_type: z.enum(["instant", "recurring"]).default("instant"),
    target_type: z.enum(["all", "role", "user"]).default("all"),
    target_id: z.string().trim().max(120).optional().nullable(),
    is_active: z.boolean().default(true),
    interval_value: z.number().int().min(1).max(24 * 365).optional().nullable(),
    interval_unit: z.enum(["hours", "days", "weeks"]).optional().nullable(),
    start_date: dateSchema.optional().nullable(),
    end_date: dateSchema.optional().nullable()
})
    .strict()
    .superRefine((value, ctx) => {
    if (value.target_type !== "all" && (!value.target_id || value.target_id.trim().length === 0)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "target required", path: ["target_id"] });
    }
    if (value.notification_type === "recurring") {
        if (!value.interval_value || !value.interval_unit) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "interval required", path: ["interval_value"] });
        }
        if (value.start_date && value.end_date && value.end_date < value.start_date) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "invalid date range", path: ["end_date"] });
        }
    }
});
const mapCustomPushRule = (input) => {
    const notificationType = input.notification_type ?? "instant";
    const targetType = input.target_type ?? "all";
    const isActive = input.is_active ?? true;
    const recurring = notificationType === "recurring";
    return {
        rule_type: "custom-notification",
        enabled: isActive ? 1 : 0,
        lead_time_hours: 0,
        target_user_id: targetType === "user" ? (input.target_id ?? null) : null,
        target_role: targetType === "role" ? (input.target_id ?? null) : null,
        title_template: null,
        body_template: null,
        min_response_percent: null,
        event_type: null,
        send_start: null,
        send_end: null,
        schedule_start_date: null,
        schedule_every: null,
        schedule_time: null,
        cooldown_hours: 0,
        title: String(input.title ?? "").trim(),
        message: String(input.message ?? "").trim(),
        notification_type: notificationType,
        target_type: targetType,
        target_id: targetType === "all" ? null : (input.target_id ?? null),
        is_recurring: recurring ? 1 : 0,
        interval_value: recurring ? (input.interval_value ?? 1) : null,
        interval_unit: recurring ? (input.interval_unit ?? "days") : null,
        start_date: recurring ? (input.start_date ?? null) : null,
        end_date: recurring ? (input.end_date ?? null) : null,
        is_active: isActive ? 1 : 0
    };
};
const manualSendRateLimit = createRateLimit({
    bucket: "admin-push-send",
    max: 12,
    windowMs: 60 * 60 * 1000,
    message: "Zu viele manuelle Push-Sendungen. Bitte spaeter erneut versuchen.",
    keyGenerator: rateLimitKeyByUserOrIp
});
const bootstrapRateLimit = createRateLimit({
    bucket: "admin-bootstrap",
    max: 10,
    windowMs: 60 * 60 * 1000,
    message: "Zu viele Bootstrap-Versuche. Bitte spaeter erneut versuchen."
});
const adminCount = () => {
    const row = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get();
    return Number(row.count ?? 0);
};
const getActorUserId = (request) => {
    const user = request.user;
    const id = user?.id;
    return typeof id === "string" && id.trim() ? id.trim() : null;
};
export const adminRoutes = async (app) => {
    app.get("/admin/stats", { preHandler: requireAdmin }, getAdminStatsController);
    app.get("/admin/system", { preHandler: requireAdmin }, async () => {
        return getAdminSystemMonitor();
    });
    app.get("/admin/jobs", { preHandler: requireAdmin }, async () => {
        return { jobs: getAdminJobDashboard() };
    });
    app.post("/admin/jobs/run/:id", { preHandler: requireAdmin }, async (request, reply) => {
        const params = parseOrReply(reply, jobIdParamsSchema, request.params);
        if (!params)
            return;
        try {
            if (params.id === "calendar-refresh")
                await runCalendarRefreshJob();
            if (params.id === "reminders")
                await runRemindersJob();
            if (params.id === "packlist-check")
                await runPacklistCheckJob();
            if (params.id === "custom-push-rules")
                await runCustomPushRulesJob();
            writeAuditLog({
                actorUserId: getActorUserId(request),
                action: "admin.jobs.run",
                targetType: "job",
                targetId: params.id
            });
            return { ok: true };
        }
        catch (error) {
            return reply.code(500).send({
                success: false,
                message: error instanceof Error ? error.message : "Job konnte nicht ausgefuehrt werden."
            });
        }
    });
    app.get("/admin/docker", { preHandler: requireAdmin }, async () => {
        return getAdminDockerStatus();
    });
    app.post("/admin/docker/restart", { preHandler: requireAdmin }, async (request, reply) => {
        try {
            const result = await restartDockerServices();
            writeAuditLog({
                actorUserId: getActorUserId(request),
                action: "admin.docker.restart",
                targetType: "docker",
                targetId: "compose"
            });
            return result;
        }
        catch (error) {
            return reply.code(503).send({
                success: false,
                message: error instanceof Error ? error.message : "Docker restart fehlgeschlagen."
            });
        }
    });
    app.get("/admin/websocket", { preHandler: requireAdmin }, async () => {
        return getAdminWebsocketDashboard();
    });
    app.get("/admin/queue", { preHandler: requireAdmin }, async () => {
        return getQueueMonitor();
    });
    app.post("/admin/queue/retry/:jobId", { preHandler: requireAdmin }, async (request, reply) => {
        const params = parseOrReply(reply, queueRetryParamsSchema, request.params);
        if (!params)
            return;
        const id = params.jobId;
        try {
            if (id === "calendar-refresh")
                await runCalendarRefreshJob();
            else if (id === "reminders")
                await runRemindersJob();
            else if (id === "packlist-check")
                await runPacklistCheckJob();
            else if (id === "custom-push-rules")
                await runCustomPushRulesJob();
            else
                return reply.code(404).send({ success: false, message: "Job nicht gefunden." });
            recordQueueRetry();
            const snapshot = getQueueMonitor();
            publishAdminQueue(snapshot);
            writeAuditLog({
                actorUserId: getActorUserId(request),
                action: "admin.queue.retry",
                entityType: "queue_job",
                entityId: id,
                ipAddress: request.ip,
                userAgent: String(request.headers["user-agent"] ?? "")
            });
            return { ok: true };
        }
        catch (error) {
            return reply.code(500).send({
                success: false,
                message: error instanceof Error ? error.message : "Retry fehlgeschlagen."
            });
        }
    });
    app.get("/admin/redis", { preHandler: requireAdmin }, async () => {
        return getRedisMonitor();
    });
    app.post("/admin/feature-flags", { preHandler: requireAdmin }, async (request, reply) => {
        const parsed = parseOrReply(reply, featureFlagsSchema, request.body);
        if (!parsed)
            return;
        const result = saveFeatureFlags(parsed.flags);
        writeAuditLog({
            actorUserId: getActorUserId(request),
            action: "admin.feature-flags.update",
            targetType: "settings",
            metadata: { flags: parsed.flags }
        });
        return result;
    });
    app.get("/admin/db-health", { preHandler: requireAdmin }, async () => {
        return getDbHealth();
    });
    app.get("/admin/audit-logs", { preHandler: requireAdmin }, async (request, reply) => {
        const query = parseOrReply(reply, auditLogQuerySchema, request.query ?? {});
        if (!query)
            return;
        return listAuditLogs(query);
    });
    app.get("/admin/security/audit", { preHandler: requireAdmin }, async (request, reply) => {
        const query = parseOrReply(reply, auditLogQuerySchema, request.query ?? {});
        if (!query)
            return;
        return listAuditLogs(query);
    });
    app.get("/admin/errors", { preHandler: requireAdmin }, async (request, reply) => {
        const query = parseOrReply(reply, errorListQuerySchema, request.query ?? {});
        if (!query)
            return;
        return listSystemErrors(query);
    });
    app.post("/admin/errors/:id/resolve", { preHandler: requireAdmin }, async (request, reply) => {
        const params = parseOrReply(reply, idParamsSchema, request.params);
        if (!params)
            return;
        const ok = resolveSystemError(params.id);
        if (!ok)
            return reply.code(404).send({ success: false, message: "Eintrag nicht gefunden." });
        writeAuditLog({
            actorUserId: getActorUserId(request),
            action: "admin.errors.resolve",
            entityType: "error",
            entityId: params.id,
            ipAddress: request.ip,
            userAgent: String(request.headers["user-agent"] ?? "")
        });
        return { ok: true };
    });
    app.get("/admin/metrics/api-heatmap", { preHandler: requireAdmin }, async () => {
        return { items: getApiHeatmap() };
    });
    app.get("/admin/metrics/summary", { preHandler: requireAdmin }, async () => {
        return getMetricsSummary();
    });
    app.get("/admin/metrics/timeseries", { preHandler: requireAdmin }, async (request, reply) => {
        const query = parseOrReply(reply, metricsTimeseriesQuerySchema, request.query ?? {});
        if (!query)
            return;
        return getMetricTimeseries(query.metric, query.range);
    });
    app.get("/admin/metrics/report", { preHandler: requireAdmin }, async (request, reply) => {
        const query = parseOrReply(reply, metricsReportQuerySchema, request.query ?? {});
        if (!query)
            return;
        const format = query.format ?? "json";
        const content = getMetricsReport(format);
        const ext = format === "csv" ? "csv" : "json";
        reply.header("Content-Type", format === "csv" ? "text/csv; charset=utf-8" : "application/json; charset=utf-8");
        reply.header("Content-Disposition", `attachment; filename=\"pfadi-observability-report.${ext}\"`);
        return reply.send(content);
    });
    app.post("/admin/alerts", { preHandler: requireAdmin }, async (request, reply) => {
        const parsed = parseOrReply(reply, alertCreateSchema, request.body);
        if (!parsed)
            return;
        const alert = createAlert({
            name: parsed.name,
            metric: parsed.metric,
            operator: parsed.operator,
            threshold: parsed.threshold,
            windowSeconds: parsed.windowSeconds ?? 300,
            isActive: parsed.isActive ?? true
        });
        writeAuditLog({
            actorUserId: getActorUserId(request),
            action: "admin.alert.create",
            entityType: "alert_threshold",
            entityId: alert.id,
            ipAddress: request.ip,
            userAgent: String(request.headers["user-agent"] ?? ""),
            metadata: { metric: alert.metric, operator: alert.operator, threshold: alert.threshold }
        });
        return reply.code(201).send(alert);
    });
    app.get("/admin/alerts", { preHandler: requireAdmin }, async () => {
        return { items: listAlerts() };
    });
    app.post("/admin/alerts/test", { preHandler: requireAdmin }, async (request) => {
        const result = testAlerts();
        writeAuditLog({
            actorUserId: getActorUserId(request),
            action: "admin.alert.test",
            entityType: "alert_threshold"
        });
        return result;
    });
    app.post("/admin/bootstrap", { preHandler: bootstrapRateLimit }, async (request, reply) => {
        const parsed = parseOrReply(reply, bootstrapSchema, request.body);
        if (!parsed)
            return;
        if (adminCount() > 0) {
            return reply.code(409).send({ success: false, message: "Bootstrap deaktiviert: Admin existiert bereits." });
        }
        const bootstrapToken = String(request.headers["x-bootstrap-token"] || "").trim();
        if (!settings.adminBootstrapToken) {
            return reply.code(503).send({ success: false, message: "Bootstrap ist nicht konfiguriert." });
        }
        if (!bootstrapToken || bootstrapToken !== settings.adminBootstrapToken) {
            return reply.code(403).send({ success: false, message: "Ungueltiger Bootstrap-Token." });
        }
        const normalized = parsed.username.trim().toLowerCase();
        const now = nowIso();
        const existing = db
            .prepare("SELECT id FROM users WHERE lower(email) = ?")
            .get(normalized);
        if (existing) {
            db.prepare("UPDATE users SET role = 'admin', status = 'approved', updated_at = ? WHERE id = ?").run(now, existing.id);
            writeAuditLog({
                actorUserId: null,
                action: "admin.bootstrap.promote-existing",
                targetType: "user",
                targetId: existing.id,
                metadata: { username: normalized }
            });
            return reply.send({
                success: true,
                message: "Erster Admin gesetzt.",
                data: { id: existing.id, username: normalized }
            });
        }
        if (!parsed.password) {
            return reply.code(400).send({
                success: false,
                message: "Passwort erforderlich, wenn der Benutzer noch nicht existiert."
            });
        }
        const id = randomUUID();
        const passwordHash = await hashPassword(parsed.password);
        db.prepare("INSERT INTO users (id, email, password_hash, role, status, created_at, updated_at) VALUES (?, ?, ?, 'admin', 'approved', ?, ?)").run(id, normalized, passwordHash, now, now);
        writeAuditLog({
            actorUserId: null,
            action: "admin.bootstrap.create-admin",
            targetType: "user",
            targetId: id,
            metadata: { username: normalized }
        });
        return reply.code(201).send({
            success: true,
            message: "Erster Admin erstellt.",
            data: { id, username: normalized }
        });
    });
    app.get("/admin/users", { preHandler: requireAdmin }, async (request, reply) => {
        const query = parseOrReply(reply, userListQuerySchema, request.query ?? {});
        if (!query)
            return;
        const normalizedRole = query.role ? query.role.toLowerCase() : null;
        const roleFilter = !normalizedRole || normalizedRole === "all" || normalizedRole === "alle" ? null : normalizedRole;
        if (roleFilter) {
            const rows = db
                .prepare("SELECT id, email, role, status, avatar_updated_at, created_at FROM users WHERE lower(role) = ? ORDER BY created_at DESC, email ASC")
                .all(roleFilter);
            return rows.map((row) => ({
                ...row,
                avatar_url: getAvatarPublicUrl(row.id, row.avatar_updated_at)
            }));
        }
        const rows = db
            .prepare("SELECT id, email, role, status, avatar_updated_at, created_at FROM users ORDER BY created_at DESC, email ASC")
            .all();
        return rows.map((row) => ({
            ...row,
            avatar_url: getAvatarPublicUrl(row.id, row.avatar_updated_at)
        }));
    });
    app.get("/admin/user-requests", { preHandler: requireAdmin }, async () => {
        const rows = db
            .prepare("SELECT id, email, role, status, created_at FROM users WHERE status = 'pending' ORDER BY created_at ASC")
            .all();
        return rows.map((row) => ({
            ...row,
            avatar_url: null
        }));
    });
    app.delete("/admin/users/:id/avatar", { preHandler: requireAdmin }, async (request, reply) => {
        const params = parseOrReply(reply, idParamsSchema, request.params);
        if (!params)
            return;
        try {
            await deleteUserAvatar(params.id);
            return reply.send({ ok: true });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Avatar konnte nicht entfernt werden.";
            return reply.code(400).send({ error: message });
        }
    });
    app.put("/admin/users/:id/role", { preHandler: requireAdmin }, async (request, reply) => {
        const params = parseOrReply(reply, idParamsSchema, request.params);
        const parsed = parseOrReply(reply, roleSchema, request.body);
        if (!params || !parsed)
            return;
        const now = nowIso();
        const result = db.prepare("UPDATE users SET role = ?, updated_at = ? WHERE id = ?").run(parsed.role, now, params.id);
        if (result.changes === 0) {
            return reply.code(404).send({ error: "Not found" });
        }
        writeAuditLog({
            actorUserId: getActorUserId(request),
            action: "admin.user.role.update",
            targetType: "user",
            targetId: params.id,
            metadata: { role: parsed.role }
        });
        return reply.send({ ok: true });
    });
    app.put("/admin/users/:id/status", { preHandler: requireAdmin }, async (request, reply) => {
        const params = parseOrReply(reply, idParamsSchema, request.params);
        const parsed = parseOrReply(reply, statusSchema, request.body);
        if (!params || !parsed)
            return;
        const now = nowIso();
        const result = db
            .prepare("UPDATE users SET status = ?, role = COALESCE(?, role), updated_at = ? WHERE id = ?")
            .run(parsed.status, parsed.role ?? null, now, params.id);
        if (result.changes === 0) {
            return reply.code(404).send({ error: "Not found" });
        }
        writeAuditLog({
            actorUserId: getActorUserId(request),
            action: "admin.user.status.update",
            targetType: "user",
            targetId: params.id,
            metadata: { status: parsed.status, role: parsed.role ?? null }
        });
        return reply.send({ ok: true });
    });
    app.post("/admin/users/:id/force-logout", { preHandler: requireAdmin }, async (request, reply) => {
        const params = parseOrReply(reply, idParamsSchema, request.params);
        if (!params)
            return;
        const now = nowIso();
        const result = db
            .prepare("UPDATE users SET force_logout_after = ?, updated_at = ? WHERE id = ?")
            .run(now, now, params.id);
        if (result.changes === 0) {
            return reply.code(404).send({ error: "Not found" });
        }
        writeAuditLog({
            actorUserId: getActorUserId(request),
            action: "admin.user.force-logout",
            targetType: "user",
            targetId: params.id
        });
        return reply.send({ ok: true, forced_at: now });
    });
    app.delete("/admin/users/:id", { preHandler: requireAdmin }, async (request, reply) => {
        const params = parseOrReply(reply, idParamsSchema, request.params);
        if (!params)
            return;
        const actor = request.user;
        if (params.id === actor.id) {
            return reply.code(409).send({ error: "Eigenes Konto kann nicht geloescht werden." });
        }
        const user = db
            .prepare("SELECT id, role FROM users WHERE id = ?")
            .get(params.id);
        if (!user) {
            return reply.code(404).send({ error: "Not found" });
        }
        if (user.role === "admin") {
            const adminCount = db
                .prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND status = 'approved'")
                .get();
            if (Number(adminCount.count) <= 1) {
                return reply.code(409).send({ error: "Letzter Admin kann nicht geloescht werden." });
            }
        }
        const result = db.prepare("DELETE FROM users WHERE id = ?").run(params.id);
        if (result.changes === 0) {
            return reply.code(404).send({ error: "Not found" });
        }
        writeAuditLog({
            actorUserId: getActorUserId(request),
            action: "admin.user.delete",
            targetType: "user",
            targetId: params.id
        });
        return reply.code(204).send();
    });
    app.get("/admin/settings", { preHandler: requireAdmin }, async () => {
        return db.prepare("SELECT key, value, updated_at FROM settings ORDER BY key ASC").all();
    });
    app.put("/admin/settings", { preHandler: requireAdmin }, async (request, reply) => {
        const parsed = parseOrReply(reply, z.array(settingSchema).max(20), request.body);
        if (!parsed)
            return;
        const now = nowIso();
        const insert = db.prepare("INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at");
        const transaction = db.transaction(() => {
            for (const item of parsed) {
                insert.run(item.key, item.value, now);
            }
        });
        transaction();
        writeAuditLog({
            actorUserId: getActorUserId(request),
            action: "admin.settings.update",
            targetType: "settings",
            metadata: { count: parsed.length }
        });
        return reply.send({ ok: true });
    });
    app.get("/admin/push-rules", { preHandler: requireAdmin }, async () => {
        return db.prepare("SELECT * FROM push_rules ORDER BY created_at DESC, rule_type ASC").all();
    });
    app.post("/admin/push-rules", { preHandler: requireAdmin }, async (request, reply) => {
        const parsed = parseOrReply(reply, customPushRuleSchema, request.body);
        if (!parsed)
            return;
        const mapped = mapCustomPushRule(parsed);
        const now = nowIso();
        const id = randomUUID();
        db.prepare(`INSERT INTO push_rules (
        id, rule_type, enabled, lead_time_hours, target_user_id, target_role, title_template, body_template,
        min_response_percent, event_type, send_start, send_end, schedule_start_date, schedule_every, schedule_time,
        cooldown_hours, title, message, notification_type, target_type, target_id, is_recurring, interval_value,
        interval_unit, start_date, end_date, last_sent_at, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, mapped.rule_type, mapped.enabled, mapped.lead_time_hours, mapped.target_user_id, mapped.target_role, mapped.title_template, mapped.body_template, mapped.min_response_percent, mapped.event_type, mapped.send_start, mapped.send_end, mapped.schedule_start_date, mapped.schedule_every, mapped.schedule_time, mapped.cooldown_hours, mapped.title, mapped.message, mapped.notification_type, mapped.target_type, mapped.target_id, mapped.is_recurring, mapped.interval_value, mapped.interval_unit, mapped.start_date, mapped.end_date, null, mapped.is_active, now, now);
        writeAuditLog({
            actorUserId: getActorUserId(request),
            action: "admin.push-rule.create",
            targetType: "push_rule",
            targetId: id
        });
        return reply.code(201).send({ id });
    });
    app.put("/admin/push-rules/:id", { preHandler: requireAdmin }, async (request, reply) => {
        const params = parseOrReply(reply, idParamsSchema, request.params);
        const parsed = parseOrReply(reply, customPushRuleSchema, request.body);
        if (!params || !parsed)
            return;
        const mapped = mapCustomPushRule(parsed);
        const now = nowIso();
        const result = db
            .prepare(`UPDATE push_rules SET
          rule_type = ?, enabled = ?, lead_time_hours = ?, target_user_id = ?, target_role = ?, title_template = ?,
          body_template = ?, min_response_percent = ?, event_type = ?, send_start = ?, send_end = ?, schedule_start_date = ?,
          schedule_every = ?, schedule_time = ?, cooldown_hours = ?, title = ?, message = ?, notification_type = ?,
          target_type = ?, target_id = ?, is_recurring = ?, interval_value = ?, interval_unit = ?, start_date = ?,
          end_date = ?, is_active = ?, updated_at = ? WHERE id = ? AND rule_type = 'custom-notification'`)
            .run(mapped.rule_type, mapped.enabled, mapped.lead_time_hours, mapped.target_user_id, mapped.target_role, mapped.title_template, mapped.body_template, mapped.min_response_percent, mapped.event_type, mapped.send_start, mapped.send_end, mapped.schedule_start_date, mapped.schedule_every, mapped.schedule_time, mapped.cooldown_hours, mapped.title, mapped.message, mapped.notification_type, mapped.target_type, mapped.target_id, mapped.is_recurring, mapped.interval_value, mapped.interval_unit, mapped.start_date, mapped.end_date, mapped.is_active, now, params.id);
        if (result.changes === 0) {
            return reply.code(404).send({ error: "Not found" });
        }
        writeAuditLog({
            actorUserId: getActorUserId(request),
            action: "admin.push-rule.update",
            targetType: "push_rule",
            targetId: params.id
        });
        return reply.send({ ok: true });
    });
    app.delete("/admin/push-rules/:id", { preHandler: requireAdmin }, async (request, reply) => {
        const params = parseOrReply(reply, idParamsSchema, request.params);
        if (!params)
            return;
        const result = db.prepare("DELETE FROM push_rules WHERE id = ?").run(params.id);
        if (result.changes === 0) {
            return reply.code(404).send({ error: "Not found" });
        }
        writeAuditLog({
            actorUserId: getActorUserId(request),
            action: "admin.push-rule.delete",
            targetType: "push_rule",
            targetId: params.id
        });
        return reply.code(204).send();
    });
    app.post("/admin/push-rules/:id/send", { preHandler: [requireAdmin, manualSendRateLimit] }, async (request, reply) => {
        const params = parseOrReply(reply, idParamsSchema, request.params);
        if (!params)
            return;
        const rule = getCustomPushRule(params.id);
        if (!rule) {
            return reply.code(404).send({ error: "Not found" });
        }
        if (!rule.is_active) {
            return reply.code(409).send({ error: "Regel ist deaktiviert." });
        }
        const result = await sendCustomPushRule(rule);
        writeAuditLog({
            actorUserId: getActorUserId(request),
            action: "admin.push-rule.send-now",
            targetType: "push_rule",
            targetId: params.id
        });
        return reply.send({ ok: true, delivered: result.delivered, skipped: result.skipped, last_sent_at: result.lastSentAt });
    });
};
