import { z } from "zod";
import { randomUUID } from "node:crypto";
import { db, nowIso } from "../db/database.js";
import { requireAdmin } from "../utils/guards.js";
import { dateSchema, optionalTextField, parseOrReply, textField, timeSchema, uuidParamSchema } from "../utils/validation.js";
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
    if ((value.key === "quiet_hours_start" || value.key === "quiet_hours_end") && !timeSchema.safeParse(value.value).success) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "time expected" });
    }
});
const idParamsSchema = z.object({ id: uuidParamSchema }).strict();
const roleSchema = z
    .object({
    role: z.enum(["admin", "user", "materialwart"])
})
    .strict();
const statusSchema = z
    .object({
    status: z.enum(["approved", "rejected"]),
    role: z.enum(["admin", "user", "materialwart"]).optional()
})
    .strict();
const pushRuleSchema = z
    .object({
    rule_type: textField(60),
    enabled: z.boolean(),
    lead_time_hours: z.number().int().min(0).max(24 * 365),
    target_user_id: uuidParamSchema.nullable().optional(),
    target_role: z.enum(["admin", "user", "materialwart"]).optional().nullable(),
    title_template: optionalTextField(160),
    body_template: optionalTextField(1200),
    min_response_percent: z.number().int().min(0).max(100).optional().nullable(),
    event_type: z.enum(["Gruppenstunde", "Lager", "Aktion", "Sonstiges"]).optional().nullable(),
    send_start: timeSchema.optional().nullable(),
    send_end: timeSchema.optional().nullable(),
    schedule_start_date: dateSchema.optional().nullable(),
    schedule_every: z.enum(["daily", "weekly", "monthly"]).optional().nullable(),
    schedule_time: timeSchema.optional().nullable(),
    cooldown_hours: z.number().int().min(0).max(24 * 365).optional().nullable()
})
    .strict();
export const adminRoutes = async (app) => {
    app.get("/admin/users", { preHandler: requireAdmin }, async () => {
        return db.prepare("SELECT id, email, role, status, created_at FROM users ORDER BY created_at DESC, email ASC").all();
    });
    app.get("/admin/user-requests", { preHandler: requireAdmin }, async () => {
        return db
            .prepare("SELECT id, email, role, status, created_at FROM users WHERE status = 'pending' ORDER BY created_at ASC")
            .all();
    });
    app.put("/admin/users/:id/role", { preHandler: requireAdmin }, async (request, reply) => {
        const params = parseOrReply(reply, idParamsSchema, request.params);
        const parsed = parseOrReply(reply, roleSchema, request.body);
        if (!params || !parsed)
            return;
        const now = nowIso();
        const result = db
            .prepare("UPDATE users SET role = ?, updated_at = ? WHERE id = ?")
            .run(parsed.role, now, params.id);
        if (result.changes === 0) {
            return reply.code(404).send({ error: "Not found" });
        }
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
        return reply.send({ ok: true });
    });
    app.get("/admin/settings", { preHandler: requireAdmin }, async () => {
        const rows = db.prepare("SELECT key, value, updated_at FROM settings ORDER BY key ASC").all();
        return rows;
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
        return reply.send({ ok: true });
    });
    app.get("/admin/push-rules", { preHandler: requireAdmin }, async () => {
        return db.prepare("SELECT * FROM push_rules ORDER BY rule_type ASC").all();
    });
    app.post("/admin/push-rules", { preHandler: requireAdmin }, async (request, reply) => {
        const parsed = parseOrReply(reply, pushRuleSchema, request.body);
        if (!parsed)
            return;
        const now = nowIso();
        const id = randomUUID();
        db.prepare("INSERT INTO push_rules (id, rule_type, enabled, lead_time_hours, target_user_id, target_role, title_template, body_template, min_response_percent, event_type, send_start, send_end, schedule_start_date, schedule_every, schedule_time, cooldown_hours, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(id, parsed.rule_type, parsed.enabled ? 1 : 0, parsed.lead_time_hours, parsed.target_user_id ?? null, parsed.target_role ?? null, parsed.title_template ?? null, parsed.body_template ?? null, parsed.min_response_percent ?? null, parsed.event_type ?? null, parsed.send_start ?? null, parsed.send_end ?? null, parsed.schedule_start_date ?? null, parsed.schedule_every ?? null, parsed.schedule_time ?? null, parsed.cooldown_hours ?? null, now, now);
        return reply.code(201).send({ id });
    });
    app.put("/admin/push-rules/:id", { preHandler: requireAdmin }, async (request, reply) => {
        const params = parseOrReply(reply, idParamsSchema, request.params);
        const parsed = parseOrReply(reply, pushRuleSchema, request.body);
        if (!params || !parsed)
            return;
        const now = nowIso();
        const result = db
            .prepare("UPDATE push_rules SET rule_type = ?, enabled = ?, lead_time_hours = ?, target_user_id = ?, target_role = ?, title_template = ?, body_template = ?, min_response_percent = ?, event_type = ?, send_start = ?, send_end = ?, schedule_start_date = ?, schedule_every = ?, schedule_time = ?, cooldown_hours = ?, updated_at = ? WHERE id = ?")
            .run(parsed.rule_type, parsed.enabled ? 1 : 0, parsed.lead_time_hours, parsed.target_user_id ?? null, parsed.target_role ?? null, parsed.title_template ?? null, parsed.body_template ?? null, parsed.min_response_percent ?? null, parsed.event_type ?? null, parsed.send_start ?? null, parsed.send_end ?? null, parsed.schedule_start_date ?? null, parsed.schedule_every ?? null, parsed.schedule_time ?? null, parsed.cooldown_hours ?? null, now, params.id);
        if (result.changes === 0) {
            return reply.code(404).send({ error: "Not found" });
        }
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
        return reply.code(204).send();
    });
};
