// engineered by Maro Elias Goth
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth, getApprovedUserFromRequest } from "../utils/guards.js";
import { parseOrReply } from "../utils/validation.js";
import { listNotifications, markNotificationsRead } from "../services/notification.service.js";

const listQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).optional(),
    before: z.string().datetime().optional()
  })
  .strict();

const markReadBodySchema = z
  .object({
    ids: z.array(z.string().uuid()).max(200).optional(),
    all: z.boolean().optional()
  })
  .strict();

export const notificationRoutes = async (app: FastifyInstance) => {
  app.get("/notifications", { preHandler: requireAuth }, async (request, reply) => {
    const query = parseOrReply(reply, listQuerySchema, request.query);
    if (!query) return;

    const user = getApprovedUserFromRequest(request);
    if (!user) {
      return reply.code(403).send({ success: false, message: "Forbidden" });
    }

    return reply.send(
      listNotifications(user.id, {
        limit: query.limit,
        before: query.before ?? null
      })
    );
  });

  app.post("/notifications/mark-read", { preHandler: requireAuth }, async (request, reply) => {
    const body = parseOrReply(reply, markReadBodySchema, request.body ?? {});
    if (!body) return;

    const user = getApprovedUserFromRequest(request);
    if (!user) {
      return reply.code(403).send({ success: false, message: "Forbidden" });
    }

    return reply.send(
      markNotificationsRead(user.id, {
        ids: body.ids,
        all: body.all ?? false
      })
    );
  });
};
