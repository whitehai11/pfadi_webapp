import { z } from "zod";
import { randomUUID } from "node:crypto";
import { db, nowIso } from "../db/database.js";
import { hashPassword, verifyPassword } from "../utils/auth.js";
import { settings } from "../config/settings.js";
import { requireAuth } from "../utils/guards.js";
const registerSchema = z.object({
    username: z.string().min(3),
    password: z.string().min(8)
});
const loginSchema = z.object({
    username: z.string().min(3),
    password: z.string().min(8)
});
export const authRoutes = async (app) => {
    app.post("/auth/register", async (request, reply) => {
        const parsed = registerSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.code(400).send({ error: "Invalid input" });
        }
        const { username, password } = parsed.data;
        const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(username);
        if (existing) {
            return reply.code(409).send({ error: "Benutzername bereits vergeben" });
        }
        const now = nowIso();
        const role = settings.adminEmails.includes(username) ? "admin" : "user";
        const passwordHash = await hashPassword(password);
        const id = randomUUID();
        db.prepare("INSERT INTO users (id, email, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)").run(id, username, passwordHash, role, now, now);
        return reply.code(201).send({ id, username, role });
    });
    app.post("/auth/login", async (request, reply) => {
        const parsed = loginSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.code(400).send({ error: "Invalid input" });
        }
        const { username, password } = parsed.data;
        const user = db
            .prepare("SELECT * FROM users WHERE email = ?")
            .get(username);
        if (!user) {
            return reply.code(401).send({ error: "Invalid credentials" });
        }
        const ok = await verifyPassword(password, user.password_hash);
        if (!ok) {
            return reply.code(401).send({ error: "Invalid credentials" });
        }
        const token = app.jwt.sign({ id: user.id, username: user.email, role: user.role });
        return reply.send({ token, user: { id: user.id, username: user.email, role: user.role } });
    });
    app.get("/auth/me", { preHandler: requireAuth }, async (request, reply) => {
        const user = request.user;
        const record = db
            .prepare("SELECT id, email, role, created_at FROM users WHERE id = ?")
            .get(user.id);
        if (!record) {
            return reply.code(404).send({ error: "Not found" });
        }
        return reply.send({ id: record.id, username: record.email, role: record.role, created_at: record.created_at });
    });
};
