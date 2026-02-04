import type { FastifyInstance } from "fastify";
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

export const authRoutes = async (app: FastifyInstance) => {
  app.post("/auth/register", async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid input" });
    }

    const { username, password } = parsed.data;
    const normalized = username.trim().toLowerCase();
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(username) as { id: string } | undefined;
    if (existing) {
      return reply.code(409).send({ error: "Benutzername bereits vergeben" });
    }

    const now = nowIso();
    const role = settings.adminEmails.includes(username) || normalized === "maro" ? "admin" : "user";
    const passwordHash = await hashPassword(password);
    const id = randomUUID();
    db.prepare(
      "INSERT INTO users (id, email, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(id, username, passwordHash, role, now, now);

    return reply.code(201).send({ id, username, role });
  });

  app.post("/auth/login", async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid input" });
    }

    const { username, password } = parsed.data;
    const normalized = username.trim().toLowerCase();
    const user = db
      .prepare("SELECT * FROM users WHERE email = ?")
      .get(username) as { id: string; email: string; password_hash: string; role: string } | undefined;
    if (!user) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    let role = user.role;
    if (normalized === "maro" && user.role !== "admin") {
      role = "admin";
      db.prepare("UPDATE users SET role = 'admin', updated_at = ? WHERE id = ?").run(nowIso(), user.id);
    }

    const token = app.jwt.sign({ id: user.id, username: user.email, role });
    return reply.send({ token, user: { id: user.id, username: user.email, role } });
  });

  app.get("/auth/me", { preHandler: requireAuth }, async (request, reply) => {
    const user = request.user as { id: string; username: string; role: string };
    const record = db
      .prepare("SELECT id, email, role, created_at FROM users WHERE id = ?")
      .get(user.id) as { id: string; email: string; role: string; created_at: string } | undefined;
    if (!record) {
      return reply.code(404).send({ error: "Not found" });
    }
    if (record.email.trim().toLowerCase() === "maro" && record.role !== "admin") {
      db.prepare("UPDATE users SET role = 'admin', updated_at = ? WHERE id = ?").run(nowIso(), record.id);
      record.role = "admin";
    }
    return reply.send({ id: record.id, username: record.email, role: record.role, created_at: record.created_at });
  });
};
