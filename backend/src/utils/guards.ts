import type { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../db/database.js";
import { getBooleanSetting } from "../services/app-settings.service.js";

export const getApprovedUserFromRequest = (request: FastifyRequest) => {
  const tokenUser = request.user as { id?: string };
  if (!tokenUser?.id) return null;

  const user = db
    .prepare("SELECT id, email, role, status FROM users WHERE id = ?")
    .get(tokenUser.id) as { id: string; email: string; role: string; status: string } | undefined;

  if (!user || user.status !== "approved") return null;
  return user;
};

export const requireAuth = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    await request.jwtVerify();
    if (!getApprovedUserFromRequest(request)) {
      return reply.code(403).send({ error: "Forbidden" });
    }
  } catch {
    return reply.code(401).send({ error: "Unauthorized" });
  }
};

export const requireAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    await request.jwtVerify();
    const user = getApprovedUserFromRequest(request);
    if (user?.role !== "admin") {
      return reply.code(403).send({ error: "Forbidden" });
    }
  } catch {
    return reply.code(401).send({ error: "Unauthorized" });
  }
};

export const requireMaterialOrAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    await request.jwtVerify();
    const user = getApprovedUserFromRequest(request);
    if (user?.role !== "admin" && user?.role !== "materialwart") {
      return reply.code(403).send({ error: "Forbidden" });
    }
  } catch {
    return reply.code(401).send({ error: "Unauthorized" });
  }
};

export const requireChatFeature = async (request: FastifyRequest, reply: FastifyReply) => {
  await requireAuth(request, reply);
  if (reply.sent) return;

  if (!getBooleanSetting("chat_enabled", false)) {
    return reply.code(403).send({ error: "Chat ist derzeit deaktiviert." });
  }
};
