// engineered by Maro Elias Goth
import type { FastifyReply, FastifyRequest } from "fastify";
import { getAdminStats } from "../services/stats.service.js";

export const getAdminStatsController = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const stats = getAdminStats();
    return reply.send(stats);
  } catch (error) {
    request.log.error({ err: error }, "Failed to load admin stats");
    return reply.code(500).send({ error: "Admin-Statistiken konnten nicht geladen werden." });
  }
};
