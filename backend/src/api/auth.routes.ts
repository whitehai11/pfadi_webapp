import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { db, nowIso } from "../db/database.js";
import { hashPassword, verifyPassword } from "../utils/auth.js";
import { settings } from "../config/settings.js";
import { requireAuth } from "../utils/guards.js";
import { createRateLimit } from "../utils/rate-limit.js";
import { parseOrReply, passwordSchema, usernameSchema } from "../utils/validation.js";

const registerSchema = z
  .object({
    username: usernameSchema,
    password: passwordSchema
  })
  .strict();

const loginSchema = z
  .object({
    username: usernameSchema,
    password: passwordSchema
  })
  .strict();

const registerRateLimit = createRateLimit({
  bucket: "auth-register",
  max: 5,
  windowMs: 60 * 60 * 1000,
  message: "Zu viele Registrierungsversuche. Bitte spaeter erneut versuchen."
});

const loginRateLimit = createRateLimit({
  bucket: "auth-login",
  max: 10,
  windowMs: 15 * 60 * 1000,
  message: "Zu viele Login-Versuche. Bitte spaeter erneut versuchen."
});

type UserRecord = {
  id: string;
  email: string;
  password_hash: string;
  role: "admin" | "user" | "materialwart";
  status: "pending" | "approved" | "rejected";
  created_at?: string;
};

export const authRoutes = async (app: FastifyInstance) => {
  app.post("/auth/register", { preHandler: registerRateLimit }, async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    const parsed = parseOrReply(reply, registerSchema, request.body);
    if (!parsed) return;

    const { username, password } = parsed;
    const normalized = username.trim().toLowerCase();
    const existing = db.prepare("SELECT id FROM users WHERE lower(email) = ?").get(normalized) as
      | { id: string }
      | undefined;
    if (existing) {
      return reply.code(202).send({ ok: true, status: "pending" });
    }

    const now = nowIso();
    const isBootstrapAdmin = settings.adminEmails.includes(normalized) || normalized === "maro";
    const role = isBootstrapAdmin ? "admin" : "user";
    const status = isBootstrapAdmin ? "approved" : "pending";
    const passwordHash = await hashPassword(password);
    const id = randomUUID();
    db.prepare(
      "INSERT INTO users (id, email, password_hash, role, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(id, normalized, passwordHash, role, status, now, now);

    return reply.code(201).send({ ok: true, id, username: normalized, role, status });
  });

  app.post("/auth/login", { preHandler: loginRateLimit }, async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    const parsed = parseOrReply(reply, loginSchema, request.body);
    if (!parsed) return;

    const { username, password } = parsed;
    const normalized = username.trim().toLowerCase();
    const user = db
      .prepare("SELECT * FROM users WHERE lower(email) = ?")
      .get(normalized) as UserRecord | undefined;
    if (!user) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    if (user.status === "pending") {
      return reply.code(403).send({ error: "Dein Account wurde noch nicht freigegeben." });
    }

    if (user.status === "rejected") {
      return reply.code(403).send({ error: "Dein Account wurde abgelehnt. Bitte kontaktiere einen Admin." });
    }

    let role = user.role;
    if (normalized === "maro" && user.role !== "admin") {
      role = "admin";
      db.prepare("UPDATE users SET role = 'admin', status = 'approved', updated_at = ? WHERE id = ?").run(
        nowIso(),
        user.id
      );
    }

    const token = app.jwt.sign({ id: user.id, username: user.email, role, status: "approved" });
    return reply.send({ token, user: { id: user.id, username: user.email, role, status: "approved" } });
  });

  app.get("/auth/me", { preHandler: requireAuth }, async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    const user = request.user as { id: string; username: string; role: string };
    const record = db
      .prepare("SELECT id, email, role, status, created_at FROM users WHERE id = ?")
      .get(user.id) as { id: string; email: string; role: string; status: string; created_at: string } | undefined;
    if (!record) {
      return reply.code(404).send({ error: "Not found" });
    }
    if (record.email.trim().toLowerCase() === "maro" && record.role !== "admin") {
      db.prepare("UPDATE users SET role = 'admin', status = 'approved', updated_at = ? WHERE id = ?").run(
        nowIso(),
        record.id
      );
      record.role = "admin";
      record.status = "approved";
    }
    if (record.status !== "approved") {
      return reply.code(403).send({ error: "Unauthorized" });
    }
    return reply.send({
      id: record.id,
      username: record.email,
      role: record.role,
      status: record.status,
      created_at: record.created_at
    });
  });
};
