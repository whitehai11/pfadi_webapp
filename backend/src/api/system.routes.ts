// engineered by Maro Elias Goth
import type { FastifyInstance } from "fastify";
import { requireAuth } from "../utils/guards.js";
import { getSystemVersion } from "../services/version.service.js";

export const systemRoutes = async (app: FastifyInstance) => {
  app.get("/system/version", { preHandler: requireAuth }, async (_request, reply) => {
    reply.header("Cache-Control", "no-store");

    const version = getSystemVersion();
    if (!version) {
      return reply.code(404).send({ error: "Keine Versionsdaten verfuegbar." });
    }

    return version;
  });
};
