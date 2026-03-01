// engineered by Maro Elias Goth
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { db, nowIso } from "../db/database.js";
import { requireAdmin } from "../utils/guards.js";
import { hashPassword } from "../utils/auth.js";
import { createRateLimit, rateLimitKeyByUserOrIp } from "../utils/rate-limit.js";
import { getCustomPushRule, sendCustomPushRule } from "../services/push-rules.service.js";
import { deleteUserAvatar, getAvatarPublicUrl } from "../services/avatar.service.js";
import { settings } from "../config/settings.js";
import {
  dateSchema,
  passwordSchema,
  parseOrReply,
  textField,
  timeSchema,
  usernameSchema,
  uuidParamSchema
} from "../utils/validation.js";

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
    if (
      (value.key === "quiet_hours_start" || value.key === "quiet_hours_end") &&
      !timeSchema.safeParse(value.value).success
    ) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "time expected" });
    }
  });

const idParamsSchema = z.object({ id: uuidParamSchema }).strict();
const userListQuerySchema = z
  .object({
    role: z.string().trim().toLowerCase().optional()
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

const mapCustomPushRule = (
  input: Partial<
    z.infer<typeof customPushRuleSchema> & {
      title: string;
      message: string;
    }
  >
) => {
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
  } as const;
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
  const row = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get() as { count: number };
  return Number(row.count ?? 0);
};

export const adminRoutes = async (app: FastifyInstance) => {
  app.post("/admin/bootstrap", { preHandler: bootstrapRateLimit }, async (request, reply) => {
    const parsed = parseOrReply(reply, bootstrapSchema, request.body);
    if (!parsed) return;

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
      .get(normalized) as { id: string } | undefined;

    if (existing) {
      db.prepare("UPDATE users SET role = 'admin', status = 'approved', updated_at = ? WHERE id = ?").run(
        now,
        existing.id
      );
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
    db.prepare(
      "INSERT INTO users (id, email, password_hash, role, status, created_at, updated_at) VALUES (?, ?, ?, 'admin', 'approved', ?, ?)"
    ).run(id, normalized, passwordHash, now, now);

    return reply.code(201).send({
      success: true,
      message: "Erster Admin erstellt.",
      data: { id, username: normalized }
    });
  });

  app.get("/admin/users", { preHandler: requireAdmin }, async (request, reply) => {
    const query = parseOrReply(reply, userListQuerySchema, request.query ?? {});
    if (!query) return;

    const normalizedRole = query.role ? query.role.toLowerCase() : null;
    const roleFilter = !normalizedRole || normalizedRole === "all" || normalizedRole === "alle" ? null : normalizedRole;

    if (roleFilter) {
      const rows = db
        .prepare(
          "SELECT id, email, role, status, avatar_updated_at, created_at FROM users WHERE lower(role) = ? ORDER BY created_at DESC, email ASC"
        )
        .all(roleFilter) as Array<{
        id: string;
        email: string;
        role: string;
        status: string;
        avatar_updated_at: string | null;
        created_at: string;
      }>;
      return rows.map((row) => ({
        ...row,
        avatar_url: getAvatarPublicUrl(row.id, row.avatar_updated_at)
      }));
    }

    const rows = db
      .prepare("SELECT id, email, role, status, avatar_updated_at, created_at FROM users ORDER BY created_at DESC, email ASC")
      .all() as Array<{ id: string; email: string; role: string; status: string; avatar_updated_at: string | null; created_at: string }>;
    return rows.map((row) => ({
      ...row,
      avatar_url: getAvatarPublicUrl(row.id, row.avatar_updated_at)
    }));
  });

  app.get("/admin/user-requests", { preHandler: requireAdmin }, async () => {
    const rows = db
      .prepare("SELECT id, email, role, status, created_at FROM users WHERE status = 'pending' ORDER BY created_at ASC")
      .all() as Array<{ id: string; email: string; role: string; status: string; created_at: string }>;
    return rows.map((row) => ({
      ...row,
      avatar_url: null
    }));
  });

  app.delete("/admin/users/:id/avatar", { preHandler: requireAdmin }, async (request, reply) => {
    const params = parseOrReply(reply, idParamsSchema, request.params);
    if (!params) return;

    try {
      await deleteUserAvatar(params.id);
      return reply.send({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Avatar konnte nicht entfernt werden.";
      return reply.code(400).send({ error: message });
    }
  });

  app.put("/admin/users/:id/role", { preHandler: requireAdmin }, async (request, reply) => {
    const params = parseOrReply(reply, idParamsSchema, request.params);
    const parsed = parseOrReply(reply, roleSchema, request.body);
    if (!params || !parsed) return;
    const now = nowIso();
    const result = db.prepare("UPDATE users SET role = ?, updated_at = ? WHERE id = ?").run(parsed.role, now, params.id);
    if (result.changes === 0) {
      return reply.code(404).send({ error: "Not found" });
    }
    return reply.send({ ok: true });
  });

  app.put("/admin/users/:id/status", { preHandler: requireAdmin }, async (request, reply) => {
    const params = parseOrReply(reply, idParamsSchema, request.params);
    const parsed = parseOrReply(reply, statusSchema, request.body);
    if (!params || !parsed) return;
    const now = nowIso();
    const result = db
      .prepare("UPDATE users SET status = ?, role = COALESCE(?, role), updated_at = ? WHERE id = ?")
      .run(parsed.status, parsed.role ?? null, now, params.id);
    if (result.changes === 0) {
      return reply.code(404).send({ error: "Not found" });
    }
    return reply.send({ ok: true });
  });

  app.post("/admin/users/:id/force-logout", { preHandler: requireAdmin }, async (request, reply) => {
    const params = parseOrReply(reply, idParamsSchema, request.params);
    if (!params) return;

    const now = nowIso();
    const result = db
      .prepare("UPDATE users SET force_logout_after = ?, updated_at = ? WHERE id = ?")
      .run(now, now, params.id);
    if (result.changes === 0) {
      return reply.code(404).send({ error: "Not found" });
    }

    return reply.send({ ok: true, forced_at: now });
  });

  app.delete("/admin/users/:id", { preHandler: requireAdmin }, async (request, reply) => {
    const params = parseOrReply(reply, idParamsSchema, request.params);
    if (!params) return;

    const actor = request.user as { id: string };
    if (params.id === actor.id) {
      return reply.code(409).send({ error: "Eigenes Konto kann nicht geloescht werden." });
    }

    const user = db
      .prepare("SELECT id, role FROM users WHERE id = ?")
      .get(params.id) as { id: string; role: string } | undefined;
    if (!user) {
      return reply.code(404).send({ error: "Not found" });
    }

    if (user.role === "admin") {
      const adminCount = db
        .prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND status = 'approved'")
        .get() as { count: number };
      if (Number(adminCount.count) <= 1) {
        return reply.code(409).send({ error: "Letzter Admin kann nicht geloescht werden." });
      }
    }

    const result = db.prepare("DELETE FROM users WHERE id = ?").run(params.id);
    if (result.changes === 0) {
      return reply.code(404).send({ error: "Not found" });
    }

    return reply.code(204).send();
  });

  app.get("/admin/settings", { preHandler: requireAdmin }, async () => {
    return db.prepare("SELECT key, value, updated_at FROM settings ORDER BY key ASC").all();
  });

  app.put("/admin/settings", { preHandler: requireAdmin }, async (request, reply) => {
    const parsed = parseOrReply(reply, z.array(settingSchema).max(20), request.body);
    if (!parsed) return;
    const now = nowIso();
    const insert = db.prepare(
      "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
    );
    const transaction = db.transaction(() => {
      for (const item of parsed) {
        insert.run(item.key, item.value, now);
      }
    });
    transaction();
    return reply.send({ ok: true });
  });

  app.get("/admin/push-rules", { preHandler: requireAdmin }, async () => {
    return db.prepare("SELECT * FROM push_rules ORDER BY created_at DESC, rule_type ASC").all();
  });

  app.post("/admin/push-rules", { preHandler: requireAdmin }, async (request, reply) => {
    const parsed = parseOrReply(reply, customPushRuleSchema, request.body);
    if (!parsed) return;
    const mapped = mapCustomPushRule(parsed);
    const now = nowIso();
    const id = randomUUID();
    db.prepare(
      `INSERT INTO push_rules (
        id, rule_type, enabled, lead_time_hours, target_user_id, target_role, title_template, body_template,
        min_response_percent, event_type, send_start, send_end, schedule_start_date, schedule_every, schedule_time,
        cooldown_hours, title, message, notification_type, target_type, target_id, is_recurring, interval_value,
        interval_unit, start_date, end_date, last_sent_at, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      mapped.rule_type,
      mapped.enabled,
      mapped.lead_time_hours,
      mapped.target_user_id,
      mapped.target_role,
      mapped.title_template,
      mapped.body_template,
      mapped.min_response_percent,
      mapped.event_type,
      mapped.send_start,
      mapped.send_end,
      mapped.schedule_start_date,
      mapped.schedule_every,
      mapped.schedule_time,
      mapped.cooldown_hours,
      mapped.title,
      mapped.message,
      mapped.notification_type,
      mapped.target_type,
      mapped.target_id,
      mapped.is_recurring,
      mapped.interval_value,
      mapped.interval_unit,
      mapped.start_date,
      mapped.end_date,
      null,
      mapped.is_active,
      now,
      now
    );
    return reply.code(201).send({ id });
  });

  app.put("/admin/push-rules/:id", { preHandler: requireAdmin }, async (request, reply) => {
    const params = parseOrReply(reply, idParamsSchema, request.params);
    const parsed = parseOrReply(reply, customPushRuleSchema, request.body);
    if (!params || !parsed) return;
    const mapped = mapCustomPushRule(parsed);
    const now = nowIso();
    const result = db
      .prepare(
        `UPDATE push_rules SET
          rule_type = ?, enabled = ?, lead_time_hours = ?, target_user_id = ?, target_role = ?, title_template = ?,
          body_template = ?, min_response_percent = ?, event_type = ?, send_start = ?, send_end = ?, schedule_start_date = ?,
          schedule_every = ?, schedule_time = ?, cooldown_hours = ?, title = ?, message = ?, notification_type = ?,
          target_type = ?, target_id = ?, is_recurring = ?, interval_value = ?, interval_unit = ?, start_date = ?,
          end_date = ?, is_active = ?, updated_at = ? WHERE id = ? AND rule_type = 'custom-notification'`
      )
      .run(
        mapped.rule_type,
        mapped.enabled,
        mapped.lead_time_hours,
        mapped.target_user_id,
        mapped.target_role,
        mapped.title_template,
        mapped.body_template,
        mapped.min_response_percent,
        mapped.event_type,
        mapped.send_start,
        mapped.send_end,
        mapped.schedule_start_date,
        mapped.schedule_every,
        mapped.schedule_time,
        mapped.cooldown_hours,
        mapped.title,
        mapped.message,
        mapped.notification_type,
        mapped.target_type,
        mapped.target_id,
        mapped.is_recurring,
        mapped.interval_value,
        mapped.interval_unit,
        mapped.start_date,
        mapped.end_date,
        mapped.is_active,
        now,
        params.id
      );
    if (result.changes === 0) {
      return reply.code(404).send({ error: "Not found" });
    }
    return reply.send({ ok: true });
  });

  app.delete("/admin/push-rules/:id", { preHandler: requireAdmin }, async (request, reply) => {
    const params = parseOrReply(reply, idParamsSchema, request.params);
    if (!params) return;
    const result = db.prepare("DELETE FROM push_rules WHERE id = ?").run(params.id);
    if (result.changes === 0) {
      return reply.code(404).send({ error: "Not found" });
    }
    return reply.code(204).send();
  });

  app.post("/admin/push-rules/:id/send", { preHandler: [requireAdmin, manualSendRateLimit] }, async (request, reply) => {
    const params = parseOrReply(reply, idParamsSchema, request.params);
    if (!params) return;
    const rule = getCustomPushRule(params.id);
    if (!rule) {
      return reply.code(404).send({ error: "Not found" });
    }
    if (!rule.is_active) {
      return reply.code(409).send({ error: "Regel ist deaktiviert." });
    }
    const result = await sendCustomPushRule(rule);
    return reply.send({ ok: true, delivered: result.delivered, skipped: result.skipped, last_sent_at: result.lastSentAt });
  });
};
