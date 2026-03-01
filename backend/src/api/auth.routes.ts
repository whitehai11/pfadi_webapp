// engineered by Maro Elias Goth
import fs from "node:fs";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import type { MultipartFile } from "@fastify/multipart";
import { z } from "zod";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { db, nowIso } from "../db/database.js";
import { hashPassword, verifyPassword } from "../utils/auth.js";
import { requireAuth } from "../utils/guards.js";
import { createRateLimit } from "../utils/rate-limit.js";
import { parseOrReply, passwordSchema, usernameSchema, uuidParamSchema } from "../utils/validation.js";
import {
  AVATAR_MAX_BYTES,
  deleteUserAvatar,
  getAvatarFilePathForUser,
  getAvatarPublicUrl,
  isAllowedAvatarMime,
  storeUserAvatar
} from "../services/avatar.service.js";
import { writeAuditLog } from "../services/audit-log.service.js";

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

const refreshSchema = z
  .object({
    refreshToken: z.string().trim().min(32).max(1024).optional()
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

type LoginAttemptEntry = {
  count: number;
  resetAt: number;
};

const loginAttemptsByIpUser = new Map<string, LoginAttemptEntry>();
const loginAttemptWindowMs = 15 * 60 * 1000;
const loginAttemptMax = 8;

const getLoginAttemptKey = (ip: string, username: string) => `${ip}:${username}`;

const consumeLoginAttempt = (ip: string, username: string) => {
  const now = Date.now();
  const key = getLoginAttemptKey(ip, username);
  const current = loginAttemptsByIpUser.get(key);

  if (!current || current.resetAt <= now) {
    loginAttemptsByIpUser.set(key, { count: 1, resetAt: now + loginAttemptWindowMs });
    return { blocked: false, retryAfterSec: 0 };
  }

  if (current.count >= loginAttemptMax) {
    return { blocked: true, retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  }

  current.count += 1;
  loginAttemptsByIpUser.set(key, current);
  return { blocked: false, retryAfterSec: 0 };
};

const clearLoginAttempt = (ip: string, username: string) => {
  loginAttemptsByIpUser.delete(getLoginAttemptKey(ip, username));
};

type UserRecord = {
  id: string;
  email: string;
  password_hash: string;
  role: "admin" | "user" | "materialwart";
  status: "pending" | "approved" | "rejected";
  avatar_updated_at?: string | null;
  created_at?: string;
};

const userAvatarParamsSchema = z
  .object({
    id: uuidParamSchema
  })
  .strict();

const isSecureCookie = process.env.NODE_ENV === "production";
const accessTokenMaxAge = 15 * 60;
const refreshTokenMaxAge = 14 * 24 * 60 * 60;

const hashRefreshToken = (token: string) => createHash("sha256").update(token).digest("hex");

const generateRefreshToken = () => randomBytes(48).toString("base64url");

const parseCookieValue = (cookieHeader: string | undefined, cookieName: string) => {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";").map((part) => part.trim());
  const key = `${cookieName}=`;
  for (const part of parts) {
    if (!part.startsWith(key)) continue;
    const value = part.slice(key.length).trim();
    if (!value) return null;
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return null;
};

const serializeAuthCookie = (token: string) => {
  const parts = [
    `pfadi_token=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${accessTokenMaxAge}`
  ];
  if (isSecureCookie) {
    parts.push("Secure");
  }
  return parts.join("; ");
};

const serializeRefreshCookie = (token: string) => {
  const parts = [
    `pfadi_refresh=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${refreshTokenMaxAge}`
  ];
  if (isSecureCookie) {
    parts.push("Secure");
  }
  return parts.join("; ");
};

const clearAuthCookie = () => {
  const parts = ["pfadi_token=", "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (isSecureCookie) {
    parts.push("Secure");
  }
  return parts.join("; ");
};

const clearRefreshCookie = () => {
  const parts = ["pfadi_refresh=", "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (isSecureCookie) {
    parts.push("Secure");
  }
  return parts.join("; ");
};

const issueAccessToken = (
  app: FastifyInstance,
  payload: { id: string; username: string; role: "admin" | "user" | "materialwart"; status: "approved" }
) => app.jwt.sign(payload, { expiresIn: "15m" });

const createRefreshTokenRecord = (userId: string, rotatedFromTokenId: string | null = null) => {
  const token = generateRefreshToken();
  const tokenHash = hashRefreshToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + refreshTokenMaxAge * 1000).toISOString();
  const id = randomUUID();

  db.prepare(
    "INSERT INTO auth_refresh_tokens (id, user_id, token_hash, expires_at, created_at, rotated_from_token_id) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, userId, tokenHash, expiresAt, now.toISOString(), rotatedFromTokenId);

  return { id, token, expiresAt };
};

export const authRoutes = async (app: FastifyInstance) => {
  app.post("/auth/register", { preHandler: registerRateLimit }, async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    try {
      const parsed = parseOrReply(reply, registerSchema, request.body);
      if (!parsed) return;

      const { username, password } = parsed;
      const normalized = username.trim().toLowerCase();
      const existing = db.prepare("SELECT id FROM users WHERE lower(email) = ?").get(normalized) as
        | { id: string }
        | undefined;
      if (existing) {
        return reply.code(200).send({
          success: true,
          message: "Anfrage aufgenommen.",
          data: { status: "pending" }
        });
      }

      const now = nowIso();
      const role = "user";
      const status = "pending";
      const passwordHash = await hashPassword(password);
      const id = randomUUID();
      db.prepare(
        "INSERT INTO users (id, email, password_hash, role, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(id, normalized, passwordHash, role, status, now, now);

      return reply.code(201).send({
        success: true,
        message: "Account beantragt.",
        data: { id, username: normalized, role, status }
      });
    } catch (error) {
      request.log.error({ err: error, stack: (error as Error).stack }, "Register failed");
      throw error;
    }
  });

  app.post("/auth/login", { preHandler: loginRateLimit }, async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    try {
      const parsed = parseOrReply(reply, loginSchema, request.body);
      if (!parsed) return;

      const { username, password } = parsed;
      const normalized = username.trim().toLowerCase();
      const attempt = consumeLoginAttempt(request.ip, normalized);
      if (attempt.blocked) {
        writeAuditLog({
          actorUserId: null,
          action: "auth.login.rate-limited",
          entityType: "auth",
          entityId: normalized,
          ipAddress: request.ip,
          userAgent: String(request.headers["user-agent"] ?? ""),
          metadata: { retry_after_seconds: attempt.retryAfterSec }
        });
        reply.header("Retry-After", String(attempt.retryAfterSec));
        return reply.code(429).send({ success: false, message: "Zu viele Login-Versuche. Bitte spaeter erneut versuchen." });
      }

      const user = db
        .prepare("SELECT id, email, password_hash, role, status, avatar_updated_at FROM users WHERE lower(email) = ?")
        .get(normalized) as UserRecord | undefined;
      if (!user) {
        writeAuditLog({
          actorUserId: null,
          action: "auth.login.failed",
          entityType: "auth",
          entityId: normalized,
          ipAddress: request.ip,
          userAgent: String(request.headers["user-agent"] ?? "")
        });
        return reply.code(401).send({ success: false, message: "Ungultige Anmeldedaten." });
      }

      const ok = await verifyPassword(password, user.password_hash);
      if (!ok) {
        writeAuditLog({
          actorUserId: user.id,
          action: "auth.login.failed",
          entityType: "auth",
          entityId: user.id,
          ipAddress: request.ip,
          userAgent: String(request.headers["user-agent"] ?? "")
        });
        return reply.code(401).send({ success: false, message: "Ungultige Anmeldedaten." });
      }

      if (user.status === "pending") {
        writeAuditLog({
          actorUserId: user.id,
          action: "auth.login.blocked.pending",
          entityType: "auth",
          entityId: user.id,
          ipAddress: request.ip,
          userAgent: String(request.headers["user-agent"] ?? "")
        });
        return reply.code(403).send({ success: false, message: "Dein Account wurde noch nicht freigegeben." });
      }

      if (user.status === "rejected") {
        writeAuditLog({
          actorUserId: user.id,
          action: "auth.login.blocked.rejected",
          entityType: "auth",
          entityId: user.id,
          ipAddress: request.ip,
          userAgent: String(request.headers["user-agent"] ?? "")
        });
        return reply
          .code(403)
          .send({ success: false, message: "Dein Account wurde abgelehnt. Bitte kontaktiere einen Admin." });
      }

      const role = user.role;

      const token = issueAccessToken(app, { id: user.id, username: user.email, role, status: "approved" });
      const refresh = createRefreshTokenRecord(user.id);
      clearLoginAttempt(request.ip, normalized);
      writeAuditLog({
        actorUserId: user.id,
        action: "auth.login.success",
        entityType: "auth",
        entityId: user.id,
        ipAddress: request.ip,
        userAgent: String(request.headers["user-agent"] ?? "")
      });
      reply.header("Set-Cookie", [serializeAuthCookie(token), serializeRefreshCookie(refresh.token)]);
      return reply.send({
        success: true,
        message: "Login erfolgreich.",
        data: {
          token,
          refresh_token: refresh.token,
          user: {
            id: user.id,
            username: user.email,
            role,
            status: "approved",
            avatar_url: getAvatarPublicUrl(user.id, user.avatar_updated_at ?? null)
          }
        }
      });
    } catch (error) {
      request.log.error({ err: error, stack: (error as Error).stack }, "Login failed");
      throw error;
    }
  });

  app.get("/auth/me", { preHandler: requireAuth }, async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    const user = request.user as { id: string; username: string; role: string };
    const record = db
      .prepare("SELECT id, email, role, status, avatar_updated_at, created_at FROM users WHERE id = ?")
      .get(user.id) as
      | { id: string; email: string; role: string; status: string; avatar_updated_at: string | null; created_at: string }
      | undefined;
    if (!record) {
      return reply.code(404).send({ success: false, message: "Not found" });
    }
    if (record.status !== "approved") {
      return reply.code(403).send({ success: false, message: "Unauthorized" });
    }
    return reply.send({
      success: true,
      message: "OK",
      data: {
        id: record.id,
        username: record.email,
        role: record.role,
        status: record.status,
        avatar_url: getAvatarPublicUrl(record.id, record.avatar_updated_at),
        created_at: record.created_at
      }
    });
  });

  app.post("/auth/avatar", { preHandler: requireAuth }, async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    if (!request.isMultipart()) {
      return reply.code(400).send({ success: false, message: "Multipart-Upload erforderlich." });
    }

    const user = request.user as { id: string };
    let filePart: MultipartFile | null = null;

    for await (const part of request.parts()) {
      if (part.type !== "file") continue;
      if (part.fieldname !== "avatar" || filePart) {
        return reply.code(400).send({ success: false, message: "Ungultiges Upload-Format." });
      }
      filePart = part;
    }

    if (!filePart) {
      return reply.code(400).send({ success: false, message: "Kein Avatar hochgeladen." });
    }
    if (!isAllowedAvatarMime(filePart.mimetype)) {
      return reply.code(400).send({ success: false, message: "Nur PNG, JPG oder WEBP erlaubt." });
    }

    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of filePart.file) {
      const next = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += next.length;
      if (size > AVATAR_MAX_BYTES) {
        return reply.code(400).send({ success: false, message: "Datei ist zu gross. Maximal 2 MB." });
      }
      chunks.push(next);
    }

    try {
      const stored = await storeUserAvatar(user.id, {
        buffer: Buffer.concat(chunks),
        mimeType: filePart.mimetype
      });
      return reply.send({
        success: true,
        message: "Avatar gespeichert.",
        data: {
          avatar_url: getAvatarPublicUrl(user.id, stored.avatarUpdatedAt)
        }
      });
    } catch (error) {
      return reply.code(400).send({
        success: false,
        message: error instanceof Error ? error.message : "Avatar konnte nicht gespeichert werden."
      });
    }
  });

  app.delete("/auth/avatar", { preHandler: requireAuth }, async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    const user = request.user as { id: string };

    try {
      await deleteUserAvatar(user.id);
      return reply.send({
        success: true,
        message: "Avatar entfernt.",
        data: { avatar_url: null }
      });
    } catch (error) {
      return reply.code(400).send({
        success: false,
        message: error instanceof Error ? error.message : "Avatar konnte nicht entfernt werden."
      });
    }
  });

  app.get("/users/:id/avatar", { preHandler: requireAuth }, async (request, reply) => {
    const params = parseOrReply(reply, userAvatarParamsSchema, request.params);
    if (!params) return;

    const absolutePath = getAvatarFilePathForUser(params.id);
    if (!absolutePath) {
      return reply.code(404).send({ success: false, message: "Avatar nicht gefunden." });
    }

    const uploadDir = path.resolve(path.dirname(absolutePath), "..");
    const resolvedPath = path.resolve(absolutePath);
    const relativePath = path.relative(uploadDir, resolvedPath);
    if (relativePath.startsWith("..") || path.isAbsolute(relativePath) || !fs.existsSync(resolvedPath)) {
      return reply.code(404).send({ success: false, message: "Avatar nicht gefunden." });
    }

    reply.header("Cache-Control", "private, max-age=300");
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("Content-Type", "image/webp");
    return reply.send(fs.createReadStream(resolvedPath));
  });

  app.post("/auth/refresh", async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    const body = parseOrReply(reply, refreshSchema, request.body ?? {});
    if (!body) return;

    const cookieToken = parseCookieValue(request.headers.cookie, "pfadi_refresh");
    const providedToken = body.refreshToken || cookieToken;
    if (!providedToken) {
      return reply.code(401).send({ success: false, message: "Refresh-Token fehlt." });
    }

    const tokenHash = hashRefreshToken(providedToken);
    const now = nowIso();
    const record = db
      .prepare(
        `SELECT
          tokens.id,
          tokens.user_id,
          tokens.expires_at,
          tokens.revoked_at,
          users.email,
          users.role,
          users.status
        FROM auth_refresh_tokens tokens
        JOIN users ON users.id = tokens.user_id
        WHERE tokens.token_hash = ?
        LIMIT 1`
      )
      .get(tokenHash) as
      | {
          id: string;
          user_id: string;
          expires_at: string;
          revoked_at: string | null;
          email: string;
          role: "admin" | "user" | "materialwart";
          status: "pending" | "approved" | "rejected";
        }
      | undefined;

    if (!record) {
      return reply.code(401).send({ success: false, message: "Refresh-Token ungueltig." });
    }
    if (record.revoked_at) {
      return reply.code(401).send({ success: false, message: "Refresh-Token widerrufen." });
    }
    if (Date.parse(record.expires_at) <= Date.now()) {
      db.prepare("UPDATE auth_refresh_tokens SET revoked_at = ?, last_used_at = ? WHERE id = ?").run(now, now, record.id);
      return reply.code(401).send({ success: false, message: "Refresh-Token abgelaufen." });
    }
    if (record.status !== "approved") {
      return reply.code(403).send({ success: false, message: "Konto nicht freigegeben." });
    }

    db.prepare("UPDATE auth_refresh_tokens SET revoked_at = ?, last_used_at = ? WHERE id = ?").run(now, now, record.id);
    const rotated = createRefreshTokenRecord(record.user_id, record.id);
    const accessToken = issueAccessToken(app, {
      id: record.user_id,
      username: record.email,
      role: record.role,
      status: "approved"
    });

    reply.header("Set-Cookie", [serializeAuthCookie(accessToken), serializeRefreshCookie(rotated.token)]);
    return reply.send({
      success: true,
      message: "Token aktualisiert.",
      data: {
        token: accessToken,
        refresh_token: rotated.token
      }
    });
  });

  app.post("/auth/logout", async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    const body = parseOrReply(reply, refreshSchema, request.body ?? {});
    if (!body) return;

    const tokenFromCookie = parseCookieValue(request.headers.cookie, "pfadi_refresh");
    const providedToken = body.refreshToken || tokenFromCookie;
    const now = nowIso();

    if (providedToken) {
      db.prepare("UPDATE auth_refresh_tokens SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL").run(
        now,
        hashRefreshToken(providedToken)
      );
    }

    try {
      await request.jwtVerify();
      const current = request.user as { id: string };
      if (current?.id) {
        db.prepare("UPDATE auth_refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL").run(
          now,
          current.id
        );
      }
    } catch {
      // best effort logout for anonymous/expired sessions
    }

    reply.header("Set-Cookie", [clearAuthCookie(), clearRefreshCookie()]);
    return reply.send({ success: true, message: "Abgemeldet." });
  });
};
