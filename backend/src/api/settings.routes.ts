import type { FastifyInstance } from "fastify";
import { db } from "../db/database.js";
import { requireAuth } from "../utils/guards.js";

export const settingsRoutes = async (app: FastifyInstance) => {
  app.get("/settings", { preHandler: requireAuth }, async () => {
    return db
      .prepare("SELECT key, value, updated_at FROM settings WHERE key IN ('nfc_enabled') ORDER BY key ASC")
      .all();
  });
};
