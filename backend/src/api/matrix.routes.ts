// engineered by Maro Elias Goth
import type { FastifyInstance } from "fastify";
import { requireAuth, requireAdmin, getApprovedUserFromRequest } from "../utils/guards.js";
import { provisionMatrixUser, createManualMatrixUser } from "../services/matrix.service.js";
import { sendToAllExcept } from "../services/push.service.js";
import { db } from "../db/database.js";

export const matrixRoutes = async (app: FastifyInstance) => {
  app.get("/matrix/config", { preHandler: requireAuth }, async (request, reply) => {
    const user = getApprovedUserFromRequest(request);
    if (!user) return reply.code(401).send({ success: false, message: "Nicht autorisiert." });

    try {
      const config = await provisionMatrixUser(user.id, user.email);
      return reply.send({
        homeserver_url: config.publicUrl,
        user_id: config.matrixUserId,
        access_token: config.accessToken,
        room_id: config.roomId
      });
    } catch (error) {
      request.log.error({ err: error }, "Matrix provisioning failed");
      return reply.code(503).send({ success: false, message: "Matrix-Dienst nicht erreichbar." });
    }
  });

  // Relay: frontend calls this when a new message arrives → sends Web Push to everyone else
  app.post("/matrix/push-relay", { preHandler: requireAuth }, async (request, reply) => {
    if (reply.sent) return;
    const user = getApprovedUserFromRequest(request);
    if (!user) return reply.code(401).send({ success: false, message: "Nicht autorisiert." });

    const { senderName, roomName, body } = request.body as {
      senderName?: string;
      roomName?: string;
      body?: string;
    };
    if (!senderName || !body) return reply.send({ success: true });

    const truncated = body.length > 100 ? body.slice(0, 100) + "…" : body;
    void sendToAllExcept(user.id, {
      title: `${senderName}${roomName ? ` — ${roomName}` : ""}`,
      body: truncated,
      type: "matrix_message",
      url: "/chat"
    });
    return reply.send({ success: true });
  });

  // Public (auth): list Matrix users for DM creation
  app.get("/matrix/users", { preHandler: requireAuth }, async () => {
    return db.prepare(
      "SELECT mu.matrix_user_id, u.email FROM matrix_users mu LEFT JOIN users u ON u.id = mu.user_id ORDER BY u.email"
    ).all();
  });

  // Admin: list all Matrix users
  app.get("/matrix/admin/users", { preHandler: requireAdmin }, async () => {
    return db.prepare(
      "SELECT mu.matrix_user_id, mu.created_at, u.email FROM matrix_users mu LEFT JOIN users u ON u.id = mu.user_id ORDER BY mu.created_at DESC"
    ).all();
  });

  // Admin: create a manual Matrix user
  app.post("/matrix/admin/users", { preHandler: requireAdmin }, async (request, reply) => {
    const { localpart, password } = request.body as { localpart?: string; password?: string };
    if (!localpart || !password) {
      return reply.code(400).send({ success: false, message: "localpart und password erforderlich." });
    }
    if (!/^[a-z0-9._-]+$/.test(localpart)) {
      return reply.code(400).send({ success: false, message: "Ungültiger localpart (nur a-z, 0-9, . _ -)." });
    }
    try {
      const result = await createManualMatrixUser(localpart, password);
      return reply.send({ success: true, data: { matrix_user_id: result.matrixUserId } });
    } catch (error) {
      request.log.error({ err: error }, "Manual Matrix user creation failed");
      const msg = error instanceof Error ? error.message : "Unbekannter Fehler";
      return reply.code(500).send({ success: false, message: msg });
    }
  });
};
