import { z } from "zod";
import { randomUUID } from "node:crypto";
import { db, nowIso } from "../db/database.js";
import { requireAdmin } from "../utils/guards.js";
const settingSchema = z.object({
    key: z.string().min(1),
    value: z.string()
});
const roleSchema = z.object({
    role: z.enum(["admin", "user", "materialwart"])
});
const pushRuleSchema = z.object({
    rule_type: z.string().min(1),
    enabled: z.boolean(),
    lead_time_hours: z.number().int().min(0),
    target_user_id: z.string().optional().nullable(),
    target_role: z.enum(["admin", "user", "materialwart"]).optional().nullable(),
    title_template: z.string().optional().nullable(),
    body_template: z.string().optional().nullable(),
    min_response_percent: z.number().int().min(0).max(100).optional().nullable(),
    event_type: z.string().optional().nullable(),
    send_start: z.string().optional().nullable(),
    send_end: z.string().optional().nullable(),
    schedule_start_date: z.string().optional().nullable(),
    schedule_every: z.enum(["daily", "weekly", "monthly"]).optional().nullable(),
    schedule_time: z.string().optional().nullable(),
    cooldown_hours: z.number().int().min(0).optional().nullable()
});
export const adminRoutes = async (app) => {
    app.get("/admin/users", { preHandler: requireAdmin }, async () => {
        return db.prepare("SELECT id, email, role, created_at FROM users ORDER BY email ASC").all();
    });
    app.put("/admin/users/:id/role", { preHandler: requireAdmin }, async (request, reply) => {
        const parsed = roleSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.code(400).send({ error: "Invalid input" });
        }
        const now = nowIso();
        const result = db
            .prepare("UPDATE users SET role = ?, updated_at = ? WHERE id = ?")
            .run(parsed.data.role, now, request.params.id);
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
        const parsed = z.array(settingSchema).safeParse(request.body);
        if (!parsed.success) {
            return reply.code(400).send({ error: "Invalid input" });
        }
        const now = nowIso();
        const insert = db.prepare("INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at");
        const transaction = db.transaction(() => {
            for (const item of parsed.data) {
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
        const parsed = pushRuleSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.code(400).send({ error: "Invalid input" });
        }
        const now = nowIso();
        const id = randomUUID();
        db.prepare("INSERT INTO push_rules (id, rule_type, enabled, lead_time_hours, target_user_id, target_role, title_template, body_template, min_response_percent, event_type, send_start, send_end, schedule_start_date, schedule_every, schedule_time, cooldown_hours, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(id, parsed.data.rule_type, parsed.data.enabled ? 1 : 0, parsed.data.lead_time_hours, parsed.data.target_user_id ?? null, parsed.data.target_role ?? null, parsed.data.title_template ?? null, parsed.data.body_template ?? null, parsed.data.min_response_percent ?? null, parsed.data.event_type ?? null, parsed.data.send_start ?? null, parsed.data.send_end ?? null, parsed.data.schedule_start_date ?? null, parsed.data.schedule_every ?? null, parsed.data.schedule_time ?? null, parsed.data.cooldown_hours ?? null, now, now);
        return reply.code(201).send({ id });
    });
    app.put("/admin/push-rules/:id", { preHandler: requireAdmin }, async (request, reply) => {
        const parsed = pushRuleSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.code(400).send({ error: "Invalid input" });
        }
        const now = nowIso();
        const result = db
            .prepare("UPDATE push_rules SET rule_type = ?, enabled = ?, lead_time_hours = ?, target_user_id = ?, target_role = ?, title_template = ?, body_template = ?, min_response_percent = ?, event_type = ?, send_start = ?, send_end = ?, schedule_start_date = ?, schedule_every = ?, schedule_time = ?, cooldown_hours = ?, updated_at = ? WHERE id = ?")
            .run(parsed.data.rule_type, parsed.data.enabled ? 1 : 0, parsed.data.lead_time_hours, parsed.data.target_user_id ?? null, parsed.data.target_role ?? null, parsed.data.title_template ?? null, parsed.data.body_template ?? null, parsed.data.min_response_percent ?? null, parsed.data.event_type ?? null, parsed.data.send_start ?? null, parsed.data.send_end ?? null, parsed.data.schedule_start_date ?? null, parsed.data.schedule_every ?? null, parsed.data.schedule_time ?? null, parsed.data.cooldown_hours ?? null, now, request.params.id);
        if (result.changes === 0) {
            return reply.code(404).send({ error: "Not found" });
        }
        return reply.send({ ok: true });
    });
    app.delete("/admin/push-rules/:id", { preHandler: requireAdmin }, async (request, reply) => {
        const result = db.prepare("DELETE FROM push_rules WHERE id = ?").run(request.params.id);
        if (result.changes === 0) {
            return reply.code(404).send({ error: "Not found" });
        }
        return reply.code(204).send();
    });
};
